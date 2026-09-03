'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { Layers, LogOut, ShieldAlert } from 'lucide-react';

export function Navbar() {
  const { currentUser, logout } = useAuth();

  if (!currentUser) return null;

  return (
    <header className="glass-card flex flex-wrap items-center justify-between p-4 mb-5 gap-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg text-xl font-bold">
          <Layers className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent flex items-center gap-2">
            PulseHR <span className="text-blue-400">Pro</span>
          </h1>
          <p className="text-xs text-slate-400">
            {currentUser.canApprove 
              ? (currentUser.role === 'HR_ADMIN' ? 'Global HR & Operations Admin Suite' : 'Reporting Manager Workspace') 
              : 'Employee Self-Service (ESS) Portal'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
          <div 
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm border-2 border-blue-500"
            style={{ backgroundColor: currentUser.avatarBg }}
          >
            {currentUser.avatar}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight">{currentUser.name}</span>
            <span className="text-xs text-slate-400 leading-tight">{currentUser.id} • {currentUser.title}</span>
            <span className="text-[10px] text-blue-400 font-medium">Reporting to: {currentUser.managerName}</span>
          </div>
        </div>

        <button 
          onClick={logout}
          className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 px-4 py-2 rounded-xl text-xs font-semibold transition"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </header>
  );
}
