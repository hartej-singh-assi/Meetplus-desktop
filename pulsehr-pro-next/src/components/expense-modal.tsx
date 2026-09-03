'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { X, Receipt, Upload, Check, DollarSign } from 'lucide-react';

interface ExpenseModalProps {
  onClose: () => void;
  onClaimAdded?: (claim: { id: string; category: string; date: string; amount: number; receiptName: string }) => void;
}

export function ExpenseModal({ onClose, onClaimAdded }: ExpenseModalProps) {
  const { currentUser, addToast } = useAuth();
  const [category, setCategory] = useState('Broadband Internet');
  const [amount, setAmount] = useState('85.00');
  const [date, setDate] = useState('2026-08-10');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      addToast('Please enter a valid expense amount.', 'warning');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      const claimId = `#EXP-${Math.floor(1000 + Math.random() * 9000)}`;
      addToast(`Expense claim ${claimId} ($${numericAmount.toFixed(2)}) submitted for approval!`, 'success');
      
      if (onClaimAdded) {
        onClaimAdded({
          id: claimId,
          category,
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
          amount: numericAmount,
          receiptName: receipt ? receipt.name : 'receipt_attachment.pdf'
        });
      }
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="glass-card max-w-md w-full p-6 relative border border-white/20 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">Submit Expense Claim</h3>
            <p className="text-xs text-slate-400">File official business expense for finance reimbursement.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Expense Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="Broadband Internet">Broadband Internet Allowance</option>
              <option value="Client Meal & Entertainment">Client Meal & Entertainment</option>
              <option value="Ergonomic Hardware">Ergonomic Hardware & Accessories</option>
              <option value="Travel & Commute">Travel & Business Commute</option>
              <option value="Software License">Software & Cloud Subscriptions</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Amount ($ USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-7 pr-3 py-2.5 text-white focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Date Spent</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Attach Invoice / Receipt</label>
            <div className="border-2 border-dashed border-white/10 hover:border-emerald-500/50 rounded-xl p-4 text-center cursor-pointer transition bg-white/[0.01]">
              <input
                type="file"
                id="receipt-file"
                className="hidden"
                accept="image/*,.pdf"
                onChange={(e) => setReceipt(e.target.files?.[0] || null)}
              />
              <label htmlFor="receipt-file" className="cursor-pointer block">
                <Upload className="w-5 h-5 mx-auto text-emerald-400 mb-1" />
                <span className="text-slate-300 font-medium block">
                  {receipt ? receipt.name : 'Click to upload receipt (PDF, PNG, JPG)'}
                </span>
                <span className="text-[10px] text-slate-500">Max size: 10MB</span>
              </label>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-slate-400 flex items-start gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Claim will be processed by <strong className="text-slate-200">Finance & HR Admin ({currentUser?.name})</strong>.
            </span>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 py-2.5 rounded-xl font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 py-2.5 rounded-xl font-bold text-white transition flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
