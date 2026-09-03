'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { Printer, FileText } from 'lucide-react';

interface PayslipProps {
  month: string;
  amount: number;
  onClose: () => void;
}

export function PayslipModal({ month, amount, onClose }: PayslipProps) {
  const { currentUser } = useAuth();

  if (!currentUser) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-white text-slate-900 max-w-2xl w-full p-8 rounded-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start border-b border-slate-200 pb-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">PULSEHR TECHNOLOGIES INC.</h2>
            <p className="text-xs text-slate-500">100 Innovation Way, Suite 500, Tech District</p>
            <h4 className="text-sm font-semibold text-blue-600 mt-2">PAYSLIP FOR {month.toUpperCase()}</h4>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl font-bold">&times;</button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs mb-6 border-b border-slate-200 pb-4">
          <div>
            <div><span className="text-slate-500">Employee Name:</span> <strong>{currentUser.name}</strong></div>
            <div><span className="text-slate-500">Employee ID:</span> <strong>{currentUser.id}</strong></div>
            <div><span className="text-slate-500">Designation:</span> <strong>{currentUser.title}</strong></div>
          </div>
          <div>
            <div><span className="text-slate-500">Bank Account:</span> <strong>{currentUser.bankAccount}</strong></div>
            <div><span className="text-slate-500">PF Number:</span> <strong>{currentUser.pfNumber}</strong></div>
            <div><span className="text-slate-500">Payable Days:</span> <strong>31 Days</strong></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 text-xs mb-6">
          <div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-700 font-bold bg-slate-50">
                  <th className="py-2 px-2">Earnings</th>
                  <th className="py-2 px-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr><td className="py-1.5 px-2">Basic Salary</td><td className="text-right py-1.5 px-2">$4,200.00</td></tr>
                <tr><td className="py-1.5 px-2">House Rent (HRA)</td><td className="text-right py-1.5 px-2">$1,800.00</td></tr>
                <tr><td className="py-1.5 px-2">Special Allowance</td><td className="text-right py-1.5 px-2">$1,100.00</td></tr>
                <tr><td className="py-1.5 px-2">Conveyance Allowance</td><td className="text-right py-1.5 px-2">$300.00</td></tr>
                <tr className="font-bold text-slate-900"><td className="py-2 px-2">Gross Earnings</td><td className="text-right py-2 px-2">$7,400.00</td></tr>
              </tbody>
            </table>
          </div>

          <div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-700 font-bold bg-slate-50">
                  <th className="py-2 px-2">Deductions</th>
                  <th className="py-2 px-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr><td className="py-1.5 px-2">Provident Fund (PF)</td><td className="text-right py-1.5 px-2">$450.00</td></tr>
                <tr><td className="py-1.5 px-2">Income Tax (TDS)</td><td className="text-right py-1.5 px-2">$420.00</td></tr>
                <tr><td className="py-1.5 px-2">Professional Tax (PT)</td><td className="text-right py-1.5 px-2">$80.00</td></tr>
                <tr><td className="py-1.5 px-2">--</td><td className="text-right py-1.5 px-2">--</td></tr>
                <tr className="font-bold text-slate-900"><td className="py-2 px-2">Total Deductions</td><td className="text-right py-2 px-2">$950.00</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex justify-between items-center">
          <div>
            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Net Take-Home Salary</div>
            <div className="text-2xl font-black text-emerald-700">${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </div>
          <button 
            onClick={() => window.print()} 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg transition"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
}
