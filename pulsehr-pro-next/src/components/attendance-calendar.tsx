'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarPlus, Clock, Info } from 'lucide-react';
import { AttendanceRecord } from '@/types';

export function AttendanceCalendar() {
  const [viewYear, setViewYear] = useState<number>(2026);
  const [viewMonth, setViewMonth] = useState<number>(7); // August (0-indexed 7)
  const [selectedRecord, setSelectedRecord] = useState<{ date: string; rec: AttendanceRecord } | null>(null);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Helper to generate dynamic attendance records per day
  const getRecordForDay = (day: number): AttendanceRecord => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const d = new Date(viewYear, viewMonth, day);
    const dayOfWeek = d.getDay(); // 0 = Sun, 6 = Sat

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return {
        date: dateStr,
        status: 'WEEKEND',
        clockIn: '--:--',
        clockOut: '--:--',
        hours: 0,
        location: 'Non-Working Day',
        notes: dayOfWeek === 6 ? 'Saturday Off' : 'Sunday Off'
      };
    } else if (viewMonth === 7 && day === 15) { // Aug 15 Independence Day
      return {
        date: dateStr,
        status: 'HOLIDAY',
        clockIn: '--:--',
        clockOut: '--:--',
        hours: 0,
        location: 'National Holiday',
        notes: 'Independence Day'
      };
    } else if (viewMonth === 7 && day === 6) {
      return {
        date: dateStr,
        status: 'LEAVE',
        clockIn: '--:--',
        clockOut: '--:--',
        hours: 0,
        location: 'Approved Leave',
        notes: 'Casual Leave'
      };
    } else if (viewMonth === 7 && (day === 4 || day === 11)) {
      return {
        date: dateStr,
        status: 'LATE',
        clockIn: '09:28 AM',
        clockOut: '06:15 PM',
        hours: 8.8,
        location: 'HQ Tech Park'
      };
    } else if (viewYear === 2026 && viewMonth === 7 && day > 10) {
      return {
        date: dateStr,
        status: 'UPCOMING',
        clockIn: '--:--',
        clockOut: '--:--',
        hours: 0,
        location: 'Shift Scheduled'
      };
    } else {
      return {
        date: dateStr,
        status: 'PRESENT',
        clockIn: '09:02 AM',
        clockOut: '06:05 PM',
        hours: 9.0,
        location: 'HQ Tech Park'
      };
    }
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  
  // Calculate starting offset for Monday-first calendar grid
  // new Date(year, month, 1).getDay(): 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  // Transform to Monday-first (Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6)
  const startingOffset = (firstDayOfWeek + 6) % 7;

  return (
    <div className="glass-card p-6 flex flex-col gap-6">
      {/* Calendar Navigation Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (viewMonth === 0) {
                setViewMonth(11);
                setViewYear(viewYear - 1);
              } else {
                setViewMonth(viewMonth - 1);
              }
            }}
            className="w-9 h-9 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 flex items-center justify-center transition"
          >
            <ChevronLeft className="w-4 h-4 text-slate-300" />
          </button>
          <div className="text-lg font-extrabold min-w-[160px] text-center text-slate-100">
            {monthNames[viewMonth]} {viewYear}
          </div>
          <button
            onClick={() => {
              if (viewMonth === 11) {
                setViewMonth(0);
                setViewYear(viewYear + 1);
              } else {
                setViewMonth(viewMonth + 1);
              }
            }}
            className="w-9 h-9 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 flex items-center justify-center transition"
          >
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>
        </div>

        {/* Status Legend */}
        <div className="flex flex-wrap gap-2 text-[11px] font-medium">
          <span className="status-badge present">Present</span>
          <span className="status-badge late">Late</span>
          <span className="status-badge leave">Leave</span>
          <span className="status-badge holiday">Holiday</span>
          <span className="status-badge weekend">Weekend</span>
        </div>
      </div>

      {/* Weekday Column Headers (Monday to Sunday) */}
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-wider">
        <div className="text-slate-400 py-1">Mon</div>
        <div className="text-slate-400 py-1">Tue</div>
        <div className="text-slate-400 py-1">Wed</div>
        <div className="text-slate-400 py-1">Thu</div>
        <div className="text-slate-400 py-1">Fri</div>
        <div className="text-indigo-400 bg-indigo-500/10 rounded-lg py-1">Sat</div>
        <div className="text-indigo-400 bg-indigo-500/10 rounded-lg py-1">Sun</div>
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Render empty leading offset cells for days before the 1st of the month */}
        {Array.from({ length: startingOffset }).map((_, idx) => (
          <div
            key={`empty-${idx}`}
            className="min-h-[92px] p-2 rounded-xl bg-slate-950/20 border border-white/[0.02] opacity-25 select-none"
          />
        ))}

        {/* Render month days */}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const day = idx + 1;
          const rec = getRecordForDay(day);
          const isToday = viewYear === 2026 && viewMonth === 7 && day === 10;
          const isWeekend = rec.status === 'WEEKEND';

          return (
            <div
              key={day}
              onClick={() => setSelectedRecord({ date: rec.date, rec })}
              className={`min-h-[92px] p-2.5 rounded-xl flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-0.5 ${
                isWeekend
                  ? 'bg-slate-900/40 border border-white/5 hover:border-indigo-500/40'
                  : 'bg-white/[0.03] border border-white/10 hover:bg-white/[0.07] hover:border-white/20'
              } ${isToday ? 'border-2 border-blue-500 shadow-lg shadow-blue-500/25 ring-2 ring-blue-500/20' : ''}`}
            >
              <div className="flex justify-between items-center">
                <span className={`text-xs font-extrabold ${isWeekend ? 'text-slate-500' : 'text-slate-200'}`}>
                  {day}
                </span>
                <span className={`status-badge ${rec.status.toLowerCase()}`}>
                  {rec.status}
                </span>
              </div>

              <div className="text-[11px] text-slate-400 flex flex-col gap-0.5 mt-2">
                {isWeekend ? (
                  <div className="text-[10px] text-slate-500 font-medium italic">Off Shift</div>
                ) : (
                  <>
                    {rec.clockIn !== '--:--' && (
                      <div className="flex items-center gap-1 font-mono text-[10px] text-slate-300">
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" /> {rec.clockIn}
                      </div>
                    )}
                    {rec.hours > 0 && (
                      <div className="font-bold text-blue-400 text-[10px]">{rec.hours} hrs</div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Day Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-card max-w-md w-full p-6 relative border border-white/20 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-100">
                Attendance Log — {selectedRecord.date}
              </h3>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                &times;
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className={`status-badge ${selectedRecord.rec.status.toLowerCase()}`}>
                {selectedRecord.rec.status}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {selectedRecord.rec.location}
              </span>
            </div>

            {selectedRecord.rec.status === 'WEEKEND' ? (
              <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 text-xs text-slate-400 space-y-1">
                <div className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-indigo-400" /> Non-Working Weekend Day
                </div>
                <p className="text-[11px] text-slate-400">
                  Standard weekly rest period. If you worked on this day, submit a Comp-Off claim via WFH & Comp-Off tab.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Clock In</div>
                  <div className="text-sm font-bold text-slate-100 font-mono mt-0.5">
                    {selectedRecord.rec.clockIn}
                  </div>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Clock Out</div>
                  <div className="text-sm font-bold text-slate-100 font-mono mt-0.5">
                    {selectedRecord.rec.clockOut}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-white/10 mt-4">
              <span className="text-xs text-slate-400">
                Hours Recorded: <strong className="text-blue-400">{selectedRecord.rec.hours} hrs</strong>
              </span>
              <button
                onClick={() => setSelectedRecord(null)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
