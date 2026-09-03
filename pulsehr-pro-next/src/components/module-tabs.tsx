'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { CalendarCheck, Laptop, Receipt, DollarSign, BookOpen, UserCheck, ShieldCheck } from 'lucide-react';

export function ModuleTabs() {
  const { currentUser, activeTab, setActiveTab, addToast } = useAuth();

  const tabs = [
    { id: 'tabAttendance', label: 'Attendance & Clock', icon: CalendarCheck },
    { id: 'tabWfh', label: 'WFH & Comp-Off', icon: Laptop },
    { id: 'tabExpenses', label: 'Reimbursements', icon: Receipt },
    { id: 'tabPayslips', label: 'Payroll & Payslips', icon: DollarSign },
    { id: 'tabPolicies', label: 'HR Policies', icon: BookOpen },
    { id: 'tabProfile', label: '360° Profile', icon: UserCheck },
  ];

  if (currentUser?.canApprove) {
    tabs.push({ id: 'tabHrQueue', label: 'Approvals Workspace', icon: ShieldCheck });
  }

  const handleTabClick = (id: string) => {
    if (id === 'tabHrQueue' && currentUser && !currentUser.canApprove) {
      addToast('Access Denied: Standard employees cannot access approval workflows.', 'danger');
      return;
    }
    setActiveTab(id);
  };

  return (
    <nav className="glass-card flex items-center gap-2 p-2 mb-6 overflow-x-auto no-scrollbar">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              isActive
                ? 'bg-white/10 text-white border border-white/20 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : ''}`} />
            {tab.label}
            {tab.id === 'tabHrQueue' && (
              <span className="bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1">
                3
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
