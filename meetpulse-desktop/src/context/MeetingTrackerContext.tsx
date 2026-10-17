import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { MeetingRecord, WorkRecord, UserSettings, DailyKPISummary, ExportConfig, TabType, Sprint, SprintStatus, AppBackupData, ImportResult } from '../types';
import { defaultSettings, generateSeedData, generateSeedSprints } from '../utils/seedData';
import { exportRecordsToFormat } from '../utils/excelExport';
import { format, subDays } from 'date-fns';

export interface PendingCompletionMeeting {
  startTimeStr: string;
  endTimeStr: string;
  durationMinutes: number;
  startDate: string;
  title: string;
}

export function calculateMeetingShiftSplit(
  startTime: string,
  endTime: string,
  durationMinutes: number,
  shiftStartTime: string = '09:30',
  shiftEndTime: string = '18:30',
  enableLunchBreak: boolean = true,
  lunchStartTime: string = '13:00',
  lunchEndTime: string = '14:00'
): { inShiftMinutes: number; overtimeMinutes: number; lunchMinutes: number } {
  const [sh, sm] = (startTime || '00:00').split(':').map(Number);
  const [eh, em] = (endTime || '00:00').split(':').map(Number);
  const [ssh, ssm] = (shiftStartTime || '09:30').split(':').map(Number);
  const [seh, sem] = (shiftEndTime || '18:30').split(':').map(Number);

  const startMins = sh * 60 + sm;
  let endMins = eh * 60 + em;
  const shiftStart = ssh * 60 + ssm;
  const shiftEnd = seh * 60 + sem;

  const getOverlap = (s1: number, e1: number, s2: number, e2: number): number => {
    const s = Math.max(s1, s2);
    const e = Math.min(e1, e2);
    return e > s ? e - s : 0;
  };

  const [lsh, lsm] = (lunchStartTime || '13:00').split(':').map(Number);
  const [leh, lem] = (lunchEndTime || '14:00').split(':').map(Number);
  const lunchStart = lsh * 60 + lsm;
  const lunchEnd = leh * 60 + lem;

  let inShiftRaw = 0;
  let lunchOverlap = 0;

  if (endMins >= startMins) {
    // Same-day meeting
    inShiftRaw = getOverlap(startMins, endMins, shiftStart, shiftEnd);
    if (enableLunchBreak && inShiftRaw > 0) {
      const inShiftStart = Math.max(startMins, shiftStart);
      const inShiftEnd = Math.min(endMins, shiftEnd);
      lunchOverlap = getOverlap(inShiftStart, inShiftEnd, lunchStart, lunchEnd);
    }
  } else {
    // Overnight meeting crossing midnight
    // Part 1: startMins to 1440 (midnight)
    const p1Shift = getOverlap(startMins, 1440, shiftStart, shiftEnd);
    inShiftRaw += p1Shift;
    if (enableLunchBreak && p1Shift > 0) {
      lunchOverlap += getOverlap(Math.max(startMins, shiftStart), Math.min(1440, shiftEnd), lunchStart, lunchEnd);
    }
    // Part 2: 0 to endMins on the next day
    const p2Shift = getOverlap(0, endMins, shiftStart, shiftEnd);
    inShiftRaw += p2Shift;
    if (enableLunchBreak && p2Shift > 0) {
      lunchOverlap += getOverlap(Math.max(0, shiftStart), Math.min(endMins, shiftEnd), lunchStart, lunchEnd);
    }
  }

  const inShiftWorking = Math.min(durationMinutes, Math.max(0, inShiftRaw - lunchOverlap));
  // Overtime is strictly meeting minutes outside official shift hours (lunch is NOT counted as overtime)
  const overtime = Math.max(0, durationMinutes - inShiftRaw);
  const lunchMinutes = Math.min(durationMinutes, lunchOverlap);

  return { inShiftMinutes: inShiftWorking, overtimeMinutes: overtime, lunchMinutes };
}

interface MeetingTrackerContextType {
  meetings: MeetingRecord[];
  workLogs: WorkRecord[];
  sprints: Sprint[];
  activeSprint: Sprint | null;
  lastActiveSprint: Sprint | null;
  settings: UserSettings;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  addMeeting: (meeting: Omit<MeetingRecord, 'id' | 'totalImpactMinutes'>) => void;
  deleteMeeting: (id: string) => void;
  calculateShiftSplit: (startTime: string, endTime: string, durationMinutes: number) => { inShiftMinutes: number; overtimeMinutes: number; lunchMinutes: number };
  updateMeeting: (id: string, meeting: Partial<MeetingRecord>) => void;
  addWorkLog: (work: Omit<WorkRecord, 'id'>) => void;
  updateWorkLog: (id: string, work: Partial<WorkRecord>) => void;
  addSprint: (sprint: Omit<Sprint, 'id'>) => void;
  updateSprint: (id: string, sprint: Partial<Sprint>) => void;
  deleteSprint: (id: string) => void;
  setActiveSprint: (id: string) => void;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  dailySummaries: DailyKPISummary[];
  todaySummary: DailyKPISummary;
  storageStats: {
    totalBytes: number;
    totalKB: string;
    totalMB: string;
    meetingCount: number;
    sprintCount: number;
    workLogCount: number;
    percentageUsed: number;
  };
  triggerExport: (config: ExportConfig) => void;
  exportAllDataAsJSON: (filename?: string) => void;
  importDataFromJSON: (rawInput: string | AppBackupData, mode?: 'replace' | 'merge') => ImportResult;
  loadBundledBackup: () => Promise<ImportResult>;
  resetToSeedData: () => void;
  clearAllData: () => void;
  clearDataOlderThan: (days: number) => void;
  formatDisplayTime: (timeStr: string) => string;

  // Global Spontaneous Timer State & Controls
  timerRunning: boolean;
  timerSeconds: number;
  timerTitle: string;
  isWidgetMinimized: boolean;
  pendingCompletionMeeting: PendingCompletionMeeting | null;
  startSpontaneousTimer: (initialTitle?: string) => void;
  stopTimer: () => void;
  setTimerTitle: (title: string) => void;
  setWidgetMinimized: (minimized: boolean) => void;
  saveCompletedMeeting: (details: Omit<MeetingRecord, 'id' | 'totalImpactMinutes'>) => void;
  cancelCompletedMeeting: () => void;
  formatTimerDisplay: (sec: number) => string;
}

const MeetingTrackerContext = createContext<MeetingTrackerContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY_MEETINGS = 'meetpulse_meetings_v1';
const LOCAL_STORAGE_KEY_WORK = 'meetpulse_work_v1';
const LOCAL_STORAGE_KEY_SPRINTS = 'meetpulse_sprints_v1';
const LOCAL_STORAGE_KEY_SETTINGS = 'meetpulse_settings_v1';

const sendWindowMode = (mode: 'mini-pill' | 'normal') => {
  if (typeof window !== 'undefined' && (window as any).require) {
    try {
      const { ipcRenderer } = (window as any).require('electron');
      if (ipcRenderer) {
        ipcRenderer.send('set-window-mode', mode);
      }
    } catch (e) {
      console.warn('IPC send window mode error:', e);
    }
  }
};

export const MeetingTrackerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTabState] = useState<TabType>(() => {
    return (localStorage.getItem('meetpulse_active_tab') as TabType) || 'calendar';
  });

  const setActiveTab = (tab: TabType) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('meetpulse_active_tab', tab);
    } catch (e) {}
  };

  // Spontaneous Timer State
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerStartTime, setTimerStartTime] = useState<Date | null>(null);
  const [timerTitle, setTimerTitle] = useState('');
  const [isWidgetMinimized, setIsWidgetMinimized] = useState(false);
  const [pendingCompletionMeeting, setPendingCompletionMeeting] = useState<PendingCompletionMeeting | null>(null);

  useEffect(() => {
    let interval: any = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const startSpontaneousTimer = (initialTitle?: string) => {
    const titleToUse = initialTitle?.trim() || timerTitle.trim() || 'Spontaneous Meeting';
    setTimerTitle(titleToUse);
    setTimerStartTime(new Date());
    setTimerSeconds(0);
    setTimerRunning(true);
    setIsWidgetMinimized(true);
    sendWindowMode('mini-pill');
  };

  const handleSetWidgetMinimized = (minimized: boolean) => {
    setIsWidgetMinimized(minimized);
    sendWindowMode(minimized ? 'mini-pill' : 'normal');
  };

  const stopTimer = () => {
    const now = new Date();
    const startObj = timerStartTime || new Date(now.getTime() - Math.max(1, timerSeconds) * 1000);
    const startTimeStr = format(startObj, 'HH:mm');
    const endTimeStr = format(now, 'HH:mm');
    const startDate = format(startObj, 'yyyy-MM-dd');
    const durationMinutes = Math.max(1, Math.round(timerSeconds / 60));

    setPendingCompletionMeeting({
      startTimeStr,
      endTimeStr,
      durationMinutes,
      startDate,
      title: timerTitle.trim() || 'Spontaneous Meeting',
    });

    setTimerRunning(false);
    setTimerSeconds(0);
    handleSetWidgetMinimized(false);
  };

  const saveCompletedMeeting = (details: Omit<MeetingRecord, 'id' | 'totalImpactMinutes'>) => {
    addMeeting(details);
    setPendingCompletionMeeting(null);
    setTimerTitle('');
  };

  const cancelCompletedMeeting = () => {
    setPendingCompletionMeeting(null);
    setTimerTitle('');
  };

  const formatTimerDisplay = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Helper: Normalize sprint status based on today's date
  const normalizeSprints = (rawSprints: Sprint[], today: string): Sprint[] => {
    return rawSprints.map(s => {
      // If sprint date has passed (endDate < today), automatically mark as COMPLETED
      if (s.endDate < today && s.status === 'ACTIVE') {
        return { ...s, status: 'COMPLETED' as SprintStatus };
      }
      return s;
    });
  };

  // Helper: Automatically map meetings to sprints based on strict date ranges [startDate, endDate]
  const mapMeetingsToSprints = (meetingsList: MeetingRecord[], sprintsList: Sprint[]): MeetingRecord[] => {
    return meetingsList.map(m => {
      // Find sprint that contains m.date
      const matchingSprint = sprintsList.find(s => s.startDate <= m.date && m.date <= s.endDate);
      const resolvedSprintId = matchingSprint ? matchingSprint.id : undefined;
      if (m.sprintId !== resolvedSprintId) {
        return { ...m, sprintId: resolvedSprintId };
      }
      return m;
    });
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Sprints state initialized and normalized
  const [sprints, setSprints] = useState<Sprint[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_SPRINTS);
    const list: Sprint[] = saved ? (() => {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
        return generateSeedSprints();
      }
    })() : generateSeedSprints();
    return normalizeSprints(list, format(new Date(), 'yyyy-MM-dd'));
  });

  // Active Sprint resolution: ongoing sprint that strictly includes today
  const activeSprint = useMemo(() => {
    const ongoing = sprints.find(s => s.startDate <= todayStr && todayStr <= s.endDate);
    return ongoing || null;
  }, [sprints, todayStr]);

  // Last Active Sprint resolution: most recent sprint whose cycle ended before today
  const lastActiveSprint = useMemo(() => {
    const pastSprints = sprints
      .filter(s => s.endDate < todayStr)
      .sort((a, b) => b.endDate.localeCompare(a.endDate));
    return pastSprints[0] || null;
  }, [sprints, todayStr]);

  // Load meetings & work logs from local storage or seed, auto-mapping meetings to sprints by date
  const [meetings, setMeetings] = useState<MeetingRecord[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_MEETINGS);
    let initialMeetings: MeetingRecord[];
    if (saved) {
      try {
        initialMeetings = JSON.parse(saved);
      } catch (e) {
        console.error(e);
        initialMeetings = generateSeedData().meetings;
      }
    } else {
      initialMeetings = generateSeedData().meetings;
    }
    return mapMeetingsToSprints(initialMeetings, sprints);
  });

  // Automatically keep all meetings synchronized with sprints whenever sprints are added, updated, or deleted
  useEffect(() => {
    setMeetings(prev => {
      const remapped = mapMeetingsToSprints(prev, sprints);
      const isChanged = remapped.some((m, idx) => m.sprintId !== prev[idx]?.sprintId);
      return isChanged ? remapped : prev;
    });
  }, [sprints]);

  const [workLogs, setWorkLogs] = useState<WorkRecord[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_WORK);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    const seed = generateSeedData();
    return seed.workLogs;
  });

  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_SETTINGS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...defaultSettings,
          ...parsed,
          trackContextLoss: parsed.trackContextLoss ?? false,
        };
      } catch (e) {
        console.error(e);
      }
    }
    return defaultSettings;
  });

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_MEETINGS, JSON.stringify(meetings));
  }, [meetings]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_WORK, JSON.stringify(workLogs));
  }, [workLogs]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_SPRINTS, JSON.stringify(sprints));
  }, [sprints]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }, [settings]);

  const addSprint = (sprintInput: Omit<Sprint, 'id'>) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    let resolvedStatus: SprintStatus = sprintInput.status;
    // If the sprint endDate has already passed, automatically mark it COMPLETED
    if (sprintInput.endDate < today) {
      resolvedStatus = 'COMPLETED';
    } else if (sprintInput.startDate <= today && today <= sprintInput.endDate && sprintInput.status === 'ACTIVE') {
      resolvedStatus = 'ACTIVE';
    }

    const newSprint: Sprint = {
      ...sprintInput,
      status: resolvedStatus,
      id: `sprint-${Date.now()}`,
    };

    setSprints(prev => {
      let updated: Sprint[];
      if (newSprint.status === 'ACTIVE') {
        updated = prev
          .map(s => (s.status === 'ACTIVE' ? ({ ...s, status: 'COMPLETED' as SprintStatus }) : s))
          .concat(newSprint);
      } else {
        updated = [newSprint, ...prev];
      }
      return normalizeSprints(updated, today);
    });
  };

  const updateSprint = (id: string, updated: Partial<Sprint>) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setSprints(prev => {
      const updatedList = prev.map(s => {
        if (s.id === id) {
          const merged = { ...s, ...updated };
          if (merged.endDate < today && merged.status === 'ACTIVE') {
            merged.status = 'COMPLETED';
          }
          return merged;
        }
        if (updated.status === 'ACTIVE' && s.id !== id && s.status === 'ACTIVE') {
          return { ...s, status: 'COMPLETED' as SprintStatus };
        }
        return s;
      });
      return normalizeSprints(updatedList, today);
    });
  };

  const deleteSprint = (id: string) => {
    setSprints(prev => prev.filter(s => s.id !== id));
  };

  const setActiveSprint = (id: string) => {
    setSprints(prev =>
      prev.map(s => ({
        ...s,
        status: s.id === id ? 'ACTIVE' : s.status === 'ACTIVE' ? 'COMPLETED' : s.status,
      }))
    );
  };

  const addMeeting = (meetingInput: Omit<MeetingRecord, 'id' | 'totalImpactMinutes'>) => {
    const totalImpact = meetingInput.durationMinutes + meetingInput.contextSwitchLossMinutes;
    // Auto-resolve sprintId strictly from meeting date if not explicitly specified
    let resolvedSprintId = meetingInput.sprintId;
    if (!resolvedSprintId) {
      const matched = sprints.find(s => s.startDate <= meetingInput.date && meetingInput.date <= s.endDate);
      resolvedSprintId = matched ? matched.id : undefined;
    }

    const newMeeting: MeetingRecord = {
      ...meetingInput,
      sprintId: resolvedSprintId || undefined,
      id: `m-${Date.now()}`,
      totalImpactMinutes: totalImpact,
    };
    setMeetings(prev => [newMeeting, ...prev]);
  };

  const deleteMeeting = (id: string) => {
    setMeetings(prev => prev.filter(m => m.id !== id));
  };

  const updateMeeting = (id: string, updated: Partial<MeetingRecord>) => {
    setMeetings(prev =>
      prev.map(m => {
        if (m.id === id) {
          const merged = { ...m, ...updated };
          // If date changed and sprintId wasn't explicitly changed, re-evaluate matching sprint by date
          if (updated.date && updated.sprintId === undefined) {
            const matched = sprints.find(s => s.startDate <= merged.date && merged.date <= s.endDate);
            merged.sprintId = matched ? matched.id : undefined;
          }
          merged.totalImpactMinutes = merged.durationMinutes + merged.contextSwitchLossMinutes;
          return merged;
        }
        return m;
      })
    );
  };

  const addWorkLog = (workInput: Omit<WorkRecord, 'id'>) => {
    const newWork: WorkRecord = {
      ...workInput,
      id: `w-${Date.now()}`,
    };
    setWorkLogs(prev => [newWork, ...prev]);
  };

  const updateWorkLog = (id: string, updated: Partial<WorkRecord>) => {
    setWorkLogs(prev => prev.map(w => (w.id === id ? { ...w, ...updated } : w)));
  };

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const clearAllData = () => {
    setMeetings([]);
    setWorkLogs([]);
    setSprints([]);
    localStorage.removeItem(LOCAL_STORAGE_KEY_MEETINGS);
    localStorage.removeItem(LOCAL_STORAGE_KEY_WORK);
    localStorage.removeItem(LOCAL_STORAGE_KEY_SPRINTS);
  };

  const clearDataOlderThan = (days: number) => {
    if (days <= 0) return;
    const cutoffDate = subDays(new Date(), days);
    const cutoffStr = format(cutoffDate, 'yyyy-MM-dd');

    setMeetings(prev => prev.filter(m => m.date >= cutoffStr));
    setWorkLogs(prev => prev.filter(w => w.date >= cutoffStr));
  };

  // Full System Export (JSON format)
  const exportAllDataAsJSON = (customFilename?: string) => {
    const backup: AppBackupData = {
      version: '1.0',
      exportTimestamp: new Date().toISOString(),
      appName: 'MeetPulse Desktop',
      meetings,
      workLogs,
      sprints,
      settings,
      activeTab,
    };

    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dateStr = format(new Date(), 'yyyy-MM-dd_HH-mm');
    const filename = customFilename || `meetpulse-backup-${dateStr}.json`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Full System Import / Restore (JSON format)
  const importDataFromJSON = (
    rawInput: string | AppBackupData,
    mode: 'replace' | 'merge' = 'replace'
  ): ImportResult => {
    try {
      let parsed: any;
      if (typeof rawInput === 'string') {
        parsed = JSON.parse(rawInput);
      } else {
        parsed = rawInput;
      }

      if (!parsed || typeof parsed !== 'object') {
        return {
          success: false,
          message: 'Invalid backup: JSON must be an object.',
          importedMeetings: 0,
          importedSprints: 0,
          importedWorkLogs: 0,
          updatedSettings: false,
        };
      }

      const importedMeetingsRaw: MeetingRecord[] = Array.isArray(parsed.meetings) ? parsed.meetings : [];
      const importedSprintsRaw: Sprint[] = Array.isArray(parsed.sprints) ? parsed.sprints : [];
      const importedWorkLogsRaw: WorkRecord[] = Array.isArray(parsed.workLogs) ? parsed.workLogs : [];
      const importedSettings: UserSettings | undefined = parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : undefined;

      const today = format(new Date(), 'yyyy-MM-dd');
      let finalSprints: Sprint[];
      let finalMeetings: MeetingRecord[];
      let finalWorkLogs: WorkRecord[];

      if (mode === 'replace') {
        finalSprints = normalizeSprints(importedSprintsRaw, today);
        finalMeetings = mapMeetingsToSprints(importedMeetingsRaw, finalSprints);
        finalWorkLogs = importedWorkLogsRaw;
        if (importedSettings) {
          const mergedSettings = { ...defaultSettings, ...importedSettings };
          setSettings(mergedSettings);
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY_SETTINGS, JSON.stringify(mergedSettings));
          } catch (e) {}
        }
      } else {
        // Merge mode
        const existingSprintIds = new Set(sprints.map(s => s.id));
        const existingSprintNames = new Set(sprints.map(s => s.name.toLowerCase()));
        const mergedSprints = [...sprints];
        importedSprintsRaw.forEach(s => {
          if (!existingSprintIds.has(s.id) && !existingSprintNames.has(s.name.toLowerCase())) {
            mergedSprints.push(s);
            existingSprintIds.add(s.id);
          }
        });
        finalSprints = normalizeSprints(mergedSprints, today);

        const existingMeetingIds = new Set(meetings.map(m => m.id));
        const existingMeetingKey = new Set(meetings.map(m => `${m.date}_${m.startTime}_${m.title.toLowerCase()}`));
        const mergedMeetings = [...meetings];
        importedMeetingsRaw.forEach(m => {
          const key = `${m.date}_${m.startTime}_${m.title.toLowerCase()}`;
          if (!existingMeetingIds.has(m.id) && !existingMeetingKey.has(key)) {
            mergedMeetings.push(m);
            existingMeetingIds.add(m.id);
          }
        });
        finalMeetings = mapMeetingsToSprints(mergedMeetings, finalSprints);

        const existingWorkIds = new Set(workLogs.map(w => w.id));
        const existingWorkDates = new Set(workLogs.map(w => w.date));
        const mergedWork = [...workLogs];
        importedWorkLogsRaw.forEach(w => {
          if (!existingWorkIds.has(w.id) && !existingWorkDates.has(w.date)) {
            mergedWork.push(w);
            existingWorkIds.add(w.id);
          }
        });
        finalWorkLogs = mergedWork;

        if (importedSettings) {
          setSettings(prev => {
            const merged = { ...prev, ...importedSettings };
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY_SETTINGS, JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
        }
      }

      // Save directly to localStorage immediately
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY_SPRINTS, JSON.stringify(finalSprints));
        localStorage.setItem(LOCAL_STORAGE_KEY_MEETINGS, JSON.stringify(finalMeetings));
        localStorage.setItem(LOCAL_STORAGE_KEY_WORK, JSON.stringify(finalWorkLogs));
      } catch (e) {
        console.error('Error persisting to localStorage:', e);
      }

      // Update state
      setSprints(finalSprints);
      setMeetings(finalMeetings);
      setWorkLogs(finalWorkLogs);

      if (parsed.activeTab && typeof parsed.activeTab === 'string') {
        setActiveTab(parsed.activeTab as TabType);
      }

      return {
        success: true,
        message: `Successfully restored ${importedMeetingsRaw.length} meetings, ${importedSprintsRaw.length} sprints, and ${importedWorkLogsRaw.length} work records (${mode === 'replace' ? 'Complete Replacement' : 'Merged with Existing'}).`,
        importedMeetings: importedMeetingsRaw.length,
        importedSprints: importedSprintsRaw.length,
        importedWorkLogs: importedWorkLogsRaw.length,
        updatedSettings: !!importedSettings,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to import data: ${err.message || 'Invalid JSON syntax'}`,
        importedMeetings: 0,
        importedSprints: 0,
        importedWorkLogs: 0,
        updatedSettings: false,
      };
    }
  };

  // Automated loader for bundled repository backup (meetpulse-backup.json)
  const loadBundledBackup = async (): Promise<ImportResult> => {
    try {
      let jsonText = '';

      // 1. Try fetching from web/Vite public assets
      try {
        const pathsToTry = ['./meetpulse-backup.json', '/meetpulse-backup.json', 'meetpulse-backup.json'];
        for (const p of pathsToTry) {
          const res = await fetch(p);
          if (res.ok) {
            jsonText = await res.text();
            if (jsonText.includes('meetings')) break;
          }
        }
      } catch (e) {
        // Fetch failed in Electron file:// protocol or offline
      }

      // 2. Try Node.js fs if running in Electron
      if (!jsonText && typeof window !== 'undefined' && (window as any).require) {
        try {
          const fs = (window as any).require('fs');
          const path = (window as any).require('path');
          const possiblePaths = [
            path.resolve(__dirname, '../meetpulse-backup.json'),
            path.resolve(__dirname, './meetpulse-backup.json'),
            path.resolve(__dirname, '../public/meetpulse-backup.json'),
            path.join(process.cwd(), 'meetpulse-backup.json'),
            path.join(process.cwd(), 'public/meetpulse-backup.json'),
          ];
          for (const cand of possiblePaths) {
            if (fs.existsSync(cand)) {
              jsonText = fs.readFileSync(cand, 'utf-8');
              break;
            }
          }
        } catch (e) {
          console.warn('Node fs fallback error:', e);
        }
      }

      if (!jsonText) {
        return {
          success: false,
          message: 'Could not auto-locate meetpulse-backup.json. Please use the "Choose Backup File" button to select your backup JSON file.',
          importedMeetings: 0,
          importedSprints: 0,
          importedWorkLogs: 0,
          updatedSettings: false,
        };
      }

      return importDataFromJSON(jsonText, 'replace');
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to load bundled backup: ${err.message || 'Unknown error'}`,
        importedMeetings: 0,
        importedSprints: 0,
        importedWorkLogs: 0,
        updatedSettings: false,
      };
    }
  };

  const resetToSeedData = () => {
    const seed = generateSeedData();
    setMeetings(seed.meetings);
    setWorkLogs(seed.workLogs);
    setSprints(seed.sprints);
    setSettings(defaultSettings);
  };

  // Helper to calculate meeting hours split into in-shift vs overtime/non-working hours
  const calculateShiftSplit = (startTime: string, endTime: string, durationMinutes: number) => {
    return calculateMeetingShiftSplit(
      startTime,
      endTime,
      durationMinutes,
      settings.shiftStartTime || '09:30',
      settings.shiftEndTime || '18:30',
      settings.enableLunchBreak ?? true,
      settings.lunchStartTime || '13:00',
      settings.lunchEndTime || '14:00'
    );
  };

  // Compute Daily Summaries
  const dailySummaries = useMemo<DailyKPISummary[]>(() => {
    const dateSet = new Set<string>();
    meetings.forEach(m => dateSet.add(m.date));
    workLogs.forEach(w => dateSet.add(w.date));
    dateSet.add(format(new Date(), 'yyyy-MM-dd'));

    const sortedDates = Array.from(dateSet).sort((a, b) => b.localeCompare(a));

    return sortedDates.map(dateStr => {
      const dayMeetings = meetings.filter(m => m.date === dateStr);
      const dayWork = workLogs.find(w => w.date === dateStr);

      const totalMeetingsCount = dayMeetings.length;
      const totalDirectMinutes = dayMeetings.reduce((acc, m) => acc + m.durationMinutes, 0);
      const totalLostMinutes = settings.trackContextLoss
        ? dayMeetings.reduce((acc, m) => acc + (m.contextSwitchLossMinutes || 0), 0)
        : 0;
      const totalImpactMinutes = totalDirectMinutes + totalLostMinutes;

      // In-Shift vs Overtime calculations
      let inShiftMins = 0;
      let overtimeMins = 0;
      let lunchMins = 0;
      dayMeetings.forEach(m => {
        const split = calculateMeetingShiftSplit(
          m.startTime,
          m.endTime,
          m.durationMinutes,
          settings.shiftStartTime || '09:30',
          settings.shiftEndTime || '18:30',
          settings.enableLunchBreak ?? true,
          settings.lunchStartTime || '13:00',
          settings.lunchEndTime || '14:00'
        );
        inShiftMins += split.inShiftMinutes;
        overtimeMins += split.overtimeMinutes;
        lunchMins += split.lunchMinutes;
      });

      const inShiftMeetingHours = Number((inShiftMins / 60).toFixed(2));
      const overtimeMeetingHours = Number((overtimeMins / 60).toFixed(2));
      const lunchMeetingHours = Number((lunchMins / 60).toFixed(2));

      const totalDirectMeetingHours = Number((totalDirectMinutes / 60).toFixed(2));
      const totalTimeLostHours = Number((totalLostMinutes / 60).toFixed(2));
      const totalMeetingImpactHours = Number((totalImpactMinutes / 60).toFixed(2));

      // Calculate working hours: when shift tracking is enabled, official working hours = shift duration minus lunch break
      let workingHours = settings.workingHoursPerDay || 8.0;
      if (settings.enableShiftTracking) {
        const [ssh, ssm] = (settings.shiftStartTime || '09:30').split(':').map(Number);
        const [seh, sem] = (settings.shiftEndTime || '18:30').split(':').map(Number);
        const sStart = ssh * 60 + ssm;
        const sEnd = seh * 60 + sem;
        const shiftDuration = sEnd >= sStart ? sEnd - sStart : (1440 - sStart) + sEnd;

        let lunchDuration = 0;
        if (settings.enableLunchBreak !== false) {
          const [lsh, lsm] = (settings.lunchStartTime || '13:00').split(':').map(Number);
          const [leh, lem] = (settings.lunchEndTime || '14:00').split(':').map(Number);
          const lStart = lsh * 60 + lsm;
          const lEnd = leh * 60 + lem;
          lunchDuration = lEnd >= lStart ? lEnd - lStart : (1440 - lStart) + lEnd;
        }

        const netWorkingMins = Math.max(60, shiftDuration - lunchDuration);
        workingHours = Number((netWorkingMins / 60).toFixed(2));
      }

      const availableFocusHours = Math.max(0, Number((workingHours - totalMeetingImpactHours).toFixed(2)));

      const targetFocusHours = dayWork ? dayWork.targetFocusHours : settings.defaultTargetFocusHours;
      const actualWorkHours = dayWork ? dayWork.actualWorkHours : 0;

      const targetAchievementPercentage = targetFocusHours > 0 
        ? Math.min(100, Math.round((actualWorkHours / targetFocusHours) * 100))
        : 0;

      const meetingRatio = Math.min(1, totalMeetingImpactHours / workingHours);
      const disruptionIndex = Math.min(100, Math.round(meetingRatio * 100));

      return {
        date: dateStr,
        totalMeetingsCount,
        totalDirectMeetingHours,
        totalTimeLostHours,
        totalMeetingImpactHours,
        availableFocusHours,
        actualWorkHours,
        targetFocusHours,
        targetAchievementPercentage,
        disruptionIndex,
        inShiftMeetingHours,
        overtimeMeetingHours,
        lunchMeetingHours,
      };
    });
  }, [meetings, workLogs, settings]);

  const todaySummary = useMemo(() => {
    return (
      dailySummaries.find(s => s.date === todayStr) || {
        date: todayStr,
        totalMeetingsCount: 0,
        totalDirectMeetingHours: 0,
        totalTimeLostHours: 0,
        totalMeetingImpactHours: 0,
        availableFocusHours: settings.workingHoursPerDay,
        actualWorkHours: 0,
        targetFocusHours: settings.defaultTargetFocusHours,
        targetAchievementPercentage: 0,
        disruptionIndex: 0,
        inShiftMeetingHours: 0,
        overtimeMeetingHours: 0,
        lunchMeetingHours: 0,
      }
    );
  }, [dailySummaries, todayStr, settings]);

  const storageStats = useMemo(() => {
    const meetingsStr = JSON.stringify(meetings);
    const workStr = JSON.stringify(workLogs);
    const sprintsStr = JSON.stringify(sprints);
    const settingsStr = JSON.stringify(settings);

    const totalBytes = new Blob([meetingsStr + workStr + sprintsStr + settingsStr]).size;
    const totalKB = (totalBytes / 1024).toFixed(2);
    const totalMB = (totalBytes / (1024 * 1024)).toFixed(3);
    const percentageUsed = Math.min(100, Number(((totalBytes / (5 * 1024 * 1024)) * 100).toFixed(2)));

    return {
      totalBytes,
      totalKB,
      totalMB,
      meetingCount: meetings.length,
      sprintCount: sprints.length,
      workLogCount: workLogs.length,
      percentageUsed,
    };
  }, [meetings, workLogs, sprints, settings]);

  const formatDisplayTime = (timeStr: string) => {
    if (!timeStr) return '';
    if (settings.timeFormat === '24h') return timeStr;

    try {
      const [hStr, mStr] = timeStr.split(':');
      let hours = parseInt(hStr, 10);
      const minutes = parseInt(mStr, 10);
      if (isNaN(hours) || isNaN(minutes)) return timeStr;

      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const formattedMins = minutes < 10 ? `0${minutes}` : minutes;
      return `${hours}:${formattedMins} ${ampm}`;
    } catch (e) {
      return timeStr;
    }
  };

  const triggerExport = (config: ExportConfig) => {
    exportRecordsToFormat(meetings, workLogs, dailySummaries, config, sprints, settings.trackContextLoss);
  };

  return (
    <MeetingTrackerContext.Provider
      value={{
        meetings,
        workLogs,
        sprints,
        activeSprint,
        lastActiveSprint,
        settings,
        activeTab,
        setActiveTab,
        addMeeting,
        deleteMeeting,
        updateMeeting,
        addWorkLog,
        updateWorkLog,
        addSprint,
        updateSprint,
        deleteSprint,
        setActiveSprint,
        updateSettings,
        dailySummaries,
        todaySummary,
        storageStats,
        triggerExport,
        exportAllDataAsJSON,
        importDataFromJSON,
        loadBundledBackup,
        resetToSeedData,
        clearAllData,
        clearDataOlderThan,
        formatDisplayTime,
        calculateShiftSplit,

        // Timer context values
        timerRunning,
        timerSeconds,
        timerTitle,
        isWidgetMinimized,
        pendingCompletionMeeting,
        startSpontaneousTimer,
        stopTimer,
        setTimerTitle,
        setWidgetMinimized: handleSetWidgetMinimized,
        saveCompletedMeeting,
        cancelCompletedMeeting,
        formatTimerDisplay,
      }}
    >
      {children}
    </MeetingTrackerContext.Provider>
  );
};

export const useMeetingTracker = () => {
  const context = useContext(MeetingTrackerContext);
  if (!context) {
    throw new Error('useMeetingTracker must be used within a MeetingTrackerProvider');
  }
  return context;
};

