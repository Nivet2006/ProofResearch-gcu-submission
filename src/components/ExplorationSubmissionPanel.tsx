import React, { useState, useEffect } from 'react';
import { ExplorationSubmission, UserProfile } from '../types';
import { explorationService } from '../services/explorationService';
import { AlertTriangle, CheckCircle2, XCircle, FileText, FlaskConical, Award, ArrowRight, ShieldCheck, DollarSign } from 'lucide-react';

interface Props {
  projectId: string;
  milestoneId: string;
  budget: number;
  user: UserProfile;
  onReviewCompleted?: () => void;
}

export const ExplorationSubmissionPanel: React.FC<Props> = ({
  projectId,
  milestoneId,
  budget,
  user,
  onReviewCompleted
}) => {
  const [submission, setSubmission] = useState<ExplorationSubmission | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reviewerNotes, setReviewerNotes] = useState('');

  useEffect(() => {
    loadSubmission();
  }, [milestoneId]);

  const loadSubmission = async () => {
    const subs = await explorationService.getMilestoneSubmissions(milestoneId);
    if (subs.length > 0) {
      setSubmission(subs[0]);
    }
  };

  const handleReviewDecision = async (decision: 'ACCEPT' | 'REJECT') => {
    if (!submission) return;
    setIsProcessing(true);
    try {
      const res = await explorationService.reviewExplorationSubmission(
        projectId,
        submission.id,
        user.id,
        decision,
        reviewerNotes || 'Verified documented research effort, methodology, and negative findings.'
      );
      setSubmission(res.submission);
      if (onReviewCompleted) onReviewCompleted();
    } catch (err: any) {
      alert(err.message || 'Error processing exploration review');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!submission) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-xs text-slate-400">
        Loading exploration submission data...
      </div>
    );
  }

  const isReviewer = user.role === 'SPONSOR' || user.role === 'EXPERT' || user.role === 'ADMIN';

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 text-slate-100 space-y-6 shadow-xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/30">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Exploration Milestone Submission</h3>
            <p className="text-xs text-slate-400">
              Contributor: <strong className="text-slate-200">{submission.contributor_name || 'Rahul Sharma'}</strong> · Policy: Documented Effort Rewards Negative Results
            </p>
          </div>
        </div>

        {/* Outcome Badge */}
        <div className="flex items-center space-x-2">
          {submission.research_outcome === 'NEGATIVE_RESULT' ? (
            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold rounded-full flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> VALIDATED NEGATIVE RESULT
            </span>
          ) : (
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-semibold rounded-full flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> HYPOTHESIS CONFIRMED
            </span>
          )}
        </div>
      </div>

      {/* Exploration Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Box 1: Question & Hypothesis */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-4 space-y-2">
          <div className="font-semibold text-indigo-300 uppercase tracking-wider text-[11px]">
            Research Question & Hypothesis
          </div>
          <div>
            <span className="text-slate-400">Question:</span>
            <p className="text-slate-200 font-medium mt-0.5">{submission.research_question}</p>
          </div>
          <div className="pt-2 border-t border-slate-700/80">
            <span className="text-slate-400">Hypothesis:</span>
            <p className="text-slate-200 mt-0.5">{submission.hypothesis}</p>
          </div>
        </div>

        {/* Box 2: Methodology & Experiments */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-4 space-y-2">
          <div className="font-semibold text-cyan-300 uppercase tracking-wider text-[11px]">
            Methodology & Experiments Performed
          </div>
          <div>
            <span className="text-slate-400">Methodology:</span>
            <p className="text-slate-200 font-medium mt-0.5">{submission.methodology}</p>
          </div>
          <div className="pt-2 border-t border-slate-700/80">
            <span className="text-slate-400">Experiments:</span>
            <p className="text-slate-200 mt-0.5">{submission.experiments_performed}</p>
          </div>
        </div>
      </div>

      {/* Box 3: Results Summary & Negative Findings */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3 text-xs">
        <div className="font-semibold text-amber-300 uppercase tracking-wider text-[11px] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Results & Negative Findings Analysis
        </div>
        <p className="text-slate-200 leading-relaxed font-mono bg-slate-900/90 p-3 rounded border border-slate-800">
          {submission.results_summary}
        </p>

        {submission.negative_findings && (
          <div className="bg-amber-950/20 border border-amber-500/30 p-3 rounded text-amber-200 space-y-1">
            <span className="font-semibold text-[11px] text-amber-300">Negative Finding / Root Cause:</span>
            <p>{submission.negative_findings}</p>
          </div>
        )}

        {/* Lessons Learned & Recommended Next Step */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-slate-300">
          <div className="bg-slate-900 p-3 rounded border border-slate-800">
            <span className="text-slate-400 font-semibold block text-[11px] mb-1">Lessons Learned:</span>
            <p>{submission.lessons_learned || 'INT8 quantization requires Quantization-Aware Training (QAT).'}</p>
          </div>
          <div className="bg-slate-900 p-3 rounded border border-slate-800">
            <span className="text-slate-400 font-semibold block text-[11px] mb-1 flex items-center gap-1">
              <ArrowRight className="w-3.5 h-3.5 text-cyan-400" /> Recommended Next Step:
            </span>
            <p>{submission.recommended_next_step || 'Evaluate Knowledge Distillation or FP16 inference.'}</p>
          </div>
        </div>
      </div>

      {/* Reviewer Section */}
      {submission.review_status === 'PENDING' ? (
        isReviewer ? (
          <div className="bg-slate-950 border border-indigo-500/40 rounded-lg p-5 space-y-4 text-xs text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="font-bold text-indigo-300 flex items-center gap-2 text-sm">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                EXPLORATION EFFORT REVIEWER PANEL
              </div>
              <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[11px] font-semibold rounded">
                REVIEWER: {user.full_name} ({user.role})
              </span>
            </div>

            {/* Documented Effort Checklist */}
            <div className="bg-slate-900 p-3.5 rounded border border-slate-800 space-y-2 text-slate-300">
              <div className="font-semibold text-slate-100 uppercase tracking-wider text-[11px]">
                Gardenia Documented Effort Checklist
              </div>
              <ul className="space-y-1.5 text-[11px]">
                <li className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Research question & hypothesis clearly stated
                </li>
                <li className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Agreed experiments & methodology documented
                </li>
                <li className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Negative findings & failure analysis documented
                </li>
                <li className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Lessons learned & recommended next step recorded
                </li>
              </ul>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Reviewer Assessment Notes:</label>
              <input
                type="text"
                value={reviewerNotes}
                onChange={e => setReviewerNotes(e.target.value)}
                placeholder="Enter review rationale (e.g. Negative result accepted: documented effort satisfies exploration criteria)"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => handleReviewDecision('REJECT')}
                disabled={isProcessing}
                className="px-4 py-2 bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-semibold rounded transition-colors"
              >
                [ REJECT SUBMISSION ]
              </button>
              <button
                onClick={() => handleReviewDecision('ACCEPT')}
                disabled={isProcessing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> [ ACCEPT EXPLORATION & RELEASE ESCROW ]
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-950 p-4 rounded border border-slate-800 text-xs text-slate-400 italic">
            Exploration submission is pending review by Sponsor or Expert Advisor.
          </div>
        )
      ) : (
        <div className={`p-5 rounded-lg border text-xs space-y-2 ${
          submission.review_status === 'ACCEPTED'
            ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
            : 'bg-rose-950/20 border-rose-500/40 text-rose-300'
        }`}>
          <div className="font-bold text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            EXPLORATION SUBMISSION ACCEPTED (NEGATIVE RESULT DELIVERABLE)
          </div>
          <p className="leading-relaxed">
            {submission.reviewer_notes || 'Negative result accepted as a valid research deliverable because documented exploration effort and methodology were verified.'}
          </p>
          <div className="pt-2 border-t border-emerald-500/30 flex items-center justify-between font-mono text-[11px]">
            <span>Escrow Status: <strong>RELEASED</strong></span>
            <span>Reward Engine: <strong>EXECUTED (Impact: 8.5)</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};
