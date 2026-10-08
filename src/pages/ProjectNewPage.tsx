import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { authService } from '../services/authService';
import { UserProfile } from '../types';
import { ResearchNoveltyCheck } from '../components/ResearchNoveltyCheck';
import { ResearchNoveltyAssessment } from '../types/novelty';

export const ProjectNewPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);

  const [title, setTitle] = useState('');
  const [publicSummary, setPublicSummary] = useState('');
  const [confidentialBrief, setConfidentialBrief] = useState('');
  const [engagementModel, setEngagementModel] = useState<'FUNDED' | 'KNOWLEDGE_SHARING'>('FUNDED');
  const [budget, setBudget] = useState(100000);
  const [confidentialityLevel, setConfidentialityLevel] = useState<'PUBLIC' | 'MEDIUM' | 'HIGH'>('HIGH');

  // Research Novelty Check gating states
  const [noveltyAssessment, setNoveltyAssessment] = useState<ResearchNoveltyAssessment | null>(null);
  const [isNoveltyReadyForPublish, setIsNoveltyReadyForPublish] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    authService.getCurrentProfile().then(setUser);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || submitting || !isNoveltyReadyForPublish) return;

    setSubmitting(true);
    try {
      const created = await projectService.createProject(
        {
          title,
          public_summary: publicSummary,
          confidential_brief: confidentialBrief,
          engagement_model: engagementModel,
          budget: Number(budget),
          confidentiality_level: confidentialityLevel,
          novelty_assessment_id: noveltyAssessment?.id
        },
        user.id
      );

      navigate(`/projects/${created.id}`);
    } catch (err) {
      console.error('Error creating project', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="pb-6 border-b border-[#E5E5E5]">
        <h1 className="text-2xl md:text-3xl font-medium text-[#111111]">Create Research Project</h1>
        <p className="text-sm text-[#6B6B6B] mt-1">
          Public summaries are open for candidate discovery. Confidential briefs remain locked under Row Level Security.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="border border-[#E5E5E5] bg-white rounded-lg p-6 space-y-5 text-xs">
        <div>
          <label className="block text-[#111111] font-medium mb-1">Research Project Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Low-cost detection of diabetic retinopathy from fundus images on edge devices"
            className="w-full bg-white border border-[#E5E5E5] text-[#111111] px-3 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 text-xs placeholder:text-[#6B6B6B]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[#111111] font-medium mb-1">Engagement Model</label>
            <select
              value={engagementModel}
              onChange={e => setEngagementModel(e.target.value as any)}
              className="w-full bg-white border border-[#E5E5E5] text-[#111111] px-3 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 text-xs"
            >
              <option value="FUNDED">Funded Research (Escrow Payouts)</option>
              <option value="KNOWLEDGE_SHARING">Knowledge Sharing (Co-authorship & Credentials)</option>
            </select>
          </div>

          <div>
            <label className="block text-[#111111] font-medium mb-1">Total Project Budget (INR)</label>
            <input
              type="number"
              value={budget}
              onChange={e => setBudget(Number(e.target.value))}
              disabled={engagementModel === 'KNOWLEDGE_SHARING'}
              className="w-full bg-white border border-[#E5E5E5] text-[#111111] px-3 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 text-xs disabled:opacity-50"
            />
          </div>
        </div>

        <div>
          <label className="block text-[#111111] font-medium mb-1">Public Brief (Open Discovery)</label>
          <textarea
            required
            rows={3}
            value={publicSummary}
            onChange={e => setPublicSummary(e.target.value)}
            placeholder="Describe the research goals in non-sensitive terms..."
            className="w-full bg-white border border-[#E5E5E5] text-[#111111] p-3 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 text-xs placeholder:text-[#6B6B6B]"
          />
        </div>

        <div className="bg-[#F5F5F3] p-4 rounded-md border border-[#E5E5E5] space-y-2">
          <label className="block text-[#111111] font-medium">
            Confidential Brief (RLS Protected)
          </label>
          <p className="text-[11px] text-[#6B6B6B]">
            Stored in project_confidential table. Accessible only after digital charter acceptance.
          </p>
          <textarea
            required
            rows={4}
            value={confidentialBrief}
            onChange={e => setConfidentialBrief(e.target.value)}
            placeholder="Enter proprietary dataset details and pre-processing restrictions..."
            className="w-full bg-white border border-[#E5E5E5] text-[#111111] p-3 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 text-xs placeholder:text-[#6B6B6B]"
          />
        </div>

        {/* INLINE RESEARCH NOVELTY CHECK STAGE */}
        <div className="pt-2">
          <ResearchNoveltyCheck
            title={title}
            publicSummary={publicSummary}
            creatorId={user?.id}
            onAssessmentChange={(assessmentObj, readyToPublish) => {
              setNoveltyAssessment(assessmentObj);
              setIsNoveltyReadyForPublish(readyToPublish);
            }}
          />
        </div>

        <div className="pt-4 border-t border-[#E5E5E5] flex flex-col items-end space-y-1.5">
          <button
            type="submit"
            disabled={submitting || !isNoveltyReadyForPublish}
            className="px-6 py-2.5 bg-[#111111] hover:bg-black text-white font-medium rounded-md transition-colors text-xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating Project...' : 'Publish Project & Charter v1.0'}
          </button>
          {!isNoveltyReadyForPublish && (
            <p className="text-[11px] text-amber-700 italic">
              * Research Novelty Check and Human Assessment Decision are required prior to publication.
            </p>
          )}
        </div>
      </form>
    </div>
  );
};
