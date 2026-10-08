import React, { useState, useEffect } from 'react';
import { noveltyAgent } from '../services/noveltyAgent';
import {
  ResearchNoveltyAssessment,
  NoveltyHumanDecision,
  ResearchQueryResult
} from '../types/novelty';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Search,
  ExternalLink,
  Info,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Lock
} from 'lucide-react';

interface ResearchNoveltyCheckProps {
  projectId?: string;
  title: string;
  publicSummary: string;
  creatorId?: string;
  onAssessmentChange: (
    assessment: ResearchNoveltyAssessment | null,
    isReadyForPublish: boolean
  ) => void;
}

export const ResearchNoveltyCheck: React.FC<ResearchNoveltyCheckProps> = ({
  projectId,
  title,
  publicSummary,
  creatorId,
  onAssessmentChange
}) => {
  const [checking, setChecking] = useState(false);
  const [progressStep, setProgressStep] = useState<string>('');
  const [assessment, setAssessment] = useState<ResearchNoveltyAssessment | null>(null);
  const [expandedResultId, setExpandedResultId] = useState<string | null>(null);

  // Human decision state
  const [selectedDecision, setSelectedDecision] = useState<NoveltyHumanDecision | ''>('');
  const [notes, setNotes] = useState('');
  const [recordingDecision, setRecordingDecision] = useState(false);
  const [decisionRecordedMessage, setDecisionRecordedMessage] = useState('');

  const currentContentHash = title && publicSummary
    ? noveltyAgent.computeProjectContentHash(title, publicSummary)
    : '';

  const isInformationSufficient = title.trim().length > 3 && publicSummary.trim().length > 10;
  const isStale = assessment ? assessment.project_content_hash !== currentContentHash : false;

  // Check if ready for publish:
  // Zero matches → always ready after check completes (no human decision needed)
  // Has matches → requires an explicit human decision
  useEffect(() => {
    if (!assessment || isStale) {
      onAssessmentChange(assessment, false);
    } else if (assessment.result_count === 0) {
      // No conflicts found — auto-clear for publishing
      onAssessmentChange(assessment, true);
    } else if (assessment.human_decision) {
      onAssessmentChange(assessment, true);
    } else {
      onAssessmentChange(assessment, false);
    }
  }, [assessment, isStale, selectedDecision]);

  const handleRunCheck = async () => {
    if (!isInformationSufficient || checking) return;

    setChecking(true);
    setDecisionRecordedMessage('');
    setProgressStep('Initializing Research Novelty Check...');

    try {
      const result = await noveltyAgent.runNoveltyCheck(
        {
          projectId,
          title,
          publicSummary,
          creatorId
        },
        stepText => setProgressStep(stepText)
      );

      setAssessment(result);
      setSelectedDecision(result.human_decision || '');
      setNotes(result.human_notes || '');
      if (result.results.length > 0) {
        setExpandedResultId(result.results[0].id);
      }
    } catch (err: any) {
      console.error('Novelty check error:', err);
    } finally {
      setChecking(false);
    }
  };

  const handleSaveDecision = async (decisionToRecord?: NoveltyHumanDecision) => {
    const finalDecision = decisionToRecord || selectedDecision;
    if (!assessment || !finalDecision || recordingDecision) return;

    setRecordingDecision(true);
    try {
      const updated = await noveltyAgent.recordHumanDecision(
        assessment.id,
        assessment.project_id,
        creatorId || 'u1111111-1111-1111-1111-111111111111',
        finalDecision as NoveltyHumanDecision,
        notes
      );

      setAssessment(updated);
      setSelectedDecision(finalDecision);
      setDecisionRecordedMessage(`Novelty assessment recorded as "${finalDecision.replace(/_/g, ' ')}"`);
      onAssessmentChange(updated, true);
    } catch (err) {
      console.error('Failed to record human novelty decision:', err);
    } finally {
      setRecordingDecision(false);
    }
  };

  const getOverlapBandBadge = (band?: string) => {
    switch (band) {
      case 'REVIEW_RECOMMENDED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">REVIEW RECOMMENDED</span>;
      case 'HIGH_OVERLAP':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-800 border border-orange-200">HIGH OVERLAP DETECTED</span>;
      case 'MODERATE_OVERLAP':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">MODERATE OVERLAP</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">NO SIGNIFICANT SIMILARITY</span>;
    }
  };

  return (
    <div className="border border-[#E5E5E5] bg-[#FAFAFA] rounded-lg p-5 space-y-5 text-xs text-[#111111] transition-all">
      {/* HEADER SECTION */}
      <div className="flex items-start justify-between pb-3 border-b border-[#E5E5E5]">
        <div>
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#111111]">
              Research Novelty Check
            </h3>
          </div>
          <p className="text-[11px] text-[#6B6B6B] mt-1">
            Before publishing this research project, ProofResearch searches available research sources for potentially similar work.
            This does not prove absolute uniqueness; it identifies research with potentially significant semantic overlap.
          </p>
        </div>
        {assessment && !isStale && (
          <div>{getOverlapBandBadge(assessment.overlap_band)}</div>
        )}
      </div>

      {/* CONFIDENTIALITY NOTICE BOX */}
      <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-md flex items-start gap-2.5 text-[11px] text-blue-950">
        <Lock className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Confidentiality Notice:</span> Only public project details (Title & Public Brief) are used for external research discovery.
          Your confidential brief remains protected under Row Level Security (RLS) and is <strong>never</strong> sent to external APIs or third-party engines.
        </div>
      </div>

      {/* SUPERSEDED STALE WARNING */}
      {isStale && assessment && (
        <div className="bg-amber-50 border border-amber-300 p-3 rounded-md flex items-start gap-2 text-[11px] text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Project Content Modified:</span> Project title or public brief has been edited since the previous check.
            This assessment is now marked <span className="font-mono bg-amber-200 px-1 py-0.5 rounded">SUPERSEDED</span>. Please run the novelty check again before publication.
          </div>
        </div>
      )}

      {/* NOT CHECKED STATE */}
      {!assessment && !checking && (
        <div className="bg-white p-5 rounded-md border border-[#E5E5E5] text-center space-y-3">
          <p className="text-xs text-[#6B6B6B]">
            Execute semantic similarity analysis against ProofResearch projects, National Digital Library of India (NDLI), OpenAlex, and scholarly databases.
          </p>

          {!isInformationSufficient ? (
            <div className="text-[11px] text-amber-700 bg-amber-50 inline-block px-3 py-1.5 rounded-md border border-amber-200">
              ⚠️ Add a project title and public brief to run the novelty check.
            </div>
          ) : (
            <div>
              <button
                type="button"
                onClick={handleRunCheck}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors shadow-sm text-xs inline-flex items-center gap-2"
              >
                <Search className="w-3.5 h-3.5" />
                Check Research Similarity
              </button>
            </div>
          )}
        </div>
      )}

      {/* CHECKING PROGRESS STATE */}
      {checking && (
        <div className="bg-white p-5 rounded-md border border-blue-200 space-y-4">
          <div className="flex items-center gap-2 text-blue-700 font-medium">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Checking research similarity...</span>
          </div>

          <div className="space-y-2 text-[11px] pl-6 text-[#6B6B6B]">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>ProofResearch internal projects database</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>National Digital Library of India (NDLI) index</span>
            </div>
            <div className="flex items-center gap-2 text-blue-600 font-medium animate-pulse">
              <Search className="w-3.5 h-3.5" />
              <span>{progressStep}</span>
            </div>
            <div className="flex items-center gap-2 text-[#999999]">
              <span className="w-3.5 h-3.5 text-center">•</span>
              <span>External domain-specific repositories & preprints</span>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETED RESULTS DISPLAY */}
      {assessment && !checking && (
        <div className="space-y-5">
          {/* SUMMARY STATS BAR */}
          <div className="bg-white p-4 rounded-md border border-[#E5E5E5] grid grid-cols-1 md:grid-cols-3 gap-4 text-center md:text-left">
            <div>
              <div className="text-[10px] text-[#6B6B6B] uppercase tracking-wider font-semibold">Potentially Similar Works</div>
              <div className="text-xl font-bold text-[#111111] mt-0.5">{assessment.result_count} items found</div>
            </div>
            <div>
              <div className="text-[10px] text-[#6B6B6B] uppercase tracking-wider font-semibold">Highest Semantic Similarity</div>
              <div className={`text-xl font-bold mt-0.5 ${assessment.highest_similarity >= 75 ? 'text-amber-700' : 'text-blue-700'}`}>
                {assessment.highest_similarity}%
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#6B6B6B] uppercase tracking-wider font-semibold">
                Sources Evaluated ({assessment.sources_searched.filter(s => s.status === 'LIVE' || s.status === 'MOCK').length} of {assessment.sources_searched.length} responded)
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {assessment.sources_searched.map(src => (
                  <span
                    key={src.name}
                    className={`px-2 py-0.5 rounded text-[9px] font-mono border flex items-center gap-1 ${
                      src.status === 'LIVE' ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold' :
                      src.status === 'MOCK' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                      'bg-rose-50 text-rose-800 border-rose-200 font-semibold'
                    }`}
                    title={src.errorMessage || `${src.resultCount} items returned in ${src.responseTimeMs || 0}ms`}
                  >
                    <span>{src.status === 'LIVE' ? '✓' : src.status === 'MOCK' ? 'ℹ' : '⚠'}</span>
                    <span>{src.name}</span>
                    <span className="opacity-75">{src.status}</span>
                    {src.responseTimeMs ? <span className="opacity-60 text-[8px]">({src.responseTimeMs}ms)</span> : null}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* SIMILAR RESEARCH LIST */}
          {assessment.results.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-[#111111] flex items-center justify-between">
                <span>Potentially Similar Research Works</span>
                <div className="relative group inline-block">
                  <span className="text-[11px] font-normal text-[#6B6B6B] hover:text-black transition-colors cursor-help flex items-center gap-1.5">
                    <span>Ranked by semantic match score</span>
                    <span className="text-blue-600 bg-blue-50 border border-blue-200 rounded-full w-4 h-4 inline-flex items-center justify-center text-[10px] font-bold">?</span>
                  </span>

                  {/* HOVER POPUP CARD */}
                  <div className="absolute right-0 top-full mt-2 w-80 p-4 bg-neutral-900 text-white rounded-lg shadow-2xl border border-neutral-800 text-xs z-50 hidden group-hover:block transition-all duration-200 font-normal pointer-events-none text-left">
                    {/* Arrow pointing up */}
                    <div className="absolute -top-1.5 right-6 w-3 h-3 bg-neutral-900 rotate-45 border-l border-t border-neutral-800"></div>

                    <div className="flex items-center gap-2 font-bold text-xs text-amber-400 mb-2 border-b border-neutral-800 pb-2">
                      <span>💡</span>
                      <span>What is Semantic Match Score?</span>
                    </div>

                    <p className="text-[11px] text-neutral-300 leading-relaxed mb-3">
                      <strong>Semantic Match Score</strong> measures conceptual and contextual overlap between your research proposal and published literature using natural language embeddings and domain ontology matching, going beyond simple keyword matching.
                    </p>

                    <div className="space-y-2 text-[11px]">
                      <div className="font-semibold text-neutral-200 uppercase tracking-wider text-[10px]">
                        How it works:
                      </div>
                      <ul className="space-y-1 text-neutral-300 list-disc list-inside text-[11px]">
                        <li><strong>Vector Cosine Similarity:</strong> Compares research objectives, technical hardware, and dataset methodology.</li>
                        <li><strong>Multi-Source Search:</strong> Aggregates live prior art from arXiv, PubMed, IEEE, ENCODE, and ProofResearch Ledger.</li>
                      </ul>

                      <div className="pt-2 border-t border-neutral-800 mt-2">
                        <div className="font-semibold text-neutral-200 uppercase tracking-wider text-[10px] mb-1.5">
                          Similarity Thresholds:
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 text-[10px] text-center font-mono">
                          <div className="bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 p-1.5 rounded">
                            <span className="font-bold">0%–39%</span><br/><span className="text-[9px] font-sans font-normal">Differentiated</span>
                          </div>
                          <div className="bg-amber-950/80 text-amber-300 border border-amber-800/60 p-1.5 rounded">
                            <span className="font-bold">40%–69%</span><br/><span className="text-[9px] font-sans font-normal">Refinement</span>
                          </div>
                          <div className="bg-rose-950/80 text-rose-300 border border-rose-800/60 p-1.5 rounded">
                            <span className="font-bold">70%–100%</span><br/><span className="text-[9px] font-sans font-normal">Expert Review</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </h4>

              <div className="space-y-2">
                {assessment.results.map((res: ResearchQueryResult) => {
                  const isExpanded = expandedResultId === res.id;
                  return (
                    <div key={res.id} className="bg-white border border-[#E5E5E5] rounded-md p-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#111111]">{res.rank}. {res.title}</span>
                          </div>
                          <div className="text-[11px] text-[#6B6B6B] mt-0.5 flex items-center gap-2">
                            <span className="font-semibold text-blue-700">{res.source}</span>
                            <span>•</span>
                            <span>{res.authors.join(', ')} ({res.publication_date})</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                            {res.similarity_score}% match
                          </div>
                        </div>
                      </div>

                      {/* MATCHED CONCEPTS BADGES */}
                      {res.matched_concepts.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] text-[#6B6B6B]">Overlapping concepts:</span>
                          {res.matched_concepts.map(c => (
                            <span key={c} className="px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-800 border border-gray-200">
                              • {c}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* EXPANDABLE DETAILS */}
                      <div className="pt-2 flex items-center gap-3 text-[11px]">
                        {res.url && (
                          <a
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
                          >
                            <span>View Source</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => setExpandedResultId(isExpanded ? null : res.id)}
                          className="text-[#6B6B6B] hover:text-[#111111] flex items-center gap-1 font-medium ml-auto"
                        >
                          <span>{isExpanded ? 'Hide Analysis' : 'View Analysis'}</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>

                      {/* EXPANDED BREAKDOWN PANEL */}
                      {isExpanded && (
                        <div className="mt-3 p-3 bg-[#F9F9F9] rounded border border-[#E5E5E5] space-y-3 text-[11px]">
                          {res.component_scores && (
                            <div>
                              <div className="font-semibold text-[#111111] mb-1.5">Component Similarity Breakdown</div>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                <div className="bg-white p-2 rounded border border-[#E5E5E5] flex justify-between">
                                  <span className="text-[#6B6B6B]">Research Domain</span>
                                  <span className="font-bold text-blue-700">{res.component_scores.domain}%</span>
                                </div>
                                <div className="bg-white p-2 rounded border border-[#E5E5E5] flex justify-between">
                                  <span className="text-[#6B6B6B]">Problem Definition</span>
                                  <span className="font-bold text-blue-700">{res.component_scores.problem}%</span>
                                </div>
                                <div className="bg-white p-2 rounded border border-[#E5E5E5] flex justify-between">
                                  <span className="text-[#6B6B6B]">Methodology</span>
                                  <span className="font-bold text-blue-700">{res.component_scores.methodology}%</span>
                                </div>
                                <div className="bg-white p-2 rounded border border-[#E5E5E5] flex justify-between">
                                  <span className="text-[#6B6B6B]">Technology</span>
                                  <span className="font-bold text-blue-700">{res.component_scores.technology}%</span>
                                </div>
                                <div className="bg-white p-2 rounded border border-[#E5E5E5] flex justify-between">
                                  <span className="text-[#6B6B6B]">Dataset</span>
                                  <span className="font-bold text-blue-700">{res.component_scores.dataset}%</span>
                                </div>
                                <div className="bg-white p-2 rounded border border-[#E5E5E5] flex justify-between">
                                  <span className="text-[#6B6B6B]">Objective</span>
                                  <span className="font-bold text-blue-700">{res.component_scores.objective}%</span>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="space-y-1">
                            <span className="font-semibold text-[#111111]">Abstract / Summary Snippet:</span>
                            <p className="text-[#6B6B6B] italic">{res.abstract_or_summary}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── ZERO MATCHES: clear to publish ────────────────────────────── */}
          {assessment.result_count === 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-md p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-sm font-semibold text-emerald-800">
                  No Conflicting Research Found
                </div>
                <p className="text-[11px] text-emerald-700">
                  The similarity search returned no matching works across all available sources.
                  This project is clear to publish — no human novelty review is required.
                </p>
                <div className="pt-1 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleRunCheck}
                    className="text-[11px] text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Run Check Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── HAS MATCHES: WHY SIMILAR & WHAT DIFFERENT ─────────────────── */}
          {assessment.result_count > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-3.5 rounded border border-[#E5E5E5] space-y-1">
                  <div className="font-semibold text-[#111111] uppercase tracking-wider text-[10px] text-amber-800">
                    WHY SIMILAR?
                  </div>
                  <p className="text-[11px] text-[#6B6B6B]">{assessment.why_similar}</p>
                </div>

                <div className="bg-white p-3.5 rounded border border-[#E5E5E5] space-y-1">
                  <div className="font-semibold text-[#111111] uppercase tracking-wider text-[10px] text-emerald-800">
                    WHAT APPEARS DIFFERENT?
                  </div>
                  <p className="text-[11px] text-[#6B6B6B]">{assessment.what_different}</p>
                </div>
              </div>

              {/* ── HUMAN DECISION (only when conflicts exist) ───────────── */}
              <div className="bg-white p-4 rounded-md border-2 border-amber-400/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                      Novelty Assessment — Human Review Required
                    </h4>
                    <p className="text-[10px] text-[#6B6B6B] mt-0.5">
                      Potential conflicts detected. A human reviewer must classify this project before it can be published.
                    </p>
                  </div>
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 transition-colors">
                    <input
                      type="radio"
                      name="human_decision"
                      value="SUFFICIENTLY_DIFFERENTIATED"
                      checked={selectedDecision === 'SUFFICIENTLY_DIFFERENTIATED'}
                      onChange={() => {
                        setSelectedDecision('SUFFICIENTLY_DIFFERENTIATED');
                        handleSaveDecision('SUFFICIENTLY_DIFFERENTIATED');
                      }}
                      className="text-emerald-600"
                    />
                    <div>
                      <div className="font-semibold text-[#111111]">Sufficiently Differentiated</div>
                      <div className="text-[10px] text-[#6B6B6B]">The proposed research introduces unique methodologies, hardware constraints, or objectives distinguishing it from prior work.</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-amber-50 border border-gray-200 hover:border-amber-300 transition-colors">
                    <input
                      type="radio"
                      name="human_decision"
                      value="REQUIRES_REFINEMENT"
                      checked={selectedDecision === 'REQUIRES_REFINEMENT'}
                      onChange={() => {
                        setSelectedDecision('REQUIRES_REFINEMENT');
                        handleSaveDecision('REQUIRES_REFINEMENT');
                      }}
                      className="text-amber-600"
                    />
                    <div>
                      <div className="font-semibold text-[#111111]">Requires Refinement</div>
                      <div className="text-[10px] text-[#6B6B6B]">Scope or deliverables overlap with existing literature and should be narrowed before publication.</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-red-50 border border-gray-200 hover:border-red-300 transition-colors">
                    <input
                      type="radio"
                      name="human_decision"
                      value="SIMILARITY_REQUIRES_FURTHER_REVIEW"
                      checked={selectedDecision === 'SIMILARITY_REQUIRES_FURTHER_REVIEW'}
                      onChange={() => {
                        setSelectedDecision('SIMILARITY_REQUIRES_FURTHER_REVIEW');
                        handleSaveDecision('SIMILARITY_REQUIRES_FURTHER_REVIEW');
                      }}
                      className="text-red-600"
                    />
                    <div>
                      <div className="font-semibold text-[#111111]">Similarity Requires Further Review</div>
                      <div className="text-[10px] text-[#6B6B6B]">Substantial overlap flagged; requires expert domain review before proceeding.</div>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#111111] mb-1">Reviewer Notes (Optional)</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Enter justification notes recorded in the provenance ledger..."
                    className="w-full bg-white border border-[#E5E5E5] text-[#111111] p-2 rounded text-xs focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleRunCheck}
                    className="text-[11px] text-[#6B6B6B] hover:text-[#111111] underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Run Check Again
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveDecision()}
                    disabled={!selectedDecision || recordingDecision}
                    className="px-4 py-1.5 bg-[#111111] hover:bg-black text-white font-medium rounded text-xs transition-colors disabled:opacity-50"
                  >
                    {recordingDecision ? 'Saving Decision...' : 'Record Novelty Decision'}
                  </button>
                </div>

                {decisionRecordedMessage && (
                  <div className="text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{decisionRecordedMessage}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
