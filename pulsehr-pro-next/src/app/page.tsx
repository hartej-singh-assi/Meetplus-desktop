'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import LoginPage from './login/page';
import { Navbar } from '@/components/navbar';
import { ModuleTabs } from '@/components/module-tabs';
import { ClockWidget } from '@/components/clock-widget';
import { StatsGrid } from '@/components/stats-grid';
import { AttendanceCalendar } from '@/components/attendance-calendar';
import { ProfileView } from '@/components/profile-view';
import { HrApprovalsQueue } from '@/components/hr-approvals-queue';
import { PayslipModal } from '@/components/payslip-modal';
import { WfhModal } from '@/components/wfh-modal';
import { ExpenseModal } from '@/components/expense-modal';
import { PolicyModal } from '@/components/policy-modal';
import { Laptop, Plus, Briefcase, Receipt, FileText, BookOpen, CheckCircle } from 'lucide-react';

interface ExpenseItem {
  id: string;
  category: string;
  date: string;
  amount: number;
  status: 'APPROVED' | 'DISBURSED' | 'UNDER REVIEW';
}

export default function DashboardPage() {
  const { currentUser, activeTab, toasts } = useAuth();
  const [activePayslip, setActivePayslip] = useState<{ month: string; amount: number } | null>(null);
  const [wfhModalType, setWfhModalType] = useState<'WFH' | 'COMPOFF' | null>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<{
    title: string;
    category: string;
    lastUpdated: string;
    content: string[];
    rules: string[];
  } | null>(null);

  const [expenseClaims, setExpenseClaims] = useState<ExpenseItem[]>([
    { id: '#EXP-9201', category: 'Broadband Internet', date: 'Aug 01, 2026', amount: 85.00, status: 'APPROVED' },
    { id: '#EXP-9184', category: 'Client Dinner', date: 'Jul 28, 2026', amount: 142.50, status: 'DISBURSED' },
    { id: '#EXP-9302', category: 'Ergonomic Hardware', date: 'Aug 08, 2026', amount: 190.00, status: 'UNDER REVIEW' }
  ]);

  if (!currentUser) {
    return <LoginPage />;
  }

  const handleExpenseAdded = (newClaim: { id: string; category: string; date: string; amount: number; receiptName: string }) => {
    setExpenseClaims((prev) => [
      {
        id: newClaim.id,
        category: newClaim.category,
        date: newClaim.date,
        amount: newClaim.amount,
        status: 'UNDER REVIEW'
      },
      ...prev
    ]);
  };

  const POLICIES_DATA = {
    attendance: {
      title: 'Global Attendance & Punctuality Policy',
      category: 'OPERATIONS & TIMINGS',
      lastUpdated: 'August 2026',
      content: [
        'PulseHR Pro mandates standard core working hours from 09:00 AM to 06:00 PM local time zone.',
        'A grace period of 15 minutes is allowed for morning clock-ins. More than 3 late clock-ins in a single calendar month will trigger an automated half-day leave deduction unless regularized by your reporting manager.'
      ],
      rules: [
        'Daily punch-in and punch-out are mandatory via the portal widget.',
        'Grace period expires at 09:15 AM.',
        'Shift adjustments require 24-hour prior manager authorization.'
      ]
    },
    leave: {
      title: 'Employee Leave & Absence Policy',
      category: 'TIME OFF & WELLNESS',
      lastUpdated: 'July 2026',
      content: [
        'Full-time employees are entitled to Casual Leave (12 days/year), Sick Leave (10 days/year), and Privilege Leave (15 days/year).',
        'All leave applications must be submitted through the HR Approvals Queue at least 48 hours in advance, except in cases of emergency medical sick leaves.'
      ],
      rules: [
        'Casual leaves cannot be carried forward beyond December 31st.',
        'Privilege leave requests exceeding 3 consecutive days require 1-week notice.',
        'Medical certificate required for sick leaves exceeding 2 consecutive days.'
      ]
    },
    wfh: {
      title: 'Hybrid & Remote Work Framework',
      category: 'FLEXIBLE WORKPLACE',
      lastUpdated: 'August 2026',
      content: [
        'Eligible engineering and product employees may utilize up to 4 Work From Home (WFH) days per calendar month.',
        'Employees working remotely are required to maintain active communication on corporate Slack/Teams during core collaboration hours (10:00 AM to 05:00 PM).'
      ],
      rules: [
        'WFH requests must be submitted at least 24 hours prior.',
        'High-speed broadband connectivity (>50 Mbps) is mandatory for remote shifts.',
        'Weekend work claims for Comp-Off credits must be authorized within 7 days.'
      ]
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-7xl mx-auto flex flex-col">
      <Navbar />
      <ModuleTabs />

      <main className="flex-1">
        {/* MODULE 1: ATTENDANCE & PUNCH CLOCK */}
        {activeTab === 'tabAttendance' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <ClockWidget />
              <div className="lg:col-span-2">
                <StatsGrid />
              </div>
            </div>
            <AttendanceCalendar />
          </div>
        )}

        {/* MODULE 2: WFH & COMP-OFF */}
        {activeTab === 'tabWfh' && (
          <div className="flex flex-col gap-6">
            <div className="glass-card p-6 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Laptop className="w-5 h-5 text-blue-400" /> Work From Home & Comp-Off Management
                </h2>
                <p className="text-xs text-slate-400">Request remote work days or claim compensatory credits for weekend work.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setWfhModalType('WFH')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" /> Request WFH
                </button>
                <button
                  onClick={() => setWfhModalType('COMPOFF')}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Briefcase className="w-4 h-4" /> Claim Comp-Off
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-card p-5 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="status-badge present">APPROVED</span>
                  <span className="text-xs text-slate-400">Aug 14, 2026</span>
                </div>
                <div className="my-3">
                  <h4 className="text-sm font-bold text-slate-100">Work From Home</h4>
                  <p className="text-xs text-slate-400 italic">&quot;ISP Maintenance at Home Office&quot;</p>
                </div>
                <div className="text-[11px] text-slate-500 border-t border-white/10 pt-2">
                  Approved by: Michael Vance
                </div>
              </div>

              <div className="glass-card p-5 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="status-badge late">PENDING APPROVAL</span>
                  <span className="text-xs text-slate-400">Aug 21, 2026</span>
                </div>
                <div className="my-3">
                  <h4 className="text-sm font-bold text-slate-100">Work From Home</h4>
                  <p className="text-xs text-slate-400 italic">&quot;Severe Monsoon Warning&quot;</p>
                </div>
                <div className="text-[11px] text-slate-500 border-t border-white/10 pt-2">
                  Sent to Manager: Michael Vance
                </div>
              </div>

              <div className="glass-card p-5 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="status-badge leave">CREDITED (+1 DAY)</span>
                  <span className="text-xs text-slate-400">Aug 02, 2026</span>
                </div>
                <div className="my-3">
                  <h4 className="text-sm font-bold text-slate-100">Compensatory Off</h4>
                  <p className="text-xs text-slate-400 italic">&quot;Server Migration on Sunday&quot;</p>
                </div>
                <div className="text-[11px] text-slate-500 border-t border-white/10 pt-2">
                  Comp-Off Balance: 2 Days
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODULE 3: EXPENSES */}
        {activeTab === 'tabExpenses' && (
          <div className="flex flex-col gap-6">
            <div className="glass-card p-6 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-400" /> Expense Reimbursements
                </h2>
                <p className="text-xs text-slate-400">Submit business claims for internet, travel, client meals, and equipment.</p>
              </div>
              <button
                onClick={() => setShowExpenseModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" /> Submit Expense Claim
              </button>
            </div>

            <div className="glass-card p-6">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 font-semibold bg-white/[0.02]">
                    <th className="p-3">Claim ID</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {expenseClaims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-white/[0.02] transition">
                      <td className="p-3 font-bold">{claim.id}</td>
                      <td className="p-3">{claim.category}</td>
                      <td className="p-3 text-slate-400">{claim.date}</td>
                      <td className="p-3 font-bold text-emerald-400">${claim.amount.toFixed(2)}</td>
                      <td className="p-3">
                        <span className={`status-badge ${claim.status === 'APPROVED' || claim.status === 'DISBURSED' ? 'present' : 'late'}`}>
                          {claim.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODULE 4: PAYSLIPS */}
        {activeTab === 'tabPayslips' && (
          <div className="flex flex-col gap-6">
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" /> Monthly Salary Payslips
              </h2>
              <p className="text-xs text-slate-400">View earnings, tax deductions, and download official PDF payslips.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-card p-6 flex flex-col justify-between">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-blue-400">JULY 2026</span>
                  <span className="status-badge present">DISBURSED</span>
                </div>
                <div className="my-4">
                  <div className="text-3xl font-black text-slate-100">$6,450.00</div>
                  <div className="text-xs text-slate-400">Net Take-Home Pay</div>
                </div>
                <button
                  onClick={() => setActivePayslip({ month: 'July 2026', amount: 6450.00 })}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" /> View Payslip
                </button>
              </div>

              <div className="glass-card p-6 flex flex-col justify-between">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-blue-400">JUNE 2026</span>
                  <span className="status-badge present">DISBURSED</span>
                </div>
                <div className="my-4">
                  <div className="text-3xl font-black text-slate-100">$6,450.00</div>
                  <div className="text-xs text-slate-400">Net Take-Home Pay</div>
                </div>
                <button
                  onClick={() => setActivePayslip({ month: 'June 2026', amount: 6450.00 })}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" /> View Payslip
                </button>
              </div>

              <div className="glass-card p-6 flex flex-col justify-between">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-blue-400">MAY 2026</span>
                  <span className="status-badge present">DISBURSED</span>
                </div>
                <div className="my-4">
                  <div className="text-3xl font-black text-slate-100">$6,750.00</div>
                  <div className="text-xs text-slate-400">Net Pay (Includes Bonus)</div>
                </div>
                <button
                  onClick={() => setActivePayslip({ month: 'May 2026', amount: 6750.00 })}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" /> View Payslip
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODULE 5: POLICIES */}
        {activeTab === 'tabPolicies' && (
          <div className="flex flex-col gap-6">
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-400" /> HR Policies & Employee Handbook
              </h2>
              <p className="text-xs text-slate-400">Official company rules on attendance, leaves, remote work, and compliance.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-card p-6 flex flex-col justify-between">
                <div>
                  <h4 className="text-base font-bold text-slate-100 mb-2">Attendance Policy</h4>
                  <p className="text-xs text-slate-400">Standard shift: 09:00 AM - 06:00 PM. Grace period allowed is 15 minutes. 3 late clock-ins in a month incur half-day deduction.</p>
                </div>
                <button
                  onClick={() => setSelectedPolicy(POLICIES_DATA.attendance)}
                  className="mt-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-2 rounded-xl text-xs font-semibold transition"
                >
                  Read Details
                </button>
              </div>

              <div className="glass-card p-6 flex flex-col justify-between">
                <div>
                  <h4 className="text-base font-bold text-slate-100 mb-2">Leave Guidelines</h4>
                  <p className="text-xs text-slate-400">Casual Leave (12), Sick Leave (10), Privilege Leave (15). Leave must be requested 48 hours prior except emergency sick leaves.</p>
                </div>
                <button
                  onClick={() => setSelectedPolicy(POLICIES_DATA.leave)}
                  className="mt-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-2 rounded-xl text-xs font-semibold transition"
                >
                  Read Details
                </button>
              </div>

              <div className="glass-card p-6 flex flex-col justify-between">
                <div>
                  <h4 className="text-base font-bold text-slate-100 mb-2">Remote Work Rules</h4>
                  <p className="text-xs text-slate-400">Up to 4 WFH days per month allowed for eligible engineering roles. Core online availability required between 10:00 AM and 05:00 PM.</p>
                </div>
                <button
                  onClick={() => setSelectedPolicy(POLICIES_DATA.wfh)}
                  className="mt-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-2 rounded-xl text-xs font-semibold transition"
                >
                  Read Details
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODULE 6: PROFILE */}
        {activeTab === 'tabProfile' && <ProfileView />}

        {/* MODULE 7: HR APPROVALS QUEUE */}
        {activeTab === 'tabHrQueue' && <HrApprovalsQueue />}
      </main>

      {/* Payslip Modal */}
      {activePayslip && (
        <PayslipModal
          month={activePayslip.month}
          amount={activePayslip.amount}
          onClose={() => setActivePayslip(null)}
        />
      )}

      {/* WFH & Comp-off Modal */}
      {wfhModalType && (
        <WfhModal
          type={wfhModalType}
          onClose={() => setWfhModalType(null)}
        />
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <ExpenseModal
          onClose={() => setShowExpenseModal(false)}
          onClaimAdded={handleExpenseAdded}
        />
      )}

      {/* Policy Modal */}
      {selectedPolicy && (
        <PolicyModal
          policy={selectedPolicy}
          onClose={() => setSelectedPolicy(null)}
        />
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-5 right-5 flex flex-col gap-2 z-50">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-3.5 rounded-xl text-xs font-semibold shadow-2xl flex items-center gap-2 border text-white animate-bounce ${
              toast.type === 'success' ? 'bg-emerald-600 border-emerald-500' :
              toast.type === 'warning' ? 'bg-amber-600 border-amber-500' :
              toast.type === 'danger' ? 'bg-red-600 border-red-500' : 'bg-blue-600 border-blue-500'
            }`}
          >
            <CheckCircle className="w-4 h-4" /> {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}
