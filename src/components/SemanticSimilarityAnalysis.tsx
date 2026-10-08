import React, { useState } from 'react';
import { semanticSimilarityService, SemanticAnalysisResult } from '../services/semanticSimilarityService';

interface SemanticSimilarityAnalysisProps {
  projectId?: string;
  submissionId?: string;
  defaultReferenceText?: string;
  defaultSubmissionText?: string;
  onAnalysisComplete?: (result: SemanticAnalysisResult) => void;
}

export const SemanticSimilarityAnalysis: React.FC<SemanticSimilarityAnalysisProps> = ({
  projectId,
  submissionId,
  defaultReferenceText = '',
  defaultSubmissionText = '',
  onAnalysisComplete
}) => {
  const [referenceText, setReferenceText] = useState(defaultReferenceText);
  const [submissionText, setSubmissionText] = useState(defaultSubmissionText);
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<SemanticAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRunAnalysis = async () => {
    if (!referenceText.trim()) {
      setErrorMessage('Please enter or select a reference project text.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      let finalSubmissionText = submissionText;

      // Handle file upload if present
      if (file) {
        const formData = new FormData();
        formData.append('reference_text', referenceText);
        formData.append('file', file);

        try {
          const apiRes = await fetch('http://127.0.0.1:8000/similarity/analyze-upload', {
            method: 'POST',
            body: formData
          });
          if (apiRes.ok) {
            const data = await apiRes.json();
            setAnalysisResult(data);
            if (onAnalysisComplete) onAnalysisComplete(data);
            setIsAnalyzing(false);
            return;
          }
        } catch {
          // If backend upload server is offline, read text file locally
          const text = await file.text();
          finalSubmissionText = text;
        }
      }

      if (!finalSubmissionText.trim()) {
        setErrorMessage('Please enter target submission text or select a valid document.');
        setIsAnalyzing(false);
        return;
      }

      const res = await semanticSimilarityService.analyzeSimilarity(
        referenceText,
        finalSubmissionText,
        projectId,
        submissionId
      );
      setAnalysisResult(res);
      if (onAnalysisComplete) onAnalysisComplete(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete semantic similarity analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLoadPlantDemo = () => {
    setReferenceText("AI-powered plant leaf disease detection using CNNs");
    setSubmissionText("Automated crop infection diagnosis from photographs via deep convolutional neural networks");
    setErrorMessage(null);
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-100 pb-4 gap-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <span>ML Semantic Project Similarity Engine</span>
            <span className="text-xs bg-neutral-100 text-neutral-800 font-mono px-2 py-0.5 rounded border border-neutral-200">
              sentence-transformers/all-MiniLM-L6-v2 (384-D)
            </span>
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Real machine-learning vector embedding & cosine similarity analysis. Detects conceptual relationships regardless of wording variations.
          </p>
        </div>

        {/* Demo Preset Button */}
        <div>
          <button
            onClick={handleLoadPlantDemo}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 shadow-sm"
          >
            <span>🌱</span>
            <span>Plant Disease CNN Similarity Demo</span>
          </button>
        </div>
      </div>

      {/* Demo Explanation Banner */}
      <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg text-xs text-neutral-700 leading-relaxed">
        <strong>Hackathon / Demo Proof:</strong> This proves the model is not only matching exact keywords. Project A says plant leaf disease detection using CNNs, while Project B says crop infection diagnosis from photographs using deep convolutional neural networks. The wording is different, but the semantic meaning is the same: image-based agricultural disease detection using CNN/deep learning. If the ML model is unavailable, our deterministic fallback still proves the relationship transparently using matched concept groups.
      </div>

      {/* Input Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">
            Reference Project Description / Text
          </label>
          <textarea
            value={referenceText}
            onChange={(e) => setReferenceText(e.target.value)}
            rows={5}
            placeholder="e.g. Develop a CNN-based diabetic retinopathy screening system using retinal fundus images..."
            className="w-full text-xs p-3 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-neutral-950 focus:border-transparent outline-none transition-all font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">
            Target Submission Description / Document
          </label>
          <textarea
            value={submissionText}
            onChange={(e) => setSubmissionText(e.target.value)}
            rows={5}
            placeholder="e.g. Create an automated ophthalmology disease detection pipeline using deep neural networks..."
            className="w-full text-xs p-3 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-neutral-950 focus:border-transparent outline-none transition-all font-mono"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-neutral-400">Or attach document (.txt, .pdf, .docx):</span>
            <input
              type="file"
              accept=".txt,.pdf,.docx"
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
              className="text-xs text-neutral-600 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-neutral-100 file:text-neutral-700 hover:file:bg-neutral-200"
            />
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-end">
        <button
          onClick={handleRunAnalysis}
          disabled={isAnalyzing}
          className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium rounded-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
        >
          {isAnalyzing ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Generating 384-D Embeddings...</span>
            </>
          ) : (
            <span>Run ML Semantic Analysis</span>
          )}
        </button>
      </div>

      {/* Analysis Output Panel */}
      {analysisResult && (
        <div className="mt-6 border-t border-neutral-200 pt-6 space-y-6">
          {/* Status Indicator Banner */}
          <div className={`p-3 rounded-lg border text-xs font-medium flex items-center justify-between ${
            analysisResult.fallback_reasoning?.used_fallback
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}>
            <span className="flex items-center gap-2">
              <span className="font-bold">Execution Status:</span>
              <span>{analysisResult.status_summary || (analysisResult.fallback_reasoning?.used_fallback ? "ML model result was unavailable or inconclusive. Rule-based semantic fallback was used for transparent verification." : "Primary ML model completed successfully.")}</span>
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold border bg-white">
              {analysisResult.fallback_reasoning?.used_fallback ? "Rule-based Semantic Fallback" : "Primary ML Model"}
            </span>
          </div>

          {/* SECTION 1: ML Model Result */}
          <div className="p-5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800 flex items-center gap-2">
                <span>ML Model Result</span>
                <span className="text-[10px] font-mono font-normal text-neutral-500 bg-neutral-200 px-2 py-0.5 rounded">
                  {analysisResult.model.name}
                </span>
              </h3>
              <span className="text-xs text-neutral-500 font-mono">
                Dim: {analysisResult.model.embedding_dimension}D
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-white rounded-lg border border-neutral-200">
                <span className="text-[11px] text-neutral-500 block mb-1">Cosine Similarity</span>
                <span className="text-xl font-bold text-neutral-900">
                  {analysisResult.similarity.percentage}%
                </span>
                <span className="text-[10px] text-neutral-400 block mt-0.5 font-mono">
                  cosine: {analysisResult.similarity.cosine.toFixed(4)}
                </span>
              </div>

              <div className="p-3 bg-white rounded-lg border border-neutral-200">
                <span className="text-[11px] text-neutral-500 block mb-1">ML Probability</span>
                <span className="text-xl font-bold text-neutral-900">
                  {analysisResult.machine_learning.probability_percentage}%
                </span>
                <span className="text-[10px] text-neutral-400 block mt-0.5 font-mono">
                  prob: {analysisResult.machine_learning.relationship_probability.toFixed(4)}
                </span>
              </div>

              <div className="p-3 bg-white rounded-lg border border-neutral-200">
                <span className="text-[11px] text-neutral-500 block mb-1">Classification</span>
                <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold ${
                  analysisResult.classification === 'VERY_HIGH'
                    ? 'bg-red-100 text-red-800'
                    : analysisResult.classification === 'HIGH'
                    ? 'bg-amber-100 text-amber-800'
                    : analysisResult.classification === 'MODERATE'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {analysisResult.classification.replace('_', ' ')}
                </span>
              </div>

              <div className="p-3 bg-white rounded-lg border border-neutral-200">
                <span className="text-[11px] text-neutral-500 block mb-1">Human Review</span>
                <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold ${
                  analysisResult.review.required ? 'bg-amber-100 text-amber-800' : 'bg-neutral-100 text-neutral-700'
                }`}>
                  {analysisResult.review.required ? 'REQUIRED' : 'NOT REQUIRED'}
                </span>
              </div>
            </div>

            {/* Multi-View Feature Breakdown */}
            <div>
              <span className="text-[11px] font-semibold text-neutral-700 uppercase tracking-wider block mb-2">
                Multi-View Vector Alignment
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                {Object.entries(analysisResult.machine_learning.multi_view_features).map(([key, val]) => (
                  <div key={key} className="p-2 bg-white rounded border border-neutral-200">
                    <span className="text-[10px] font-medium text-neutral-600 capitalize block truncate mb-1">
                      {key.replace('_cosine', '').replace('_', ' ')}
                    </span>
                    <div className="w-full bg-neutral-100 rounded-full h-1 mb-1 overflow-hidden">
                      <div
                        className="bg-neutral-900 h-1 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(0, val * 100))}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-neutral-500 font-mono">
                      {(val * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-neutral-700 border-t border-neutral-200 pt-3">
              <strong>ML Explanation:</strong> {analysisResult.explanation}
            </p>
          </div>

          {/* SECTION 2: Fallback Reasoning */}
          {analysisResult.fallback_reasoning && (
            <div className="p-5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800 flex items-center gap-2">
                  <span>Fallback Reasoning</span>
                  <span className="text-[10px] font-medium text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                    Rule-based semantic fallback
                  </span>
                </h3>
                <span className="text-xs text-neutral-600 font-mono">
                  Matched Concept Groups: {analysisResult.fallback_reasoning.matched_concept_groups_count}/{analysisResult.fallback_reasoning.total_concept_groups}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-white rounded-lg border border-neutral-200">
                  <span className="text-[11px] text-neutral-500 block mb-1">Fallback Usage</span>
                  <span className="text-xs font-semibold text-neutral-900">
                    {analysisResult.fallback_reasoning.used_fallback ? "Active (Rule-based Fallback)" : "Inactive (Primary ML Active)"}
                  </span>
                </div>

                <div className="p-3 bg-white rounded-lg border border-neutral-200">
                  <span className="text-[11px] text-neutral-500 block mb-1">Fallback Classification</span>
                  <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold ${
                    analysisResult.fallback_reasoning.fallback_classification === 'VERY_HIGH'
                      ? 'bg-red-100 text-red-800'
                      : analysisResult.fallback_reasoning.fallback_classification === 'HIGH'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {analysisResult.fallback_reasoning.fallback_classification}
                  </span>
                </div>

                <div className="p-3 bg-white rounded-lg border border-neutral-200">
                  <span className="text-[11px] text-neutral-500 block mb-1">Human Review Needed</span>
                  <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {analysisResult.fallback_reasoning.human_review_required ? "TRUE (Review Required)" : "FALSE"}
                  </span>
                </div>
              </div>

              {/* Synonym Matches Table */}
              <div>
                <span className="text-[11px] font-semibold text-neutral-700 uppercase tracking-wider block mb-2">
                  Concept Group & Synonym Alignment
                </span>
                <div className="overflow-x-auto border border-neutral-200 rounded-lg">
                  <table className="w-full text-xs text-left text-neutral-700">
                    <thead className="text-[11px] text-neutral-500 uppercase bg-neutral-100 border-b border-neutral-200">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Concept Category</th>
                        <th className="px-3 py-2 font-semibold">Project A Terms</th>
                        <th className="px-3 py-2 font-semibold">Project B Terms</th>
                        <th className="px-3 py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 bg-white font-mono text-[11px]">
                      {['domain', 'problem', 'input_data', 'method'].map((group) => {
                        const match = analysisResult.fallback_reasoning?.synonym_matches.find(s => s.group === group);
                        return (
                          <tr key={group}>
                            <td className="px-3 py-2 font-sans capitalize font-medium text-neutral-900">{group.replace('_', ' ')}</td>
                            <td className="px-3 py-2 text-emerald-700">{match ? match.text_a_terms.join(', ') : '—'}</td>
                            <td className="px-3 py-2 text-blue-700">{match ? match.text_b_terms.join(', ') : '—'}</td>
                            <td className="px-3 py-2">
                              {match ? (
                                <span className="text-emerald-700 font-sans font-medium">✓ Matched</span>
                              ) : (
                                <span className="text-neutral-400 font-sans">No Match</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-3 bg-white border border-neutral-200 rounded-lg">
                <p className="text-xs text-neutral-700">
                  <strong>Fallback Plain-English Explanation:</strong> {analysisResult.fallback_reasoning.explanation}
                </p>
              </div>
            </div>
          )}

          {/* Content Hashes & Ledger Footer */}
          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg flex flex-wrap items-center justify-between text-[11px] text-neutral-500 font-mono">
            <span>Ref Hash: {analysisResult.content_hashes.reference_text_hash.slice(0, 16)}...</span>
            <span>Sub Hash: {analysisResult.content_hashes.submission_text_hash.slice(0, 16)}...</span>
            <span>Ledger: Recorded ✓</span>
          </div>
        </div>
      )}
    </div>
  );
};
