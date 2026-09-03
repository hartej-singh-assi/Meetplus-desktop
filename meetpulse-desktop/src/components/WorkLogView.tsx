import React, { useState } from 'react';
import { useMeetingTracker } from '../context/MeetingTrackerContext';
import { Briefcase, Target, Plus, CheckSquare, Square, Save, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import confetti from 'canvas-confetti';

export const WorkLogView: React.FC = () => {
  const { workLogs, addWorkLog, updateWorkLog, settings } = useMeetingTracker();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const todayWork = workLogs.find(w => w.date === todayStr) || {
    id: `w-today-${Date.now()}`,
    date: todayStr,
    targetFocusHours: settings.defaultTargetFocusHours,
    actualWorkHours: 4.5,
    tasks: [
      { id: 't-1', title: 'Implement Excel export extension selector', completed: true },
      { id: 't-2', title: 'Optimize context-switching lost time formula', completed: true },
      { id: 't-3', title: 'Build Electron cross-platform desktop wrapper', completed: false },
    ],
    workSummary: 'Progressing on core target deliverables today.',
    efficiencyScore: 75,
  };

  const [targetHours, setTargetHours] = useState(todayWork.targetFocusHours);
  const [actualHours, setActualHours] = useState(todayWork.actualWorkHours);
  const [tasks, setTasks] = useState(todayWork.tasks);
  const [summary, setSummary] = useState(todayWork.workSummary);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTask = {
      id: `t-${Date.now()}`,
      title: newTaskTitle.trim(),
      completed: false,
    };
    setTasks(prev => [...prev, newTask]);
    setNewTaskTitle('');
  };

  const toggleTask = (taskId: string) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id === taskId) {
          const nextState = !t.completed;
          if (nextState) {
            confetti({ particleCount: 30, spread: 60, origin: { y: 0.8 } });
          }
          return { ...t, completed: nextState };
        }
        return t;
      })
    );
  };

  const handleSave = () => {
    const efficiency = targetHours > 0 ? Math.min(100, Math.round((actualHours / targetHours) * 100)) : 0;
    const existing = workLogs.find(w => w.date === todayStr);

    if (existing) {
      updateWorkLog(existing.id, {
        targetFocusHours: Number(targetHours),
        actualWorkHours: Number(actualHours),
        tasks,
        workSummary: summary,
        efficiencyScore: efficiency,
      });
    } else {
      addWorkLog({
        date: todayStr,
        targetFocusHours: Number(targetHours),
        actualWorkHours: Number(actualHours),
        tasks,
        workSummary: summary,
        efficiencyScore: efficiency,
      });
    }

    if (efficiency >= 100) {
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
    }

    alert("Today's work log saved successfully!");
  };

  return (
    <div className="p-6 space-y-6 w-full h-full flex flex-col flex-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-400" />
            <span>Daily Work & Target Achievement Log</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Record actual deep work completed against target focus hours and track key task milestones.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
        >
          <Save className="w-4 h-4" />
          <span>Save Today's Work Log</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Hours & Efficiency Config Card */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-bold text-base text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Target className="w-5 h-5 text-indigo-400" />
              <span>Target vs Actual Hours ({todayStr})</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Target Focus Hours Goal
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="16"
                  value={targetHours}
                  onChange={e => setTargetHours(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 text-white font-bold p-3 rounded-xl focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Actual Deep Work Hours Done
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="16"
                  value={actualHours}
                  onChange={e => setActualHours(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 text-emerald-400 font-bold p-3 rounded-xl focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Target Efficiency Score Pill */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Target Efficiency</span>
                  <span className="font-black text-indigo-400 text-sm">
                    {targetHours > 0 ? Math.min(100, Math.round((actualHours / targetHours) * 100)) : 0}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all"
                    style={{
                      width: `${targetHours > 0 ? Math.min(100, Math.round((actualHours / targetHours) * 100)) : 0}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Work Summary Notes</label>
                <textarea
                  rows={4}
                  value={summary}
                  onChange={e => setSummary(e.target.value)}
                  placeholder="Key accomplishments and blocker updates..."
                  className="w-full bg-slate-950 border border-slate-700 text-white p-3 rounded-xl focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Task Checklist */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-5 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <span>Today's Task Checklist</span>
            </h3>
            <span className="text-xs text-slate-400 font-semibold">
              {tasks.filter(t => t.completed).length} / {tasks.length} Completed
            </span>
          </div>

          {/* Add Task Input */}
          <form onSubmit={handleAddTask} className="flex gap-2">
            <input
              type="text"
              placeholder="Add new task title..."
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 text-xs text-white p-3 rounded-xl focus:border-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm"
            >
              Add Task
            </button>
          </form>

          {/* Task List */}
          <div className="space-y-2 flex-1 overflow-y-auto pr-1 min-h-[250px]">
            {tasks.length === 0 ? (
              <p className="text-xs text-slate-400 p-6 text-center font-medium">No tasks added yet for today.</p>
            ) : (
              tasks.map(t => (
                <div
                  key={t.id}
                  onClick={() => toggleTask(t.id)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                    t.completed
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200 line-through'
                      : 'bg-slate-950/60 border-slate-800 text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 text-xs font-medium">
                    {t.completed ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    )}
                    <span>{t.title}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
