'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ShieldCheck, Check, X, FileSpreadsheet } from 'lucide-react';
import { HrBulkAttendanceModal } from './hr-bulk-attendance-modal';

interface ApprovalItem {
  id: string;
  type: 'LEAVE' | 'WFH' | 'EXPENSE';
  employeeName: string;
  empId: string;
  details: string;
  date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  processedBy?: string;
}

export function HrApprovalsQueue() {
  const { currentUser, addToast } = useAuth();
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [items, setItems] = useState<ApprovalItem[]>([
    {
      id: '1',
      type: 'LEAVE',
      employeeName: 'Alex Rivera',
      empId: 'EMP-84931',
      details: 'Casual Leave for 2 days (Aug 18 - Aug 19) • Reason: Family Function',
      date: 'Aug 09, 2026',
      status: 'PENDING'
    },
    {
      id: '2',
      type: 'WFH',
      employeeName: 'John Doe',
      empId: 'EMP-84920',
      details: 'Remote Work on Aug 14 • Reason: ISP Broadband maintenance',
      date: 'Aug 10, 2026',
      status: 'PENDING'
    },
    {
      id: '3',
      type: 'EXPENSE',
      employeeName: 'John Doe',
      empId: 'EMP-84920',
      details: '#EXP-9302 Ergonomic Desk Hardware ($190.00)',
      date: 'Aug 08, 2026',
      status: 'PENDING'
    }
  ]);

  if (!currentUser || !currentUser.canApprove) {
    return (
      <div className="glass-card p-8 text-center">
        <ShieldCheck className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-100">Access Denied</h3>
        <p className="text-xs text-slate-400 mt-1">Standard IC Employees cannot access approval workflows.</p>
      </div>
    );
  }

  const handleApprove = (id: string, name: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'APPROVED', processedBy: currentUser.name } : item
      )
    );
    addToast(`Approved request from ${name} by ${currentUser.name}!`, 'success');
  };

  const handleReject = (id: string, name: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'REJECTED', processedBy: currentUser.name } : item
      )
    );
    addToast(`Rejected request from ${name}`, 'warning');
  };

  return (
    <div className="glass-card p-6">
      <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-purple-400 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" /> Approvals Workspace (Hierarchy Protected)
          </h2>
          <p className="text-xs text-slate-400">
            {currentUser.role === 'HR_ADMIN'
              ? 'Global HR Company Oversight: Review pending employee leave, WFH, and expense requests.'
              : `Manager Scope: Review pending requests submitted by your direct reports.`}
          </p>
        </div>

        {currentUser.role === 'HR_ADMIN' && (
          <button
            onClick={() => setShowBulkModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-purple-600/30"
          >
            <FileSpreadsheet className="w-4 h-4" /> Bulk Upload Attendance
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-slate-400 font-semibold bg-white/[0.02]">
              <th className="p-3">Request Type</th>
              <th className="p-3">Employee Name</th>
              <th className="p-3">Details / Reason</th>
              <th className="p-3">Submitted Date</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-white/[0.03] transition">
                <td className="p-3">
                  <span className={`status-badge ${item.type === 'LEAVE' ? 'leave' : item.type === 'WFH' ? 'late' : 'present'}`}>
                    {item.type}
                  </span>
                </td>
                <td className="p-3 font-semibold text-slate-200">
                  {item.employeeName} <span className="text-slate-500 font-normal">({item.empId})</span>
                </td>
                <td className="p-3 text-slate-300">{item.details}</td>
                <td className="p-3 text-slate-400">{item.date}</td>
                <td className="p-3">
                  {item.status === 'PENDING' ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(item.id, item.employeeName)}
                        className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 py-1 rounded-md text-[11px] font-semibold transition"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => handleReject(item.id, item.employeeName)}
                        className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-2.5 py-1 rounded-md text-[11px] font-semibold transition"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  ) : (
                    <span className={`status-badge ${item.status === 'APPROVED' ? 'present' : 'absent'}`}>
                      {item.status} BY {item.processedBy?.toUpperCase()}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showBulkModal && (
        <HrBulkAttendanceModal
          onClose={() => setShowBulkModal(false)}
        />
      )}
    </div>
  );
}
