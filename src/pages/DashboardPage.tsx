import React, { useState, useEffect } from 'react';
import { UserProfile, Project, MatchingResult, LedgerEntry, Submission, RewardAllocation, Credential } from '../types';
import { authService } from '../services/authService';
import { projectService } from '../services/projectService';
import { matchingService } from '../services/matchingService';
import { ledgerService } from '../services/ledgerService';
import { rewardService } from '../services/rewardService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { verifyLedgerChain } from '../lib/hash';
import { Link } from 'react-router-dom';

// ─── Sponsor Dashboard ───────────────────────────────────────────────────────

const SponsorDashboardView: React.FC<{ user: UserProfile; projects: Project[] }> = ({ user, projects }) => {
  const [matches, setMatches] = useState<{ match: MatchingResult; projectTitle: string }[]>([]);
  const [activities, setActivities] = useState<LedgerEntry[]>([]);
  const [escrowLocked, setEscrowLocked] = useState(0);
  const [activeContributors, setActiveContributors] = useState(0);
  const [loading, setLoading] = useState(true);

  const sponsorProjects = projects.filter(p => p.created_by === user.id);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      let totalEscrow = 0;
      const allMatches: { match: MatchingResult; projectTitle: string }[] = [];
      const allActivities: LedgerEntry[] = [];
      const contributors = new Set<string>();

      for (const project of sponsorProjects) {
        try {
          const pm = await matchingService.getMatchingResults(project.id);
          allMatches.push(...pm.map(m => ({ match: m, projectTitle: project.title })));
        } catch (_) {}

        try {
          const pa = await ledgerService.getLedgerEntries(project.id);
          allActivities.push(...pa);
        } catch (_) {}

        try {
          const milestones = await projectService.getMilestones(project.id);
          for (const m of milestones) {
            const escrow = await rewardService.getEscrowAccount(project.id, m.id);
            if (escrow?.amount) totalEscrow += escrow.amount;
          }
        } catch (_) {}

        try {
          if (isSupabaseConfigured) {
            const { data } = await supabase
              .from('project_members')
              .select('user_id')
              .eq('project_id', project.id)
              .eq('status', 'ACCEPTED')
              .neq('role', 'SPONSOR');
            data?.forEach(m => contributors.add(m.user_id));
          }
        } catch (_) {}
      }

      if (isMounted) {
        setMatches(allMatches.sort((a, b) => b.match.match_score - a.match.match_score));
        setActivities(
          allActivities.sort(
            (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
          )
        );
        setEscrowLocked(totalEscrow);
        setActiveContributors(contributors.size);
        setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [sponsorProjects.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="text-sm text-[#888888]">Loading sponsor dashboard…</div>;

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Active Projects', value: sponsorProjects.length },
          { label: 'Escrow Locked', value: `₹${escrowLocked.toLocaleString()}` },
          { label: 'Active Contributors', value: activeContributors },
          { label: 'Candidate Matches', value: matches.length },
        ].map(s => (
          <div key={s.label} className="p-3.5 bg-white border border-neutral-200 rounded-md">
            <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">{s.label}</div>
            <div className="text-2xl font-bold text-neutral-900 mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Projects */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
          <h2 className="text-base font-semibold text-[#000000] tracking-tight">SPONSORED RESEARCH PROJECTS</h2>
          <span className="text-xs font-mono text-neutral-500">
            {sponsorProjects.length} Active Project{sponsorProjects.length !== 1 ? 's' : ''}
          </span>
        </div>
        {sponsorProjects.length === 0 ? (
          <div className="text-sm text-[#666666] py-4">
            No active research projects.
            <div className="mt-4">
              <Link to="/sponsor/projects/new" className="px-4 py-2 bg-[#000000] hover:bg-[#1A1A1A] text-[#FFFFFF] text-xs font-medium rounded transition-colors inline-flex items-center justify-center shrink-0">
                + Create Research Project
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E5E5] border-t border-b border-[#E5E5E5]">
            {sponsorProjects.map(project => (
              <div key={project.id} className="py-5 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-[#F5F5F5] px-2 transition-colors">
                <div className="space-y-1.5 max-w-3xl">
                  <h3 className="text-base font-medium text-[#000000] leading-snug">{project.title}</h3>
                  <p className="text-xs text-[#666666]">{user.institution || 'Sponsor'} · Sponsor Ownership</p>
                  <div className="text-xs text-[#888888] pt-1">
                    {project.status} · Total Budget: ₹{project.budget?.toLocaleString() || 0}
                  </div>
                </div>
                <div className="shrink-0">
                  <Link to={`/projects/${project.id}`} className="text-xs font-medium text-[#000000] hover:underline">
                    Manage Project →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Matches */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
          <h2 className="text-lg font-medium text-[#000000]">CANDIDATE MATCHES</h2>
        </div>
        {matches.length === 0 ? (
          <div className="text-sm text-[#666666] py-4">No candidate matches yet.</div>
        ) : (
          <div className="divide-y divide-[#E5E5E5] border-t border-b border-[#E5E5E5]">
            {matches.slice(0, 5).map(m => (
              <div key={m.match.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#F5F5F5] px-2 transition-colors">
                <div>
                  <div className="font-semibold text-[#000000] text-sm">
                    {(m.match as any).candidate_profile?.profile?.full_name || 'Candidate'}
                  </div>
                  <div className="text-xs text-[#666666]">
                    {(m.match as any).candidate_profile?.profile?.institution || 'Unknown Institution'}
                  </div>
                  <div className="text-xs text-[#888888] mt-0.5">
                    Match Fit: {m.match.match_score}% · {m.projectTitle}
                  </div>
                </div>
                <Link to={`/projects/${m.match.project_id}/matching`} className="text-xs font-medium text-[#000000] hover:underline">
                  View Candidate Fit →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-[#000000] border-b border-[#E5E5E5] pb-3">SPONSOR ACTIVITY FEED</h2>
        {activities.length === 0 ? (
          <div className="text-sm text-[#666666] py-4">No recent activity.</div>
        ) : (
          <div className="space-y-3 font-mono text-xs">
            {activities.slice(0, 10).map((activity, i) => {
              const timeString = activity.created_at
                ? new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';
              let payloadPreview = '';
              try {
                if (typeof activity.payload === 'object' && activity.payload !== null) {
                  const title = (activity.payload as any).title || (activity.payload as any).status || '';
                  payloadPreview = title.substring(0, 50);
                }
              } catch (_) {}
              return (
                <div key={activity.id || i} className="flex items-center gap-6 py-2 border-b border-[#E5E5E5]">
                  <span className="text-[#888888] w-14 shrink-0">{timeString}</span>
                  <span className="font-medium text-[#000000] flex-1">{activity.action}</span>
                  <span className="text-[#666666] hidden sm:inline">{payloadPreview}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

// ─── Expert Dashboard ────────────────────────────────────────────────────────

const ExpertDashboardView: React.FC<{ user: UserProfile; projects: Project[] }> = ({ user, projects }) => {
  const [pendingSubmissions, setPendingSubmissions] = useState<(Submission & { projectTitle: string })[]>([]);
  const [advisoryProjects, setAdvisoryProjects] = useState<{ project: Project; share: number }[]>([]);
  const [activities, setActivities] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      const pending: (Submission & { projectTitle: string })[] = [];
      const advisory: { project: Project; share: number }[] = [];
      const allActivities: LedgerEntry[] = [];

      for (const project of projects) {
        // Check if this expert is a member
        try {
          if (isSupabaseConfigured) {
            const { data: membership } = await supabase
              .from('project_members')
              .select('role, status')
              .eq('project_id', project.id)
              .eq('user_id', user.id)
              .maybeSingle();

            if (membership && (membership.status === 'ACTIVE' || membership.status === 'ACCEPTED')) {
              // Get pending submissions for review
              const { data: subs } = await supabase
                .from('submissions')
                .select('*')
                .eq('project_id', project.id)
                .eq('integrity_status', 'REQUIRES_HUMAN_REVIEW');
              if (subs) {
                subs.forEach(s => pending.push({ ...(s as Submission), projectTitle: project.title }));
              }

              // Get reward allocation for this expert
              const { data: alloc } = await supabase
                .from('reward_allocations')
                .select('base_share')
                .eq('project_id', project.id)
                .eq('user_id', user.id)
                .maybeSingle();
              advisory.push({ project, share: alloc?.base_share || 0 });

              // Activity
              const pa = await ledgerService.getLedgerEntries(project.id);
              allActivities.push(...pa.filter(e => e.actor_id === user.id));
            }
          }
        } catch (_) {}
      }

      if (isMounted) {
        setPendingSubmissions(pending);
        setAdvisoryProjects(advisory);
        setActivities(allActivities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [projects.length, user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="text-sm text-[#888888]">Loading expert dashboard…</div>;

  return (
    <>
      {/* Pending Reviews */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
          <h2 className="text-lg font-medium text-[#000000]">PENDING EXPERT REVIEWS</h2>
          <span className="text-xs text-[#888888]">{pendingSubmissions.length} Action Required</span>
        </div>
        {pendingSubmissions.length === 0 ? (
          <div className="text-sm text-[#666666] py-4">No pending reviews.</div>
        ) : (
          <div className="divide-y divide-[#E5E5E5] border-t border-b border-[#E5E5E5]">
            {pendingSubmissions.map(sub => (
              <div key={sub.id} className="py-5 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-[#F5F5F5] px-2 transition-colors">
                <div className="space-y-1.5 max-w-3xl">
                  <h3 className="text-base font-medium text-[#000000] leading-snug">{sub.title}</h3>
                  <p className="text-xs text-[#666666]">{sub.projectTitle}</p>
                  <div className="text-xs text-[#888888] pt-1">
                    Similarity Score: {sub.similarity_score ?? 'N/A'}% · Expert Review Required
                  </div>
                </div>
                <div className="shrink-0">
                  <Link
                    to={`/projects/${sub.project_id}/contributions`}
                    className="px-4 py-2 bg-[#000000] text-[#FFFFFF] text-xs font-medium rounded hover:bg-[#1A1A1A] transition-colors"
                  >
                    Review Deliverable →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Advisory Roles */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
          <h2 className="text-lg font-medium text-[#000000]">EXPERT ADVISORY ROLES</h2>
          <span className="text-xs text-[#888888]">{advisoryProjects.length} Projects</span>
        </div>
        {advisoryProjects.length === 0 ? (
          <div className="text-sm text-[#666666] py-4">No advisory roles yet.</div>
        ) : (
          <div className="divide-y divide-[#E5E5E5] border-t border-b border-[#E5E5E5]">
            {advisoryProjects.map(({ project, share }) => (
              <div key={project.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#F5F5F5] px-2 transition-colors">
                <div>
                  <div className="font-semibold text-[#000000] text-sm">{project.title}</div>
                  <div className="text-xs text-[#666666]">
                    {(project as any).sponsor_profile?.full_name
                      ? `Sponsor: ${(project as any).sponsor_profile.full_name}`
                      : project.engagement_model.replace('_', ' ')}
                    {share > 0 ? ` · Expert Share: ${share}%` : ''}
                  </div>
                </div>
                <Link to={`/projects/${project.id}/rewards`} className="text-xs font-medium text-[#000000] hover:underline">
                  View Reward Share →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-[#000000] border-b border-[#E5E5E5] pb-3">EXPERT REVIEWS & VERIFICATIONS</h2>
        {activities.length === 0 ? (
          <div className="text-sm text-[#666666] py-4">No recent activity.</div>
        ) : (
          <div className="space-y-3 font-mono text-xs">
            {activities.slice(0, 10).map((a, i) => (
              <div key={a.id || i} className="flex items-center gap-6 py-2 border-b border-[#E5E5E5]">
                <span className="text-[#888888] w-14 shrink-0">
                  {a.created_at ? new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
                <span className="font-medium text-[#000000] flex-1">{a.action}</span>
                <span className="text-[#666666] hidden sm:inline">
                  {typeof a.payload === 'object' ? ((a.payload as any)?.title || '') : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

// ─── Student Dashboard ───────────────────────────────────────────────────────

const StudentDashboardView: React.FC<{ user: UserProfile; projects: Project[] }> = ({ user, projects }) => {
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [allocations, setAllocations] = useState<(RewardAllocation & { projectTitle: string })[]>([]);
  const [credentials, setCredentials] = useState<(Credential & { projectTitle: string })[]>([]);
  const [activities, setActivities] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      const enrolled: Project[] = [];
      const allAlloc: (RewardAllocation & { projectTitle: string })[] = [];
      const allCreds: (Credential & { projectTitle: string })[] = [];
      const allActivities: LedgerEntry[] = [];

      for (const project of projects) {
        try {
          if (isSupabaseConfigured) {
            const { data: membership } = await supabase
              .from('project_members')
              .select('status')
              .eq('project_id', project.id)
              .eq('user_id', user.id)
              .maybeSingle();

            if (membership) {
              enrolled.push(project);

              // Reward allocations
              const { data: allocs } = await supabase
                .from('reward_allocations')
                .select('*')
                .eq('project_id', project.id)
                .eq('user_id', user.id);
              if (allocs) allocs.forEach(a => allAlloc.push({ ...(a as RewardAllocation), projectTitle: project.title }));

              // Credentials
              const { data: creds } = await supabase
                .from('credentials')
                .select('*')
                .eq('project_id', project.id)
                .eq('user_id', user.id);
              if (creds) creds.forEach(c => allCreds.push({ ...(c as Credential), projectTitle: project.title }));

              // Activity
              const pa = await ledgerService.getLedgerEntries(project.id);
              allActivities.push(...pa.filter(e => e.actor_id === user.id));
            }
          }
        } catch (_) {}
      }

      if (isMounted) {
        setMyProjects(enrolled);
        setAllocations(allAlloc);
        setCredentials(allCreds);
        setActivities(allActivities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [projects.length, user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="text-sm text-[#888888]">Loading student dashboard…</div>;

  const totalEarnings = allocations.reduce((sum, a) => sum + (a.final_amount || 0), 0);

  return (
    <>
      {/* Active Charters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
          <h2 className="text-lg font-medium text-[#000000]">MY ACTIVE RESEARCH & CHARTERS</h2>
          <span className="text-xs text-[#888888]">{myProjects.length} Active Project{myProjects.length !== 1 ? 's' : ''}</span>
        </div>
        {myProjects.length === 0 ? (
          <div className="text-sm text-[#666666] py-4">
            No active research projects yet.{' '}
            <Link to="/projects" className="underline">Browse open projects →</Link>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E5E5] border-t border-b border-[#E5E5E5]">
            {myProjects.map(project => (
              <div key={project.id} className="py-5 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-[#F5F5F5] px-2 transition-colors">
                <div className="space-y-1.5 max-w-3xl">
                  <h3 className="text-base font-medium text-[#000000] leading-snug">{project.title}</h3>
                  <p className="text-xs text-[#666666]">
                    {(project as any).sponsor_profile?.full_name
                      ? `Sponsor: ${(project as any).sponsor_profile.full_name}`
                      : project.engagement_model.replace('_', ' ')}
                    {' '}· Contributor Role
                  </p>
                  <div className="text-xs text-[#888888] pt-1">{project.status}</div>
                </div>
                <div className="shrink-0 flex items-center gap-3">
                  <Link
                    to={`/projects/${project.id}/workspace`}
                    className="px-4 py-2 bg-[#000000] text-[#FFFFFF] text-xs font-medium rounded hover:bg-[#1A1A1A] transition-colors"
                  >
                    Open Workspace →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Earnings & Credentials */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
          <h2 className="text-lg font-medium text-[#000000]">EARNINGS & VERIFIABLE CREDENTIALS</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-[#FFFFFF] border border-[#E5E5E5] rounded space-y-1">
            <span className="text-[#888888] block text-[11px]">Total Calculated Earnings</span>
            <span className="text-xl font-semibold text-[#000000]">₹{totalEarnings.toLocaleString()}</span>
            <span className="text-[#666666] block text-[11px]">Across {allocations.length} allocation{allocations.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="p-4 bg-[#FFFFFF] border border-[#E5E5E5] rounded space-y-1">
            <span className="text-[#888888] block text-[11px]">Issued Verifiable Credentials</span>
            {credentials.length === 0 ? (
              <span className="text-sm text-[#666666]">None issued yet</span>
            ) : (
              credentials.slice(0, 2).map(c => (
                <span key={c.id} className="text-sm font-semibold text-[#000000] block">{c.title}</span>
              ))
            )}
            <span className="text-[#666666] block text-[11px]">Signed & recorded on audit hash ledger</span>
          </div>
        </div>
      </div>

      {/* Activity */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-[#000000] border-b border-[#E5E5E5] pb-3">MY ACTIVITY LOG</h2>
        {activities.length === 0 ? (
          <div className="text-sm text-[#666666] py-4">No recent activity.</div>
        ) : (
          <div className="space-y-3 font-mono text-xs">
            {activities.slice(0, 10).map((a, i) => (
              <div key={a.id || i} className="flex items-center gap-6 py-2 border-b border-[#E5E5E5]">
                <span className="text-[#888888] w-14 shrink-0">
                  {a.created_at ? new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
                <span className="font-medium text-[#000000] flex-1">{a.action}</span>
                <span className="text-[#666666] hidden sm:inline">
                  {typeof a.payload === 'object' ? ((a.payload as any)?.title || '') : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

// ─── Admin Dashboard ─────────────────────────────────────────────────────────

const AdminDashboardView: React.FC<{ projects: Project[] }> = ({ projects }) => {
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [verificationStatus, setVerificationStatus] = useState<'LOADING' | 'VALID' | 'INVALID'>('LOADING');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const entries = await ledgerService.getLedgerEntries();
        const result = verifyLedgerChain(entries);

        if (isMounted) {
          setLedgerEntries(entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
          setVerificationStatus(result.isValid ? 'VALID' : 'INVALID');
          setLoading(false);
        }
      } catch (_) {
        if (isMounted) {
          setVerificationStatus('INVALID');
          setLoading(false);
        }
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, []);

  if (loading) return <div className="text-sm text-[#888888]">Loading admin dashboard…</div>;

  return (
    <>
      {/* System Integrity */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
          <h2 className="text-lg font-medium text-[#000000]">SYSTEM INTEGRITY STATUS</h2>
          <span
            className={`text-xs font-semibold border px-2 py-0.5 rounded ${
              verificationStatus === 'VALID'
                ? 'text-[#000000] border-[#000000]'
                : 'text-red-600 border-red-600'
            }`}
          >
            {verificationStatus === 'VALID' ? 'INTEGRITY VALID ✓' : 'INTEGRITY FAILED ✗'}
          </span>
        </div>
        <div className="p-5 bg-[#000000] text-[#FFFFFF] rounded space-y-2 text-xs">
          <div className="font-semibold text-sm">Global Cryptographic Hash-Chain Ledger</div>
          <p className="opacity-90 leading-relaxed">
            {ledgerEntries.length} sequential transaction entr{ledgerEntries.length === 1 ? 'y' : 'ies'} verified with SHA-256 hash pointers across all active projects.
          </p>
          <div className="pt-2">
            <Link to="/admin/ledger" className="px-4 py-2 bg-[#FFFFFF] text-[#000000] text-xs font-medium rounded hover:bg-[#F5F5F5] transition-colors inline-block">
              Open System Auditor & Tamper Control Panel →
            </Link>
          </div>
        </div>
      </div>

      {/* All Projects */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
          <h2 className="text-lg font-medium text-[#000000]">ALL PLATFORM PROJECTS</h2>
          <span className="text-xs text-[#888888]">{projects.length} Total</span>
        </div>
        {projects.length === 0 ? (
          <div className="text-sm text-[#666666] py-4">No projects on platform yet.</div>
        ) : (
          <div className="divide-y divide-[#E5E5E5] border-t border-b border-[#E5E5E5]">
            {projects.map(project => (
              <div key={project.id} className="py-4 flex items-center justify-between hover:bg-[#F5F5F5] px-2 transition-colors">
                <div>
                  <div className="font-semibold text-[#000000] text-sm">{project.title}</div>
                  <div className="text-xs text-[#666666]">
                    {(project as any).sponsor_profile?.full_name
                      ? `Sponsor: ${(project as any).sponsor_profile.full_name} · `
                      : ''}
                    Budget: ₹{project.budget?.toLocaleString() || 0} · Status: {project.status}
                  </div>
                </div>
                <Link to={`/projects/${project.id}`} className="text-xs font-medium text-[#000000] hover:underline">
                  Inspect →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit Log */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-[#000000] border-b border-[#E5E5E5] pb-3">SYSTEM TRANSACTION AUDIT LOG</h2>
        {ledgerEntries.length === 0 ? (
          <div className="text-sm text-[#666666] py-4">No ledger entries yet.</div>
        ) : (
          <div className="space-y-3 font-mono text-xs">
            {ledgerEntries.slice(0, 15).map((entry, i) => (
              <div key={entry.id || i} className="flex items-center gap-6 py-2 border-b border-[#E5E5E5]">
                <span className="text-[#888888] w-14 shrink-0">
                  {entry.created_at ? new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
                <span className="font-medium text-[#000000] flex-1">{entry.action}</span>
                <span className="text-[#666666] hidden sm:inline">Seq #{entry.sequence_number} · {entry.actor_id?.slice(0, 8)}…</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

// ─── Main Dashboard Page ─────────────────────────────────────────────────────

export const DashboardPage: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    authService.getCurrentProfile().then(setUser);
    projectService.getProjects().then(setProjects);
  }, []);

  if (!user) return null;

  const roleSubtitles: Record<string, string> = {
    SPONSOR: `Sponsor Overview · ${user.institution || 'Research Institute'}`,
    EXPERT: `Expert Advisor Overview · ${user.institution || 'Academic Institution'}`,
    STUDENT: `Student Contributor Overview · ${user.institution || 'University'}`,
    ADMIN: `Platform Governance Overview · ProofResearch`,
  };

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="border-b border-[#E5E5E5] pb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-[#888888] uppercase tracking-widest">OVERVIEW · {user.role}</div>
          <h1 className="text-3xl font-medium text-[#000000] tracking-tight">{user.full_name}</h1>
          <p className="text-sm text-[#666666]">{roleSubtitles[user.role]}</p>
        </div>

        {user.role === 'SPONSOR' && (
          <Link to="/sponsor/projects/new" className="px-4 py-2 bg-[#000000] hover:bg-[#1A1A1A] text-[#FFFFFF] text-xs font-medium rounded transition-colors inline-flex items-center justify-center shrink-0">
            + Create Research Project
          </Link>
        )}
        {user.role === 'STUDENT' && (
          <Link to="/projects" className="px-4 py-2 bg-[#000000] hover:bg-[#1A1A1A] text-[#FFFFFF] text-xs font-medium rounded transition-colors inline-flex items-center justify-center shrink-0">
            Browse Open Projects →
          </Link>
        )}
        {user.role === 'ADMIN' && (
          <Link to="/admin/ledger" className="px-4 py-2 bg-[#000000] hover:bg-[#1A1A1A] text-[#FFFFFF] text-xs font-medium rounded transition-colors inline-flex items-center justify-center shrink-0">
            Run System Integrity Test →
          </Link>
        )}
      </div>

      {user.role === 'SPONSOR' && <SponsorDashboardView user={user} projects={projects} />}
      {user.role === 'EXPERT' && <ExpertDashboardView user={user} projects={projects} />}
      {user.role === 'STUDENT' && <StudentDashboardView user={user} projects={projects} />}
      {user.role === 'ADMIN' && <AdminDashboardView projects={projects} />}
    </div>
  );
};
