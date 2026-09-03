import React from 'react';
import { useMeetingTracker } from '../context/MeetingTrackerContext';
import { Download, Plus, Flag, Play, Square, Radio } from 'lucide-react';
import { format } from 'date-fns';
import appLogo from '../assets/logo.png';

interface DesktopTitlebarProps {
  onOpenExportModal: () => void;
  onOpenNewMeetingModal: () => void;
  onOpenSprintModal: () => void;
}

export const DesktopTitlebar: React.FC<DesktopTitlebarProps> = ({
  onOpenExportModal,
  onOpenNewMeetingModal,
  onOpenSprintModal,
}) => {
  const {
    activeTab,
    setActiveTab,
    todaySummary,
    activeSprint,
    timerRunning,
    timerSeconds,
    formatTimerDisplay,
    startSpontaneousTimer,
    setWidgetMinimized,
  } = useMeetingTracker();

  const todayFormatted = format(new Date(), 'EEE, MMM d');

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'meetings', label: 'Meetings' },
    { id: 'work', label: 'Daily Work' },
    { id: 'records', label: 'Records' },
    { id: 'settings', label: 'Settings' },
  ] as const;

  return (
    <header className="sticky top-0 z-40 bg-[#0b0f17]/95 border-b border-slate-800/80 text-slate-200 select-none px-6 py-3 flex items-center justify-between">
      {/* Brand & Tabs */}
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2.5">
          <img
            src={appLogo}
            alt="MeetPulse"
            className="w-6 h-6 rounded-lg object-cover border border-cyan-500/40 shadow-sm shadow-cyan-500/20"
          />
          <span className="font-bold text-sm tracking-tight text-white">MeetPulse</span>
        </div>

        {/* Minimal Nav Items */}
        <nav className="flex items-center gap-1">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right Quick Stats & Actions */}
      <div className="flex items-center gap-4">
        {/* Active Sprint Pill */}
        <button
          onClick={onOpenSprintModal}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-all whitespace-nowrap shrink-0"
          title="Open Sprint Master Timeline"
        >
          <Flag className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="whitespace-nowrap">{activeSprint ? (activeSprint.name.includes(' - ') ? activeSprint.name.split(' - ')[0] : activeSprint.name) : 'Sprint Master'}</span>
        </button>

        {/* Active Live Timer Badge if Running */}
        {timerRunning && (
          <button
            onClick={() => setWidgetMinimized(true)}
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-mono font-bold animate-pulse hover:bg-rose-500/25 transition-colors"
            title="Meeting in progress. Click to collapse to floating pill widget"
          >
            <Radio className="w-3.5 h-3.5 text-rose-500" />
            <span>{formatTimerDisplay(timerSeconds)}</span>
          </button>
        )}

        <div className="text-xs text-slate-400 font-medium hidden md:flex items-center gap-3">
          <span>{todayFormatted}</span>
          <span className="w-1 h-1 rounded-full bg-slate-700"></span>
          <span className="text-slate-300">
            Lost Time: <strong className="text-rose-400 font-semibold">{todaySummary.totalTimeLostHours}h</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!timerRunning && (
            <button
              onClick={() => startSpontaneousTimer()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-medium text-xs border border-emerald-500/30 transition-all active:scale-95"
              title="Start Spontaneous Live Meeting & Collapse to Floating Pill"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Live Timer</span>
            </button>
          )}

          <button
            onClick={onOpenNewMeetingModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Meeting</span>
          </button>

          <button
            onClick={onOpenExportModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-medium text-xs border border-slate-700/60 transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export</span>
          </button>
        </div>
      </div>
    </header>
  );
};

