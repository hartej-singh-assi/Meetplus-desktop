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
  const { meetings, formatDisplayTime } = useMeetingTracker();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');

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
      weekScrollRef.current.scrollTop = 512;
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
          <div className="grid grid-cols-8 bg-slate-950/90 border-b border-slate-800 text-slate-400 font-semibold py-3 text-center shrink-0">
            <span className="text-slate-500 font-mono">Time</span>
            {weekDays.map(day => (
              <div key={day.toISOString()} className={isToday(day) ? 'text-indigo-400 font-bold' : ''}>
                <div className="text-xs uppercase tracking-wider">{format(day, 'EEE')}</div>
                <div className="text-xs text-slate-400 font-normal">{format(day, 'MMM d')}</div>
              </div>
            ))}
          </div>

          {/* Time Grid - Scrollable 24 Hours */}
          <div ref={weekScrollRef} className="divide-y divide-slate-800/50 flex-1 overflow-y-auto min-h-0">
            {hoursGrid.map(hour => {
              const hourStr = `${hour.toString().padStart(2, '0')}:00`;
              return (
                <div key={hour} className="grid grid-cols-8 min-h-[64px]">
                  <div className="p-2.5 text-slate-500 font-mono text-xs border-r border-slate-800/60 flex items-center justify-center font-semibold bg-slate-950/40 shrink-0 select-none">
                    {formatDisplayTime(hourStr)}
                  </div>
                  {weekDays.map(day => {
                    const dayStr = format(day, 'yyyy-MM-dd');
                    const slotMeetings = meetings.filter(m => {
                      if (m.date !== dayStr) return false;
                      const [h] = m.startTime.split(':').map(Number);
                      return h === hour;
                    });

                    return (
                      <div
                        key={dayStr}
                        className="p-1.5 border-r border-slate-800/60 hover:bg-slate-800/20 transition-all flex flex-col gap-1"
                      >
                        {slotMeetings.map(m => (
                          <div
                            key={m.id}
                            onClick={() => onEditMeeting && onEditMeeting(m)}
                            className={`p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all hover:scale-[1.01] shadow-xs ${getCategoryBadgeClass(
                              m.category
                            )}`}
                          >
                            <div className="font-bold truncate">{m.title}</div>
                            <div className="text-[11px] opacity-80 mt-0.5">
                              {formatDisplayTime(m.startTime)} • {formatTime(m.durationMinutes)}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
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
                      <span>•</span>
                      <span className="text-rose-400 font-semibold">Overhead Loss: +{m.contextSwitchLossMinutes}m</span>
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
