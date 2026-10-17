import React, { useState, useMemo } from 'react';
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
  ChartOptions,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Play,
  Square,
  ArrowUpRight,
  Minimize2,
  Clock,
  Sparkles,
  Target,
  Video,
  AlertCircle,
  BarChart3,
  PieChart,
  Plus,
  Calendar,
  Layers,
  Flag,
  CheckCircle2,
  Moon,
  UtensilsCrossed,
} from 'lucide-react';
import { format, subDays, isSameDay } from 'date-fns';

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
    workLogs,
    settings,
    activeSprint,
    lastActiveSprint,
    setActiveTab,
    formatDisplayTime,
    calculateShiftSplit,
    timerRunning,
    timerSeconds,
    timerTitle,
    setTimerTitle,
    startSpontaneousTimer,
    stopTimer,
    setWidgetMinimized,
    formatTimerDisplay,
  } = useMeetingTracker();

  const showDeepWork = settings.trackDeepWorkFocus !== false;
  const showShift = settings.enableShiftTracking !== false;
  const showLoss = Boolean(settings.trackContextLoss);

  const [trendMode, setTrendMode] = useState<'focus' | 'work'>(showDeepWork ? 'focus' : 'work');

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => format(today, 'yyyy-MM-dd'), [today]);
  const todayMeetings = useMemo(
    () => meetings.filter(m => m.date === todayStr),
    [meetings, todayStr]
  );

  // Today's work record if user manually entered it
  const todayWork = useMemo(
    () => workLogs.find(w => w.date === todayStr),
    [workLogs, todayStr]
  );

  const workingHours = settings.workingHoursPerDay || 8.0;
  const focusRatio = Math.min(
    100,
    Math.round((todaySummary.availableFocusHours / workingHours) * 100)
  );

  // Target completion: either from saved workLog or focus capacity availability
  const hasLoggedWork = Boolean(todayWork && todayWork.actualWorkHours > 0);
  const targetPercent = hasLoggedWork
    ? todaySummary.targetAchievementPercentage
    : (showDeepWork ? focusRatio : 100);

  // Donut Chart Data
  const totalDayHours = workingHours;
  const meetingPercent = Math.round((todaySummary.totalDirectMeetingHours / totalDayHours) * 100);
  const inShiftPercent = Math.round((todaySummary.inShiftMeetingHours / totalDayHours) * 100);
  const overtimePercent = Math.round((todaySummary.overtimeMeetingHours / totalDayHours) * 100);
  const focusPercent = Math.round((todaySummary.availableFocusHours / totalDayHours) * 100);
  const lossPercent = showLoss
    ? Math.round((todaySummary.totalTimeLostHours / totalDayHours) * 100)
    : 0;

  // Build dynamic doughnut datasets based on user toggles
  const doughnutLabels: string[] = [];
  const doughnutValues: number[] = [];
  const doughnutColors: string[] = [];
  const doughnutHovers: string[] = [];

  if (showDeepWork) {
    doughnutLabels.push('Available Deep Work');
    doughnutValues.push(todaySummary.availableFocusHours);
    doughnutColors.push('#10b981');
    doughnutHovers.push('#34d399');
  }

  if (showShift) {
    doughnutLabels.push('In-Shift Meetings', 'Overtime Meetings');
    doughnutValues.push(todaySummary.inShiftMeetingHours, todaySummary.overtimeMeetingHours);
    doughnutColors.push('#6366f1', '#f59e0b');
    doughnutHovers.push('#818cf8', '#fbbf24');
  } else {
    doughnutLabels.push('Direct Meetings');
    doughnutValues.push(todaySummary.totalDirectMeetingHours);
    doughnutColors.push('#6366f1');
    doughnutHovers.push('#818cf8');
  }

  if (showLoss) {
    doughnutLabels.push('Context Loss');
    doughnutValues.push(todaySummary.totalTimeLostHours);
    doughnutColors.push('#f43f5e');
    doughnutHovers.push('#fb7185');
  }

  const doughnutData = {
    labels: doughnutLabels,
    datasets: [
      {
        data: doughnutValues,
        backgroundColor: doughnutColors,
        hoverBackgroundColor: doughnutHovers,
        borderWidth: 2,
        borderColor: '#0f172a',
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '74%',
    plugins: {
      legend: {
        display: false, // Custom interactive badges used below
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        callbacks: {
          label: (context: any) => {
            const val = Number(context.raw) || 0;
            const hrs = Math.floor(val);
            const mins = Math.round((val - hrs) * 60);
            const timeStr = hrs > 0 ? (mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`) : `${mins}m`;
            return ` ${context.label}: ${val.toFixed(1)}h (${timeStr})`;
          },
        },
      },
    },
  };

  // Fixed 7-Day Continuous Bar Chart Sequence (Ending Today)
  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, idx) => {
      const d = subDays(today, 6 - idx);
      const dateStr = format(d, 'yyyy-MM-dd');
      const summary = dailySummaries.find(s => s.date === dateStr);
      const dayMeetings = meetings.filter(m => m.date === dateStr);
      const dayWork = workLogs.find(w => w.date === dateStr);

      const meetingHours = summary
        ? summary.totalDirectMeetingHours
        : Number((dayMeetings.reduce((sum, m) => sum + m.durationMinutes, 0) / 60).toFixed(2));
      const lossHours = summary ? summary.totalTimeLostHours : 0;
      const focusHours = summary
        ? summary.availableFocusHours
        : Math.max(0, Number((workingHours - meetingHours).toFixed(2)));
      const workHours = dayWork ? dayWork.actualWorkHours : (summary ? summary.actualWorkHours : 0);
      const isCurrentDay = isSameDay(d, today);

      return {
        date: d,
        dateStr,
        dayName: format(d, 'EEE'),
        dayNum: format(d, 'd'),
        label: isCurrentDay ? `Today (${format(d, 'EEE')})` : format(d, 'EEE d'),
        meetingHours,
        lossHours,
        focusHours,
        workHours,
        isCurrentDay,
        meetingCount: summary ? summary.totalMeetingsCount : dayMeetings.length,
      };
    });
  }, [dailySummaries, meetings, workLogs, settings, today, workingHours]);

  // Bar Chart 7-day stats
  const avgMeetings7d = useMemo(() => {
    const total = last7Days.reduce((acc, d) => acc + d.meetingHours, 0);
    return (total / 7).toFixed(1);
  }, [last7Days]);

  const peakDay = useMemo(() => {
    let max = last7Days[0];
    for (const d of last7Days) {
      if (d.meetingHours > max.meetingHours) max = d;
    }
    return max;
  }, [last7Days]);

  const barData = {
    labels: last7Days.map(d => d.label),
    datasets: [
      {
        label: 'Direct Meetings',
        data: last7Days.map(d => d.meetingHours),
        backgroundColor: 'rgba(99, 102, 241, 0.85)',
        hoverBackgroundColor: '#818cf8',
        borderRadius: 6,
        borderSkipped: false,
        barPercentage: 0.65,
        categoryPercentage: 0.75,
      },
      ...(showLoss
        ? [
            {
              label: 'Loss Overhead',
              data: last7Days.map(d => d.lossHours),
              backgroundColor: 'rgba(244, 63, 94, 0.85)',
              hoverBackgroundColor: '#fb7185',
              borderRadius: 6,
              borderSkipped: false,
              barPercentage: 0.65,
              categoryPercentage: 0.75,
            },
          ]
        : []),
      ...(showDeepWork
        ? [
            {
              label: trendMode === 'focus' ? 'Available Focus' : 'Work Logged',
              data: last7Days.map(d => (trendMode === 'focus' ? d.focusHours : d.workHours)),
              backgroundColor:
                trendMode === 'focus' ? 'rgba(16, 185, 129, 0.85)' : 'rgba(14, 165, 233, 0.85)',
              hoverBackgroundColor: trendMode === 'focus' ? '#34d399' : '#38bdf8',
              borderRadius: 6,
              borderSkipped: false,
              barPercentage: 0.65,
              categoryPercentage: 0.75,
            },
          ]
        : [
            {
              label: 'Work Logged',
              data: last7Days.map(d => d.workHours),
              backgroundColor: 'rgba(14, 165, 233, 0.85)',
              hoverBackgroundColor: '#38bdf8',
              borderRadius: 6,
              borderSkipped: false,
              barPercentage: 0.65,
              categoryPercentage: 0.75,
            },
          ]),
    ],
  };

  const barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          color: '#94a3b8',
          font: { size: 11, family: 'Inter' },
          usePointStyle: true,
          pointStyleWidth: 8,
          padding: 14,
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          label: (context: any) => {
            const val = Number(context.raw) || 0;
            const hrs = Math.floor(val);
            const mins = Math.round((val - hrs) * 60);
            const timeStr = hrs > 0 ? (mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`) : `${mins}m`;
            return ` ${context.dataset.label}: ${val.toFixed(1)}h (${timeStr})`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#94a3b8',
          font: { size: 11, family: 'Inter' },
        },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        suggestedMax: 8,
        ticks: {
          color: '#64748b',
          font: { size: 10, family: 'Inter' },
          callback: value => `${value}h`,
        },
        grid: {
          color: 'rgba(51, 65, 85, 0.35)',
        },
      },
    },
  };

  const kpiCount = (showDeepWork ? 1 : 0) + (showLoss ? 1 : 0) + 2;

  return (
    <div className="p-6 space-y-6 w-full h-full flex flex-col flex-1 overflow-y-auto">
      {/* Top Quick Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-black text-white tracking-tight">Today's Overview</h2>
            {activeSprint ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/25">
                <Flag className="w-3 h-3 text-indigo-400" />
                <span>{activeSprint.name.split(' - ')[0]}</span>
              </span>
            ) : lastActiveSprint ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700/60">
                <Flag className="w-3 h-3 text-slate-500" />
                <span>Last: {lastActiveSprint.name.split(' - ')[0]}</span>
              </span>
            ) : null}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {format(today, 'EEEE, MMMM d, yyyy')} •{' '}
            {showLoss
              ? 'Direct meeting time vs focus recovery overhead'
              : 'Direct meeting consumption and net deep work bandwidth'}
          </p>
        </div>

        {/* Minimal Timer & Quick Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl shadow-xs backdrop-blur-sm">
            {!timerRunning ? (
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="text"
                  placeholder="Spontaneous Meeting..."
                  value={timerTitle}
                  onChange={e => setTimerTitle(e.target.value)}
                  className="bg-transparent text-white px-1 focus:outline-none w-36 sm:w-44 placeholder:text-slate-500 font-medium"
                />
                <button
                  onClick={() => startSpontaneousTimer()}
                  className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-lg text-emerald-400 font-semibold hover:bg-emerald-500 hover:text-white transition-all shadow-sm active:scale-95"
                  title="Start Spontaneous Meeting Timer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Timer</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                <span className="font-mono font-bold text-rose-400 text-sm">
                  {formatTimerDisplay(timerSeconds)}
                </span>
                <input
                  type="text"
                  value={timerTitle}
                  onChange={e => setTimerTitle(e.target.value)}
                  className="bg-transparent text-white px-1 focus:outline-none w-32 placeholder:text-slate-500 font-medium"
                />
                <button
                  onClick={() => setWidgetMinimized(true)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-indigo-400 hover:bg-slate-700 transition-colors"
                  title="Collapse to Floating Corner Pill"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={stopTimer}
                  className="flex items-center gap-1.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2.5 py-1 rounded-lg font-semibold hover:bg-rose-600 hover:text-white transition-colors"
                  title="Stop and Log Meeting"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modern KPI Cards Grid */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 ${
          kpiCount >= 4 ? 'xl:grid-cols-4' : kpiCount === 3 ? 'xl:grid-cols-3' : 'xl:grid-cols-2'
        } gap-4`}
      >
        {/* Card 1: Direct Meetings */}
        <div className="relative group bg-gradient-to-br from-indigo-950/20 via-slate-900/80 to-slate-900/60 border border-indigo-500/20 hover:border-indigo-500/40 p-5 rounded-2xl shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs text-indigo-300/80 font-bold uppercase tracking-wider">
              Direct Meetings
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Video className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-black text-white tracking-tight">
              {todaySummary.totalDirectMeetingHours}
            </span>
            <span className="text-sm font-medium text-slate-400">hrs</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-slate-800/60 text-slate-400">
            <span>{todaySummary.totalMeetingsCount} sessions logged</span>
            {showShift ? (
              <span className="font-semibold text-indigo-400 font-mono flex items-center gap-1.5">
                <span>Shift: {todaySummary.inShiftMeetingHours}h</span>
                {todaySummary.overtimeMeetingHours > 0 && (
                  <span className="text-amber-400 flex items-center gap-1 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    <Moon className="w-3 h-3 text-amber-400" />
                    <span>+{todaySummary.overtimeMeetingHours}h OT</span>
                  </span>
                )}
              </span>
            ) : (
              <span className="font-semibold text-indigo-400">{meetingPercent}% of day</span>
            )}
          </div>
        </div>

        {/* Card 2: Context Loss (Conditional) */}
        {showLoss && (
          <div className="relative group bg-gradient-to-br from-rose-950/20 via-slate-900/80 to-slate-900/60 border border-rose-500/20 hover:border-rose-500/40 p-5 rounded-2xl shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs text-rose-400 font-bold uppercase tracking-wider">
                Time Lost (Overhead)
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-3xl font-black text-rose-400 tracking-tight">
                {todaySummary.totalTimeLostHours}
              </span>
              <span className="text-sm font-medium text-rose-300/60">hrs</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-slate-800/60 text-slate-400">
              <span>Cognitive switching delay</span>
              <span className="font-semibold text-rose-400">{lossPercent}% penalty</span>
            </div>
          </div>
        )}

        {/* Card 3: Available Focus (Conditional on trackDeepWorkFocus) */}
        {showDeepWork && (
          <div className="relative group bg-gradient-to-br from-emerald-950/20 via-slate-900/80 to-slate-900/60 border border-emerald-500/20 hover:border-emerald-500/40 p-5 rounded-2xl shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
                Available Focus
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-3xl font-black text-emerald-400 tracking-tight">
                {todaySummary.availableFocusHours}
              </span>
              <span className="text-sm font-medium text-emerald-300/60">hrs</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-slate-800/60 text-slate-400">
              <span>Net deep work bandwidth</span>
              <span className="font-semibold text-emerald-400">{focusPercent}% focus</span>
            </div>
          </div>
        )}

        {/* Card 4: Daily Focus Health / Target Completion */}
        <div className="relative group bg-gradient-to-br from-purple-950/20 via-slate-900/80 to-slate-900/60 border border-purple-500/20 hover:border-purple-500/40 p-5 rounded-2xl shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs text-purple-300/80 font-bold uppercase tracking-wider">
              {hasLoggedWork ? 'Target Completion' : showDeepWork ? 'Daily Focus Health' : 'Target Deliverables'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-black text-white tracking-tight">{targetPercent}%</span>
            <span className="text-xs text-slate-400 font-medium">
              {hasLoggedWork
                ? `(${todayWork?.actualWorkHours}h done)`
                : showDeepWork
                ? `(${todaySummary.availableFocusHours}h bandwidth)`
                : 'Tasks tracking active'}
            </span>
          </div>
          <div className="w-full bg-slate-800/90 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, targetPercent)}%` }}
            ></div>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span>Target: {todaySummary.targetFocusHours}h deep work</span>
            <span className="text-indigo-400 font-medium cursor-pointer hover:underline" onClick={() => setActiveTab('work')}>
              {hasLoggedWork ? 'View Log' : '+ Log Work'}
            </span>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Time Breakdown Donut Chart */}
        <div className="lg:col-span-4 bg-slate-900/70 border border-slate-800/80 p-5 rounded-2xl space-y-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Time Breakdown
              </span>
            </div>
            <span className="text-[11px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md font-mono">
              {workingHours}h Day Budget
            </span>
          </div>

          {/* Donut with High-Precision Center Overlay */}
          <div className="relative flex-1 min-h-[200px] flex items-center justify-center my-2">
            <Doughnut data={doughnutData} options={doughnutOptions} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {showDeepWork ? (
                <>
                  <span className="text-3xl font-black text-white tracking-tight leading-none">
                    {todaySummary.availableFocusHours}
                    <span className="text-sm font-semibold text-slate-400 ml-0.5">h</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mt-1">
                    Focus Left
                  </span>
                </>
              ) : (
                <>
                  <span className="text-3xl font-black text-white tracking-tight leading-none">
                    {todaySummary.totalDirectMeetingHours}
                    <span className="text-sm font-semibold text-slate-400 ml-0.5">h</span>
                  </span>
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mt-1">
                    Meeting Load
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Interactive Breakdown Badges */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800/60 text-xs">
            {showDeepWork && (
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Deep Work Focus</span>
                </span>
                <span className="font-mono font-bold">
                  {todaySummary.availableFocusHours}h ({focusPercent}%)
                </span>
              </div>
            )}

            {showShift ? (
              <>
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                    <span>In-Shift Meetings</span>
                  </span>
                  <span className="font-mono font-bold">
                    {todaySummary.inShiftMeetingHours}h ({inShiftPercent}%)
                  </span>
                </div>

                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span className="flex items-center gap-1">
                      <Moon className="w-3 h-3 text-amber-400" />
                      <span>Overtime / Off-Shift</span>
                    </span>
                  </span>
                  <span className="font-mono font-bold">
                    {todaySummary.overtimeMeetingHours}h ({overtimePercent}%)
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                  <span>Direct Meetings</span>
                </span>
                <span className="font-mono font-bold">
                  {todaySummary.totalDirectMeetingHours}h ({meetingPercent}%)
                </span>
              </div>
            )}

            {showLoss && (
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  <span>Context Loss Penalty</span>
                </span>
                <span className="font-mono font-bold">
                  {todaySummary.totalTimeLostHours}h ({lossPercent}%)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 7-Day Continuous Bar Chart (Weekly Burden Trend) */}
        <div className="lg:col-span-8 bg-slate-900/70 border border-slate-800/80 p-5 rounded-2xl space-y-3 flex flex-col justify-between shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Weekly Burden Trend
              </span>
              <span className="text-[11px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md font-medium">
                Past 7 Days
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Toggle Focus vs Work Mode (Only shown if showDeepWork is enabled) */}
              {showDeepWork && (
                <div className="inline-flex p-0.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium">
                  <button
                    onClick={() => setTrendMode('focus')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      trendMode === 'focus'
                        ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Compare Meetings vs Deep Work Bandwidth"
                  >
                    Focus Bandwidth
                  </button>
                  <button
                    onClick={() => setTrendMode('work')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      trendMode === 'work'
                        ? 'bg-sky-500/20 text-sky-400 font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Compare Meetings vs Logged Work Done"
                  >
                    Work Done
                  </button>
                </div>
              )}

              <button
                onClick={() => setActiveTab('records')}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold hover:underline"
              >
                <span>Records</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick 7-Day Stats Chips */}
          <div className="flex items-center gap-4 text-xs text-slate-400 pb-1">
            <span>
              7-Day Avg Meeting Load:{' '}
              <strong className="text-white font-mono">{avgMeetings7d}h / day</strong>
            </span>
            <span>•</span>
            <span>
              Peak Day:{' '}
              <strong className="text-indigo-400 font-mono">
                {peakDay.meetingHours > 0 ? `${peakDay.label} (${peakDay.meetingHours.toFixed(1)}h)` : 'None (0h)'}
              </strong>
            </span>
          </div>

          {/* Bar Canvas */}
          <div className="flex-1 min-h-[230px]">
            <Bar data={barData} options={barOptions} />
          </div>
        </div>
      </div>

      {/* Today's Logged Meetings Feed */}
      <div className="bg-slate-900/70 border border-slate-800/80 p-5 rounded-2xl space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Today's Logged Meetings
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {todayMeetings.length} {todayMeetings.length === 1 ? 'meeting' : 'meetings'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('meetings')}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold hover:underline"
            >
              <span>View All &rarr;</span>
            </button>
          </div>
        </div>

        {todayMeetings.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-xs text-slate-500 font-medium">
            No meetings logged yet today. Click "Start Timer" or "+ Log Meeting" to record a session.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {todayMeetings.map(m => {
              const split = calculateShiftSplit(m.startTime, m.endTime, m.durationMinutes);

              const impactColor =
                m.impactLevel === 'HIGH'
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : m.impactLevel === 'MEDIUM'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

              const categoryColor =
                m.category === 'All-Hands' || m.category === 'Standup'
                  ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                  : m.category === 'Client'
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : m.category === 'Technical'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';

              return (
                <div
                  key={m.id}
                  className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40 transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider shrink-0 ${categoryColor}`}
                      >
                        {m.category}
                      </span>
                      <h4 className="font-bold text-white text-sm truncate group-hover:text-indigo-300 transition-colors">
                        {m.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1.5">
                      <span className="font-mono">
                        {formatDisplayTime(m.startTime)} - {formatDisplayTime(m.endTime)}
                      </span>
                      {m.participantsCount && (
                        <>
                          <span>•</span>
                          <span>{m.participantsCount} participants</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0 space-y-1">
                    <div className="inline-block font-mono font-bold text-slate-200 text-sm bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700/60">
                      {m.durationMinutes}m
                    </div>
                    {showShift && split.overtimeMinutes > 0 && (
                      <div className="flex items-center justify-end">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <Moon className="w-3 h-3 text-amber-400" />
                          <span>{split.inShiftMinutes === 0 ? 'Off-Shift' : `+${split.overtimeMinutes}m OT`}</span>
                        </span>
                      </div>
                    )}
                    {showShift && (split.lunchMinutes || 0) > 0 && split.overtimeMinutes === 0 && (
                      <div className="flex items-center justify-end">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          <UtensilsCrossed className="w-3 h-3 text-amber-400" />
                          <span>Lunch ({split.lunchMinutes}m)</span>
                        </span>
                      </div>
                    )}
                    {showLoss && m.contextSwitchLossMinutes > 0 && (
                      <div className="text-[11px] text-rose-400 font-medium">
                        +{m.contextSwitchLossMinutes}m lost
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

