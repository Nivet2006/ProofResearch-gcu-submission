import React, { useState, useEffect } from 'react';
import { Charter, CharterAcceptance } from '../types';
import { charterService } from '../services/charterService';
import { parseRewardSplit } from '../utils/rewardUtils';

interface CharterAcceptanceProps {
  charter: Charter;
  projectId: string;
  userId: string;
  userName: string;
  onAccepted: (acceptance: CharterAcceptance) => void;
}

export const CharterAcceptanceView: React.FC<CharterAcceptanceProps> = ({
  charter,
  projectId,
  userId,
  userName,
  onAccepted
}) => {
  const [isAccepted, setIsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acceptanceRecord, setAcceptanceRecord] = useState<CharterAcceptance | null>(null);

  useEffect(() => {
    charterService.hasAcceptedCharter(projectId, userId).then(accepted => {
      setIsAccepted(accepted);
    });
  }, [projectId, userId]);

  const [modelAcknowledged, setModelAcknowledged] = useState(false);

  const handleAccept = async () => {
    if (!modelAcknowledged) return;
    setLoading(true);
    try {
      const record = await charterService.acceptCharter(charter.id, projectId, userId, charter.engagement_model, true);
      setAcceptanceRecord(record);
      setIsAccepted(true);
      onAccepted(record);
    } catch (err) {
      console.error('Error signing charter', err);
    } finally {
      setLoading(false);
    }
  };

  const getModelAckText = () => {
    switch (charter.engagement_model) {
      case 'FUNDED':
        return 'I explicitly acknowledge that this project is a FUNDED engagement (Milestone payments through escrow, credentials, credit, and reputation).';
      case 'STIPEND':
        return `I explicitly acknowledge that this project is a STIPEND / HONORARIUM engagement (Fixed amount stated upfront: ₹${(charter.stipend_amount || 5000).toLocaleString()}, plus credit).`;
      case 'KNOWLEDGE_SHARING':
        return 'I explicitly acknowledge that this project is a KNOWLEDGE-SHARING engagement with NO MONETARY PAYMENT (Certificates, badges, co-authorship, mentorship, recommendation letters).';
      case 'INSTITUTIONAL_CREDIT':
        return `I explicitly acknowledge that this project is an INSTITUTIONAL CREDIT engagement with NO PLATFORM MONETARY PAYMENT (${charter.institutional_credit_terms || 'Course/Project Credit'} granted by ${charter.institution_name || 'Institution'}).`;
      default:
        return `I explicitly acknowledge the ${charter.engagement_model} engagement model terms.`;
    }
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#E5E5E5]">
        <div>
          <div className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-1">
            RESEARCH CHARTER
          </div>
          <h2 className="text-lg font-medium text-[#000000]">
            Charter Agreement [{charter.version}]
          </h2>
          <p className="text-xs text-[#666666] mt-0.5">
            Formal governance agreement required prior to accessing confidential research data.
          </p>
        </div>

        <div className="text-xs text-[#666666] text-right">
          Engagement Model: <strong className="font-semibold text-[#000000] border border-[#000000] px-2 py-0.5 rounded inline-block ml-1">{charter.engagement_model}</strong>
        </div>
      </div>

      {/* Prominent Engagement Model Summary Banner */}
      <div className="bg-[#F9F9F9] p-4 rounded border border-[#E5E5E5] space-y-1 text-xs">
        <span className="font-semibold text-[#000000] uppercase tracking-wider block text-[11px]">
          ENGAGEMENT MODEL SUMMARY
        </span>
        <p className="text-[#666666]">
          {getModelAckText()}
        </p>
      </div>

      {/* Terms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        <div className="bg-[#F5F5F5] p-4 rounded border border-[#E5E5E5] space-y-2">
          <span className="font-semibold text-[#000000] block">Scope & Deliverables</span>
          <p className="text-[#666666]">{charter.scope}</p>
          <ul className="list-disc list-inside text-[#000000] space-y-1 pt-1">
            {charter.deliverables.map((d, idx) => (
              <li key={idx}>{d}</li>
            ))}
          </ul>
        </div>

        <div className="bg-[#F5F5F5] p-4 rounded border border-[#E5E5E5] space-y-2">
          <span className="font-semibold text-[#000000] block">Reward Allocation Terms ({charter.version})</span>
          {(() => {
            const split = parseRewardSplit(charter.reward_terms, charter.reward_split);
            return (
              <div className="space-y-1 text-[#666666]">
                <div>• Platform Fee: <strong className="text-[#000000]">{split.platformFeePercent}%</strong></div>
                <div>• AI Compute Reserve: <strong className="text-[#000000]">{split.aiComputeReservePercent}%</strong></div>
                <div>• Expert Reviewer Share: <strong className="text-[#000000]">{split.expertSharePercent}%</strong></div>
                <div>• Contributor Pool: <strong className="text-[#000000]">{split.studentPoolPercent}%</strong></div>
                <div>• Reserve / Buffer: <strong className="text-[#000000]">{split.reservePercent}%</strong></div>
              </div>
            );
          })()}
        </div>

        <div className="bg-[#F5F5F5] p-4 rounded border border-[#E5E5E5] space-y-2">
          <span className="font-semibold text-[#000000] block">IP & Publication Rights</span>
          <p className="text-[#666666]">{charter.ip_terms}</p>
          <p className="text-[#000000] pt-1">• {charter.publication_terms}</p>
        </div>

        <div className="bg-[#F5F5F5] p-4 rounded border border-[#E5E5E5] space-y-2">
          <span className="font-semibold text-[#000000] block">Data Confidentiality & AI Tools</span>
          <p className="text-[#666666]">{charter.confidentiality_terms}</p>
          <div className="text-[11px] text-[#888888] pt-1">• Permitted AI: Scoping Agent, Review Assistant, Integrity Scanner</div>
        </div>
      </div>

      {/* Signature Status Bar & Separate Model Acknowledgement */}
      <div className="bg-[#F5F5F5] p-5 rounded border border-[#E5E5E5] space-y-4 text-xs">
        {isAccepted ? (
          <div className="space-y-1">
            <div className="font-semibold text-[#000000]">
              ✓ Charter {charter.version} Digitally Signed by {userName} ({charter.engagement_model})
            </div>
            <div className="text-[#666666] text-[11px]">
              Signature Hash: <code className="font-mono text-[#000000]">{acceptanceRecord?.acceptance_hash || 'a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890'}</code>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="font-semibold text-[#000000]">Digital Acceptance & Model Acknowledgement Required</div>
              <div className="text-[#666666]">
                By signing, you agree to IP guidelines, publication credit rules, data boundaries, and engagement terms.
              </div>
            </div>

            {/* Separate Engagement Model Acknowledgement Checkbox */}
            <label className="flex items-start gap-2.5 p-3 bg-[#FFFFFF] rounded border border-[#E5E5E5] cursor-pointer hover:border-[#CCCCCC] transition-colors">
              <input
                type="checkbox"
                checked={modelAcknowledged}
                onChange={e => setModelAcknowledged(e.target.checked)}
                className="mt-0.5 rounded border-[#CCCCCC] text-[#000000] focus:ring-[#000000]"
              />
              <span className="text-[11px] text-[#000000] leading-relaxed">
                <strong>Mandatory Acknowledgement:</strong> {getModelAckText()}
              </span>
            </label>

            <div className="flex justify-end pt-1">
              <button
                onClick={handleAccept}
                disabled={loading || !modelAcknowledged}
                className="px-5 py-2.5 bg-[#000000] hover:bg-[#1A1A1A] disabled:opacity-40 text-[#FFFFFF] font-medium rounded transition-colors shrink-0"
              >
                {loading ? 'Signing Charter...' : `Accept Charter ${charter.version}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
