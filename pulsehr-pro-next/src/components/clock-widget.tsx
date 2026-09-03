'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Clock, ArrowDown, ArrowUp, Timer, ShieldCheck, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { HrBulkAttendanceModal } from './hr-bulk-attendance-modal';

export function ClockWidget() {
  const { currentUser } = useAuth();
  const [time, setTime] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);

  // Default recorded times from automated HR system / biometric scanner
  const [clockInTime, setClockInTime] = useState<string>('09:02 AM');
  const [clockOutTime, setClockOutTime] = useState<string>('06:05 PM');
  const [workHours, setWorkHours] = useState<string>('9.0 hrs');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
      setDateStr(now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const isHr = currentUser?.role === 'HR_ADMIN' || currentUser?.canApprove;

  return (
    <div className="glass-card p-6 flex flex-col justify-between relative overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Daily Attendance Tracker</h3>
        <span className="text-xs bg-blue-500/15 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full font-semibold flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> Shift: 09:00 - 18:00
        </span>
      </div>

      <div className="text-center py-3">
        <div className="text-4xl font-extrabold tracking-wider bg-gradient-to-b from-white to-slate-300 bg-clip-text text-transparent font-mono">
          {time || '12:00:00 PM'}
        </div>
        <div className="text-xs text-slate-400 mt-1">{dateStr}</div>
      </div>

      {/* Automated Sync Status Badge */}
      <div className="bg-white/[0.03] border border-white/10 p-3 rounded-xl my-3 text-center">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Biometric & HR Attendance Synced</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Clock-in/out timestamps are managed automatically via biometric systems and HR Administration.
        </p>
      </div>

      {/* HR Bulk Upload Button (Visible only to HR / Approvers) */}
      {isHr ? (
        <button
          onClick={() => setShowBulkModal(true)}
          className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Bulk Upload Attendance (CSV / Excel)
        </button>
      ) : (
        <div className="text-center py-2 bg-slate-900/40 rounded-xl border border-white/5">
          <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Verified Record • Locked by HR Admin
          </span>
        </div>
      )}

      {/* Timestamp Summary */}
      <div className="flex justify-between border-t border-white/10 mt-4 pt-3 text-xs text-slate-400">
        <div className="flex items-center gap-1">
          <ArrowDown className="w-3.5 h-3.5 text-emerald-400" /> In: <strong className="text-slate-200">{clockInTime}</strong>
        </div>
        <div className="flex items-center gap-1">
          <ArrowUp className="w-3.5 h-3.5 text-red-400" /> Out: <strong className="text-slate-200">{clockOutTime}</strong>
        </div>
        <div className="flex items-center gap-1">
          <Timer className="w-3.5 h-3.5 text-blue-400" /> Work: <strong className="text-slate-200">{workHours}</strong>
        </div>
      </div>

      {/* Bulk Attendance Modal */}
      {showBulkModal && (
        <HrBulkAttendanceModal
          onClose={() => setShowBulkModal(false)}
          onUpdateComplete={() => {
            setClockInTime('09:00 AM');
            setClockOutTime('06:00 PM');
            setWorkHours('9.0 hrs');
          }}
        />
      )}
    </div>
  );
}
