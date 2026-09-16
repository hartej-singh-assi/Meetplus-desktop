import React, { useState } from 'react';
import { useMeetingTracker } from '../context/MeetingTrackerContext';
import { MeetingRecord } from '../types';
import {
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Plus, Edit3 } from 'lucide-react';

interface CalendarViewProps {
  onOpenNewMeetingWithDate?: (dateStr: string) => void;
  onEditMeeting?: (meeting: MeetingRecord) => void;
}

type ViewMode = 'month' | 'week' | 'day';

export const CalendarView: React.FC<CalendarViewProps> = ({
  onOpenNewMeetingWithDate,
  onEditMeeting,
}) => {
  const { meetings, formatDisplayTime, settings } = useMeetingTracker();

  const [currentDate, setCurrentDateState] = useState<Date>(new Date('2026-09-10T10:00:00'));

  const setCurrentDate = (d: Date | ((prev: Date) => Date)) => {
    setCurrentDateState(prev => {
      const next = typeof d === 'function' ? d(prev) : d;
      try {
        localStorage.setItem('meetpulse_calendar_date', next.toISOString());
      } catch (e) {}
      return next;
    });
  };

  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    try {
      return (localStorage.getItem('meetpulse_calendar_view') as ViewMode) || 'week';
    } catch (e) {
      return 'week';
    }
  });

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem('meetpulse_calendar_view', mode);
    } catch (e) {}
  };

  const handlePrev = () => {
    if (viewMode === 'month') setCurrentDate(prev => subMonths(prev, 1));
    else if (viewMode === 'week') setCurrentDate(prev => subWeeks(prev, 1));
    else setCurrentDate(prev => subDays(prev, 1));
  };

  const handleNext = () => {
    if (viewMode === 'month') setCurrentDate(prev => addMonths(prev, 1));
    else if (viewMode === 'week') setCurrentDate(prev => addWeeks(prev, 1));
    else setCurrentDate(prev => addDays(prev, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Keyboard navigation for Calendar
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 't' || e.key === 'T') {
        handleToday();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode]);

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Standup':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'Technical':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'Client':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case '1-on-1':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'Ad-hoc':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      default:
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
    }
  };

  const getWeekMeetingCardClass = (category: string) => {
    switch (category) {
      case 'Standup':
        return 'bg-emerald-950/90 hover:bg-emerald-900/90 text-emerald-100 border-emerald-500/50 hover:border-emerald-400 shadow-lg shadow-emerald-950/50';
      case 'Technical':
        return 'bg-cyan-950/90 hover:bg-cyan-900/90 text-cyan-100 border-cyan-500/50 hover:border-cyan-400 shadow-lg shadow-cyan-950/50';
      case 'Client':
        return 'bg-amber-950/90 hover:bg-amber-900/90 text-amber-100 border-amber-500/50 hover:border-amber-400 shadow-lg shadow-amber-950/50';
      case '1-on-1':
        return 'bg-purple-950/90 hover:bg-purple-900/90 text-purple-100 border-purple-500/50 hover:border-purple-400 shadow-lg shadow-purple-950/50';
      case 'Ad-hoc':
        return 'bg-rose-950/90 hover:bg-rose-900/90 text-rose-100 border-rose-500/50 hover:border-rose-400 shadow-lg shadow-rose-950/50';
      default:
        return 'bg-indigo-950/90 hover:bg-indigo-900/90 text-indigo-100 border-indigo-500/50 hover:border-indigo-400 shadow-lg shadow-indigo-950/50';
    }
  };

  const HOUR_HEIGHT = 64; // Pixels per hour

  interface PositionedMeeting {
    meeting: MeetingRecord;
    top: number;
    height: number;
    leftPercent: number;
    widthPercent: number;
  }

  // Calculate proportional vertical placement and duration stretch for meetings on a day
  const calculateDayMeetingsLayout = (dayMeetings: MeetingRecord[]): PositionedMeeting[] => {
    if (dayMeetings.length === 0) return [];

    const parsed = dayMeetings.map(m => {
      let [startH, startMin] = (m.startTime || '00:00').split(':').map(Number);
      if (isNaN(startH)) startH = 0;
      if (isNaN(startMin)) startMin = 0;
      const startMins = Math.max(0, Math.min(24 * 60, startH * 60 + startMin));
      const duration = Math.max(5, m.durationMinutes || 30);
      const endMins = Math.min(24 * 60, startMins + duration);
      return {
        meeting: m,
        startMins,
        endMins,
        duration,
      };
    });

    // Sort by start time ascending, then longer duration first
    parsed.sort((a, b) => a.startMins - b.startMins || b.duration - a.duration);

    // Group overlapping meetings into clusters
    const clusters: (typeof parsed)[] = [];
    let currentCluster: typeof parsed = [];
    let clusterEnd = -1;

    for (const item of parsed) {
      if (currentCluster.length === 0) {
        currentCluster.push(item);
        clusterEnd = item.endMins;
      } else if (item.startMins < clusterEnd) {
        currentCluster.push(item);
        clusterEnd = Math.max(clusterEnd, item.endMins);
      } else {
        clusters.push(currentCluster);
        currentCluster = [item];
        clusterEnd = item.endMins;
      }
    }
    if (currentCluster.length > 0) {
      clusters.push(currentCluster);
    }

    const result: PositionedMeeting[] = [];

    for (const cluster of clusters) {
      const columns: (typeof parsed)[] = [];

      for (const item of cluster) {
        let placed = false;
        for (let c = 0; c < columns.length; c++) {
          const lastInCol = columns[c][columns[c].length - 1];
          if (lastInCol.endMins <= item.startMins) {
            columns[c].push(item);
            placed = true;
            break;
          }
        }
        if (!placed) {
          columns.push([item]);
        }
      }

      const totalCols = columns.length;

      for (let c = 0; c < totalCols; c++) {
        for (const item of columns[c]) {
          const top = (item.startMins / 60) * HOUR_HEIGHT;
          const maxHeightOnDay = Math.max(26, 24 * HOUR_HEIGHT - top - 2);
          const height = Math.min(maxHeightOnDay, Math.max(26, (item.duration / 60) * HOUR_HEIGHT));
          const leftPercent = (c / totalCols) * 100;
          const widthPercent = (1 / totalCols) * 100;

          result.push({
            meeting: item.meeting,
            top,
            height,
            leftPercent,
            widthPercent,
          });
        }
      }
    }

    return result;
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthDays = eachDayOfInterval({ start: startDate, end: endDate });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const hoursGrid = Array.from({ length: 24 }, (_, i) => i); // Full 24-hour day schedule

  const weekScrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (viewMode === 'week' && weekScrollRef.current) {
      // Scroll to 8:00 AM on view mount (8 * 64px = 512px)
      weekScrollRef.current.scrollTop = 8 * HOUR_HEIGHT;
    }
  }, [viewMode]);

  const formatTime = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <div className="p-6 space-y-4 w-full h-full flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Calendar Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {viewMode === 'month' && format(currentDate, 'MMMM yyyy')}
              {viewMode === 'week' && `Week of ${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`}
              {viewMode === 'day' && format(currentDate, 'EEEE, MMMM d, yyyy')}
            </h2>
            <p className="text-xs text-slate-400">Teams-style interactive meeting calendar timeline</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Navigation Arrows */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
            <button
              onClick={handlePrev}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* View Switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs font-semibold">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                viewMode === 'month' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                viewMode === 'week' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                viewMode === 'day' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Day
            </button>
          </div>
        </div>
      </div>

      {/* MONTH VIEW */}
      {viewMode === 'month' && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden text-xs flex-1 flex flex-col min-h-0 shadow-xl">
          {/* Days Header */}
          <div className="grid grid-cols-7 bg-slate-950/90 border-b border-slate-800 text-slate-400 font-semibold py-3 text-center text-xs shrink-0">
            <span>Monday</span>
            <span>Tuesday</span>
            <span>Wednesday</span>
            <span>Thursday</span>
            <span>Friday</span>
            <span>Saturday</span>
            <span>Sunday</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-800/60 flex-1 overflow-y-auto min-h-0">
            {monthDays.map((day, idx) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const dayMeetings = meetings.filter(m => m.date === dayStr);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={idx}
                  className={`p-2.5 flex flex-col justify-between transition-colors min-h-[110px] ${
                    !isCurrentMonth ? 'bg-slate-950/40 text-slate-600' : 'hover:bg-slate-800/20'
                  } ${isCurrentDay ? 'bg-indigo-950/20' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-bold text-xs w-6 h-6 flex items-center justify-center rounded-full ${
                        isCurrentDay
                          ? 'bg-indigo-600 text-white shadow-md'
                          : isCurrentMonth
                          ? 'text-slate-300'
                          : 'text-slate-600'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>

                    {isCurrentMonth && onOpenNewMeetingWithDate && (
                      <button
                        onClick={() => onOpenNewMeetingWithDate(dayStr)}
                        className="text-slate-600 hover:text-indigo-400 p-1 rounded-md hover:bg-slate-800 transition-colors"
                        title="Add meeting on this day"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Meeting Badges */}
                  <div className="mt-1.5 space-y-1 overflow-y-auto max-h-[120px]">
                    {dayMeetings.map(m => (
                      <div
                        key={m.id}
                        onClick={() => onEditMeeting && onEditMeeting(m)}
                        className={`p-1.5 rounded-lg border text-xs font-semibold cursor-pointer truncate transition-all hover:scale-[1.01] shadow-xs ${getCategoryBadgeClass(
                          m.category
                        )}`}
                        title={`${m.title} (${m.startTime}) - Click to edit`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate">{m.title}</span>
                          <span className="text-[10px] opacity-80 shrink-0">{m.startTime}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {viewMode === 'week' && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden text-xs flex-1 flex flex-col min-h-0 shadow-xl">
          {/* Days Header */}
          <div className="grid grid-cols-8 bg-slate-950/90 border-b border-slate-800 text-slate-400 font-semibold py-3 text-center shrink-0 pr-1.5">
            <span className="text-slate-500 font-mono">Time</span>
            {weekDays.map(day => {
              const isCurrentDay = isToday(day);
              return (
                <div key={day.toISOString()} className={isCurrentDay ? 'text-indigo-400 font-bold' : ''}>
                  <div className="text-xs uppercase tracking-wider">{format(day, 'EEE')}</div>
                  <div className="text-xs text-slate-400 font-normal">{format(day, 'MMM d')}</div>
                </div>
              );
            })}
          </div>

          {/* Time Grid - Scrollable 24 Hours with Proportional Placement */}
          <div ref={weekScrollRef} className="flex-1 overflow-y-auto min-h-0 select-none">
            <div className="grid grid-cols-8 min-h-[1536px] relative">
              {/* Time Column (24 Hours) */}
              <div className="border-r border-slate-800/60 bg-slate-950/40 shrink-0">
                {hoursGrid.map(hour => {
                  const hourStr = `${hour.toString().padStart(2, '0')}:00`;
                  return (
                    <div
                      key={hour}
                      className="h-[64px] border-b border-slate-800/50 p-2 text-slate-500 font-mono text-xs flex items-start justify-center font-semibold"
                    >
                      <span className="-translate-y-2.5 bg-slate-950 px-1 py-0.5 rounded text-[11px] text-slate-400">
                        {formatDisplayTime(hourStr)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* 7 Day Columns */}
              {weekDays.map(day => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const isCurrentDay = isToday(day);

                // Direct meetings starting on this day
                const directMeetings = meetings.filter(m => m.date === dayStr);

                // Overnight meetings from the previous day crossing midnight
                const prevDayStr = format(subDays(day, 1), 'yyyy-MM-dd');
                const continuationMeetings: MeetingRecord[] = meetings
                  .filter(m => {
                    if (m.date !== prevDayStr) return false;
                    const [sh, sm] = (m.startTime || '00:00').split(':').map(Number);
                    const startM = (sh || 0) * 60 + (sm || 0);
                    return startM + (m.durationMinutes || 0) > 24 * 60;
                  })
                  .map(m => {
                    const [sh, sm] = (m.startTime || '00:00').split(':').map(Number);
                    const startM = (sh || 0) * 60 + (sm || 0);
                    const remainingMins = startM + (m.durationMinutes || 0) - 24 * 60;
                    return {
                      ...m,
                      id: `${m.id}-cont`,
                      title: `${m.title} (Overnight cont.)`,
                      startTime: '00:00',
                      durationMinutes: remainingMins,
                    };
                  });

                const allDayMeetings = [...directMeetings, ...continuationMeetings];
                const positionedMeetings = calculateDayMeetingsLayout(allDayMeetings);

                return (
                  <div
                    key={dayStr}
                    className={`relative border-r border-slate-800/60 h-[1536px] ${
                      isCurrentDay ? 'bg-indigo-950/10' : ''
                    }`}
                  >
                    {/* Background hour grid lines */}
                    {hoursGrid.map(hour => (
                      <div
                        key={hour}
                        onClick={() => onOpenNewMeetingWithDate && onOpenNewMeetingWithDate(dayStr)}
                        className="h-[64px] border-b border-slate-800/40 hover:bg-slate-800/15 transition-colors cursor-pointer relative"
                        title={`Click to log meeting on ${format(day, 'EEE, MMM d')} at ${formatDisplayTime(`${hour.toString().padStart(2, '0')}:00`)}`}
                      >
                        {/* 30-minute subtle dashed guideline */}
                        <div className="absolute top-1/2 left-0 right-0 border-b border-slate-800/25 border-dashed pointer-events-none" />
                      </div>
                    ))}

                    {/* Current Live Time Indicator (for today) */}
                    {isCurrentDay && (() => {
                      const now = new Date();
                      const nowMins = now.getHours() * 60 + now.getMinutes();
                      const nowTop = (nowMins / 60) * HOUR_HEIGHT;
                      return (
                        <div
                          className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                          style={{ top: `${nowTop}px` }}
                        >
                          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 -ml-1.5 shadow-sm shadow-rose-500/50 ring-2 ring-rose-500/30" />
                          <div className="flex-1 border-t-2 border-rose-500 shadow-sm" />
                        </div>
                      );
                    })()}

                    {/* Positioned & Stretched Meeting Blocks */}
                    {positionedMeetings.map(({ meeting: m, top, height, leftPercent, widthPercent }) => {
                      const isMini = height < 34;
                      const isCompact = height < 58;

                      return (
                        <div
                          key={m.id}
                          onClick={e => {
                            e.stopPropagation();
                            const targetMeeting = m.id.endsWith('-cont')
                              ? meetings.find(orig => orig.id === m.id.replace('-cont', '')) || m
                              : m;
                            onEditMeeting && onEditMeeting(targetMeeting);
                          }}
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            left: `calc(${leftPercent}% + 3px)`,
                            width: `calc(${widthPercent}% - 6px)`,
                          }}
                          className={`absolute z-10 p-2.5 rounded-xl border text-xs cursor-pointer transition-all hover:scale-[1.01] hover:z-20 hover:shadow-2xl overflow-hidden flex flex-col justify-start backdrop-blur-md shadow-md ${getWeekMeetingCardClass(
                            m.category
                          )}`}
                          title={`${m.title} (${formatDisplayTime(m.startTime)} - ${formatDisplayTime(m.endTime)}, ${formatTime(m.durationMinutes)}) - Click to edit`}
                        >
                          {isMini ? (
                            <div className="flex items-center justify-between gap-1 text-[10px] leading-tight truncate">
                              <span className="font-bold truncate text-white">{m.title}</span>
                              <span className="opacity-80 shrink-0 font-mono">{formatDisplayTime(m.startTime)}</span>
                            </div>
                          ) : isCompact ? (
                            <div className="space-y-0.5">
                              <div className="font-bold text-white truncate leading-tight">{m.title}</div>
                              <div className="text-[10px] opacity-85 truncate font-medium">
                                {formatDisplayTime(m.startTime)} • {formatTime(m.durationMinutes)}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1 h-full flex flex-col">
                              <div className="flex items-start justify-between gap-1.5">
                                <span className="font-bold text-white text-xs leading-snug line-clamp-2">{m.title}</span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white/10 uppercase tracking-wider shrink-0">
                                  {m.category}
                                </span>
                              </div>
                              <div className="text-[11px] opacity-90 font-medium">
                                {formatDisplayTime(m.startTime)} - {formatDisplayTime(m.endTime)}
                                <span className="opacity-75 ml-1 font-normal">({formatTime(m.durationMinutes)})</span>
                              </div>
                              {height >= 90 && m.notes && (
                                <p className="text-[11px] opacity-75 line-clamp-2 mt-1 leading-relaxed font-normal">
                                  {m.notes}
                                </p>
                              )}
                              {height >= 120 && m.participantsCount && (
                                <div className="text-[10px] opacity-70 mt-auto pt-1 flex items-center gap-1 font-medium">
                                  <span>{m.participantsCount} attendees</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* DAY VIEW */}
      {viewMode === 'day' && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4 text-xs flex-1 flex flex-col shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
            <div>
              <h3 className="text-base font-bold text-white">Daily Schedule & Detailed Breakdown</h3>
              <p className="text-slate-400">{format(currentDate, 'EEEE, MMMM d, yyyy')}</p>
            </div>
            {onOpenNewMeetingWithDate && (
              <button
                onClick={() => onOpenNewMeetingWithDate(format(currentDate, 'yyyy-MM-dd'))}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Log Meeting for Today</span>
              </button>
            )}
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {meetings
              .filter(m => m.date === format(currentDate, 'yyyy-MM-dd'))
              .map(m => (
                <div
                  key={m.id}
                  className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between hover:border-indigo-500/40 transition-all"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-white text-base">{m.title}</span>
                      <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${getCategoryBadgeClass(m.category)}`}>
                        {m.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400 text-xs">
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {formatDisplayTime(m.startTime)} - {formatDisplayTime(m.endTime)}
                      </span>
                      <span>•</span>
                      <span>Duration: <strong className="text-indigo-300">{formatTime(m.durationMinutes)}</strong></span>
                      {settings.trackContextLoss && (
                        <>
                          <span>•</span>
                          <span className="text-rose-400 font-semibold">Overhead Loss: +{m.contextSwitchLossMinutes}m</span>
                        </>
                      )}
                    </div>
                    {m.notes && <p className="text-slate-300 text-xs mt-1 leading-relaxed">{m.notes}</p>}
                  </div>

                  {onEditMeeting && (
                    <button
                      onClick={() => onEditMeeting(m)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-all"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>
              ))}

            {meetings.filter(m => m.date === format(currentDate, 'yyyy-MM-dd')).length === 0 && (
              <div className="p-12 text-center text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/40 font-medium">
                No meetings scheduled or logged for this day.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
