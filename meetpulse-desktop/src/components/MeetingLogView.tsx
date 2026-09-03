import React, { useState } from 'react';
import { useMeetingTracker } from '../context/MeetingTrackerContext';
import { MeetingCategory, MeetingRecord } from '../types';
import { Plus, Trash2, Edit3, Flag } from 'lucide-react';
import { format } from 'date-fns';

export const MeetingLogView: React.FC = () => {
  const { meetings, sprints, activeSprint, addMeeting, updateMeeting, deleteMeeting, settings, formatDisplayTime } = useMeetingTracker();

  // Form & Edit State
  const [showModal, setShowModal] = useState(false);
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<MeetingCategory>('Sync');
  const [sprintId, setSprintId] = useState<string>('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [notes, setNotes] = useState('');

  const [selectedSprintFilter, setSelectedSprintFilter] = useState<string>('ALL');

  const openNewMeetingModal = () => {
    setEditingMeetingId(null);
    setTitle('');
    setCategory('Sync');
    setSprintId(activeSprint?.id || (sprints[0]?.id ?? ''));
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setStartTime('10:00');
    setEndTime('11:00');
    setNotes('');
    setShowModal(true);
  };

  const openEditMeetingModal = (m: MeetingRecord) => {
    setEditingMeetingId(m.id);
    setTitle(m.title);
    setCategory(m.category);
    setSprintId(m.sprintId || activeSprint?.id || '');
    setDate(m.date);
    setStartTime(m.startTime);
    setEndTime(m.endTime);
    setNotes(m.notes || '');
    setShowModal(true);
  };

  const calculateDuration = () => {
    try {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      return Math.max(0, eh * 60 + em - (sh * 60 + sm));
    } catch (e) {
      return 60;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const duration = calculateDuration();
    if (duration <= 0) return;

    if (editingMeetingId) {
      updateMeeting(editingMeetingId, {
        title: title.trim() || 'Untitled Meeting',
        category,
        sprintId,
        date,
        startTime,
        endTime,
        durationMinutes: duration,
        notes: notes.trim(),
      });
    } else {
      addMeeting({
        title: title.trim() || 'Untitled Meeting',
        category,
        sprintId: sprintId || activeSprint?.id,
        date,
        startTime,
        endTime,
        durationMinutes: duration,
        contextSwitchLossMinutes: settings.defaultContextLossMinutes,
        impactLevel: duration > 45 ? 'HIGH' : 'MEDIUM',
        participantsCount: 2,
        notes: notes.trim(),
        targetDisruptionScore: 5,
      });
    }

    setShowModal(false);
    setEditingMeetingId(null);
  };

  const formatMeetingTime = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${hrs}h ${m}m` : `${hrs}h`;
  };

  const filteredMeetings = meetings.filter(m => {
    if (selectedSprintFilter === 'ALL') return true;
    return (m.sprintId || activeSprint?.id) === selectedSprintFilter;
  });

  return (
    <div className="p-6 space-y-5 w-full h-full flex flex-col flex-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800/80 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Meeting Logs</h2>
          <p className="text-xs text-slate-400">Record, edit, and track meeting times linked to Sprint timelines</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sprint Filter */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs shadow-xs">
            <Flag className="w-4 h-4 text-indigo-400 shrink-0" />
            <select
              value={selectedSprintFilter}
              onChange={e => setSelectedSprintFilter(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer font-medium"
            >
              <option value="ALL" className="bg-slate-900">All Sprints</option>
              {sprints.map(s => (
                <option key={s.id} value={s.id} className="bg-slate-900">
                  {s.name} {s.status === 'ACTIVE' ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={openNewMeetingModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all active:scale-95 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Meeting</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-x-auto overflow-y-auto text-xs flex-1 shadow-xl flex flex-col min-h-[500px]">
        <table className="w-full text-left text-slate-300 border-collapse">
          <thead className="bg-slate-950/90 text-slate-400 border-b border-slate-800 font-semibold sticky top-0 z-10 backdrop-blur-md">
            <tr>
              <th className="p-4">Title</th>
              <th className="p-4 whitespace-nowrap">Sprint</th>
              <th className="p-4 whitespace-nowrap">Category</th>
              <th className="p-4 whitespace-nowrap">Date / Time</th>
              <th className="p-4 whitespace-nowrap font-bold text-white">Meeting Time</th>
              <th className="p-4 text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filteredMeetings.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-slate-500 font-medium text-sm">
                  No meeting records found for this selection.
                </td>
              </tr>
            ) : (
              filteredMeetings.map(m => {
                const linkedSprint = sprints.find(s => s.id === m.sprintId) || activeSprint;
                const sprintDisplayName = linkedSprint
                  ? (linkedSprint.name.includes(' - ') ? linkedSprint.name.split(' - ')[0] : linkedSprint.name)
                  : 'Sprint';

                return (
                  <tr key={m.id} className="hover:bg-slate-800/30 transition-all">
                    <td className="p-4 font-medium text-white max-w-md">
                      <div className="text-sm font-semibold">{m.title}</div>
                      {m.notes && <div className="text-xs text-slate-400 font-normal mt-1 leading-relaxed">{m.notes}</div>}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 whitespace-nowrap">
                        <Flag className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>{sprintDisplayName}</span>
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700/60">
                        {m.category}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap text-slate-400 font-medium">
                      <div>{m.date}</div>
                      <div className="text-xs text-slate-500 font-normal">({formatDisplayTime(m.startTime)})</div>
                    </td>
                    <td className="p-4 whitespace-nowrap font-bold text-indigo-300 text-sm">
                      {formatMeetingTime(m.durationMinutes)}
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditMeetingModal(m)}
                          className="text-slate-400 hover:text-indigo-400 p-2 rounded-xl hover:bg-slate-800 transition-colors"
                          title="Edit Meeting"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteMeeting(m.id)}
                          className="text-slate-500 hover:text-rose-400 p-2 rounded-xl hover:bg-slate-800 transition-colors"
                          title="Delete Meeting"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-5 text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="font-bold text-white text-base">
                {editingMeetingId ? 'Edit Meeting Record' : 'Log New Meeting'}
              </span>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white text-lg font-bold">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="Meeting title..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-xl focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Linked Sprint</label>
                <select
                  value={sprintId}
                  onChange={e => setSprintId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-xl focus:outline-none focus:border-indigo-500 font-medium"
                >
                  {sprints.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as MeetingCategory)}
                    className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-xl focus:outline-none font-medium"
                  >
                    <option value="Sync">Sync</option>
                    <option value="Standup">Standup</option>
                    <option value="Client">Client</option>
                    <option value="1-on-1">1-on-1</option>
                    <option value="Technical">Technical</option>
                    <option value="Ad-hoc">Ad-hoc</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-xl focus:outline-none font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-xl focus:outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-xl focus:outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Notes</label>
                <textarea
                  rows={3}
                  placeholder="Optional meeting notes..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-xl focus:outline-none font-medium"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-all shadow-md"
                >
                  {editingMeetingId ? 'Update Meeting' : 'Save Meeting'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
