'use client';

import React from 'react';
import { useAuth, USERS_DATABASE } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Layers, ShieldCheck, ChevronRight, LogIn } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const handleQuickLogin = (email: string) => {
    login(email);
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full glass-card p-8 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-2xl">
        <div className="flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/10 pb-6 md:pb-0 md:pr-6">
          <div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xl mb-4">
              <Layers className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white mb-1">PulseHR <span className="text-blue-400">Pro</span></h2>
            <p className="text-xs text-slate-400">Next.js 15 Full-Stack Enterprise HRMS & Hierarchy Platform</p>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-2 mt-6">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Multi-Role Reporting Hierarchy Enforced
          </div>
        </div>

        <div>
          <h3 className="text-lg font-extrabold text-slate-100 mb-1">Select Persona</h3>
          <p className="text-xs text-slate-400 mb-5">Click any demo account to test role permissions:</p>

          <div className="flex flex-col gap-3">
            {Object.values(USERS_DATABASE).map((user) => (
              <div
                key={user.email}
                onClick={() => handleQuickLogin(user.email)}
                className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-blue-500/50 cursor-pointer flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold border border-white/20"
                    style={{ backgroundColor: user.avatarBg }}
                  >
                    {user.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-100 group-hover:text-blue-400 transition">{user.name}</div>
                    <div className="text-xs text-slate-400">{user.title}</div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mt-1 ${
                      user.role === 'EMPLOYEE' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                      user.role === 'MANAGER' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    }`}>
                      {user.role === 'EMPLOYEE' ? 'Level 3 • Cannot Approve' :
                       user.role === 'MANAGER' ? 'Level 2 • Approves Team Requests' :
                       'Level 1 • Global HR Approval'}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
