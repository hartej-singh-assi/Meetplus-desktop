import React, { useState } from 'react';
import { useMeetingTracker } from '../context/MeetingTrackerContext';
import { Search, Download } from 'lucide-react';

interface RecordsViewProps {
  onOpenExportModal: () => void;
}

export const RecordsView: React.FC<RecordsViewProps> = ({ onOpenExportModal }) => {
  const { meetings } = useMeetingTracker();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const filteredMeetings = meetings.filter(m => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.date.includes(searchQuery);

    const matchesCategory = selectedCategory === 'ALL' || m.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const formatMeetingTime = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${hrs}h ${m}m` : `${hrs}h`;
  };

  return (
    <div className="p-6 space-y-5 w-full h-full flex flex-col flex-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800/80 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Audit Records & Export</h2>
          <p className="text-xs text-slate-400">Search and export all meeting records</p>
        </div>

        <button
          onClick={onOpenExportModal}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-sm active:scale-95"
        >
          <Download className="w-4 h-4" />
          <span>Export Excel / CSV</span>
        </button>
      </div>

      {/* Filter Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-3 shrink-0">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search meetings by title, date, or notes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-xs text-white pl-10 pr-4 py-2.5 rounded-xl focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="sm:w-52">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-xs text-white p-2.5 rounded-xl focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            <option value="Sync">Sync</option>
            <option value="Standup">Standup</option>
            <option value="Client">Client</option>
            <option value="1-on-1">1-on-1</option>
            <option value="Technical">Technical</option>
            <option value="Ad-hoc">Ad-hoc</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden text-xs flex-1 shadow-xl flex flex-col">
        <table className="w-full text-left text-slate-300">
          <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800/80 font-semibold">
            <tr>
              <th className="p-3.5 whitespace-nowrap">Date</th>
              <th className="p-3.5">Meeting Name</th>
              <th className="p-3.5 whitespace-nowrap">Category</th>
              <th className="p-3.5 whitespace-nowrap font-semibold text-white">Meeting Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filteredMeetings.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500 font-medium">
                  No matching records found.
                </td>
              </tr>
            ) : (
              filteredMeetings.map(m => (
                <tr key={m.id} className="hover:bg-slate-800/30 transition-all">
                  <td className="p-3.5 text-slate-400 whitespace-nowrap font-medium">{m.date}</td>
                  <td className="p-3.5 font-medium text-white">
                    <div className="text-sm font-medium">{m.title}</div>
                    {m.notes && <div className="text-xs text-slate-400 font-normal mt-0.5">{m.notes}</div>}
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700/60">
                      {m.category}
                    </span>
                  </td>
                  <td className="p-3.5 whitespace-nowrap font-semibold text-indigo-300 text-sm">
                    {formatMeetingTime(m.durationMinutes)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
