'use client';

import React from 'react';
import { X, BookOpen, Download, ShieldCheck, AlertCircle } from 'lucide-react';

interface PolicyModalProps {
  policy: {
    title: string;
    category: string;
    lastUpdated: string;
    content: string[];
    rules: string[];
  } | null;
  onClose: () => void;
}

export function PolicyModal({ policy, onClose }: PolicyModalProps) {
  if (!policy) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="glass-card max-w-2xl w-full p-6 relative border border-white/20 shadow-2xl max-h-[85vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400">
              {policy.category} • Updated {policy.lastUpdated}
            </span>
            <h3 className="text-xl font-bold text-slate-100">{policy.title}</h3>
          </div>
        </div>

        <div className="overflow-y-auto space-y-4 pr-2 text-xs text-slate-300 flex-1">
          {policy.content.map((paragraph, idx) => (
            <p key={idx} className="leading-relaxed">
              {paragraph}
            </p>
          ))}

          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 my-4">
            <h4 className="font-bold text-slate-100 mb-2 flex items-center gap-2 text-xs">
              <ShieldCheck className="w-4 h-4 text-purple-400" /> Key Guidelines & Compliance Rules
            </h4>
            <ul className="space-y-2 text-slate-300">
              {policy.rules.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-white/10 shrink-0">
          <button
            onClick={() => {
              alert(`Downloading PDF document: ${policy.title.replace(/\s+/g, '_')}_2026.pdf`);
            }}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2 rounded-xl text-xs font-semibold transition"
          >
            <Download className="w-4 h-4 text-purple-400" /> Download PDF Handbook
          </button>

          <button
            onClick={onClose}
            className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition"
          >
            Close Document
          </button>
        </div>
      </div>
    </div>
  );
}
