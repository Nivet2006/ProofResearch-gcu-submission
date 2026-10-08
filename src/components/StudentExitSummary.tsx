import React from 'react';
import { StudentExitRecord } from '../types';
import { CheckCircle2, ShieldAlert, Award, FileText, Lock, DollarSign, History } from 'lucide-react';

interface Props {
  exitRecord: StudentExitRecord;
}

export const StudentExitSummary: React.FC<Props> = ({ exitRecord }) => {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 text-slate-100 shadow-xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/30">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">Membership Status: LEFT</h3>
            <p className="text-xs text-slate-400">
              Student voluntary exit recorded under Charter {exitRecord.charter_version}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold rounded-full flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> ACTIVE ACCESS REVOKED
          </span>
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-semibold rounded-full flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> CREDIT PRESERVED
          </span>
        </div>
      </div>

      {/* Outcome Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Credit Kept */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">1. Credit Kept</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-emerald-400">
              {exitRecord.accepted_contribution_score} <span className="text-xs text-slate-400 font-normal">/ 10 Impact</span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              {exitRecord.accepted_contributions_count} Accepted Contribution{exitRecord.accepted_contributions_count !== 1 ? 's' : ''} Frozen
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-700 text-[11px] text-slate-400">
            ✓ Historical authorship & SHA-256 artifact hashes remain permanently attributed.
          </div>
        </div>

        {/* Card 2: Pro-Rata Share */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">2. Pro-Rata Share</span>
            <DollarSign className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-cyan-400">
              {exitRecord.percentage_share}% <span className="text-xs text-slate-400 font-normal">Student Pool</span>
            </div>
            <p className="text-xs text-slate-300 font-semibold">
              {exitRecord.reward_amount > 0 ? `₹${exitRecord.reward_amount.toLocaleString('en-IN')}` : '₹0 (Knowledge Sharing)'}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-700 text-[11px] text-slate-400">
            Calculated via Configurable Reward Engine using reviewed impact weighting ({exitRecord.reward_status}).
          </div>
        </div>

        {/* Card 3: Access Revoked */}
        <div className="bg-slate-800/80 border border-rose-500/30 rounded-lg p-4 flex flex-col justify-between bg-rose-950/10">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-300">3. Access Revoked</span>
            <Lock className="w-4 h-4 text-rose-400" />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-bold text-rose-300">
              🔒 Confidential Brief & Workspace Locked
            </div>
            <p className="text-xs text-slate-400">
              New submissions & AI execution blocked.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-700 text-[11px] text-rose-300/80">
            Enforced server-side at authorization layer & Supabase RLS.
          </div>
        </div>
      </div>

      {/* Ledger Provenance Box */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <History className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span>
            Ledger Event Recorded: <strong className="text-slate-200">MEMBER_EXITED</strong> ({new Date(exitRecord.exited_at).toLocaleString()})
          </span>
        </div>
        <div className="font-mono text-[11px] text-cyan-300/80 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
          Entry ID: {exitRecord.ledger_entry_id || 'ledg-exit-001'}
        </div>
      </div>
    </div>
  );
};
