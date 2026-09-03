import React from 'react';
import { useMeetingTracker } from '../context/MeetingTrackerContext';
import { Maximize2, Square } from 'lucide-react';

export const FloatingTimerPill: React.FC = () => {
  const {
    timerRunning,
    timerSeconds,
    timerTitle,
    setTimerTitle,
    isWidgetMinimized,
    setWidgetMinimized,
    stopTimer,
    formatTimerDisplay,
  } = useMeetingTracker();

  if (!timerRunning || !isWidgetMinimized) {
    return null;
  }

  return (
    <div className="w-full h-full min-h-[70px] bg-[#070a14] border border-slate-700/80 shadow-2xl rounded-xl p-2.5 text-white select-none flex items-center justify-between gap-2 overflow-hidden border-t-indigo-500/60">
      {/* Live Pulse & Counter */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
        </span>

        <div className="font-mono text-lg font-black text-rose-400 tracking-wider">
          {formatTimerDisplay(timerSeconds)}
        </div>
      </div>

      {/* Meeting Title Input */}
      <div className="flex-1 min-w-0 px-1">
        <input
          type="text"
          value={timerTitle}
          onChange={e => setTimerTitle(e.target.value)}
          placeholder="Spontaneous Meeting"
          className="w-full bg-transparent text-xs font-semibold text-slate-200 placeholder:text-slate-500 focus:outline-none truncate border-b border-transparent focus:border-indigo-500 transition-colors"
          title="Edit Meeting Title"
        />
      </div>

      {/* Control Actions */}
      <div className="flex items-center gap-1.5 shrink-0 pl-1 border-l border-slate-800">
        {/* Enlarge / Expand back to full desktop UI */}
        <button
          onClick={() => setWidgetMinimized(false)}
          className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-indigo-600 text-slate-300 hover:text-white transition-all shadow-xs group/btn"
          title="Expand to Full Application Screen"
        >
          <Maximize2 className="w-4 h-4 transition-transform group-hover/btn:scale-110" />
        </button>

        {/* Stop & Log Details */}
        <button
          onClick={stopTimer}
          className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-xs shadow-rose-600/30 group/btn"
          title="Stop Meeting & Log Details"
        >
          <Square className="w-4 h-4 fill-current transition-transform group-hover/btn:scale-110" />
        </button>
      </div>
    </div>
  );
};

export default FloatingTimerPill;
