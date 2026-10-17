import React, { useState, useMemo, useRef } from 'react';
import { useMeetingTracker } from '../context/MeetingTrackerContext';
import { AppBackupData } from '../types';
import {
  Settings,
  RefreshCw,
  Save,
  ShieldAlert,
  Sliders,
  Trash2,
  HardDrive,
  Clock,
  Calendar,
  Sparkles,
  UtensilsCrossed,
  Download,
  Upload,
  FileJson,
  Copy,
  Check,
  Laptop,
  ArrowRightLeft,
  AlertCircle,
  CheckCircle2,
  FolderUp,
  FileCheck,
  X,
  FileText,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    resetToSeedData,
    clearAllData,
    clearDataOlderThan,
    storageStats,
    exportAllDataAsJSON,
    importDataFromJSON,
    loadBundledBackup,
    meetings,
    sprints,
    workLogs,
  } = useMeetingTracker();

  // Migration & Backup State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedBackup, setParsedBackup] = useState<AppBackupData | null>(null);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isLoadingBundled, setIsLoadingBundled] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteContent, setPasteContent] = useState('');

  const [trackContextLoss, setTrackContextLoss] = useState<boolean>(settings.trackContextLoss ?? false);
  const [trackDeepWorkFocus, setTrackDeepWorkFocus] = useState<boolean>(settings.trackDeepWorkFocus ?? true);
  const [enableShiftTracking, setEnableShiftTracking] = useState<boolean>(settings.enableShiftTracking ?? true);
  const [shiftStartTime, setShiftStartTime] = useState<string>(settings.shiftStartTime || '09:30');
  const [shiftEndTime, setShiftEndTime] = useState<string>(settings.shiftEndTime || '18:30');
  const [enableLunchBreak, setEnableLunchBreak] = useState<boolean>(settings.enableLunchBreak ?? true);
  const [lunchStartTime, setLunchStartTime] = useState<string>(settings.lunchStartTime || '13:00');
  const [lunchEndTime, setLunchEndTime] = useState<string>(settings.lunchEndTime || '14:00');
  const [contextLoss, setContextLoss] = useState(settings.defaultContextLossMinutes);
  const [workingHours, setWorkingHours] = useState(settings.workingHoursPerDay);
  const [targetFocus, setTargetFocus] = useState(settings.defaultTargetFocusHours);
  const [retentionDays, setRetentionDays] = useState(settings.dataRetentionDays || 0);
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>(settings.timeFormat || '12h');

  // Compute shift duration and net working hours preview
  const { shiftTotalHours, lunchDurationHours, netWorkingHours } = useMemo(() => {
    const [sh, sm] = (shiftStartTime || '09:30').split(':').map(Number);
    const [eh, em] = (shiftEndTime || '18:30').split(':').map(Number);
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    const shiftMins = end >= start ? end - start : (1440 - start) + end;

    let lunchMins = 0;
    if (enableLunchBreak && lunchStartTime && lunchEndTime) {
      const [lsh, lsm] = lunchStartTime.split(':').map(Number);
      const [leh, lem] = lunchEndTime.split(':').map(Number);
      const lStart = lsh * 60 + lsm;
      const lEnd = leh * 60 + lem;
      lunchMins = lEnd >= lStart ? lEnd - lStart : (1440 - lStart) + lEnd;
    }

    const netMins = Math.max(0, shiftMins - lunchMins);

    return {
      shiftTotalHours: (shiftMins / 60).toFixed(1),
      lunchDurationHours: (lunchMins / 60).toFixed(1),
      netWorkingHours: (netMins / 60).toFixed(1),
    };
  }, [shiftStartTime, shiftEndTime, enableLunchBreak, lunchStartTime, lunchEndTime]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      trackContextLoss,
      trackDeepWorkFocus,
      enableShiftTracking,
      shiftStartTime,
      shiftEndTime,
      enableLunchBreak,
      lunchStartTime,
      lunchEndTime,
      defaultContextLossMinutes: Number(contextLoss),
      workingHoursPerDay: Number(workingHours),
      defaultTargetFocusHours: Number(targetFocus),
      dataRetentionDays: Number(retentionDays),
      timeFormat,
    });
    alert('Settings and preferences saved successfully!');
  };

  const handleReset = () => {
    if (confirm('Reset all records to standard 14-day sample seed dataset?')) {
      resetToSeedData();
    }
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to CLEAR ALL local meeting records, work logs, and sprints? This action cannot be undone.')) {
      clearAllData();
      alert('All local database records have been completely cleared.');
    }
  };

  const handlePurgeOlderThan = () => {
    if (retentionDays <= 0) {
      alert('Please select a valid retention period (e.g. 30, 60, or 90 days) to purge older records.');
      return;
    }
    if (confirm(`Purge all meeting logs and work records older than ${retentionDays} days?`)) {
      clearDataOlderThan(retentionDays);
      alert(`Records older than ${retentionDays} days have been purged.`);
    }
  };

  // Migration & Backup Handlers
  const handleExportBackup = () => {
    exportAllDataAsJSON();
    setImportStatus({
      type: 'success',
      message: 'Full backup JSON downloaded! Save this file to transfer to your new laptop.',
    });
  };

  const handleCopyBackup = async () => {
    try {
      const backup: AppBackupData = {
        version: '1.0',
        exportTimestamp: new Date().toISOString(),
        appName: 'MeetPulse Desktop',
        meetings,
        workLogs,
        sprints,
        settings,
      };
      await navigator.clipboard.writeText(JSON.stringify(backup, null, 2));
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
      setImportStatus({
        type: 'success',
        message: 'Complete backup JSON copied to your clipboard!',
      });
    } catch (e) {
      alert('Failed to copy to clipboard. Please use Export Backup (.json) instead.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('File does not contain a valid JSON object.');
        }
        setParsedBackup(parsed);
        setImportStatus(null);
      } catch (err: any) {
        setParsedBackup(null);
        setImportStatus({
          type: 'error',
          message: `Invalid backup JSON file: ${err.message || 'Syntax error'}`,
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleApplyImport = (mode: 'replace' | 'merge') => {
    if (!parsedBackup) return;
    const res = importDataFromJSON(parsedBackup, mode);
    if (res.success) {
      setImportStatus({ type: 'success', message: res.message });
      setParsedBackup(null);
      setImportFileName('');
      // Sync local form state if settings changed
      if (parsedBackup.settings) {
        const s = parsedBackup.settings;
        if (s.trackContextLoss !== undefined) setTrackContextLoss(s.trackContextLoss);
        if (s.trackDeepWorkFocus !== undefined) setTrackDeepWorkFocus(s.trackDeepWorkFocus);
        if (s.enableShiftTracking !== undefined) setEnableShiftTracking(s.enableShiftTracking);
        if (s.shiftStartTime) setShiftStartTime(s.shiftStartTime);
        if (s.shiftEndTime) setShiftEndTime(s.shiftEndTime);
        if (s.enableLunchBreak !== undefined) setEnableLunchBreak(s.enableLunchBreak);
        if (s.lunchStartTime) setLunchStartTime(s.lunchStartTime);
        if (s.lunchEndTime) setLunchEndTime(s.lunchEndTime);
        if (s.defaultContextLossMinutes !== undefined) setContextLoss(s.defaultContextLossMinutes);
        if (s.workingHoursPerDay !== undefined) setWorkingHours(s.workingHoursPerDay);
        if (s.defaultTargetFocusHours !== undefined) setTargetFocus(s.defaultTargetFocusHours);
        if (s.dataRetentionDays !== undefined) setRetentionDays(s.dataRetentionDays);
        if (s.timeFormat) setTimeFormat(s.timeFormat);
      }
    } else {
      setImportStatus({ type: 'error', message: res.message });
    }
  };

  const handleLoadBundledRepoBackup = async () => {
    setIsLoadingBundled(true);
    setImportStatus(null);
    try {
      const res = await loadBundledBackup();
      if (res.success) {
        setImportStatus({ type: 'success', message: res.message });
        setParsedBackup(null);
      } else {
        setImportStatus({ type: 'error', message: res.message });
      }
    } finally {
      setIsLoadingBundled(false);
    }
  };

  const handlePasteSubmit = () => {
    try {
      const parsed = JSON.parse(pasteContent);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Pasted content is not a valid JSON object');
      }
      setParsedBackup(parsed);
      setImportFileName('pasted-backup.json');
      setShowPasteModal(false);
      setPasteContent('');
      setImportStatus(null);
    } catch (err: any) {
      alert(`Invalid JSON format: ${err.message}`);
    }
  };

  return (
    <div className="p-6 space-y-6 w-full h-full flex flex-col flex-1 overflow-y-auto">
      {/* Header */}
      <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-400" />
          <span>Application Settings & Algorithm Preferences</span>
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Customize context switching lost time parameters, deep work focus bandwidth, official shift hours, and data retention timelines.
        </p>
      </div>

      {/* Storage Footprint Breakdown */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-4 text-xs">
        <h3 className="font-bold text-sm text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <HardDrive className="w-4 h-4 text-cyan-400" />
          <span>Local Storage Footprint & Capacity Usage</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-1">
            <span className="text-slate-400 text-[11px]">Storage Consumption</span>
            <div className="text-xl font-bold text-cyan-400">{storageStats.totalKB} KB</div>
            <p className="text-[10px] text-slate-500">{storageStats.totalBytes} bytes stored locally</p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-1">
            <span className="text-slate-400 text-[11px]">Storage Quota Used</span>
            <div className="text-xl font-bold text-indigo-400">{storageStats.percentageUsed}%</div>
            <p className="text-[10px] text-slate-500">of 5.0 MB browser storage quota</p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-1">
            <span className="text-slate-400 text-[11px]">Total Records Stored</span>
            <div className="text-xl font-bold text-emerald-400">
              {storageStats.meetingCount + storageStats.workLogCount + storageStats.sprintCount}
            </div>
            <p className="text-[10px] text-slate-500">
              {storageStats.meetingCount} meetings • {storageStats.sprintCount} sprints • {storageStats.workLogCount} work logs
            </p>
          </div>
        </div>
      </div>

      {/* Import / Export Status Alert */}
      {importStatus && (
        <div
          className={`p-4 rounded-2xl border flex items-start justify-between gap-3 text-xs transition-all animate-fadeIn ${
            importStatus.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {importStatus.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">{importStatus.message}</p>
            </div>
          </div>
          <button
            onClick={() => setImportStatus(null)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Laptop Migration & Data Backup Section */}
      <div className="bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-indigo-950/20 border border-indigo-500/30 p-6 rounded-2xl space-y-5 text-xs shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Laptop className="w-4 h-4 text-indigo-400" />
              <span>Laptop Data Transfer & Full Backup (Export / Import)</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Switching laptops? Export all your stored meetings, sprints, and custom parameters into a single portable backup file, and import it on your new laptop with 1 click.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-semibold text-[11px] flex items-center gap-1.5">
              <FileJson className="w-3.5 h-3.5 text-indigo-400" />
              <span>JSON Backup Engine</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Export Box */}
          <div className="bg-slate-950/80 border border-slate-800/80 p-5 rounded-xl flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white font-bold">
                <Download className="w-4 h-4 text-cyan-400" />
                <span>Export Local Data (Transfer Out)</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Downloads a clean JSON file containing all <strong className="text-slate-200">{storageStats.meetingCount} meetings</strong>, <strong className="text-slate-200">{storageStats.sprintCount} sprints</strong>, and your configured shift and algorithm settings.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-md active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Backup (.json)</span>
              </button>

              <button
                type="button"
                onClick={handleCopyBackup}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-all active:scale-95"
                title="Copy entire database JSON to clipboard"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{isCopied ? 'Copied to Clipboard!' : 'Copy JSON'}</span>
              </button>
            </div>
          </div>

          {/* Import Box */}
          <div className="bg-slate-950/80 border border-slate-800/80 p-5 rounded-xl flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white font-bold">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Import Data (Transfer In)</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Restore data from a JSON backup file or automatically load the bundled repository backup file (<code className="text-indigo-300 font-mono">meetpulse-backup.json</code>).
              </p>
            </div>

            {/* Hidden native file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".json,application/json"
              className="hidden"
            />

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md active:scale-95"
              >
                <FolderUp className="w-3.5 h-3.5" />
                <span>Choose Backup File (.json)</span>
              </button>

              <button
                type="button"
                onClick={handleLoadBundledRepoBackup}
                disabled={isLoadingBundled}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-semibold text-xs border border-indigo-500/30 transition-all active:scale-95 disabled:opacity-50"
                title="Quickly restore bundled meetpulse-backup.json from the cloned repo"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>{isLoadingBundled ? 'Loading...' : 'Load Repo Backup'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPasteModal(true)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs border border-slate-700 transition-all active:scale-95"
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Paste Text</span>
              </button>
            </div>
          </div>
        </div>

        {/* Parsed Backup Inspection & Import Action Card */}
        {parsedBackup && (
          <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/40 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-indigo-300 text-xs">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>Ready to Import: {importFileName || 'Backup Dataset'}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setParsedBackup(null);
                  setImportFileName('');
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-1 text-center">
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                <div className="text-base font-bold text-emerald-400">
                  {parsedBackup.meetings?.length || 0}
                </div>
                <div className="text-[10px] text-slate-400">Meetings Detected</div>
              </div>

              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                <div className="text-base font-bold text-indigo-400">
                  {parsedBackup.sprints?.length || 0}
                </div>
                <div className="text-[10px] text-slate-400">Sprints Detected</div>
              </div>

              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                <div className="text-base font-bold text-cyan-400">
                  {parsedBackup.workLogs?.length || 0}
                </div>
                <div className="text-[10px] text-slate-400">Work Logs Detected</div>
              </div>

              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                <div className="text-base font-bold text-amber-400">
                  {parsedBackup.settings ? 'Yes' : 'No'}
                </div>
                <div className="text-[10px] text-slate-400">Custom Settings</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-indigo-500/20">
              <button
                type="button"
                onClick={() => handleApplyImport('replace')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md active:scale-95"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Replace All Local Data (Recommended for New Laptop)</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyImport('merge')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all active:scale-95"
              >
                <span>Merge with Existing Records</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setParsedBackup(null);
                  setImportFileName('');
                }}
                className="px-3 py-2 text-slate-400 hover:text-slate-200 text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Paste Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Paste Backup JSON Directly</span>
              </div>
              <button
                onClick={() => setShowPasteModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-2">
                Paste the exported JSON text below to parse and restore your data:
              </p>
              <textarea
                value={pasteContent}
                onChange={e => setPasteContent(e.target.value)}
                placeholder='{"version": "1.0", "meetings": [...], ...}'
                className="w-full h-44 bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium text-xs hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePasteSubmit}
                disabled={!pasteContent.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs disabled:opacity-50"
              >
                Parse & Inspect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSave} className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-5 text-xs">
        <h3 className="font-bold text-sm text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <span>Productivity & Data Retention Parameters</span>
        </h3>

        {/* Deep Work Focus Toggle Card */}
        <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <label htmlFor="deep-work-toggle" className="text-xs font-bold text-white cursor-pointer select-none flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Track Deep Work Focus (Capacity Bandwidth)</span>
              </label>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${trackDeepWorkFocus ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                {trackDeepWorkFocus ? 'ENABLED' : 'DISABLED (HIDDEN)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              When enabled, calculates and displays Available Deep Work bandwidth, daily focus capacity ratios, and target achievements. When disabled, focus cards and charts hide this metric to streamline the interface.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              id="deep-work-toggle"
              type="checkbox"
              checked={trackDeepWorkFocus}
              onChange={e => setTrackDeepWorkFocus(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        {/* Shift Hours & Overtime Tracking Card */}
        <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <label htmlFor="shift-tracking-toggle" className="text-xs font-bold text-white cursor-pointer select-none flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Shift Hours & Overtime Meeting Tracking</span>
                </label>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${enableShiftTracking ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-800 text-slate-400'}`}>
                  {enableShiftTracking ? 'ENABLED' : 'DISABLED (HIDDEN)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Define official shift start/end hours. MeetPulse will automatically calculate meeting hours within working hours vs overtime / non-working hours (including late-night sessions).
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                id="shift-tracking-toggle"
                type="checkbox"
                checked={enableShiftTracking}
                onChange={e => setEnableShiftTracking(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
            </label>
          </div>

          {enableShiftTracking && (
            <div className="pt-3 border-t border-slate-800/80 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Shift Start Time
                  </label>
                  <input
                    type="time"
                    value={shiftStartTime}
                    onChange={e => setShiftStartTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-cyan-300 font-bold p-2.5 rounded-xl focus:border-cyan-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Shift End Time
                  </label>
                  <input
                    type="time"
                    value={shiftEndTime}
                    onChange={e => setShiftEndTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-cyan-300 font-bold p-2.5 rounded-xl focus:border-cyan-500 focus:outline-none font-mono"
                  />
                </div>

                <div className="p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-cyan-300">
                  <span className="text-[11px] font-bold block">Official Shift: {shiftTotalHours}h</span>
                  <span className="text-[10px] text-cyan-400/80">
                    Net Working: <strong className="text-white">{netWorkingHours}h</strong>
                    {enableLunchBreak ? ` • Lunch: ${lunchDurationHours}h` : ''}
                  </span>
                </div>
              </div>

              {/* Lunch Time Configuration */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-semibold text-slate-200">Lunch Time (Excluded from Shift Working Hours)</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={enableLunchBreak}
                      onChange={e => setEnableLunchBreak(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                {enableLunchBreak && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    <div>
                      <label className="block text-slate-400 text-[11px] font-medium mb-1">
                        Lunch Start Time
                      </label>
                      <input
                        type="time"
                        value={lunchStartTime}
                        onChange={e => setLunchStartTime(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-amber-300 font-bold p-2 rounded-lg focus:border-amber-500 focus:outline-none font-mono text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 text-[11px] font-medium mb-1">
                        Lunch End Time
                      </label>
                      <input
                        type="time"
                        value={lunchEndTime}
                        onChange={e => setLunchEndTime(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-amber-300 font-bold p-2 rounded-lg focus:border-amber-500 focus:outline-none font-mono text-xs"
                      />
                    </div>

                    <p className="text-[10px] text-slate-500 col-span-full">
                      Lunch duration ({lunchDurationHours}h) is automatically subtracted from official shift hours. Any meetings scheduled during lunch time will not count toward shift working hours.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Context Switching Loss Toggle Card */}
        <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <label htmlFor="context-loss-toggle" className="text-xs font-bold text-white cursor-pointer select-none">
                Track Context Switching Loss (Recovery Overhead)
              </label>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${trackContextLoss ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-slate-800 text-slate-400'}`}>
                {trackContextLoss ? 'ENABLED' : 'DISABLED (HIDDEN)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              When disabled, all context switching lost time metrics, recovery overhead badges, and loss charts are hidden across the application.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              id="context-loss-toggle"
              type="checkbox"
              checked={trackContextLoss}
              onChange={e => setTrackContextLoss(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trackContextLoss ? (
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Default Context Switching Loss Overhead (Minutes)
              </label>
              <input
                type="number"
                min={0}
                max={120}
                value={contextLoss}
                onChange={e => setContextLoss(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 text-rose-400 font-bold p-3 rounded-xl focus:border-rose-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Standard focus recovery time lost per meeting disruption (default 15-20m).
              </p>
            </div>
          ) : (
            <div className="opacity-50 pointer-events-none p-3.5 rounded-xl border border-dashed border-slate-800 bg-slate-950/40">
              <span className="text-slate-400 text-xs font-semibold block">Context Loss Tracking is Disabled</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Focus is computed solely on direct meeting durations.</p>
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Standard Daily Working Hours
            </label>
            <input
              type="number"
              step="0.5"
              min={4}
              max={16}
              value={workingHours}
              onChange={e => setWorkingHours(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 text-white font-bold p-3 rounded-xl focus:border-indigo-500 focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Total available workday bandwidth (default 8.0 hrs).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Default Daily Target Focus Hours
            </label>
            <input
              type="number"
              step="0.5"
              min={1}
              max={12}
              value={targetFocus}
              onChange={e => setTargetFocus(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 text-emerald-400 font-bold p-3 rounded-xl focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Data Retention / Clear Timeline
            </label>
            <select
              value={retentionDays}
              onChange={e => setRetentionDays(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 text-indigo-300 font-bold p-3 rounded-xl focus:border-indigo-500 focus:outline-none cursor-pointer"
            >
              <option value={0}>Manual / Infinite (Keep all history)</option>
              <option value={30}>Auto-Clear records older than 30 Days</option>
              <option value={60}>Auto-Clear records older than 60 Days</option>
              <option value={90}>Auto-Clear records older than 90 Days</option>
              <option value={365}>Auto-Clear records older than 1 Year</option>
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Set automated timeline policy for cleaning up old meeting logs.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Time Display Format (12h / 24h)
            </label>
            <select
              value={timeFormat}
              onChange={e => setTimeFormat(e.target.value as '12h' | '24h')}
              className="w-full bg-slate-950 border border-slate-700 text-cyan-300 font-bold p-3 rounded-xl focus:border-cyan-500 focus:outline-none cursor-pointer"
            >
              <option value="12h">12-Hour Format (e.g. 05:26 PM, 09:00 AM)</option>
              <option value="24h">24-Hour Format (e.g. 17:26, 09:00)</option>
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Choose your preferred clock format across Calendar, Meeting Logs, and Dashboard.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>

      {/* Database Management Card */}
      <div className="bg-slate-900/80 border border-rose-500/20 p-6 rounded-2xl space-y-4">
        <h3 className="font-bold text-sm text-rose-300 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>Local Database Operations & Purge Controls</span>
        </h3>
        <p className="text-xs text-slate-400">
          Clear records based on timeline policy or wipe all local storage data completely.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handlePurgeOlderThan}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-semibold text-xs border border-amber-500/30 transition-all"
          >
            <Clock className="w-4 h-4" />
            <span>Purge Records Older Than Retention Policy</span>
          </button>

          <button
            type="button"
            onClick={handleClearAll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-md"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear All Local Data</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700/60 transition-all"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
            <span>Reset Sample Seed Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
