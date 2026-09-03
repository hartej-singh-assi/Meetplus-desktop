'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { User, Briefcase, CreditCard, FileCheck, Mail, Phone, MapPin } from 'lucide-react';

export function ProfileView() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'personal' | 'job' | 'bank' | 'docs'>('personal');

  if (!currentUser) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-card p-6 flex flex-wrap items-center gap-6">
        <div 
          className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-extrabold border-4 border-blue-500 shadow-xl"
          style={{ backgroundColor: currentUser.avatarBg }}
        >
          {currentUser.avatar}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-extrabold text-slate-100">{currentUser.name}</h2>
          <p className="text-sm text-slate-400 font-medium">{currentUser.title} • {currentUser.department}</p>
          <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-blue-400" /> {currentUser.email}</span>
            <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-emerald-400" /> {currentUser.phone}</span>
            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-purple-400" /> HQ Office (Full-time)</span>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex gap-2 border-b border-white/10 pb-3 mb-6">
          <button 
            onClick={() => setActiveTab('personal')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'personal' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <User className="w-4 h-4" /> Personal Details
          </button>
          <button 
            onClick={() => setActiveTab('job')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'job' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Briefcase className="w-4 h-4" /> Job & Org
          </button>
          <button 
            onClick={() => setActiveTab('bank')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'bank' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <CreditCard className="w-4 h-4" /> Financial & Tax
          </button>
          <button 
            onClick={() => setActiveTab('docs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'docs' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <FileCheck className="w-4 h-4" /> Document Vault
          </button>
        </div>

        {activeTab === 'personal' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
            <div><span className="text-slate-400 block uppercase font-medium">Full Name</span><strong className="text-sm font-semibold text-slate-200">{currentUser.name}</strong></div>
            <div><span className="text-slate-400 block uppercase font-medium">Date of Birth</span><strong className="text-sm font-semibold text-slate-200">March 14, 1992</strong></div>
            <div><span className="text-slate-400 block uppercase font-medium">Gender</span><strong className="text-sm font-semibold text-slate-200">Male</strong></div>
            <div><span className="text-slate-400 block uppercase font-medium">Blood Group</span><strong className="text-sm font-semibold text-slate-200">O Positive (O+)</strong></div>
            <div><span className="text-slate-400 block uppercase font-medium">Emergency Contact</span><strong className="text-sm font-semibold text-slate-200">Sarah Doe (Spouse)</strong></div>
            <div><span className="text-slate-400 block uppercase font-medium">Residential Address</span><strong className="text-sm font-semibold text-slate-200">{currentUser.address}</strong></div>
          </div>
        )}

        {activeTab === 'job' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
            <div><span className="text-slate-400 block uppercase font-medium">Employee ID</span><strong className="text-sm font-semibold text-slate-200">{currentUser.id}</strong></div>
            <div><span className="text-slate-400 block uppercase font-medium">Department</span><strong className="text-sm font-semibold text-slate-200">{currentUser.department}</strong></div>
            <div><span className="text-slate-400 block uppercase font-medium">Designation</span><strong className="text-sm font-semibold text-slate-200">{currentUser.title}</strong></div>
            <div><span className="text-slate-400 block uppercase font-medium">Reporting Manager</span><strong className="text-sm font-semibold text-slate-200">{currentUser.managerName}</strong></div>
            <div><span className="text-slate-400 block uppercase font-medium">Date of Joining</span><strong className="text-sm font-semibold text-slate-200">{currentUser.joiningDate}</strong></div>
            <div><span className="text-slate-400 block uppercase font-medium">Work Shift</span><strong className="text-sm font-semibold text-slate-200">General Shift (09:00 - 18:00)</strong></div>
          </div>
        )}

        {activeTab === 'bank' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
            <div><span className="text-slate-400 block uppercase font-medium">Bank Name</span><strong className="text-sm font-semibold text-slate-200">Chase National Bank</strong></div>
            <div><span className="text-slate-400 block uppercase font-medium">Account Number</span><strong className="text-sm font-semibold text-slate-200">{currentUser.bankAccount}</strong></div>
            <div><span className="text-slate-400 block uppercase font-medium">PF UAN Number</span><strong className="text-sm font-semibold text-slate-200">{currentUser.pfNumber}</strong></div>
            <div><span className="text-slate-400 block uppercase font-medium">PAN / Tax ID</span><strong className="text-sm font-semibold text-slate-200">{currentUser.taxId}</strong></div>
            <div><span className="text-slate-400 block uppercase font-medium">Tax Regime</span><strong className="text-sm font-semibold text-slate-200">New Tax Regime (FY 2026-27)</strong></div>
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
            <div>
              <span className="text-slate-400 block uppercase font-medium">Offer Letter</span>
              <a href="#" className="text-blue-400 hover:underline font-semibold flex items-center gap-1 mt-1"><FileCheck className="w-4 h-4" /> offer_letter_signed.pdf</a>
            </div>
            <div>
              <span className="text-slate-400 block uppercase font-medium">Employment Agreement</span>
              <a href="#" className="text-blue-400 hover:underline font-semibold flex items-center gap-1 mt-1"><FileCheck className="w-4 h-4" /> NDA_agreement.pdf</a>
            </div>
            <div>
              <span className="text-slate-400 block uppercase font-medium">ID / Passport Scan</span>
              <a href="#" className="text-blue-400 hover:underline font-semibold flex items-center gap-1 mt-1"><FileCheck className="w-4 h-4" /> passport_proof.jpg</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
