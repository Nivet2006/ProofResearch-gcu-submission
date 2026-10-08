import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, Project } from '../types';
import { authService } from '../services/authService';
import { projectService } from '../services/projectService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { LedgerVerificationView } from '../components/LedgerVerification';
import { DemoReadinessDiagnostic } from '../components/DemoReadinessDiagnostic';
import { AdminExpertReviewPanel } from '../components/AdminExpertReview';

type VerificationLevel = 'UNVERIFIED' | 'VERIFIED' | 'EXPERT_VERIFIED';

interface CandidateRow {
  id: string;
  user_id: string;
  skills: string[];
  experience_score: number;
  availability_score: number;
  research_interest: string;
  verification_level: VerificationLevel;
  profile?: { full_name: string; email: string; role: string; institution?: string };
}

// ─── User Verification Panel ─────────────────────────────────────────────────

const VERIFICATION_LEVELS: VerificationLevel[] = ['UNVERIFIED', 'VERIFIED', 'EXPERT_VERIFIED'];

const verificationBadge = (level: VerificationLevel) => {
  const styles: Record<VerificationLevel, string> = {
    UNVERIFIED: 'bg-gray-100 text-gray-600 border-gray-300',
    VERIFIED: 'bg-blue-50 text-blue-700 border-blue-300',
    EXPERT_VERIFIED: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  };
  return `inline-block px-2 py-0.5 border rounded text-[10px] font-semibold uppercase ${styles[level]}`;
};

const UserVerificationPanel: React.FC = () => {
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // user_id being saved
  const [statusMsg, setStatusMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (!isSupabaseConfigured) { setLoading(false); return; }
      const { data } = await supabase
        .from('candidate_profiles')
        .select('*, profile:user_id(full_name, email, role, institution)')
        .order('verification_level', { ascending: true });
      setCandidates((data as CandidateRow[]) || []);
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const setVerification = async (userId: string, candidateId: string, level: VerificationLevel) => {
    setSaving(userId);
    setStatusMsg(null);
    try {
      const { error } = await supabase
        .from('candidate_profiles')
        .update({ verification_level: level })
        .eq('id', candidateId);
      if (error) throw new Error(error.message);
      setCandidates(prev =>
        prev.map(c => c.id === candidateId ? { ...c, verification_level: level } : c)
      );
      setStatusMsg({ text: `Verification updated to ${level} for ${userId.slice(0, 8)}…`, ok: true });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Update failed', ok: false });
    }
    setSaving(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
        <div>
          <h2 className="text-base font-semibold text-[#000] uppercase tracking-wider">User Verification</h2>
          <p className="text-xs text-[#888] mt-0.5">
            Set verification level for STUDENT and EXPERT candidates. Only admins can change this.
          </p>
        </div>
        <button onClick={load} className="px-3 py-1.5 border border-[#D5D5D5] text-xs text-[#555] rounded hover:bg-[#F5F5F5] transition-colors">↻ Refresh</button>
      </div>

      {statusMsg && (
        <div className={`px-4 py-2.5 rounded text-xs font-medium border ${
          statusMsg.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {statusMsg.ok ? '✓ ' : '✗ '}{statusMsg.text}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px] text-[#555]">
        <span className={verificationBadge('UNVERIFIED')}>UNVERIFIED</span>
        <span className="text-[#888]">=</span>
        <span className="text-[#555]">No documents checked</span>
        <span className={verificationBadge('VERIFIED')}>VERIFIED</span>
        <span className="text-[#888]">=</span>
        <span className="text-[#555]">Identity &amp; institution confirmed</span>
        <span className={verificationBadge('EXPERT_VERIFIED')}>EXPERT_VERIFIED</span>
        <span className="text-[#888]">=</span>
        <span className="text-[#555]">Domain expertise confirmed</span>
      </div>

      {loading ? (
        <div className="text-xs text-[#888] py-4">Loading candidates…</div>
      ) : candidates.length === 0 ? (
        <div className="text-xs text-[#888] py-6 text-center border border-dashed border-[#DDD] rounded">
          No candidate profiles found.
        </div>
      ) : (
        <div className="divide-y divide-[#F0F0F0] border border-[#E5E5E5] rounded-md overflow-hidden">
          {candidates.map(candidate => (
            <div key={candidate.id} className="flex items-center justify-between gap-4 px-4 py-3 bg-white hover:bg-[#FAFAFA] transition-colors">
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#000] truncate">
                    {candidate.profile?.full_name || candidate.user_id}
                  </span>
                  <span className="text-[10px] text-[#888] font-mono shrink-0">{candidate.profile?.role}</span>
                </div>
                <div className="text-[10px] text-[#888]">
                  {candidate.profile?.email}
                  {candidate.profile?.institution ? ` · ${candidate.profile.institution}` : ''}
                </div>
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {(candidate.skills || []).slice(0, 4).map(s => (
                    <span key={s} className="px-1.5 py-0.5 bg-[#F5F5F5] border border-[#E0E0E0] text-[9px] font-mono text-[#555] rounded-sm">{s}</span>
                  ))}
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <span className={verificationBadge(candidate.verification_level)}>
                  {candidate.verification_level}
                </span>
                <select
                  value={candidate.verification_level}
                  disabled={saving === candidate.user_id}
                  onChange={e => setVerification(candidate.user_id, candidate.id, e.target.value as VerificationLevel)}
                  className="text-xs border border-[#D5D5D5] rounded px-2 py-1 bg-white text-[#333] focus:outline-none focus:border-[#000] disabled:opacity-50 cursor-pointer"
                >
                  {VERIFICATION_LEVELS.map(lvl => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
                {saving === candidate.user_id && (
                  <span className="text-[10px] text-[#888] animate-pulse">Saving…</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Confirm Delete Modal ─────────────────────────────────────────────────────

const ConfirmDeleteModal: React.FC<{
  project: Project;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}> = ({ project, onConfirm, onCancel, deleting }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div className="bg-white border border-[#E5E5E5] rounded-md shadow-xl w-full max-w-md mx-4 p-6 space-y-5">
      <div>
        <div className="text-[10px] font-semibold text-red-600 uppercase tracking-widest mb-1">
          ⚠ DESTRUCTIVE ACTION
        </div>
        <h2 className="text-base font-semibold text-[#000]">Delete Project & All Data?</h2>
      </div>

      <div className="bg-[#FFF5F5] border border-red-200 rounded p-3 space-y-1 text-xs text-[#333]">
        <div className="font-semibold text-[#000]">{project.title}</div>
        <div className="text-[#666] font-mono text-[10px]">{project.id}</div>
        <div className="pt-1 text-red-700">
          This will permanently delete:
          <ul className="list-disc list-inside mt-1 space-y-0.5 text-red-600">
            <li>Project record &amp; confidential brief</li>
            <li>All charters &amp; charter acceptances</li>
            <li>All milestones, submissions &amp; contributions</li>
            <li>All ledger entries &amp; escrow accounts</li>
            <li>All matching results &amp; reward allocations</li>
            <li>All novelty check records</li>
          </ul>
        </div>
        <div className="font-semibold text-red-700 pt-1">This cannot be undone.</div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={deleting}
          className="flex-1 px-4 py-2 border border-[#D5D5D5] text-xs font-medium text-[#333] rounded hover:bg-[#F5F5F5] transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={deleting}
          className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded transition-colors disabled:opacity-60"
        >
          {deleting ? 'Deleting…' : 'Yes, Delete Everything'}
        </button>
      </div>
    </div>
  </div>
);

// ─── Project Management Panel ─────────────────────────────────────────────────

const ProjectManagementPanel: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (!isSupabaseConfigured) {
        setProjects([]);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('projects')
        .select('*, sponsor_profile:users!created_by(*)')
        .order('created_at', { ascending: false });
      setProjects((data as Project[]) || []);
    } catch (_) {
      setProjects([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const result = await projectService.deleteProject(pendingDelete.id);
    setDeleting(false);
    setPendingDelete(null);
    setStatusMsg({ text: result.message, ok: result.success });
    if (result.success) {
      setProjects(prev => prev.filter(p => p.id !== pendingDelete.id));
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-[#F5F5F5] text-[#888] border-[#DDD]',
      OPEN: 'bg-green-50 text-green-700 border-green-200',
      IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
      COMPLETED: 'bg-[#F0F0F0] text-[#555] border-[#CCC]',
    };
    return `inline-block px-2 py-0.5 border rounded text-[10px] font-semibold uppercase ${colors[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
        <div>
          <h2 className="text-base font-semibold text-[#000] uppercase tracking-wider">Project Management</h2>
          <p className="text-xs text-[#888] mt-0.5">Hard-delete projects and all associated data for testing.</p>
        </div>
        <button
          onClick={load}
          className="px-3 py-1.5 border border-[#D5D5D5] text-xs text-[#555] rounded hover:bg-[#F5F5F5] transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Status message */}
      {statusMsg && (
        <div className={`px-4 py-2.5 rounded text-xs font-medium border ${
          statusMsg.ok
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {statusMsg.ok ? '✓ ' : '✗ '}{statusMsg.text}
        </div>
      )}

      {loading ? (
        <div className="text-xs text-[#888] py-4">Loading projects…</div>
      ) : projects.length === 0 ? (
        <div className="text-xs text-[#888] py-6 text-center border border-dashed border-[#DDD] rounded">
          No projects in database. Ready for a clean test.
        </div>
      ) : (
        <div className="divide-y divide-[#F0F0F0] border border-[#E5E5E5] rounded-md overflow-hidden">
          {projects.map(project => (
            <div
              key={project.id}
              className="flex items-center justify-between gap-4 px-4 py-3 bg-white hover:bg-[#FAFAFA] transition-colors"
            >
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="text-sm font-medium text-[#000] truncate">{project.title}</div>
                <div className="text-[10px] text-[#888] font-mono">{project.id}</div>
                <div className="flex items-center gap-2 pt-0.5">
                  <span className={statusBadge(project.status)}>{project.status}</span>
                  <span className="text-[10px] text-[#999]">
                    {(project as any).sponsor_profile?.full_name || 'Unknown sponsor'}
                  </span>
                  <span className="text-[10px] text-[#999]">
                    ₹{project.budget?.toLocaleString() || 0}
                  </span>
                </div>
              </div>
              <button
                onClick={() => { setStatusMsg(null); setPendingDelete(project); }}
                className="shrink-0 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-semibold rounded transition-colors"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Confirm modal */}
      {pendingDelete && (
        <ConfirmDeleteModal
          project={pendingDelete}
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
};

// ─── Main Admin Page ──────────────────────────────────────────────────────────

export const AdminPage: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    authService.getCurrentProfile().then(setUser);
  }, []);

  if (!user) return null;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="pb-6 border-b border-[#E5E5E5]">
        <div className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-1">
          ADMINISTRATION
        </div>
        <h1 className="text-3xl font-medium text-[#000000]">Platform Administration</h1>
        <p className="text-sm text-[#666666] mt-1">
          System audit log, tamper verification, project management, and demo readiness.
        </p>
      </div>

      {/* ── Expert Verification Review ────────────────────────────────────── */}
      <AdminExpertReviewPanel currentUser={user} />

      {/* ── User Verification ────────────────────────────────────────────────── */}
      <UserVerificationPanel />

      {/* ── Project Management (Delete) ─────────────────────────────────────── */}
      <ProjectManagementPanel />

      {/* ── Demo Readiness ──────────────────────────────────────────────────── */}
      <DemoReadinessDiagnostic />

      {/* ── Tamper Demo explainer ────────────────────────────────────────────── */}
      <div className="bg-[#000000] text-[#FFFFFF] p-6 rounded space-y-2 text-xs">
        <div className="font-semibold text-sm">Tamper Verification Demo Control</div>
        <p className="opacity-90 leading-relaxed">
          Clicking "SIMULATE TAMPER TEST" mutates entry #2 payload in the database without updating
          its hash pointer. Re-running verification immediately detects:
          <code className="font-mono text-[#FFFFFF] underline font-semibold ml-2">
            INTEGRITY FAILURE — Chain broken at entry #2
          </code>.
        </p>
      </div>

      {/* ── Ledger Verification ──────────────────────────────────────────────── */}
      <LedgerVerificationView projectId="p1111111-1111-1111-1111-111111111111" userRole={user.role} />
    </div>
  );
};
