import React, { useState } from 'react';
import { useMeetingTracker } from '../context/MeetingTrackerContext';
import { Settings, RefreshCw, Save, ShieldAlert, Sliders, Trash2, HardDrive, Clock, Calendar } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    resetToSeedData,
    clearAllData,
    clearDataOlderThan,
    storageStats,
  } = useMeetingTracker();

  const [contextLoss, setContextLoss] = useState(settings.defaultContextLossMinutes);
  const [workingHours, setWorkingHours] = useState(settings.workingHoursPerDay);
  const [targetFocus, setTargetFocus] = useState(settings.defaultTargetFocusHours);
  const [retentionDays, setRetentionDays] = useState(settings.dataRetentionDays || 0);
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>(settings.timeFormat || '12h');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      defaultContextLossMinutes: Number(contextLoss),
      workingHoursPerDay: Number(workingHours),
      defaultTargetFocusHours: Number(targetFocus),
      dataRetentionDays: Number(retentionDays),
      timeFormat,
    });
    alert('Settings and Time Format preferences saved successfully!');
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

  return (
    <div className="p-6 space-y-6 w-full h-full flex flex-col flex-1">
      {/* Header */}
      <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-400" />
          <span>Application Settings & Algorithm Preferences</span>
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Customize context switching lost time parameters, focus targets, storage footprint, and data retention timelines.
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

      {/* Settings Form */}
      <form onSubmit={handleSave} className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-5 text-xs">
        <h3 className="font-bold text-sm text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <span>Productivity Loss & Data Retention Parameters</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
