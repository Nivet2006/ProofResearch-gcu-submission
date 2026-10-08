import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Contribution, UserProfile, Milestone } from '../types';
import { contributionService } from '../services/contributionService';
import { projectService } from '../services/projectService';
import { authService } from '../services/authService';
import { charterService } from '../services/charterService';
import { rewardService } from '../services/rewardService';
import { AIAgentPanel } from '../components/AIAgentPanel';
import { ContributionTimeline } from '../components/ContributionTimeline';

export const WorkspacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectId = id || 'p1111111-1111-1111-1111-111111111111';

  const [user, setUser] = useState<UserProfile | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [hasAcceptedCharter, setHasAcceptedCharter] = useState(true);
  const [isEscrowFunded, setIsEscrowFunded] = useState(true);

  // Form State
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'DATASET' | 'CODE' | 'ANALYSIS' | 'REPORT' | 'REVIEW'>('CODE');
  const [aiAssisted, setAiAssisted] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    authService.getCurrentProfile().then(u => {
      setUser(u);
      if (u) {
        loadWorkspace(projectId, u.id);
      }
    });
  }, [projectId]);

  const loadWorkspace = async (pId: string, uId: string) => {
    const list = await contributionService.getContributions(pId);
    setContributions(list);

    const ms = await projectService.getMilestones(pId);
    setMilestones(ms);

    const accepted = await charterService.hasAcceptedCharter(pId, uId);
    setHasAcceptedCharter(accepted);

    const proj = await projectService.getProjectById(pId);
    if (proj && proj.engagement_model === 'FUNDED') {
      // Check escrow for first milestone (or any funded one)
      let funded = false;
      const checkIds = ms.length > 0 ? ms.map(m => m.id) : ['m1111111-1111-1111-1111-111111111111'];
      for (const mid of checkIds) {
        const esc = await rewardService.getEscrowAccount(pId, mid);
        if (esc && (esc.status === 'LOCKED_IN_ESCROW' || esc.status === 'RELEASED')) {
          funded = true;
          break;
        }
      }
      setIsEscrowFunded(funded);
    } else {
      setIsEscrowFunded(true);
    }
  };

  const handleCreateContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !description || !content || submitting) return;

    if (!hasAcceptedCharter) {
      alert('Terms before work: You must accept the active Project Charter before submitting contributions.');
      return;
    }

    if (!isEscrowFunded) {
      alert('Escrow first: Milestone funds must be locked in escrow before submitting work contributions.');
      return;
    }

    setSubmitting(true);
    try {
      const activeMilestone = milestones[0]?.id || 'm1111111-1111-1111-1111-111111111111';
      const created = await contributionService.createContribution(
        projectId,
        activeMilestone,
        user.id,
        type,
        description,
        content,
        aiAssisted
      );

      setContributions(prev => [created, ...prev]);
      setDescription('');
      setContent('');
    } catch (err: any) {
      console.error('Error creating contribution', err);
      alert(err.message || 'Error submitting contribution');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAIActionApplied = (suggestionText: string) => {
    setDescription(`Applied AI Suggestion: ${suggestionText}`);
    setContent(`// AI Proposed CLAHE Pre-processing Pipeline\nimport cv2\nimport numpy as np\n\ndef apply_clahe(image_path):\n    img = cv2.imread(image_path)\n    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))\n    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)\n    lab[:,:,0] = clahe.apply(lab[:,:,0])\n    return cv2.resize(cv2.cvtColor(lab, cv2.COLOR_LAB2BGR), (224, 224))\n`);
    setAiAssisted(true);
  };

  if (!user) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-[#E5E5E5]">
        <h1 className="text-2xl md:text-3xl font-medium text-[#111111]">Research Workspace</h1>
        <p className="text-sm text-[#6B6B6B] mt-1">
          Submit deliverables and code artifacts tied to SHA-256 evidence hashes.
        </p>
      </div>

      {/* Enforcement Banners */}
      {!hasAcceptedCharter && (
        <div className="bg-[#FFF8E1] border border-[#FFE082] p-4 rounded-lg flex items-center justify-between text-xs text-[#8D6E63]">
          <div>
            <strong className="text-[#5D4037] block font-semibold">⚠ PRINCIPLE #1: TERMS BEFORE WORK</strong>
            <span>Digital Charter acceptance is required prior to recording contributions or accessing project research data.</span>
          </div>
          <button
            onClick={() => navigate(`/projects/${projectId}`)}
            className="px-3 py-1.5 bg-[#5D4037] text-white rounded font-medium hover:bg-[#4E342E] transition-colors shrink-0 ml-4 text-xs"
          >
            Review & Accept Charter →
          </button>
        </div>
      )}

      {!isEscrowFunded && (
        <div className="bg-[#FFEBEE] border border-[#FFCDD2] p-4 rounded-lg flex items-center justify-between text-xs text-[#C62828]">
          <div>
            <strong className="block font-semibold">⚠ PRINCIPLE #2: ESCROW FIRST</strong>
            <span>Milestone funds must be locked in escrow by the sponsor before work contributions can be submitted.</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <span className="font-mono text-[11px]">ESCROW: UNFUNDED</span>
            <button
              type="button"
              onClick={() => user && loadWorkspace(projectId, user.id)}
              className="px-2 py-1 bg-[#C62828] text-white rounded text-[10px] font-semibold hover:bg-[#B71C1C] transition-colors"
            >
              ↻ Refresh
            </button>
          </div>
        </div>
      )}

      {isEscrowFunded && hasAcceptedCharter && (
        <div className="bg-[#E8F5E9] border border-[#A5D6A7] p-3 rounded-lg flex items-center gap-2 text-xs text-[#2E7D32]">
          <span className="font-semibold">✓ Escrow Funded & Charter Accepted</span>
          <span className="text-[#388E3C]">— You are cleared to submit contributions.</span>
        </div>
      )}

      {/* Grid: AI Assistant & Record Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AIAgentPanel
          projectId={projectId}
          humanOwnerId={user.id}
          humanOwnerName={user.full_name}
          onActionApplied={handleAIActionApplied}
        />

        {/* Form */}
        <div className="border border-[#E5E5E5] bg-white rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
            <h3 className="text-base font-semibold text-[#111111]">Record Contribution</h3>
            <span className="text-xs text-[#6B6B6B]">Contributor: {user.full_name}</span>
          </div>

          <form onSubmit={handleCreateContribution} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#6B6B6B] mb-1">Contribution Type</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as any)}
                  className="w-full bg-white border border-[#E5E5E5] text-[#111111] px-3 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 text-xs"
                >
                  <option value="CODE">CODE (Python / Pipeline Script)</option>
                  <option value="DATASET">DATASET (Preprocessed Fundus Images)</option>
                  <option value="ANALYSIS">ANALYSIS (Latency & Accuracy Benchmark)</option>
                  <option value="REPORT">REPORT (Research Paper Draft)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#6B6B6B] mb-1">AI Involvement</label>
                <label className="flex items-center gap-2 pt-2 text-[#111111] text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiAssisted}
                    onChange={e => setAiAssisted(e.target.checked)}
                    className="rounded border-[#E5E5E5] text-blue-600 focus:ring-blue-500"
                  />
                  <span>Tag as ai_assisted = true</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-[#6B6B6B] mb-1">Technical Summary</label>
              <input
                type="text"
                required
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Implemented CLAHE contrast enhancement pipeline..."
                className="w-full bg-white border border-[#E5E5E5] text-[#111111] px-3 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 text-xs placeholder:text-[#6B6B6B]"
              />
            </div>

            <div>
              <label className="block text-[#6B6B6B] mb-1">Deliverable Content / Script Body</label>
              <textarea
                required
                rows={5}
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Paste code script or dataset description..."
                className="w-full bg-white border border-[#E5E5E5] text-[#111111] p-3 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 text-xs font-mono placeholder:text-[#6B6B6B]"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-[#111111] hover:bg-black text-white font-medium rounded-md transition-colors text-xs"
              >
                {submitting ? 'Submitting...' : 'Submit Contribution'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Contribution Timeline */}
      <div className="space-y-4 pt-4">
        <h3 className="text-base font-semibold text-[#111111] border-b border-[#E5E5E5] pb-3">
          Contribution Timeline ({contributions.length})
        </h3>
        <ContributionTimeline contributions={contributions} />
      </div>
    </div>
  );
};
