import React, { useState, useEffect } from 'react';
import { MatchingRequirementSet, MatchingRequirement, RequirementCategory, MatchingMethod, RequirementImportance, UserProfile } from '../types';
import { requirementService } from '../services/requirementService';

interface RequirementConfigEditorProps {
  projectId: string;
  user: UserProfile;
  onRequirementApproved?: (set: MatchingRequirementSet) => void;
}

export const RequirementConfigEditor: React.FC<RequirementConfigEditorProps> = ({
  projectId,
  user,
  onRequirementApproved
}) => {
  const [activeSet, setActiveSet] = useState<MatchingRequirementSet | null>(null);
  const [requirements, setRequirements] = useState<Omit<MatchingRequirement, 'id' | 'requirement_set_id'>[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // New Requirement Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<RequirementCategory>('SKILL');
  const [weight, setWeight] = useState<number>(15);
  const [importance, setImportance] = useState<RequirementImportance>('REQUIRED');
  const [matchingMethod, setMatchingMethod] = useState<MatchingMethod>('EXACT');

  const isSponsor = user.role === 'SPONSOR' || user.role === 'ADMIN';
  const isExpert = user.role === 'EXPERT' || user.role === 'ADMIN';

  useEffect(() => {
    loadRequirementSet();
  }, [projectId]);

  const loadRequirementSet = async () => {
    setLoading(true);
    try {
      const set = await requirementService.getApprovedRequirementSet(projectId);
      if (set) {
        setActiveSet(set);
        setRequirements((set.requirements || []).map(r => ({
          name: r.name,
          description: r.description,
          category: r.category,
          weight: r.weight,
          importance: r.importance,
          matching_method: r.matching_method,
          sort_order: r.sort_order
        })));
      }
    } catch (err) {
      console.warn('Error loading requirement set:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalWeight = requirementService.calculateTotalWeight(requirements);
  const weightDifference = parseFloat((100 - totalWeight).toFixed(2));
  const isValid100 = Math.abs(totalWeight - 100.0) <= 0.01;

  const handleAddRequirement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setRequirements(prev => [
      ...prev,
      {
        name: name.trim(),
        description: description.trim(),
        category,
        weight: Number(weight),
        importance,
        matching_method: matchingMethod,
        sort_order: prev.length + 1
      }
    ]);

    setName('');
    setDescription('');
    setWeight(15);
  };

  const handleRemoveRequirement = (index: number) => {
    setRequirements(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleWeightChange = (index: number, newWeight: number) => {
    setRequirements(prev =>
      prev.map((r, idx) => (idx === index ? { ...r, weight: Math.max(0, Math.min(100, newWeight)) } : r))
    );
  };

  const handleRequestAISuggestions = () => {
    setAiLoading(true);
    setTimeout(() => {
      const suggestions = requirementService.generateAIProposedRequirements(
        projectId,
        user.id,
        'Diabetic Retinopathy Detection',
        'Edge AI image analysis pipeline for fundus images.'
      );
      setRequirements(suggestions);
      setAiLoading(false);
    }, 400);
  };

  const handleSubmitForReview = async () => {
    if (!isValid100) {
      alert(`Validation Error: Requirements must sum to exactly 100%. Current total: ${totalWeight}%.`);
      return;
    }

    setSubmitting(true);
    try {
      const draft = await requirementService.createDraftRequirementSet(projectId, user.id, requirements);
      const submitted = await requirementService.submitForExpertReview(draft.id, user.id);
      setActiveSet(submitted);
      alert('Requirement set submitted for Expert Review!');
    } catch (err: any) {
      alert(err.message || 'Error submitting requirement set');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExpertApprove = async () => {
    if (!activeSet) return;
    setSubmitting(true);
    try {
      const approved = await requirementService.approveRequirementSet(activeSet.id, user.id);
      setActiveSet(approved);
      if (onRequirementApproved) onRequirementApproved(approved);
      alert(`Requirement Set ${approved.version} Approved successfully! Locked and active for matching.`);
    } catch (err: any) {
      alert(err.message || 'Error approving requirement set');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border border-[#E5E5E5] bg-white rounded-lg p-6 space-y-6 text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-4">
        <div>
          <h2 className="text-base font-semibold text-[#111111]">Project Matching Requirements</h2>
          <p className="text-[#6B6B6B] mt-0.5">
            Configurable criteria & weight allocation approved by Sponsor & Expert Reviewer.
          </p>
        </div>
        {activeSet && (
          <div className="flex items-center gap-2">
            <span className="font-mono bg-[#F5F5F5] border border-[#E5E5E5] px-2.5 py-1 rounded text-[11px] font-semibold text-[#111111]">
              {activeSet.version}
            </span>
            <span className={`px-2.5 py-1 rounded font-medium text-[11px] uppercase ${
              activeSet.status === 'APPROVED' ? 'bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]' :
              activeSet.status === 'PENDING_EXPERT_REVIEW' ? 'bg-[#FFF8E1] text-[#F57F17] border border-[#FFE082]' :
              'bg-[#F5F5F5] text-[#616161]'
            }`}>
              {activeSet.status}
            </span>
          </div>
        )}
      </div>

      {/* AI Suggestion Bar */}
      {isSponsor && (
        <div className="bg-[#FAF9F5] border border-[#E8E6DF] p-3.5 rounded-md flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#5C5A52]">
            <span className="font-semibold text-[#111111]">✨ AI Requirement Assistant:</span>
            <span>Analyze research scope to propose optimal criteria & weights.</span>
          </div>
          <button
            onClick={handleRequestAISuggestions}
            disabled={aiLoading}
            className="px-3 py-1.5 bg-[#111111] hover:bg-black text-white font-medium rounded transition-colors text-xs"
          >
            {aiLoading ? 'Analyzing Scope...' : 'Propose AI Requirements'}
          </button>
        </div>
      )}

      {/* Requirements List */}
      <div className="space-y-3">
        <h3 className="font-semibold text-[#111111] uppercase tracking-wider text-[11px]">
          Configured Requirements ({requirements.length})
        </h3>

        <div className="divide-y divide-[#F0F0F0] border border-[#E5E5E5] rounded-md overflow-hidden">
          {requirements.map((req, idx) => (
            <div key={idx} className="p-3 bg-white hover:bg-[#FAFAFA] flex items-center justify-between gap-4">
              <div className="space-y-0.5 flex-1">
                <div className="flex items-center gap-2">
                  <strong className="text-[#111111] text-xs font-semibold">{req.name}</strong>
                  <span className="bg-[#F0F0F0] text-[#616161] px-1.5 py-0.5 rounded text-[10px] uppercase font-mono">
                    {req.category}
                  </span>
                  <span className="text-[#888888] text-[10px]">Method: {req.matching_method}</span>
                </div>
                {req.description && <p className="text-[#666666] text-[11px]">{req.description}</p>}
              </div>

              {/* Weight Adjustment */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1 font-mono">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={req.weight}
                    onChange={e => handleWeightChange(idx, Number(e.target.value))}
                    className="w-16 border border-[#E5E5E5] p-1 text-center rounded font-semibold text-[#111111]"
                  />
                  <span className="text-[#666666]">%</span>
                </div>

                {isSponsor && (
                  <button
                    onClick={() => handleRemoveRequirement(idx)}
                    className="text-[#D32F2F] hover:underline text-[11px] font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Total Weight Validation Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[#E5E5E5]">
        <div className="flex items-center gap-3 font-mono text-xs">
          <span>Total Weight: </span>
          <strong className={`text-sm ${isValid100 ? 'text-[#2E7D32]' : 'text-[#D32F2F]'}`}>
            {totalWeight}%
          </strong>
          {!isValid100 && (
            <span className="text-[11px] text-[#D32F2F] font-sans">
              ({weightDifference > 0 ? `${weightDifference}% remaining` : `Exceeds 100% by ${Math.abs(weightDifference)}%`})
            </span>
          )}
          {isValid100 && (
            <span className="text-[11px] text-[#2E7D32] font-sans">✓ Exactly 100% (Valid)</span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {isSponsor && (
            <button
              onClick={handleSubmitForReview}
              disabled={submitting || !isValid100}
              className={`px-4 py-2 text-white font-medium rounded transition-colors text-xs ${
                isValid100 ? 'bg-[#111111] hover:bg-black' : 'bg-[#CCCCCC] cursor-not-allowed'
              }`}
            >
              Submit for Expert Review
            </button>
          )}

          {isExpert && activeSet?.status === 'PENDING_EXPERT_REVIEW' && (
            <button
              onClick={handleExpertApprove}
              disabled={submitting || !isValid100}
              className="px-4 py-2 bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-medium rounded transition-colors text-xs"
            >
              Approve Requirement Set
            </button>
          )}
        </div>
      </div>

      {/* Add New Requirement Modal Form */}
      {isSponsor && (
        <form onSubmit={handleAddRequirement} className="border-t border-[#E5E5E5] pt-4 space-y-3">
          <h4 className="font-semibold text-[#111111]">Add Custom Requirement</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder="Requirement Name (e.g. PyTorch)"
              value={name}
              onChange={e => setName(e.target.value)}
              className="border border-[#E5E5E5] p-2 rounded text-xs"
            />
            <select
              value={category}
              onChange={e => setCategory(e.target.value as any)}
              className="border border-[#E5E5E5] p-2 rounded text-xs bg-white"
            >
              <option value="SKILL">SKILL</option>
              <option value="TECHNOLOGY">TECHNOLOGY</option>
              <option value="DOMAIN">DOMAIN</option>
              <option value="EXPERIENCE">EXPERIENCE</option>
              <option value="ACHIEVEMENT">ACHIEVEMENT</option>
              <option value="AVAILABILITY">AVAILABILITY</option>
              <option value="EDUCATION">EDUCATION</option>
            </select>
            <select
              value={matchingMethod}
              onChange={e => setMatchingMethod(e.target.value as any)}
              className="border border-[#E5E5E5] p-2 rounded text-xs bg-white"
            >
              <option value="EXACT">EXACT MATCH</option>
              <option value="DOMAIN_AFFINITY">DOMAIN AFFINITY</option>
              <option value="FRAMEWORK_AFFINITY">FRAMEWORK AFFINITY</option>
              <option value="NUMERIC_THRESHOLD">NUMERIC THRESHOLD</option>
              <option value="BOOLEAN">BOOLEAN ACHIEVEMENT</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Description (optional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="border border-[#E5E5E5] p-2 rounded text-xs flex-1"
            />
            <div className="flex items-center gap-1 font-mono">
              <span className="text-[#666666]">Weight:</span>
              <input
                type="number"
                min="1"
                max="100"
                value={weight}
                onChange={e => setWeight(Number(e.target.value))}
                className="w-16 border border-[#E5E5E5] p-2 rounded text-center font-semibold"
              />
              <span>%</span>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-[#111111] hover:bg-black text-white font-medium rounded text-xs"
            >
              + Add
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
