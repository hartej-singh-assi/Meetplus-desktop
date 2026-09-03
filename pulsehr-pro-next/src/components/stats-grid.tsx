'use client';

import React from 'react';
import { TrendingUp, UserCheck, Briefcase, PlaneTakeoff } from 'lucide-react';

export function StatsGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="glass-card p-5 flex flex-col justify-between">
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Attendance Rate</span>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl font-black text-slate-100 my-2">95.2%</div>
        <div className="text-xs text-slate-400">Target: 90%</div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-2">
          <div className="h-full bg-emerald-400 rounded-full" style={{ width: '95.2%' }} />
        </div>
      </div>

      <div className="glass-card p-5 flex flex-col justify-between">
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Present Days</span>
          <div className="w-9 h-9 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl font-black text-slate-100 my-2">
          19 <span className="text-sm font-normal text-slate-400">/ 22</span>
        </div>
        <div className="text-xs text-slate-400">17 On-time • 2 Late</div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-2">
          <div className="h-full bg-blue-500 rounded-full" style={{ width: '86%' }} />
        </div>
      </div>

      <div className="glass-card p-5 flex flex-col justify-between">
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Working Hours</span>
          <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl font-black text-slate-100 my-2">158.5 hrs</div>
        <div className="text-xs text-slate-400">Avg Daily: 8.3 hrs</div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-2">
          <div className="h-full bg-amber-400 rounded-full" style={{ width: '92%' }} />
        </div>
      </div>

      <div className="glass-card p-5 flex flex-col justify-between">
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Leave Balance</span>
          <div className="w-9 h-9 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center">
            <PlaneTakeoff className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl font-black text-slate-100 my-2">12 Days</div>
        <div className="text-xs text-slate-400">Casual: 5 • Sick: 7</div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-2">
          <div className="h-full bg-purple-400 rounded-full" style={{ width: '70%' }} />
        </div>
      </div>
    </div>
  );
}
