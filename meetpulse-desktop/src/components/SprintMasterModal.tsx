import React, { useState } from 'react';
import { useMeetingTracker } from '../context/MeetingTrackerContext';
import { Sprint, SprintStatus } from '../types';
import { X, Plus, Calendar, Flag, CheckCircle, Clock, Edit2, Trash2 } from 'lucide-react';
import { format, addDays } from 'date-fns';

interface SprintMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SprintMasterModal: React.FC<SprintMasterModalProps> = ({ isOpen, onClose }) => {
  const { sprints, activeSprint, addSprint, updateSprint, deleteSprint, setActiveSprint } = useMeetingTracker();

  const [isEditing, setIsEditing] = useState(false);
  const [editingSprintId, setEditingSprintId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 14), 'yyyy-MM-dd'));
  const [goal, setGoal] = useState('');
  const [status, setStatus] = useState<SprintStatus>('ACTIVE');

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    setEndDate(format(addDays(new Date(), 14), 'yyyy-MM-dd'));
    setGoal('');
    setStatus('ACTIVE');
    setIsEditing(false);
    setEditingSprintId(null);
  };

  const handleOpenNew = () => {
    resetForm();
    setIsEditing(true);
  };

  const handleEdit = (sprint: Sprint) => {
    setEditingSprintId(sprint.id);
    setName(sprint.name);
    setStartDate(sprint.startDate);
    setEndDate(sprint.endDate);
    setGoal(sprint.goal);
    setStatus(sprint.status);
    setIsEditing(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingSprintId) {
      updateSprint(editingSprintId, {
        name,
        startDate,
        endDate,
        goal,
        status,
      });
    } else {
      addSprint({
        name,
        startDate,
        endDate,
        goal,
        status,
      });
    }

    resetForm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Sprint Master Timeline</h3>
              <p className="text-xs text-slate-400">Manage ongoing sprint dates & automatically link meetings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Active Sprint Summary Bar */}
          {activeSprint && (
            <div className="p-4 bg-indigo-950/30 border border-indigo-500/30 rounded-xl flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-500 text-white uppercase tracking-wider">
                    Active Sprint
                  </span>
                  <span className="font-bold text-white text-sm">{activeSprint.name}</span>
                </div>
                <p className="text-xs text-slate-300">
                  {activeSprint.startDate} → {activeSprint.endDate}
                </p>
                {activeSprint.goal && <p className="text-xs text-slate-400 italic">Goal: "{activeSprint.goal}"</p>}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Auto-linked
                </span>
              </div>
            </div>
          )}

          {/* Sprints List or Create/Edit Form */}
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4 bg-slate-950/60 p-4 border border-slate-800 rounded-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  {editingSprintId ? 'Edit Sprint' : 'Create New Sprint'}
                </h4>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Sprint Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Sprint 25 - Authentication & CI/CD"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Start Date</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">End Date</label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as SprintStatus)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ACTIVE">ACTIVE (Ongoing)</option>
                    <option value="PLANNED">PLANNED (Upcoming)</option>
                    <option value="COMPLETED">COMPLETED (Past)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Sprint Objective / Goal</label>
                  <textarea
                    rows={2}
                    value={goal}
                    onChange={e => setGoal(e.target.value)}
                    placeholder="Key deliverable or objective for this sprint timeline..."
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all"
                >
                  {editingSprintId ? 'Update Sprint' : 'Save Sprint'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">All Sprints</h4>
                <button
                  onClick={handleOpenNew}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Sprint</span>
                </button>
              </div>

              <div className="space-y-2">
                {sprints.map(sprint => {
                  const isActive = sprint.id === activeSprint?.id;
                  return (
                    <div
                      key={sprint.id}
                      className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                        isActive
                          ? 'bg-slate-800/80 border-indigo-500/50 shadow-sm'
                          : 'bg-slate-950/40 border-slate-800/60 hover:bg-slate-800/20'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                              sprint.status === 'ACTIVE'
                                ? 'bg-indigo-500 text-white'
                                : sprint.status === 'PLANNED'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {sprint.status}
                          </span>
                          <span className="font-semibold text-white text-sm">{sprint.name}</span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>{sprint.startDate} to {sprint.endDate}</span>
                        </div>
                        {sprint.goal && <p className="text-xs text-slate-400">{sprint.goal}</p>}
                      </div>

                      <div className="flex items-center gap-2">
                        {sprint.status !== 'ACTIVE' && (
                          <button
                            onClick={() => setActiveSprint(sprint.id)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white text-xs transition-colors"
                          >
                            Set Active
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(sprint)}
                          className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                          title="Edit Sprint"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteSprint(sprint.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                          title="Delete Sprint"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
