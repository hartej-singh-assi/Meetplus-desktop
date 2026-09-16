import React from 'react';
import { useMeetingTracker } from '../context/MeetingTrackerContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Play, Square, ArrowUpRight, Minimize2 } from 'lucide-react';
import { format } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

export const DashboardView: React.FC = () => {
  const {
    todaySummary,
    dailySummaries,
    meetings,
    settings,
    setActiveTab,
    formatDisplayTime,
    timerRunning,
    timerSeconds,
    timerTitle,
    setTimerTitle,
    startSpontaneousTimer,
    stopTimer,
    setWidgetMinimized,
    formatTimerDisplay,
  } = useMeetingTracker();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayMeetings = meetings.filter(m => m.date === todayStr);

  // Donut Chart Data
  const doughnutData = settings.trackContextLoss
    ? {
        labels: ['Deep Work', 'Meetings', 'Context Loss'],
        datasets: [
          {
            data: [
              todaySummary.availableFocusHours,
              todaySummary.totalDirectMeetingHours,
              todaySummary.totalTimeLostHours,
            ],
            backgroundColor: ['#10b981', '#6366f1', '#f43f5e'],
            borderWidth: 0,
          },
        ],
      }
    : {
        labels: ['Available Deep Work', 'Direct Meetings'],
        datasets: [
          {
            data: [
              todaySummary.availableFocusHours,
              todaySummary.totalDirectMeetingHours,
            ],
            backgroundColor: ['#10b981', '#6366f1'],
            borderWidth: 0,
          },
        ],
      };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#94a3b8', font: { size: 11, family: 'Inter' }, usePointStyle: true, pointStyleWidth: 8 },
      },
    },
  };

  // Bar Chart Data
  const last7Days = dailySummaries.slice(0, 7).reverse();
  const barData = {
    labels: last7Days.map(d => format(new Date(d.date), 'EEE')),
    datasets: [
      {
        label: 'Direct Meeting',
        data: last7Days.map(d => d.totalDirectMeetingHours),
        backgroundColor: '#6366f1',
        borderRadius: 4,
      },
      ...(settings.trackContextLoss
        ? [
            {
              label: 'Loss Overhead',
              data: last7Days.map(d => d.totalTimeLostHours),
              backgroundColor: '#f43f5e',
              borderRadius: 4,
            },
          ]
        : []),
      {
        label: 'Work Done',
        data: last7Days.map(d => d.actualWorkHours),
        backgroundColor: '#10b981',
        borderRadius: 4,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: '#94a3b8', font: { size: 11, family: 'Inter' }, usePointStyle: true, pointStyleWidth: 8 },
      },
    },
    scales: {
      x: { ticks: { color: '#64748b' }, grid: { display: false } },
      y: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } },
    },
  };

  return (
    <div className="p-6 space-y-6 w-full h-full flex flex-col flex-1">
      {/* Top Quick Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800/60 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Today's Overview</h2>
          <p className="text-xs text-slate-400">
            {settings.trackContextLoss ? 'Direct meeting time vs focus recovery overhead' : 'Direct meeting time and focus availability'}
          </p>
        </div>

        {/* Minimal Timer */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl shadow-xs">
          {!timerRunning ? (
            <div className="flex items-center gap-2 text-xs">
              <input
                type="text"
                placeholder="Spontaneous Meeting..."
                value={timerTitle}
                onChange={e => setTimerTitle(e.target.value)}
                className="bg-transparent text-white px-1 focus:outline-none w-40 placeholder:text-slate-500 font-medium"
              />
              <button
                onClick={() => startSpontaneousTimer()}
                className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-emerald-400 font-semibold hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                title="Start Meeting Spontaneously & Collapse to Pill"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Timer</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span className="font-mono font-bold text-rose-400 text-sm">{formatTimerDisplay(timerSeconds)}</span>
              <input
                type="text"
                value={timerTitle}
                onChange={e => setTimerTitle(e.target.value)}
                className="bg-transparent text-white px-1 focus:outline-none w-32 placeholder:text-slate-500 font-medium"
              />
              
              {/* Collapse to Floating Pill Button */}
              <button
                onClick={() => setWidgetMinimized(true)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-indigo-400 hover:bg-slate-700 transition-colors"
                title="Collapse to Right-Corner Floating Pill"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>

              {/* Stop & Open Summary Details */}
              <button
                onClick={stopTimer}
                className="flex items-center gap-1.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2.5 py-1 rounded-lg font-semibold hover:bg-rose-600 hover:text-white transition-colors"
                title="Stop & Save Meeting Details"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            </div>
          )}
        </div>
      </div>


      {/* KPI Cards Grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${settings.trackContextLoss ? 'xl:grid-cols-4' : 'xl:grid-cols-3'} gap-4`}>
        <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl shadow-sm">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Direct Meetings</div>
          <div className="text-3xl font-bold text-white mt-1">
            {todaySummary.totalDirectMeetingHours} <span className="text-xs text-slate-400 font-normal">hrs</span>
          </div>
          <div className="text-xs text-slate-500 mt-1.5">{todaySummary.totalMeetingsCount} sessions logged</div>
        </div>

        {settings.trackContextLoss && (
          <div className="bg-slate-900/60 border border-rose-500/20 p-5 rounded-2xl shadow-sm">
            <div className="text-xs text-rose-400 font-semibold uppercase tracking-wider">Time Lost (Overhead)</div>
            <div className="text-3xl font-bold text-rose-400 mt-1">
              {todaySummary.totalTimeLostHours} <span className="text-xs text-rose-300/60 font-normal">hrs</span>
            </div>
            <div className="text-xs text-slate-500 mt-1.5">Context switching penalty</div>
          </div>
        )}

        <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl shadow-sm">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Available Focus</div>
          <div className="text-3xl font-bold text-emerald-400 mt-1">
            {todaySummary.availableFocusHours} <span className="text-xs text-slate-400 font-normal">hrs</span>
          </div>
          <div className="text-xs text-slate-500 mt-1.5">Net deep work bandwidth</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl shadow-sm">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Target Completion</div>
          <div className="text-3xl font-bold text-white mt-1">
            {todaySummary.targetAchievementPercentage}%
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all"
              style={{ width: `${todaySummary.targetAchievementPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl space-y-3 flex flex-col">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Time Breakdown</div>
          <div className="flex-1 min-h-[220px] relative">
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </div>

        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl space-y-3 flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Weekly Burden Trend</span>
            <button
              onClick={() => setActiveTab('records')}
              className="text-xs text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <span>Records</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 min-h-[220px]">
            <Bar data={barData} options={barOptions} />
          </div>
        </div>
      </div>

      {/* Today's Meetings Feed */}
      <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
          <span>Today's Logged Meetings</span>
          <button onClick={() => setActiveTab('meetings')} className="text-indigo-400 hover:underline">
            View All &rarr;
          </button>
        </div>

        {todayMeetings.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 font-medium">No meetings logged yet today.</div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {todayMeetings.map(m => (
              <div key={m.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-white text-sm">{m.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{formatDisplayTime(m.startTime)} - {formatDisplayTime(m.endTime)} • {m.category}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-slate-300 text-sm">{m.durationMinutes}m duration</div>
                  {settings.trackContextLoss && (
                    <div className="text-xs text-rose-400 font-medium">+{m.contextSwitchLossMinutes}m lost</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
