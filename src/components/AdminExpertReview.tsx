import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';
import {
  ExpertApplication,
  ExpertEvidence,
  ExpertReview,
  ExpertTier,
  ReviewVote,
  EvidenceVerificationStatus,
} from '../types/expertVerification';
import {
  expertVerificationService,
  computePreliminaryScore,
  computeCommitteeDecision,
} from '../services/expertVerificationService';
import { ExpertBadgeChip } from './ExpertBadge';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIER_LABELS: Record<ExpertTier, string> = {
  GOVERNMENT_EXPERT: '🏛️ Government-Verified Expert',
  ACADEMIC_EXPERT: '🎓 Academic Expert',
  PRACTITIONER_EXPERT: '⚙️ Practitioner Expert',
  DOMAIN_REVIEWER: '🔍 Domain Reviewer',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT:                'bg-gray-100 text-gray-600 border-gray-300',
  PENDING_REVIEW:       'bg-blue-50 text-blue-700 border-blue-300',
  NEEDS_MORE_EVIDENCE:  'bg-amber-50 text-amber-700 border-amber-300',
  APPROVED:             'bg-emerald-50 text-emerald-700 border-emerald-300',
  REJECTED:             'bg-red-50 text-red-700 border-red-300',
  SUSPENDED:            'bg-gray-100 text-gray-500 border-gray-300',
};

const EV_STATUS_COLORS: Record<EvidenceVerificationStatus, string> = {
  PENDING:  'bg-gray-100 text-gray-600',
  ACCEPTED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-red-50 text-red-700',
};

// ─── Application Row ──────────────────────────────────────────────────────────

const ApplicationRow: React.FC<{
  app: ExpertApplication;
  onSelect: () => void;
  isSelected: boolean;
}> = ({ app, onSelect, isSelected }) => {
  const scoreColor =
    app.preliminary_score >= 85 ? '#7c3aed' :
    app.preliminary_score >= 70 ? '#2563eb' :
    app.preliminary_score >= 55 ? '#059669' : '#6b7280';

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 border-b border-[#F0F0F0] hover:bg-[#FAFAFA] transition-colors ${isSelected ? 'bg-[#F5F5F5] border-l-2 border-l-[#000]' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#000] truncate">
              {app.applicant_profile?.full_name || app.full_name}
            </span>
            {app.badge && app.badge.is_active && <ExpertBadgeChip badge={app.badge} size="xs" />}
          </div>
          <div className="text-[10px] text-[#888]">{app.primary_domain}</div>
          <div className="text-[10px] text-[#666]">{app.current_role_title} · {app.institution}</div>
        </div>
        <div className="shrink-0 text-right space-y-1">
          <div className="text-xl font-black tabular-nums" style={{ color: scoreColor }}>{app.preliminary_score}</div>
          <span className={`inline-block px-2 py-0.5 border rounded text-[9px] font-semibold uppercase ${STATUS_COLORS[app.status] || ''}`}>
            {app.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>
      <div className="flex gap-3 mt-2 text-[10px] text-[#888]">
        <span>📎 {app.evidence?.length || 0} evidence</span>
        <span>👥 {app.reviews?.length || 0} reviews</span>
        <span>{new Date(app.created_at).toLocaleDateString('en-IN')}</span>
      </div>
    </button>
  );
};

// ─── Evidence Panel ───────────────────────────────────────────────────────────

const EvidencePanel: React.FC<{
  evidence: ExpertEvidence[];
  adminId: string;
  applicationId: string;
  onUpdate: () => void;
}> = ({ evidence, adminId, applicationId, onUpdate }) => {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const review = async (ev: ExpertEvidence, status: EvidenceVerificationStatus) => {
    setSaving(ev.id);
    await expertVerificationService.reviewEvidence({
      evidenceId: ev.id,
      adminId,
      status,
      adminNotes: notes[ev.id] || '',
      applicationId,
    });
    setSaving(null);
    onUpdate();
  };

  if (evidence.length === 0) return (
    <div className="text-xs text-[#888] py-4 text-center border border-dashed border-[#DDD] rounded">
      No evidence uploaded yet.
    </div>
  );

  return (
    <div className="space-y-3">
      {evidence.map(ev => (
        <div key={ev.id} className="border border-[#E5E5E5] rounded p-3 space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[#000] truncate">{ev.filename}</div>
              <div className="text-[10px] text-[#888]">
                {ev.category.replace(/_/g, ' ')} · {(ev.file_size_bytes / 1024).toFixed(1)} KB
              </div>
              <div className="text-[9px] font-mono text-[#AAA] truncate mt-0.5">SHA-256: {ev.content_hash.slice(0, 32)}…</div>
            </div>
            <span className={`shrink-0 px-2 py-0.5 rounded text-[9px] font-semibold uppercase ${EV_STATUS_COLORS[ev.verification_status]}`}>
              {ev.verification_status}
            </span>
          </div>
          {ev.admin_notes && (
            <div className="text-[10px] text-[#555] bg-[#F9F9F9] border border-[#E5E5E5] rounded p-2">
              {ev.admin_notes}
            </div>
          )}
          {ev.verification_status === 'PENDING' && (
            <div className="space-y-1">
              <input
                placeholder="Admin note (optional)…"
                value={notes[ev.id] || ''}
                onChange={e => setNotes(n => ({ ...n, [ev.id]: e.target.value }))}
                className="w-full border border-[#D5D5D5] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#000]"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => review(ev, 'ACCEPTED')}
                  disabled={saving === ev.id}
                  className="flex-1 px-3 py-1 bg-emerald-50 border border-emerald-300 text-emerald-700 text-xs font-semibold rounded hover:bg-emerald-100 transition-colors disabled:opacity-50"
                >
                  ✓ Accept
                </button>
                <button
                  onClick={() => review(ev, 'REJECTED')}
                  disabled={saving === ev.id}
                  className="flex-1 px-3 py-1 bg-red-50 border border-red-300 text-red-700 text-xs font-semibold rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  ✗ Reject
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ─── Review Panel ─────────────────────────────────────────────────────────────

const ReviewPanel: React.FC<{
  reviews: ExpertReview[];
  applicationId: string;
  adminId: string;
  onUpdate: () => void;
}> = ({ reviews, applicationId, adminId, onUpdate }) => {
  const [vote, setVote] = useState<ReviewVote>('APPROVE');
  const [confidence, setConfidence] = useState(75);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const decision = computeCommitteeDecision(reviews);
  const myReview = reviews.find(r => r.reviewer_id === adminId);

  const handleSubmit = async () => {
    setSaving(true);
    await expertVerificationService.submitReview({
      applicationId,
      reviewerId: adminId,
      vote,
      confidenceScore: confidence,
      notes,
    });
    setSaving(false);
    setNotes('');
    onUpdate();
  };

  const voteColors: Record<ReviewVote, string> = {
    APPROVE: 'border-emerald-600 bg-emerald-600 text-white',
    REJECT: 'border-red-600 bg-red-600 text-white',
    REQUEST_MORE_EVIDENCE: 'border-amber-600 bg-amber-600 text-white',
  };
  const voteInactive = 'border-[#D5D5D5] bg-white text-[#555] hover:border-[#999]';

  return (
    <div className="space-y-4">
      {/* Committee summary */}
      <div className={`p-3 rounded border text-xs ${decision.canApprove ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-[#F9F9F9] border-[#E5E5E5] text-[#555]'}`}>
        <div className="font-semibold">{decision.canApprove ? '✅ Eligible for Approval' : '⏳ Committee Vote Status'}</div>
        <div className="mt-0.5">{decision.reason}</div>
        <div className="flex gap-4 mt-2 text-[10px]">
          <span>✓ Approvals: {decision.approvals}</span>
          <span>✗ Rejections: {decision.rejections}</span>
          <span>⚠ More Evidence: {decision.moreEvidenceRequests}</span>
        </div>
      </div>

      {/* Existing votes */}
      {reviews.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#888]">Reviewer Votes</div>
          {reviews.map(r => (
            <div key={r.id} className="flex items-center gap-2 p-2 border border-[#F0F0F0] rounded bg-[#FAFAFA] text-[11px]">
              <span className="font-medium text-[#333] flex-1">{r.reviewer_profile?.full_name || r.reviewer_id.slice(0, 8)}</span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${r.vote === 'APPROVE' ? 'bg-emerald-100 text-emerald-700' : r.vote === 'REJECT' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                {r.vote.replace(/_/g, ' ')}
              </span>
              <span className="text-[#888]">{r.confidence_score}% conf.</span>
            </div>
          ))}
        </div>
      )}

      {/* Vote form */}
      <div className="space-y-3 border-t border-[#E5E5E5] pt-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#888]">
          {myReview ? 'Update Your Vote' : 'Submit Your Review Vote'}
        </div>
        <div className="flex gap-2">
          {(['APPROVE', 'REJECT', 'REQUEST_MORE_EVIDENCE'] as ReviewVote[]).map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setVote(v)}
              className={`flex-1 px-2 py-2 border rounded text-[10px] font-semibold transition-colors ${vote === v ? voteColors[v] : voteInactive}`}
            >
              {v === 'APPROVE' ? '✓ Approve' : v === 'REJECT' ? '✗ Reject' : '⚠ More Evidence'}
            </button>
          ))}
        </div>
        <div>
          <label className="text-[10px] text-[#888] block mb-1">Confidence ({confidence}%)</label>
          <input type="range" min="0" max="100" value={confidence} onChange={e => setConfidence(Number(e.target.value))} className="w-full" />
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="Notes for the committee (visible to other admins only)…"
          className="w-full border border-[#D5D5D5] rounded px-2 py-1.5 text-xs focus:outline-none focus:border-[#000] resize-none"
        />
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full px-4 py-2 bg-[#000] text-white text-xs font-semibold rounded hover:bg-[#1A1A1A] transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Submit Vote'}
        </button>
      </div>
    </div>
  );
};

// ─── Detail Panel ─────────────────────────────────────────────────────────────

const ApplicationDetail: React.FC<{
  app: ExpertApplication;
  adminId: string;
  onUpdate: () => void;
}> = ({ app, adminId, onUpdate }) => {
  const [adminNotes, setAdminNotes] = useState(app.admin_notes || '');
  const [selectedTier, setSelectedTier] = useState<ExpertTier>(app.final_tier || (app.preliminary_tier as ExpertTier) || 'DOMAIN_REVIEWER');
  const [verifiedDomains, setVerifiedDomains] = useState<string[]>(app.verified_domains || [app.primary_domain]);
  const [domainInput, setDomainInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'evidence' | 'reviews' | 'decision'>('info');

  const decision = computeCommitteeDecision(app.reviews || []);

  const updateStatus = async (status: ExpertApplication['status']) => {
    setSaving(true);
    const r = await expertVerificationService.updateApplicationStatus({
      applicationId: app.id,
      adminId,
      status,
      adminNotes,
      finalTier: selectedTier,
      verifiedDomains,
    });
    if (r.success && status === 'APPROVED') {
      // Auto-grant badge after approval
      await expertVerificationService.grantBadge({ application: { ...app, status, final_tier: selectedTier, verified_domains: verifiedDomains, approved_by: adminId, approved_at: new Date().toISOString() }, adminId });
    }
    setStatusMsg({ text: r.message, ok: r.success });
    setSaving(false);
    onUpdate();
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const toggleDomain = (d: string) =>
    setVerifiedDomains(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const addDomain = () => {
    if (domainInput.trim() && !verifiedDomains.includes(domainInput.trim())) {
      setVerifiedDomains(prev => [...prev, domainInput.trim()]);
    }
    setDomainInput('');
  };

  const tabs = [
    { id: 'info', label: 'Application Info' },
    { id: 'evidence', label: `Evidence (${app.evidence?.length || 0})` },
    { id: 'reviews', label: `Reviews (${app.reviews?.length || 0})` },
    { id: 'decision', label: 'Final Decision' },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="text-base font-semibold text-[#000]">{app.applicant_profile?.full_name || app.full_name}</div>
          <div className="text-xs text-[#888]">{app.current_role_title} · {app.institution}</div>
          <div className="text-[10px] text-[#888]">{app.applicant_profile?.email}</div>
        </div>
        <span className={`px-3 py-1 border rounded text-[10px] font-bold uppercase ${STATUS_COLORS[app.status] || ''}`}>
          {app.status.replace(/_/g, ' ')}
        </span>
      </div>

      {statusMsg && (
        <div className={`px-3 py-2 rounded border text-xs ${statusMsg.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {statusMsg.ok ? '✓ ' : '✗ '}{statusMsg.text}
        </div>
      )}

      {/* Tab nav */}
      <div className="flex border-b border-[#E5E5E5] gap-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-2 text-[10px] font-semibold uppercase tracking-wider border-b-2 transition-colors ${activeTab === t.id ? 'border-[#000] text-[#000]' : 'border-transparent text-[#888] hover:text-[#555]'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Info */}
      {activeTab === 'info' && (
        <div className="space-y-3 text-[11px]">
          {[
            ['Primary Domain', app.primary_domain],
            ['Secondary Domains', (app.secondary_domains || []).join(', ') || '—'],
            ['Highest Qualification', app.highest_qualification],
            ['Years of Experience', `${app.years_of_experience} years`],
            ['Publications', String(app.publication_count)],
            ['Patents', String(app.patent_count)],
            ['Government Empanelled', app.government_empanelled ? '✓ Yes' : '✗ No'],
          ].map(([k, v]) => (
            <div key={String(k)} className="flex items-start gap-2">
              <div className="w-36 shrink-0 text-[#888] font-medium">{k}</div>
              <div className="text-[#333]">{v}</div>
            </div>
          ))}
          <div>
            <div className="text-[#888] font-medium mb-1">References</div>
            <div className="text-[#333] whitespace-pre-line bg-[#F9F9F9] border border-[#E5E5E5] rounded p-2">{app.reference_contacts || '—'}</div>
          </div>
          <div>
            <div className="text-[#888] font-medium mb-1">Expertise Statement</div>
            <div className="text-[#333] leading-relaxed bg-[#F9F9F9] border border-[#E5E5E5] rounded p-2">{app.expertise_statement || '—'}</div>
          </div>

          {/* Score breakdown */}
          <div className="border border-[#E5E5E5] rounded p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#333]">Preliminary Score</span>
              <span className="text-xl font-black text-[#000]">{app.preliminary_score}/100</span>
            </div>
            <div className="bg-[#E5E5E5] rounded-full h-1.5 overflow-hidden">
              <div className="h-1.5 bg-[#000] rounded-full" style={{ width: `${app.preliminary_score}%` }} />
            </div>
            <div className="text-[10px] text-[#888]">{app.preliminary_tier?.replace(/_/g, ' ')} candidate</div>
          </div>
        </div>
      )}

      {/* Tab: Evidence */}
      {activeTab === 'evidence' && (
        <EvidencePanel
          evidence={app.evidence || []}
          adminId={adminId}
          applicationId={app.id}
          onUpdate={onUpdate}
        />
      )}

      {/* Tab: Reviews */}
      {activeTab === 'reviews' && (
        <ReviewPanel
          reviews={app.reviews || []}
          applicationId={app.id}
          adminId={adminId}
          onUpdate={onUpdate}
        />
      )}

      {/* Tab: Decision */}
      {activeTab === 'decision' && (
        <div className="space-y-4">
          {/* Committee decision */}
          <div className={`p-3 rounded border text-xs ${decision.canApprove ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
            <div className="font-semibold">{decision.canApprove ? '✅ Committee Quorum Reached' : '⏳ Awaiting Sufficient Votes'}</div>
            <div className="mt-0.5">{decision.reason}</div>
          </div>

          {/* Final tier */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[#888] block mb-1">Final Expert Tier</label>
            <select
              value={selectedTier}
              onChange={e => setSelectedTier(e.target.value as ExpertTier)}
              className="w-full border border-[#D5D5D5] rounded px-2 py-2 text-sm focus:outline-none focus:border-[#000]"
            >
              {(Object.entries(TIER_LABELS) as [ExpertTier, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Verified domains */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[#888] block mb-1">Verified Domains</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {verifiedDomains.map(d => (
                <span key={d} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F0F0F0] border border-[#E0E0E0] text-xs text-[#333] rounded">
                  {d}
                  <button onClick={() => toggleDomain(d)} className="text-[#888] hover:text-red-600 font-bold leading-none">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={domainInput}
                onChange={e => setDomainInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDomain(); } }}
                placeholder="Add verified domain…"
                className="flex-1 border border-[#D5D5D5] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#000]"
              />
              <button onClick={addDomain} className="px-3 py-1 border border-[#D5D5D5] text-xs text-[#555] rounded hover:bg-[#F5F5F5] transition-colors">Add</button>
            </div>
          </div>

          {/* Admin notes */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[#888] block mb-1">Admin Notes (visible to applicant)</label>
            <textarea
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              rows={3}
              placeholder="Feedback for the applicant…"
              className="w-full border border-[#D5D5D5] rounded px-2 py-1.5 text-xs focus:outline-none focus:border-[#000] resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => updateStatus('APPROVED')}
              disabled={saving}
              className="px-4 py-2.5 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              ✓ Approve &amp; Grant Badge
            </button>
            <button
              onClick={() => updateStatus('NEEDS_MORE_EVIDENCE')}
              disabled={saving}
              className="px-4 py-2.5 bg-amber-500 text-white text-xs font-semibold rounded hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              ⚠ Request More Evidence
            </button>
            <button
              onClick={() => updateStatus('REJECTED')}
              disabled={saving}
              className="px-4 py-2.5 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              ✗ Reject Application
            </button>
            {app.badge?.is_active && (
              <button
                onClick={() => expertVerificationService.suspendBadge({ userId: app.user_id, adminId, reason: adminNotes || 'Suspended by admin.', applicationId: app.id }).then(() => onUpdate())}
                disabled={saving}
                className="px-4 py-2.5 bg-gray-700 text-white text-xs font-semibold rounded hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                🚫 Suspend Badge
              </button>
            )}
          </div>
          <p className="text-[10px] text-[#888]">
            Approval requires committee quorum (2+ approvals, no unresolved rejections) or super-admin override. The badge is granted immediately on approval.
          </p>
        </div>
      )}
    </div>
  );
};

// ─── Main Export ──────────────────────────────────────────────────────────────

export const AdminExpertReviewPanel: React.FC<{ currentUser: UserProfile }> = ({ currentUser }) => {
  const [applications, setApplications] = useState<ExpertApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    const apps = await expertVerificationService.getAllApplications();
    setApplications(apps);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filterStatus === 'ALL' ? applications : applications.filter(a => a.status === filterStatus);
  const selected = applications.find(a => a.id === selectedId) || null;

  const statusCounts = applications.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
        <div>
          <h2 className="text-base font-semibold text-[#000] uppercase tracking-wider">Expert Verification Review</h2>
          <p className="text-xs text-[#888] mt-0.5">Review pending expert applications, inspect evidence, and approve or reject.</p>
        </div>
        <button onClick={load} className="px-3 py-1.5 border border-[#D5D5D5] text-xs text-[#555] rounded hover:bg-[#F5F5F5] transition-colors">↻ Refresh</button>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-2">
        {[
          ['ALL', applications.length, 'All'],
          ['PENDING_REVIEW', statusCounts.PENDING_REVIEW || 0, 'Pending'],
          ['NEEDS_MORE_EVIDENCE', statusCounts.NEEDS_MORE_EVIDENCE || 0, 'More Evidence'],
          ['APPROVED', statusCounts.APPROVED || 0, 'Approved'],
          ['REJECTED', statusCounts.REJECTED || 0, 'Rejected'],
        ].map(([status, count, label]) => (
          <button
            key={String(status)}
            onClick={() => setFilterStatus(String(status))}
            className={`px-3 py-1.5 border rounded text-[10px] font-semibold transition-colors ${filterStatus === status ? 'bg-[#000] text-white border-[#000]' : 'bg-white text-[#555] border-[#D5D5D5] hover:border-[#999]'}`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Split pane layout */}
      <div className="grid grid-cols-5 gap-4 min-h-[500px]">
        {/* Left: list */}
        <div className="col-span-2 border border-[#E5E5E5] rounded overflow-hidden">
          {loading ? (
            <div className="text-xs text-[#888] py-8 text-center">Loading applications…</div>
          ) : filtered.length === 0 ? (
            <div className="text-xs text-[#888] py-8 text-center border-2 border-dashed border-[#DDD] m-4 rounded">
              No applications found.
            </div>
          ) : (
            <div className="divide-y divide-[#F0F0F0] max-h-[600px] overflow-y-auto">
              {filtered.map(app => (
                <ApplicationRow
                  key={app.id}
                  app={app}
                  isSelected={selectedId === app.id}
                  onSelect={() => setSelectedId(app.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: detail */}
        <div className="col-span-3 border border-[#E5E5E5] rounded p-4 overflow-y-auto max-h-[700px]">
          {selected ? (
            <ApplicationDetail app={selected} adminId={currentUser.id} onUpdate={load} />
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-[#888]">
              Select an application to review
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
