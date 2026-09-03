import React, { useState } from 'react';
import { useMeetingTracker } from '../context/MeetingTrackerContext';
import { ExportFormat, ExportConfig } from '../types';
import { Download, FileSpreadsheet, Check, FileCode, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { triggerExport, meetings, workLogs } = useMeetingTracker();

  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('xlsx');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'this_week' | 'this_month' | 'custom'>('all');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-01'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeMeetingLogs, setIncludeMeetingLogs] = useState(true);
  const [includeWorkLogs, setIncludeWorkLogs] = useState(true);
  const [filename, setFilename] = useState(`MeetPulse_Report_${format(new Date(), 'yyyy-MM-dd')}`);

  if (!isOpen) return null;

  const handleExport = (e: React.FormEvent) => {
    e.preventDefault();
    const config: ExportConfig = {
      format: selectedFormat,
      dateRange,
      startDate,
      endDate,
      includeSummary,
      includeMeetingLogs,
      includeWorkLogs,
      filename: filename.trim() || 'MeetPulse_Report',
    };

    triggerExport(config);
    onClose();
  };

  const formatOptions: { format: ExportFormat; label: string; desc: string; icon: string }[] = [
    { format: 'xlsx', label: 'Excel Workbook (.xlsx)', desc: 'Full structured multi-sheet formatted workbook', icon: '📊' },
    { format: 'xls', label: 'Legacy Excel (.xls)', desc: 'Biff8 compatible legacy Excel spreadsheet format', icon: '📈' },
    { format: 'csv', label: 'Comma Separated (.csv)', desc: 'Universal text dataset for database or spreadsheet import', icon: '📄' },
    { format: 'tsv', label: 'Tab Separated (.tsv)', desc: 'Tab-delimited raw file format', icon: '📑' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Export Meeting & Productivity Records</h3>
              <p className="text-xs text-slate-400">Choose extension and data filters</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold text-lg"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleExport} className="space-y-4 text-xs">
          {/* Format Selector Grid */}
          <div>
            <label className="block text-slate-300 font-semibold mb-2">Select Extension / File Format</label>
            <div className="grid grid-cols-2 gap-2">
              {formatOptions.map(opt => (
                <div
                  key={opt.format}
                  onClick={() => setSelectedFormat(opt.format)}
                  className={`p-3 rounded-xl border cursor-pointer select-none transition-all ${
                    selectedFormat === opt.format
                      ? 'bg-indigo-500/10 border-indigo-500 text-white font-semibold'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{opt.icon}</span>
                    {selectedFormat === opt.format && <Check className="w-4 h-4 text-indigo-400" />}
                  </div>
                  <div className="mt-1 font-bold text-xs">{opt.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{opt.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Date Range Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Date Scope</label>
              <select
                value={dateRange}
                onChange={e => setDateRange(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 text-white p-2.5 rounded-xl focus:border-indigo-500 focus:outline-none"
              >
                <option value="all">All Records ({meetings.length} meetings)</option>
                <option value="today">Today Only</option>
                <option value="this_week">Last 7 Days</option>
                <option value="this_month">Last 30 Days</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Filename</label>
              <input
                type="text"
                value={filename}
                onChange={e => setFilename(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white p-2.5 rounded-xl focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {dateRange === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white p-2.5 rounded-xl focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white p-2.5 rounded-xl focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Sheet Selection */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Include Worksheets / Data Sections</label>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={includeSummary}
                  onChange={e => setIncludeSummary(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span>Executive KPI Summary Sheet</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={includeMeetingLogs}
                  onChange={e => setIncludeMeetingLogs(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span>Detailed Meeting & Context Switching Loss Audit Log</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={includeWorkLogs}
                  onChange={e => setIncludeWorkLogs(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span>Daily Work & Target Achievement Log</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download .{selectedFormat} File</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
