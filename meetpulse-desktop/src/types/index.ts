export type ImpactLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type MeetingCategory = 
  | 'Sync' 
  | 'Standup' 
  | 'Client' 
  | '1-on-1' 
  | 'All-Hands' 
  | 'Technical' 
  | 'Ad-hoc';

export type SprintStatus = 'ACTIVE' | 'PLANNED' | 'COMPLETED';

export interface Sprint {
  id: string;
  name: string; // e.g. "Sprint 24", "Q3 Launch Sprint"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  goal: string;
  status: SprintStatus;
}

export interface MeetingRecord {
  id: string;
  sprintId?: string; // Linked Sprint ID
  title: string;
  category: MeetingCategory;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  contextSwitchLossMinutes: number; // Recovery focus overhead lost
  totalImpactMinutes: number; // durationMinutes + contextSwitchLossMinutes
  impactLevel: ImpactLevel;
  participantsCount: number;
  notes: string;
  targetDisruptionScore: number; // 1 to 10 rating
}

export interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
  category?: string;
}

export interface WorkRecord {
  id: string;
  date: string; // YYYY-MM-DD
  targetFocusHours: number;
  actualWorkHours: number;
  tasks: TaskItem[];
  workSummary: string;
  efficiencyScore: number; // Percentage
  notes?: string;
}

export type ExportFormat = 'xlsx' | 'xls' | 'csv' | 'tsv';

export interface ExportConfig {
  format: ExportFormat;
  dateRange: 'all' | 'today' | 'this_week' | 'this_month' | 'custom';
  startDate?: string;
  endDate?: string;
  includeMeetingLogs: boolean;
  includeWorkLogs: boolean;
  includeSummary: boolean;
  filename: string;
}

export interface UserSettings {
  defaultTargetFocusHours: number;
  defaultContextLossMinutes: number; // Context switching recovery buffer per meeting
  workingHoursPerDay: number; // e.g. 8 hours
  autoCalculateLoss: boolean;
  dataRetentionDays: number; // 0 for infinite, or 30, 60, 90, 365
  timeFormat: '12h' | '24h'; // 12-hour (AM/PM) or 24-hour (HH:mm)
}

export interface DailyKPISummary {
  date: string;
  totalMeetingsCount: number;
  totalDirectMeetingHours: number; // hours
  totalTimeLostHours: number; // context switch overhead hours
  totalMeetingImpactHours: number; // direct + lost
  availableFocusHours: number; // workingHours - meetingImpact
  actualWorkHours: number;
  targetFocusHours: number;
  targetAchievementPercentage: number;
  disruptionIndex: number; // 0-100 scale of productivity friction
}

export type TabType = 'dashboard' | 'calendar' | 'meetings' | 'work' | 'records' | 'settings';
