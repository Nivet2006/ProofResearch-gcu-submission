import React from 'react';
import { Contribution } from '../types';

interface ContributionTimelineProps {
  contributions: Contribution[];
}

export const ContributionTimeline: React.FC<ContributionTimelineProps> = ({ contributions }) => {
  return (
    <div className="divide-y divide-[#E5E5E5] border-t border-b border-[#E5E5E5] text-xs">
      {contributions.map((c) => {
        const isApproved = c.review_status === 'APPROVED';

        return (
          <div key={c.id} className="py-5 space-y-3">
            {/* Top Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div>
                  <span className="font-semibold text-[#000000]">{c.profile?.full_name}</span>
                  <span className="text-[#888888] ml-2">({c.profile?.role})</span>
                  <div className="text-[11px] text-[#888888]">
                    {new Date(c.created_at || Date.now()).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {c.ai_assisted && (
                  <span className="text-[11px] font-medium text-[#666666] border border-[#CCCCCC] px-2 py-0.5 rounded">
                    ai_assisted
                  </span>
                )}
                <span className="text-[11px] font-medium text-[#000000] bg-[#F5F5F5] px-2 py-0.5 rounded border border-[#E5E5E5]">
                  {c.type}
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded border border-[#E5E5E5] text-[#000000]">
                  {isApproved ? 'Approved' : 'Pending Review'}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <p className="text-[#111111] leading-relaxed flex-1">{c.description}</p>
              <div className="text-right shrink-0">
                <span className="text-[#888888] text-[11px] block">Impact Score</span>
                <span className="font-semibold text-[#000000]">{c.impact_score} / 10.0</span>
              </div>
            </div>

            {/* SHA-256 Hash Pointer */}
            <div className="bg-[#F5F5F5] p-2.5 rounded border border-[#E5E5E5] flex items-center justify-between text-[11px] text-[#666666]">
              <span>Artifact Hash: <code className="font-mono text-[#000000]">{c.artifact_hash}</code></span>
            </div>

            {/* Evidence items */}
            {c.evidence && c.evidence.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] font-medium text-[#888888] block mb-1">Attached Evidence:</span>
                {c.evidence.map(ev => (
                  <div key={ev.id} className="bg-[#F5F5F5] p-2 rounded border border-[#E5E5E5] text-[11px] text-[#000000] flex items-center justify-between">
                    <div>
                      <span className="font-medium">{ev.title}</span>
                      <span className="text-[#666666] ml-2">({ev.source_type}: {ev.source_reference})</span>
                    </div>
                    <code className="font-mono text-xs text-[#666666]">{ev.content_hash.substring(0, 12)}...</code>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
