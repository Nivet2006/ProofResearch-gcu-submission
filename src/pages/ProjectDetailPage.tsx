import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Project, ProjectConfidential, Charter, Milestone, UserProfile, StudentExitRecord } from '../types';
import { projectService } from '../services/projectService';
import { charterService } from '../services/charterService';
import { authService } from '../services/authService';
import { projectExitService } from '../services/projectExitService';
import { CharterAcceptanceView } from '../components/CharterAcceptance';
import { AIScopePanel } from '../components/AIScopePanel';
import { RewardConfigEditor } from '../components/RewardConfigEditor';
import { StudentExitSummary } from '../components/StudentExitSummary';
import { SponsorSilencePanel } from '../components/SponsorSilencePanel';
import { ExplorationSubmissionPanel } from '../components/ExplorationSubmissionPanel';
import { parseRewardSplit } from '../utils/rewardUtils';
import { ShieldAlert, LogOut, Lock, Clock, FlaskConical } from 'lucide-react';

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const projectId = id || 'p1111111-1111-1111-1111-111111111111';

  const [project, setProject] = useState<Project | null>(null);
  const [confidential, setConfidential] = useState<ProjectConfidential | null>(null);
  const [charter, setCharter] = useState<Charter | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [isExited, setIsExited] = useState(false);
  const [exitRecord, setExitRecord] = useState<StudentExitRecord | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'public' | 'confidential' | 'charter' | 'scoping' | 'membership' | 'silence' | 'exploration'>('public');

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab');
    const actionParam = searchParams.get('action');

    if (actionParam === 'join' || tabParam === 'charter') {
      setActiveTab('charter');
    } else if (tabParam === 'confidential' || tabParam === 'scoping' || tabParam === 'membership' || tabParam === 'silence' || tabParam === 'exploration') {
      setActiveTab(tabParam as any);
    }

    authService.getCurrentProfile().then(u => {
      const activeUser = u || {
        id: 'u1111111-1111-1111-1111-111111111111',
        email: 'researcher@proofresearch.org',
        full_name: 'Dr. Arjun Mehta',
        role: 'STUDENT' as const,
        institution: 'IIT Bombay',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun'
      };
      setUser(activeUser);
      loadProjectData(projectId, activeUser.id, activeUser.role);
    });
  }, [projectId]);

  const loadProjectData = async (pId: string, uId: string, uRole: string) => {
    const proj = await projectService.getProjectById(pId);
    setProject(proj);

    const activeChar = await charterService.getActiveCharter(pId);
    setCharter(activeChar);

    const exited = await projectExitService.isMemberExited(pId, uId);
    setIsExited(exited);

    if (exited) {
      const rec = await projectExitService.getExitRecord(pId, uId);
      setExitRecord(rec);
      setConfidential(null);
      setHasAccepted(false);
    } else {
      const accepted = await charterService.hasAcceptedCharter(pId, uId);
      setHasAccepted(accepted);

      if (accepted || proj?.created_by === uId || uRole === 'ADMIN' || uRole === 'SPONSOR') {
        const brief = await projectService.getConfidentialBrief(pId, uId);
        setConfidential(brief);
      }
    }

    const ms = await projectService.getMilestones(pId);
    setMilestones(ms);
  };

  const handleCharterAccepted = async () => {
    setHasAccepted(true);
    if (user) {
      const brief = await projectService.getConfidentialBrief(projectId, user.id);
      setConfidential(brief);
    }
    setActiveTab('confidential');
  };

  const handleConfirmLeaveProject = async () => {
    if (!user) return;
    setIsLeaving(true);
    try {
      const result = await projectExitService.leaveProject(projectId, user.id, 'VOLUNTARY_EXIT');
      setExitRecord(result.exitRecord);
      setIsExited(true);
      setHasAccepted(false);
      setConfidential(null);
      setShowExitModal(false);
      setActiveTab('membership');
    } catch (err: any) {
      alert(err.message || 'Error leaving project');
    } finally {
      setIsLeaving(false);
    }
  };

  if (!project || !user) {
    return <div className="py-12 text-[#666666] text-xs">Loading research document...</div>;
  }

  const isCreatorOrAdmin = project.created_by === user.id || user.role === 'ADMIN';

  return (
    <div className="space-y-10 max-w-5xl">
      {/* Project Document Header */}
      <div className="space-y-4 pb-8 border-b border-[#E5E5E5]">
        <div className="text-xs font-semibold text-[#888888] uppercase tracking-widest flex items-center justify-between">
          <span>PROJECT</span>
          {isExited && (
            <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/30 text-[11px] font-bold rounded">
              MEMBERSHIP STATUS: LEFT
            </span>
          )}
        </div>

        <h1 className="text-3xl font-medium text-[#000000] leading-snug">
          {project.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-xs text-[#666666]">
          <span>Sponsor: <strong className="text-[#000000]">{project.sponsor_profile?.full_name || 'MedVision Labs'}</strong></span>
          <span>·</span>
          <span>Computer Vision · Medical Imaging · Edge AI</span>
          <span>·</span>
          <span>Budget: <strong className="text-[#000000]">₹{project.budget.toLocaleString()}</strong></span>
        </div>

        {/* Restrained Horizontal Lifecycle Step Indicator */}
        <div className="flex items-center gap-1.5 pt-2 text-[11px] font-mono text-neutral-500 overflow-x-auto pb-1">
          <span className="px-2 py-0.5 bg-neutral-900 text-white font-medium rounded-sm">POSTED</span>
          <span>→</span>
          <span className="px-2 py-0.5 bg-neutral-900 text-white font-medium rounded-sm">SCOPED</span>
          <span>→</span>
          <span className="px-2 py-0.5 bg-neutral-900 text-white font-medium rounded-sm">MATCHED</span>
          <span>→</span>
          <span className="px-2 py-0.5 bg-neutral-900 text-white font-medium rounded-sm">TEAM FORMED</span>
          <span>→</span>
          <span className="px-2 py-0.5 bg-emerald-700 text-white font-medium rounded-sm">FUNDED</span>
          <span>→</span>
          <span className="px-2 py-0.5 bg-neutral-200 text-neutral-900 font-medium rounded-sm">IN PROGRESS</span>
          <span>→</span>
          <span className="px-2 py-0.5 bg-neutral-100 text-neutral-400 rounded-sm">REVIEW</span>
          <span>→</span>
          <span className="px-2 py-0.5 bg-neutral-100 text-neutral-400 rounded-sm">COMPLETED</span>
        </div>

        {/* Minimal Navigation Bar */}
        <div className="flex items-center gap-4 pt-4 border-t border-[#E5E5E5] text-xs">
          <button
            onClick={() => setActiveTab('public')}
            className={`py-1 font-medium transition-colors ${
              activeTab === 'public'
                ? 'text-[#000000] border-b-2 border-[#000000]'
                : 'text-[#666666] hover:text-[#000000]'
            }`}
          >
            Project Brief
          </button>

          <button
            onClick={() => setActiveTab('charter')}
            className={`py-1 font-medium transition-colors flex items-center gap-1 ${
              activeTab === 'charter'
                ? 'text-[#000000] border-b-2 border-[#000000]'
                : 'text-[#666666] hover:text-[#000000]'
            }`}
          >
            <span>Research Charter {charter?.version ?? 'v1.0'}</span>
            {hasAccepted && <span className="text-xs text-[#000000]">✓</span>}
          </button>

          <button
            onClick={() => setActiveTab('confidential')}
            className={`py-1 font-medium transition-colors ${
              activeTab === 'confidential'
                ? 'text-[#000000] border-b-2 border-[#000000]'
                : 'text-[#666666] hover:text-[#000000]'
            }`}
          >
            Confidential Brief {isExited ? '(🔒 Access Revoked)' : hasAccepted || isCreatorOrAdmin ? '(Unlocked)' : '(Locked)'}
          </button>

          <button
            onClick={() => setActiveTab('scoping')}
            className={`py-1 font-medium transition-colors ${
              activeTab === 'scoping'
                ? 'text-[#000000] border-b-2 border-[#000000]'
                : 'text-[#666666] hover:text-[#000000]'
            }`}
          >
            AI Scope Proposal ({milestones.length})
          </button>

          <button
            onClick={() => setActiveTab('membership')}
            className={`py-1 font-medium transition-colors flex items-center gap-1 ${
              activeTab === 'membership'
                ? 'text-[#000000] border-b-2 border-[#000000]'
                : 'text-[#666666] hover:text-[#000000]'
            }`}
          >
            <span>Membership</span>
            {isExited && <span className="text-xs text-amber-500 font-bold">(LEFT)</span>}
          </button>

          <button
            onClick={() => setActiveTab('silence')}
            className={`py-1 font-medium transition-colors flex items-center gap-1 ${
              activeTab === 'silence'
                ? 'text-[#000000] border-b-2 border-[#000000]'
                : 'text-[#666666] hover:text-[#000000]'
            }`}
          >
            <span>Sponsor Silence & Mediation</span>
          </button>

          <button
            onClick={() => setActiveTab('exploration')}
            className={`py-1 font-medium transition-colors flex items-center gap-1 ${
              activeTab === 'exploration'
                ? 'text-[#000000] border-b-2 border-[#000000]'
                : 'text-[#666666] hover:text-[#000000]'
            }`}
          >
            <span>Exploration & Negative Results</span>
          </button>
        </div>
      </div>

      {/* Exited Warning Banner if applicable */}
      {isExited && exitRecord && activeTab !== 'membership' && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              You voluntarily exited this project on {new Date(exitRecord.exited_at).toLocaleDateString()}. Your credit ({exitRecord.accepted_contribution_score} impact) is preserved, but active project access is revoked.
            </span>
          </div>
          <button
            onClick={() => setActiveTab('membership')}
            className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded font-semibold transition-colors"
          >
            View Exit Summary →
          </button>
        </div>
      )}

      {/* Tab Contents */}
      {activeTab === 'public' && (
        <div className="space-y-4">
          <h2 className="text-xs font-semibold text-[#888888] uppercase tracking-widest">
            PROJECT BRIEF
          </h2>
          <p className="text-sm text-[#000000] leading-relaxed max-w-3xl">
            {project.public_summary}
          </p>
        </div>
      )}

      {activeTab === 'charter' && (
        <div className="space-y-8">
          {!charter ? (
            <div className="text-xs text-[#666666] p-6 border border-[#E5E5E5] rounded">
              No charter has been published for this project yet.
              {isCreatorOrAdmin && ' Use the reward config below to publish one.'}
            </div>
          ) : null}
          {isCreatorOrAdmin && (
            <RewardConfigEditor
              initialSplit={parseRewardSplit(charter?.reward_terms, charter?.reward_split)}
              onSave={async (newSplit) => {
                try {
                  const updatedChar = await charterService.publishCharterVersion(projectId, user.id, newSplit);
                  setCharter(updatedChar);
                  alert(`Charter ${updatedChar.version} successfully published with updated reward split!`);
                } catch (err: any) {
                  alert(err.message || 'Error updating reward configuration');
                }
              }}
            />
          )}

          {charter && (
            <CharterAcceptanceView
              charter={charter}
              projectId={projectId}
              userId={user.id}
              userName={user.full_name}
              onAccepted={handleCharterAccepted}
            />
          )}
        </div>
      )}

      {activeTab === 'confidential' && (
        <div className="space-y-4">
          <h2 className="text-xs font-semibold text-[#888888] uppercase tracking-widest">
            CONFIDENTIAL BRIEF
          </h2>

          {isExited ? (
            <div className="bg-rose-950/20 p-6 border border-rose-500/40 rounded space-y-3 text-xs text-rose-300">
              <div className="font-bold flex items-center gap-2 text-rose-200">
                <Lock className="w-4 h-4 text-rose-400" /> ACCESS REVOKED: MEMBER EXITED
              </div>
              <p className="leading-relaxed">
                You have voluntarily left this project. Confidential research data, proprietary dataset access, and active workspace resources are locked under Row Level Security and service-layer authorization.
              </p>
            </div>
          ) : hasAccepted || isCreatorOrAdmin ? (
            <div className="bg-[#FFFFFF] p-6 border border-[#E5E5E5] rounded space-y-3">
              <div className="text-xs font-semibold text-[#000000]">
                UNLOCKED VIA CHARTER ACCEPTANCE
              </div>
              <p className="text-xs text-[#111111] leading-relaxed font-mono">
                {confidential?.confidential_brief || 'CONTAINS PROPRIETARY CLINICAL DATASET RESTRICTIONS: Raw fundus images obtained under MedVision IRB #2025-DR-90. Pre-processing scripts must apply CLAHE contrast enhancement and resize to 224x224 before MobileNetV3 int8 quantization. Output model binary must remain under 12MB.'}
              </p>
            </div>
          ) : (
            <div className="bg-[#FFFFFF] p-6 border border-[#E5E5E5] rounded space-y-3 text-xs text-[#666666]">
              <div className="font-semibold text-[#000000]">
                Confidential Brief Locked
              </div>
              <p>
                Access to proprietary clinical dataset restrictions is locked under Row Level Security until the digital charter is accepted.
              </p>
              <button
                onClick={() => setActiveTab('charter')}
                className="px-4 py-2 bg-[#000000] text-[#FFFFFF] text-xs font-medium rounded hover:bg-[#1A1A1A] transition-colors inline-block"
              >
                Review & Accept Charter v1.0 to Unlock →
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'scoping' && (
        <AIScopePanel
          projectId={projectId}
          projectTitle={project.title}
          publicSummary={project.public_summary}
          sponsorId={user.id}
          userRole={user.role}
          milestones={milestones}
          onMilestonesUpdated={setMilestones}
        />
      )}

      {activeTab === 'membership' && (
        <div className="space-y-6">
          <h2 className="text-xs font-semibold text-[#888888] uppercase tracking-widest">
            PROJECT MEMBERSHIP & PARTICIPATION
          </h2>

          {isExited && exitRecord ? (
            <StudentExitSummary exitRecord={exitRecord} />
          ) : (
            <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#000000]">Active Participant Status</h3>
                  <p className="text-xs text-[#666666]">
                    You are currently an active contributor bound by Charter {charter?.version ?? 'v1.0'}.
                  </p>
                </div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full border border-emerald-300">
                  ACTIVE MEMBER
                </span>
              </div>

              {hasAccepted && user.role === 'STUDENT' && (
                <div className="pt-4 border-t border-[#E5E5E5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="text-xs text-[#666666]">
                    <span className="font-semibold text-[#000000]">Voluntary Exit Policy:</span> If you leave midway, your accepted contributions remain credited to you and your pro-rata reward share will be calculated from your reviewed impact score.
                  </div>
                  <button
                    onClick={() => setShowExitModal(true)}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 flex-shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Leave Project
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'silence' && (
        <SponsorSilencePanel
          projectId={projectId}
          milestoneId={milestones[0]?.id || 'm1111111-1111-1111-1111-111111111111'}
          milestoneTitle={milestones[0]?.title || 'Milestone 1: Fundus Image Preprocessing'}
          budget={milestones[0]?.budget || 25000}
          user={user}
        />
      )}

      {activeTab === 'exploration' && (
        <ExplorationSubmissionPanel
          projectId={projectId}
          milestoneId={milestones[0]?.id || 'm1111111-1111-1111-1111-111111111111'}
          budget={milestones[0]?.budget || 25000}
          user={user}
        />
      )}

      {/* Voluntary Exit Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E5E5] rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-lg">
                <LogOut className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#000000]">Leave Research Project?</h3>
            </div>

            <div className="text-xs text-[#444444] space-y-2 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200">
              <p className="font-semibold text-[#000000]">By confirming your departure:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>Credit Kept:</strong> Your accepted contributions and impact scores remain credited to you.</li>
                <li><strong>Pro-Rata Share:</strong> Your earned reward share will be calculated from your reviewed contribution impact.</li>
                <li><strong>Access Revoked:</strong> Confidential brief, workspace, submission, and AI task access will be locked.</li>
                <li><strong>Ledger Event:</strong> Your exit will be permanently recorded as <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">MEMBER_EXITED</code> in the hash chain.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowExitModal(false)}
                disabled={isLeaving}
                className="px-4 py-2 border border-[#E5E5E5] text-[#555555] hover:bg-slate-50 text-xs font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLeaveProject}
                disabled={isLeaving}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
              >
                {isLeaving ? 'Processing Exit...' : 'Confirm Leave Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
