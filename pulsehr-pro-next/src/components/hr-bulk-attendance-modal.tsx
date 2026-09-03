'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { X, Upload, Download, FileSpreadsheet, Check, AlertCircle, Clock } from 'lucide-react';

interface AttendanceRow {
  empId: string;
  name: string;
  date: string;
  clockIn: string;
  clockOut: string;
  status: 'PRESENT' | 'LATE' | 'HALFDAY' | 'ABSENT';
}

interface HrBulkAttendanceModalProps {
  onClose: () => void;
  onUpdateComplete?: () => void;
}

export function HrBulkAttendanceModal({ onClose, onUpdateComplete }: HrBulkAttendanceModalProps) {
  const { addToast } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);

  // Mock parsed CSV records for demonstration
  const [parsedRecords, setParsedRecords] = useState<AttendanceRow[]>([
    { empId: 'EMP-84920', name: 'John Doe', date: '2026-08-10', clockIn: '09:02 AM', clockOut: '06:05 PM', status: 'PRESENT' },
    { empId: 'EMP-84931', name: 'Alex Rivera', date: '2026-08-10', clockIn: '09:28 AM', clockOut: '06:00 PM', status: 'LATE' },
    { empId: 'EMP-90211', name: 'Sarah Jenkins', date: '2026-08-10', clockIn: '08:55 AM', clockOut: '06:30 PM', status: 'PRESENT' },
    { empId: 'EMP-77102', name: 'David Miller', date: '2026-08-10', clockIn: '09:00 AM', clockOut: '01:30 PM', status: 'HALFDAY' },
  ]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setIsPreviewing(true);
      addToast(`Parsed ${file.name} successfully. Previewing 4 attendance rows.`, 'info');
    }
  };

  const handleDownloadTemplate = () => {
    const csvHeader = "Employee_ID,Employee_Name,Date,Clock_In,Clock_Out,Status\nEMP-84920,John Doe,2026-08-10,09:00 AM,06:00 PM,PRESENT\n";
    const blob = new Blob([csvHeader], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "bulk_attendance_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('Downloaded bulk attendance CSV template.', 'success');
  };

  const handleApplyUpdates = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      addToast(`Bulk updated clock-in & clock-out times for ${parsedRecords.length} employees!`, 'success');
      if (onUpdateComplete) onUpdateComplete();
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="glass-card max-w-2xl w-full p-6 relative border border-white/20 shadow-2xl flex flex-col max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400">
              HR Administration Suite
            </span>
            <h3 className="text-xl font-bold text-slate-100">Bulk Attendance Upload</h3>
          </div>
        </div>

        <p className="text-xs text-slate-400 mb-4 shrink-0">
          Upload biometric or CSV attendance logs to update clock-in and clock-out timestamps for company employees in bulk.
        </p>

        {/* Upload Zone */}
        {!isPreviewing ? (
          <div className="space-y-4 my-2">
            <div className="border-2 border-dashed border-white/15 hover:border-purple-500/50 rounded-2xl p-8 text-center cursor-pointer transition bg-white/[0.01]">
              <input
                type="file"
                id="bulk-csv-input"
                className="hidden"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
              />
              <label htmlFor="bulk-csv-input" className="cursor-pointer block">
                <Upload className="w-8 h-8 mx-auto text-purple-400 mb-2" />
                <span className="text-sm font-bold text-slate-200 block">
                  Select CSV or Excel Attendance Log
                </span>
                <span className="text-xs text-slate-400 block mt-1">
                  Drag and drop your biometric export file here or click to browse
                </span>
                <span className="text-[10px] text-slate-500 mt-2 block">Supported formats: .CSV, .XLSX</span>
              </label>
            </div>

            <div className="flex justify-between items-center bg-white/[0.03] p-3 rounded-xl border border-white/5 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 text-slate-400">
                <AlertCircle className="w-4 h-4 text-purple-400" /> Need standard formatting?
              </span>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 hover:underline"
              >
                <Download className="w-3.5 h-3.5" /> Download Sample CSV
              </button>
            </div>
          </div>
        ) : (
          /* Preview Table */
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            <div className="flex justify-between items-center bg-purple-500/10 border border-purple-500/20 p-3 rounded-xl text-xs text-purple-300">
              <span>File Ready: <strong>{selectedFile?.name || 'biometric_attendance_aug10.csv'}</strong></span>
              <button
                onClick={() => setIsPreviewing(false)}
                className="text-xs text-slate-400 hover:text-white underline"
              >
                Choose Different File
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 font-semibold bg-white/[0.02]">
                    <th className="p-2.5">EMP ID</th>
                    <th className="p-2.5">Employee Name</th>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Clock In</th>
                    <th className="p-2.5">Clock Out</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {parsedRecords.map((row) => (
                    <tr key={row.empId} className="hover:bg-white/[0.02]">
                      <td className="p-2.5 font-bold font-mono text-purple-300">{row.empId}</td>
                      <td className="p-2.5 font-semibold text-slate-200">{row.name}</td>
                      <td className="p-2.5 text-slate-400">{row.date}</td>
                      <td className="p-2.5 text-emerald-400 font-mono font-bold">{row.clockIn}</td>
                      <td className="p-2.5 text-rose-400 font-mono font-bold">{row.clockOut}</td>
                      <td className="p-2.5">
                        <span className={`status-badge ${row.status === 'PRESENT' ? 'present' : row.status === 'LATE' ? 'late' : 'absent'}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-white/10 shrink-0 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="bg-white/5 hover:bg-white/10 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-bold transition"
          >
            Cancel
          </button>

          {isPreviewing && (
            <button
              type="button"
              onClick={handleApplyUpdates}
              disabled={isProcessing}
              className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-purple-600/30"
            >
              <Check className="w-4 h-4" />
              {isProcessing ? 'Applying Bulk Updates...' : 'Publish Bulk Clock In / Out Times'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
