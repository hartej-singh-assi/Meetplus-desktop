import React, { useState, useEffect } from 'react';
import { useMeetingTracker } from '../context/MeetingTrackerContext';
import { MeetingCategory, ImpactLevel } from '../types';
import { Clock, Calendar, Users, AlertTriangle, FileText, Check, X, Sparkles } from 'lucide-react';

export const MeetingCompletionModal: React.FC = () => {
  const {
    pendingCompletionMeeting,
    saveCompletedMeeting,
    cancelCompletedMeeting,
    settings,
    formatDisplayTime,
  } = useMeetingTracker();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<MeetingCategory>('Sync');
  const [impactLevel, setImpactLevel] = useState<ImpactLevel>('MEDIUM');
  const [contextLoss, setContextLoss] = useState(settings.defaultContextLossMinutes);
  const [participantsCount, setParticipantsCount] = useState(2);
  const [targetDisruptionScore, setTargetDisruptionScore] = useState(5);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (pendingCompletionMeeting) {
      setTitle(pendingCompletionMeeting.title || 'Spontaneous Meeting');
      setCategory('Sync');
      setNotes('');
      setContextLoss(settings.defaultContextLossMinutes);

      const dur = pendingCompletionMeeting.durationMinutes;
      if (dur > 60) {
        setImpactLevel('HIGH');
      } else if (dur > 20) {
        setImpactLevel('MEDIUM');
      } else {
        setImpactLevel('LOW');
      }
    }
  }, [pendingCompletionMeeting, settings]);

  if (!pendingCompletionMeeting) {
    return null;
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    saveCompletedMeeting({
      title: title.trim(),
      category,
      date: pendingCompletionMeeting.startDate,
      startTime: pendingCompletionMeeting.startTimeStr,
      endTime: pendingCompletionMeeting.endTimeStr,
      durationMinutes: pendingCompletionMeeting.durationMinutes,
      contextSwitchLossMinutes: settings.trackContextLoss ? contextLoss : 0,
      impactLevel,
      participantsCount,
      notes,
      targetDisruptionScore,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Meeting Ended — Save Details</h3>
              <p className="text-xs text-slate-400">Review recorded times and log meeting details</p>
            </div>
          </div>
          <button
            onClick={cancelCompletedMeeting}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Recorded Time Badge Summary */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center">
            <div className="space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-center gap-1">
                <Clock className="w-3 h-3 text-indigo-400" />
                <span>Start Time</span>
              </div>
              <div className="text-sm font-mono font-bold text-white">
                {formatDisplayTime(pendingCompletionMeeting.startTimeStr)}
              </div>
            </div>

            <div className="space-y-1 border-x border-slate-800/80">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-center gap-1">
                <Clock className="w-3 h-3 text-emerald-400" />
                <span>End Time</span>
              </div>
              <div className="text-sm font-mono font-bold text-white">
                {formatDisplayTime(pendingCompletionMeeting.endTimeStr)}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-center gap-1">
                <Calendar className="w-3 h-3 text-amber-400" />
                <span>Duration</span>
              </div>
              <div className="text-sm font-mono font-bold text-indigo-400">
                {pendingCompletionMeeting.durationMinutes} mins
              </div>
            </div>
          </div>

          {/* Meeting Title Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Meeting Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Weekly Product Sync, Client Review"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-sm font-medium transition-colors"
            />
          </div>

          {/* Category & Impact Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as MeetingCategory)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 font-medium transition-colors"
              >
                <option value="Sync">Sync</option>
                <option value="1:1">1:1</option>
                <option value="All Hands">All Hands</option>
                <option value="Client">Client</option>
                <option value="Review">Review</option>
                <option value="Ad-hoc">Ad-hoc</option>
                <option value="Planning">Planning</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Impact Level</label>
              <select
                value={impactLevel}
                onChange={e => setImpactLevel(e.target.value as ImpactLevel)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 font-medium transition-colors"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </select>
            </div>
          </div>

          {/* Context Loss & Participants Row */}
          <div className={`grid ${settings.trackContextLoss ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
            {settings.trackContextLoss && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Context Loss (Overhead)</span>
                  <span className="text-[10px] text-rose-400 font-normal">+{contextLoss} mins</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={contextLoss}
                  onChange={e => setContextLoss(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 font-medium transition-colors"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Participants Count</label>
              <input
                type="number"
                min="1"
                max="100"
                value={participantsCount}
                onChange={e => setParticipantsCount(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 font-medium transition-colors"
              />
            </div>
          </div>

          {/* Notes & Takeaways */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Notes / Key Action Items</label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add key decisions, follow-ups, or meeting notes..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            ></textarea>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={cancelCompletedMeeting}
              className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-300 font-semibold hover:bg-slate-800 transition-colors"
            >
              Discard
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/30"
            >
              <Check className="w-4 h-4" />
              <span>Save Log</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MeetingCompletionModal;
