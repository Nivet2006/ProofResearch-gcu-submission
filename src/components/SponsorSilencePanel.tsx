import React, { useState, useEffect } from 'react';
import { AcceptanceTimeoutPolicy, MediationCase, UserProfile } from '../types';
import { sponsorSilenceService } from '../services/sponsorSilenceService';
import { Clock, ShieldAlert, CheckCircle2, XCircle, Scale, Lock, DollarSign, Cpu, FileText } from 'lucide-react';

interface Props {
  projectId: string;
  milestoneId: string;
  milestoneTitle: string;
  budget: number;
  user: UserProfile;
  onStateChange?: () => void;
}

export const SponsorSilencePanel: React.FC<Props> = ({
  projectId,
  milestoneId,
  milestoneTitle,
  budget,
  user,
  onStateChange
}) => {
  const [policy, setPolicy] = useState<AcceptanceTimeoutPolicy>('MEDIATOR');
  const [status, setStatus] = useState<'ACCEPTANCE_PENDING' | 'ACCEPTED' | 'REJECTED' | 'MEDIATION_REQUIRED'>('ACCEPTANCE_PENDING');
  const [escrowStatus, setEscrowStatus] = useState<'LOCKED_IN_ESCROW' | 'RELEASED'>('LOCKED_IN_ESCROW');
  const [mediationCase, setMediationCase] = useState<MediationCase | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mediatorNotes, setMediatorNotes] = useState('');
  const [releaseReason, setReleaseReason] = useState<string>('');

  useEffect(() => {
    loadState();
  }, [projectId, milestoneId]);

  const loadState = async () => {
    const medCase = await sponsorSilenceService.getMediationCase(milestoneId);
    if (medCase) {
      setMediationCase(medCase);
      setPolicy(medCase.policy);
      if (medCase.status === 'PENDING') {
        setStatus('MEDIATION_REQUIRED');
        setEscrowStatus('LOCKED_IN_ESCROW');
      } else if (medCase.status === 'RESOLVED_ACCEPTED') {
        setStatus('ACCEPTED');
        setEscrowStatus('RELEASED');
        setReleaseReason('Accepted by Expert Mediator');
      } else {
        setStatus('REJECTED');
        setEscrowStatus('LOCKED_IN_ESCROW');
      }
    }
  };

  const handleSimulateTimeout = async (selectedPolicy: AcceptanceTimeoutPolicy) => {
    setIsProcessing(true);
    try {
      // First ensure window started with policy
      await sponsorSilenceService.startAcceptanceWindow(projectId, milestoneId, 48, selectedPolicy);
      const res = await sponsorSilenceService.checkAndProcessTimeout(projectId, milestoneId, true);
      
      setPolicy(res.policy);
      setStatus(res.newStatus as any);
      setEscrowStatus(res.escrowStatus);
      if (res.mediationCase) {
        setMediationCase(res.mediationCase);
      }
      if (res.newStatus === 'ACCEPTED') {
        setReleaseReason(selectedPolicy === 'AUTO_ACCEPT' ? 'Automatically accepted after 48h timeout' : 'Sponsor accepted');
      }
      if (onStateChange) onStateChange();
    } catch (err: any) {
      alert(err.message || 'Error processing timeout simulation');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMediatorDecision = async (decision: 'ACCEPT' | 'REJECT') => {
    setIsProcessing(true);
    try {
      const res = await sponsorSilenceService.processMediatorDecision(
        projectId,
        milestoneId,
        user.id,
        decision,
        mediatorNotes || `Mediator verified contribution evidence and approved milestone release.`
      );
      setStatus(res.newStatus as any);
      setEscrowStatus(res.escrowStatus);
      if (res.mediationCase) {
        setMediationCase(res.mediationCase);
      }
      setReleaseReason(decision === 'ACCEPT' ? 'Approved by Expert Mediator' : 'Rejected by Expert Mediator');
      if (onStateChange) onStateChange();
    } catch (err: any) {
      alert(err.message || 'Error executing mediator decision');
    } finally {
      setIsProcessing(false);
    }
  };

  const isSponsor = user.role === 'SPONSOR';
  const isMediator = user.role === 'EXPERT' || user.role === 'ADMIN';

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 text-slate-100 space-y-6 shadow-xl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/30">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Sponsor Acceptance Window</h3>
            <p className="text-xs text-slate-400">
              Policy: <strong className="text-slate-200">{policy}</strong> (48h Acceptance Window)
            </p>
          </div>
        </div>

        {/* Escrow Status Badge */}
        <div className="flex items-center space-x-2">
          <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${
            escrowStatus === 'RELEASED'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
          }`}>
            <DollarSign className="w-3.5 h-3.5" />
            <span>ESCROW: ₹{budget.toLocaleString()} ({escrowStatus})</span>
          </div>
        </div>
      </div>

      {/* State 1: WAITING FOR SPONSOR */}
      {status === 'ACCEPTANCE_PENDING' && (
        <div className="space-y-4">
          <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                Status: WAITING FOR SPONSOR
              </div>
              <p className="text-xs text-slate-400">
                47:58:20 remaining until acceptance window deadline.
              </p>
            </div>

            {/* Sponsor Action Buttons */}
            {isSponsor && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSimulateTimeout('MEDIATOR')}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded transition-colors"
                >
                  [ ACCEPT MILESTONE ]
                </button>
                <button
                  onClick={() => setStatus('REJECTED')}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded transition-colors"
                >
                  [ REJECT ]
                </button>
              </div>
            )}
          </div>

          {/* Hackathon Demo Silence Simulator Controls */}
          <div className="bg-slate-950/80 border border-indigo-500/30 rounded-lg p-4 space-y-3">
            <div className="text-xs font-bold text-indigo-300 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" />
              SIMULATE SPONSOR SILENCE (HACKATHON DEMO TOOLING)
            </div>
            <p className="text-xs text-slate-400">
              Simulate sponsor failing to respond within 48h to evaluate charter fallback policies:
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => handleSimulateTimeout('AUTO_ACCEPT')}
                disabled={isProcessing}
                className="px-3.5 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/50 text-xs font-semibold rounded transition-colors"
              >
                Simulate Timeout: Policy A (AUTO_ACCEPT)
              </button>
              <button
                onClick={() => handleSimulateTimeout('MEDIATOR')}
                disabled={isProcessing}
                className="px-3.5 py-2 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/50 text-xs font-semibold rounded transition-colors"
              >
                Simulate Timeout: Policy B (MEDIATOR)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* State 2: AUTO_ACCEPTED */}
      {status === 'ACCEPTED' && policy === 'AUTO_ACCEPT' && (
        <div className="bg-emerald-950/20 border border-emerald-500/40 rounded-lg p-5 space-y-3 text-xs text-emerald-300">
          <div className="font-bold text-sm flex items-center gap-2 text-emerald-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            MILESTONE AUTOMATICALLY ACCEPTED
          </div>
          <p className="leading-relaxed">
            Acceptance window expired after 48 hours without sponsor response. Milestone automatically accepted according to pre-agreed Charter v1.0 terms.
          </p>
          <div className="pt-2 border-t border-emerald-500/30 flex items-center justify-between font-mono text-[11px]">
            <span>Escrow Status: <strong>₹{budget.toLocaleString()} RELEASED</strong></span>
            <span>Reward Engine: <strong>EXECUTED</strong></span>
          </div>
        </div>
      )}

      {/* State 3: MEDIATION_REQUIRED */}
      {status === 'MEDIATION_REQUIRED' && (
        <div className="space-y-4">
          <div className="bg-amber-950/20 border border-amber-500/40 rounded-lg p-5 space-y-3 text-xs text-amber-300">
            <div className="font-bold text-sm flex items-center gap-2 text-amber-200">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              SPONSOR UNRESPONSIVE: MEDIATION REQUIRED
            </div>
            <p className="leading-relaxed">
              Acceptance window expired after 48 hours without sponsor response. Milestone moved to mediation. Escrow funds (₹{budget.toLocaleString()}) remain <strong>LOCKED_IN_ESCROW</strong> until expert mediator resolution.
            </p>
          </div>

          {/* Expert Mediator Resolution Panel */}
          {isMediator ? (
            <div className="bg-slate-950 border border-cyan-500/40 rounded-lg p-5 space-y-4 text-xs text-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="font-bold text-cyan-300 flex items-center gap-2 text-sm">
                  <Scale className="w-5 h-5 text-cyan-400" />
                  EXPERT MEDIATOR RESOLUTION PANEL
                </div>
                <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[11px] font-semibold rounded">
                  AUTHORIZED MEDIATOR: {user.full_name} ({user.role})
                </span>
              </div>

              {/* Evidence Checklist */}
              <div className="bg-slate-900/80 p-3.5 rounded border border-slate-800 space-y-2 text-xs text-slate-300">
                <div className="font-semibold text-slate-100 uppercase tracking-wider text-[11px]">
                  Mediator Evidence Checklist
                </div>
                <ul className="space-y-1.5">
                  <li className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Deliverables submitted (CLAHE pre-processing pipeline, Python script)
                  </li>
                  <li className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Acceptance criteria satisfied & tested
                  </li>
                  <li className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> SHA-256 Contribution ledger verified
                  </li>
                  <li className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Similarity & integrity checks clean (87% overlap approved by Dr. Ananya Rao)
                  </li>
                </ul>
              </div>

              {/* Notes input */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">Mediator Evaluation Notes:</label>
                <input
                  type="text"
                  value={mediatorNotes}
                  onChange={e => setMediatorNotes(e.target.value)}
                  placeholder="Enter evaluation rationale (e.g. Deliverables verified against charter acceptance criteria)"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Decision buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => handleMediatorDecision('REJECT')}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-semibold rounded transition-colors"
                >
                  [ REJECT MEDIATION ]
                </button>
                <button
                  onClick={() => handleMediatorDecision('ACCEPT')}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> [ ACCEPT & RELEASE ESCROW ]
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-950 p-4 rounded border border-slate-800 text-xs text-slate-400 italic">
              Logged in as {user.full_name} ({user.role}). Only assigned Expert Advisors or Platform Admins can resolve active mediation cases.
            </div>
          )}
        </div>
      )}

      {/* State 4: ACCEPTED BY MEDIATOR */}
      {status === 'ACCEPTED' && policy === 'MEDIATOR' && (
        <div className="bg-emerald-950/20 border border-emerald-500/40 rounded-lg p-5 space-y-3 text-xs text-emerald-300">
          <div className="font-bold text-sm flex items-center gap-2 text-emerald-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            MILESTONE ACCEPTED BY EXPERT MEDIATOR
          </div>
          <p className="leading-relaxed">
            Decision: <strong>{releaseReason}</strong>. Deliverables & SHA-256 contribution evidence verified against Charter criteria. Escrow released to student pool.
          </p>
          <div className="pt-2 border-t border-emerald-500/30 flex items-center justify-between font-mono text-[11px]">
            <span>Escrow Status: <strong>₹{budget.toLocaleString()} RELEASED</strong></span>
            <span>Ledger Event: <strong>MEDIATOR_ACCEPTED & RELEASE_REWARDS</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};
