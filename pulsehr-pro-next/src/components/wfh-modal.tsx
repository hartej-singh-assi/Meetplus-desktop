'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { X, Calendar, Laptop, Briefcase, Check } from 'lucide-react';

interface WfhModalProps {
  onClose: () => void;
  type: 'WFH' | 'COMPOFF';
}

export function WfhModal({ onClose, type }: WfhModalProps) {
  const { currentUser, addToast } = useAuth();
  const [date, setDate] = useState('2026-08-25');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      addToast('Please provide a reason for the request.', 'warning');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      addToast(
        `${type === 'WFH' ? 'Work From Home' : 'Compensatory Off'} request for ${date} submitted for manager approval!`,
        'success'
      );
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
          <div className={`p-3 rounded-xl ${type === 'WFH' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
            {type === 'WFH' ? <Laptop className="w-6 h-6" /> : <Briefcase className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              {type === 'WFH' ? 'Request Work From Home' : 'Claim Compensatory Off'}
            </h3>
            <p className="text-xs text-slate-400">
              {type === 'WFH'
                ? 'Submit remote work schedule for manager review.'
                : 'Claim 1 day off credit for weekend work.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Target Date</label>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {type === 'WFH' ? 'Reason for Remote Work' : 'Details of Weekend Work Performed'}
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                type === 'WFH'
                  ? 'e.g. Home internet installation, weather advisory...'
                  : 'e.g. Production deployment on Sunday, Aug 02...'
              }
              className="w-full bg-slate-900/80 border border-white/10 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-slate-400 flex items-start gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Request will be routed to <strong className="text-slate-200">{currentUser?.managerName}</strong> for approval.
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
              className={`flex-1 py-2.5 rounded-xl font-bold text-white transition flex items-center justify-center gap-1.5 ${
                type === 'WFH' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
