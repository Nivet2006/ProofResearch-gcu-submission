import React, { useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { UserProfile, CandidateProfile } from '../types';
import { authService } from '../services/authService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { expertVerificationService } from '../services/expertVerificationService';
import { ExpertBadgeCard } from '../components/ExpertBadge';
import type { ExpertBadge } from '../types/expertVerification';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProfileFormState {
  full_name: string;
  institution: string;
}

interface CandidateFormState {
  skills: string;             // comma-separated for editing
  experience_score: string;
  availability_score: string;
  research_interest: string;
  verification_level: string;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ─── Skill Tag component ──────────────────────────────────────────────────────

const SkillTag: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F0F0F0] border border-[#E0E0E0] text-xs text-[#333] rounded-sm font-mono">
    {label}
    <button
      type="button"
      onClick={onRemove}
      className="text-[#888] hover:text-[#000] font-bold leading-none"
      aria-label={`Remove ${label}`}
    >
      ×
    </button>
  </span>
);

// ─── Section wrapper ──────────────────────────────────────────────────────────

const Section: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({
  title, subtitle, children,
}) => (
  <div className="space-y-4">
    <div className="border-b border-[#E5E5E5] pb-3">
      <h2 className="text-base font-semibold text-[#000000] uppercase tracking-wider">{title}</h2>
      {subtitle && <p className="text-xs text-[#888888] mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
);

// ─── Experience Questionnaire ─────────────────────────────────────────────────

interface Question {
  id: string;
  text: string;
  options: { label: string; value: number }[];
  weight: number; // 0-1, weights sum to 1
}

const QUESTIONS: Question[] = [
  {
    id: 'q_degree',
    text: 'What is your highest academic qualification?',
    weight: 0.15,
    options: [
      { label: 'High School / 12th', value: 0 },
      { label: "Bachelor's (B.E / B.Tech / B.Sc)", value: 30 },
      { label: "Master's (M.Tech / M.Sc / MBA)", value: 60 },
      { label: 'PhD / Doctoral candidate', value: 90 },
      { label: 'Post-Doctoral / Professor', value: 100 },
    ],
  },
  {
    id: 'q_years',
    text: 'How many years of research / industry experience do you have?',
    weight: 0.20,
    options: [
      { label: 'Less than 1 year', value: 10 },
      { label: '1–2 years', value: 35 },
      { label: '3–5 years', value: 60 },
      { label: '6–10 years', value: 80 },
      { label: 'More than 10 years', value: 100 },
    ],
  },
  {
    id: 'q_publications',
    text: 'How many peer-reviewed publications or conference papers do you have?',
    weight: 0.20,
    options: [
      { label: 'None', value: 0 },
      { label: '1–2 (e.g. workshop / poster)', value: 30 },
      { label: '3–5 (IEEE / Springer / ACM)', value: 60 },
      { label: '6–15 (established track record)', value: 80 },
      { label: '15+ (prolific researcher)', value: 100 },
    ],
  },
  {
    id: 'q_projects',
    text: 'How many research or substantial technical projects have you completed?',
    weight: 0.15,
    options: [
      { label: 'None', value: 0 },
      { label: '1–2 (academic coursework)', value: 25 },
      { label: '3–5 (capstone / internship level)', value: 55 },
      { label: '6–10 (industry / startup)', value: 75 },
      { label: '10+ (serial contributor)', value: 100 },
    ],
  },
  {
    id: 'q_leadership',
    text: 'Have you ever led a research team, mentored juniors, or supervised a project?',
    weight: 0.10,
    options: [
      { label: 'No leadership experience', value: 0 },
      { label: 'Mentored 1–2 peers informally', value: 30 },
      { label: 'Led a small project / lab group (< 5 people)', value: 65 },
      { label: 'Led a funded team or department (5+ people)', value: 100 },
    ],
  },
  {
    id: 'q_datasets',
    text: 'Have you worked with real-world datasets or collected original data?',
    weight: 0.10,
    options: [
      { label: 'No — only worked with toy/tutorial datasets', value: 0 },
      { label: 'Yes — used public datasets (Kaggle, UCI, etc.)', value: 40 },
      { label: 'Yes — worked with domain-specific real-world data', value: 70 },
      { label: 'Yes — collected and curated original datasets', value: 100 },
    ],
  },
  {
    id: 'q_tools',
    text: 'How proficient are you with research tools (MATLAB, Python, LaTeX, citation managers, etc.)?',
    weight: 0.10,
    options: [
      { label: 'Beginner — learning basics', value: 10 },
      { label: 'Intermediate — comfortable with 1–2 tools', value: 40 },
      { label: 'Advanced — can independently design experiments', value: 70 },
      { label: 'Expert — builds custom pipelines and frameworks', value: 100 },
    ],
  },
];

function computeExperienceScore(answers: Record<string, number>): number {
  let total = 0;
  for (const q of QUESTIONS) {
    const val = answers[q.id];
    if (val !== undefined) total += val * q.weight;
  }
  return Math.round(total);
}

interface ExperienceQuestionnaireProps {
  initialScore: string;
  onScoreChange: (score: string) => void;
}

const ExperienceQuestionnaire: React.FC<ExperienceQuestionnaireProps> = ({ initialScore, onScoreChange }) => {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [done, setDone] = useState(false);

  const answeredCount = Object.keys(answers).length;
  const computedScore = computeExperienceScore(answers);

  const handleAnswer = (questionId: string, value: number) => {
    const updated = { ...answers, [questionId]: value };
    setAnswers(updated);
    if (currentQ < QUESTIONS.length - 1) {
      setTimeout(() => setCurrentQ(c => c + 1), 280);
    } else {
      setDone(true);
      const score = String(computeExperienceScore(updated));
      onScoreChange(score);
    }
  };

  const handleFinish = () => {
    onScoreChange(String(computedScore));
    setOpen(false);
  };

  const handleReset = () => {
    setAnswers({});
    setCurrentQ(0);
    setDone(false);
  };

  const displayScore = initialScore ? parseFloat(initialScore) : null;

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-[#444] uppercase tracking-wider block">
        Experience Score
      </label>

      {/* Score display bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-[#F0F0F0] rounded-full h-2 overflow-hidden">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{
              width: `${displayScore ?? 0}%`,
              background: displayScore !== null
                ? displayScore >= 70 ? '#16a34a' : displayScore >= 40 ? '#d97706' : '#6b7280'
                : '#D5D5D5',
            }}
          />
        </div>
        <span className="text-xl font-bold text-[#000] w-12 text-right tabular-nums">
          {displayScore !== null ? displayScore : '—'}
        </span>
        <button
          type="button"
          onClick={() => { setOpen(true); setDone(false); setCurrentQ(0); setAnswers({}); }}
          className="px-3 py-1.5 text-xs font-medium border border-[#D5D5D5] bg-white hover:bg-[#F5F5F5] text-[#333] rounded transition-colors"
        >
          {displayScore !== null ? 'Re-take Quiz' : 'Take Quiz →'}
        </button>
      </div>
      <p className="text-[10px] text-[#888]">
        Computed from a short questionnaire. Used by the AI matching engine.
      </p>

      {/* ── Quiz modal ───────────────────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E5E5] rounded-lg shadow-2xl w-full max-w-lg">

            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-[#E5E5E5]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-semibold text-[#888] uppercase tracking-widest">EXPERIENCE ASSESSMENT</div>
                  <h3 className="text-sm font-semibold text-[#000] mt-0.5">Research Experience Quiz</h3>
                </div>
                <button onClick={() => setOpen(false)} className="text-[#888] hover:text-[#000] text-lg leading-none">×</button>
              </div>

              {/* Progress bar */}
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 bg-[#F0F0F0] rounded-full h-1.5">
                  <div
                    className="h-1.5 bg-[#000] rounded-full transition-all duration-300"
                    style={{ width: `${(answeredCount / QUESTIONS.length) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-[#888] tabular-nums">{answeredCount}/{QUESTIONS.length}</span>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
              {!done ? (
                <div className="space-y-4">
                  {/* Question */}
                  <div className="space-y-1">
                    <div className="text-[10px] text-[#888] font-semibold uppercase tracking-wider">
                      Question {currentQ + 1} of {QUESTIONS.length}
                    </div>
                    <p className="text-sm font-medium text-[#111]">{QUESTIONS[currentQ].text}</p>
                  </div>

                  {/* Options */}
                  <div className="space-y-2">
                    {QUESTIONS[currentQ].options.map(opt => {
                      const isSelected = answers[QUESTIONS[currentQ].id] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleAnswer(QUESTIONS[currentQ].id, opt.value)}
                          className={`w-full text-left px-4 py-2.5 rounded border text-xs transition-all ${
                            isSelected
                              ? 'border-[#000] bg-[#000] text-white font-semibold'
                              : 'border-[#E5E5E5] bg-white hover:border-[#999] hover:bg-[#FAFAFA] text-[#333]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Nav row */}
                  <div className="flex gap-2 pt-1">
                    {currentQ > 0 && (
                      <button
                        type="button"
                        onClick={() => setCurrentQ(c => c - 1)}
                        className="text-xs text-[#888] hover:text-[#000] underline"
                      >
                        ← Back
                      </button>
                    )}
                    {answeredCount > 0 && answeredCount === currentQ && (
                      <span className="text-xs text-[#BBB] ml-auto">Select an option to continue</span>
                    )}
                  </div>
                </div>
              ) : (
                /* Results screen */
                <div className="space-y-4 text-center">
                  <div>
                    <div className="text-4xl font-black text-[#000] tabular-nums">{computedScore}</div>
                    <div className="text-xs text-[#888] mt-1">out of 100</div>
                  </div>

                  {/* Score band label */}
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    computedScore >= 75 ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' :
                    computedScore >= 50 ? 'bg-blue-50 text-blue-700 border border-blue-300' :
                    computedScore >= 25 ? 'bg-amber-50 text-amber-700 border border-amber-300' :
                    'bg-gray-100 text-gray-600 border border-gray-300'
                  }`}>
                    {computedScore >= 75 ? '⭐ High Experience' :
                     computedScore >= 50 ? '✓ Moderate Experience' :
                     computedScore >= 25 ? '↗ Early Researcher' :
                     '○ Beginner'}
                  </div>

                  {/* Per-question breakdown */}
                  <div className="text-left space-y-1.5 pt-2">
                    {QUESTIONS.map(q => {
                      const ans = answers[q.id];
                      const contribution = ans !== undefined ? Math.round(ans * q.weight) : 0;
                      return (
                        <div key={q.id} className="flex items-center gap-2 text-[11px]">
                          <div className="flex-1 truncate text-[#555]">{q.text.split('?')[0]}</div>
                          <div className="w-20 bg-[#F0F0F0] rounded-full h-1.5 overflow-hidden shrink-0">
                            <div className="h-1.5 bg-[#000] rounded-full" style={{ width: `${ans ?? 0}%` }} />
                          </div>
                          <div className="w-6 text-right font-mono text-[#888] text-[10px]">{contribution}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="flex-1 px-4 py-2 border border-[#D5D5D5] text-xs text-[#555] rounded hover:bg-[#F5F5F5] transition-colors"
                    >
                      Retake
                    </button>
                    <button
                      type="button"
                      onClick={handleFinish}
                      className="flex-1 px-4 py-2 bg-[#000] text-white text-xs font-semibold rounded hover:bg-[#1A1A1A] transition-colors"
                    >
                      Use this score ({computedScore})
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Availability Questionnaire ───────────────────────────────────────────────

const AVAILABILITY_QUESTIONS: Question[] = [
  {
    id: 'a_hours',
    text: 'How many hours per week can you dedicate to a new research project?',
    weight: 0.35,
    options: [
      { label: '0–2 hrs / week (barely any time)', value: 5 },
      { label: '3–5 hrs / week (light involvement)', value: 30 },
      { label: '6–10 hrs / week (part-time contributor)', value: 55 },
      { label: '11–20 hrs / week (significant commitment)', value: 80 },
      { label: '20+ hrs / week (near full-time)', value: 100 },
    ],
  },
  {
    id: 'a_commitments',
    text: 'How many active projects or responsibilities do you currently have?',
    weight: 0.25,
    options: [
      { label: '5+ ongoing — heavily committed', value: 5 },
      { label: '3–4 active projects', value: 30 },
      { label: '2 projects in parallel', value: 55 },
      { label: '1 ongoing project', value: 75 },
      { label: 'None — fully free', value: 100 },
    ],
  },
  {
    id: 'a_duration',
    text: 'For how long can you commit to this project?',
    weight: 0.20,
    options: [
      { label: 'Less than 1 month', value: 10 },
      { label: '1–3 months', value: 40 },
      { label: '3–6 months', value: 65 },
      { label: '6–12 months', value: 85 },
      { label: 'More than 1 year / open-ended', value: 100 },
    ],
  },
  {
    id: 'a_response',
    text: 'How quickly can you typically respond to project messages or review requests?',
    weight: 0.10,
    options: [
      { label: 'Takes more than a week', value: 10 },
      { label: 'Within 3–5 business days', value: 40 },
      { label: 'Within 1–2 business days', value: 70 },
      { label: 'Same day or within 24 hours', value: 100 },
    ],
  },
  {
    id: 'a_overlap',
    text: 'Would this project overlap with other academic or professional deadlines?',
    weight: 0.10,
    options: [
      { label: 'Yes — major conflict (exams, job deadlines, etc.)', value: 10 },
      { label: 'Partial overlap but manageable', value: 50 },
      { label: 'Minor overlap only', value: 75 },
      { label: 'No conflicts at all', value: 100 },
    ],
  },
];

function computeAvailabilityScore(answers: Record<string, number>): number {
  let total = 0;
  for (const q of AVAILABILITY_QUESTIONS) {
    const val = answers[q.id];
    if (val !== undefined) total += val * q.weight;
  }
  return Math.round(total);
}

interface AvailabilityQuestionnaireProps {
  initialScore: string;
  onScoreChange: (score: string) => void;
}

const AvailabilityQuestionnaire: React.FC<AvailabilityQuestionnaireProps> = ({ initialScore, onScoreChange }) => {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [done, setDone] = useState(false);

  const answeredCount = Object.keys(answers).length;
  const computedScore = computeAvailabilityScore(answers);

  const handleAnswer = (questionId: string, value: number) => {
    const updated = { ...answers, [questionId]: value };
    setAnswers(updated);
    if (currentQ < AVAILABILITY_QUESTIONS.length - 1) {
      setTimeout(() => setCurrentQ(c => c + 1), 280);
    } else {
      setDone(true);
      onScoreChange(String(computeAvailabilityScore(updated)));
    }
  };

  const handleFinish = () => { onScoreChange(String(computedScore)); setOpen(false); };
  const handleReset = () => { setAnswers({}); setCurrentQ(0); setDone(false); };

  const displayScore = initialScore ? parseFloat(initialScore) : null;

  const bandLabel = (s: number) =>
    s >= 75 ? 'High Availability' :
    s >= 50 ? 'Moderate Availability' :
    s >= 25 ? 'Limited Availability' :
    'Low Availability';

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-[#444] uppercase tracking-wider block">
        Availability Score
      </label>

      <div className="flex items-center gap-3">
        <div className="flex-1 bg-[#F0F0F0] rounded-full h-2 overflow-hidden">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{
              width: `${displayScore ?? 0}%`,
              background: displayScore !== null
                ? displayScore >= 70 ? '#2563eb' : displayScore >= 40 ? '#d97706' : '#6b7280'
                : '#D5D5D5',
            }}
          />
        </div>
        <span className="text-xl font-bold text-[#000] w-12 text-right tabular-nums">
          {displayScore !== null ? displayScore : '—'}
        </span>
        <button
          type="button"
          onClick={() => { setOpen(true); setDone(false); setCurrentQ(0); setAnswers({}); }}
          className="px-3 py-1.5 text-xs font-medium border border-[#D5D5D5] bg-white hover:bg-[#F5F5F5] text-[#333] rounded transition-colors"
        >
          {displayScore !== null ? 'Re-take Quiz' : 'Take Quiz →'}
        </button>
      </div>
      <p className="text-[10px] text-[#888]">Computed from a short questionnaire. Reflects your real-time commitment capacity.</p>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E5E5] rounded-lg shadow-2xl w-full max-w-lg">
            <div className="px-6 pt-5 pb-4 border-b border-[#E5E5E5]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-semibold text-[#888] uppercase tracking-widest">AVAILABILITY ASSESSMENT</div>
                  <h3 className="text-sm font-semibold text-[#000] mt-0.5">Availability Quiz</h3>
                </div>
                <button onClick={() => setOpen(false)} className="text-[#888] hover:text-[#000] text-lg leading-none">×</button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 bg-[#F0F0F0] rounded-full h-1.5">
                  <div
                    className="h-1.5 bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${(answeredCount / AVAILABILITY_QUESTIONS.length) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-[#888] tabular-nums">{answeredCount}/{AVAILABILITY_QUESTIONS.length}</span>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              {!done ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="text-[10px] text-[#888] font-semibold uppercase tracking-wider">
                      Question {currentQ + 1} of {AVAILABILITY_QUESTIONS.length}
                    </div>
                    <p className="text-sm font-medium text-[#111]">{AVAILABILITY_QUESTIONS[currentQ].text}</p>
                  </div>
                  <div className="space-y-2">
                    {AVAILABILITY_QUESTIONS[currentQ].options.map(opt => {
                      const isSelected = answers[AVAILABILITY_QUESTIONS[currentQ].id] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleAnswer(AVAILABILITY_QUESTIONS[currentQ].id, opt.value)}
                          className={`w-full text-left px-4 py-2.5 rounded border text-xs transition-all ${
                            isSelected
                              ? 'border-blue-600 bg-blue-600 text-white font-semibold'
                              : 'border-[#E5E5E5] bg-white hover:border-blue-300 hover:bg-blue-50 text-[#333]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  {currentQ > 0 && (
                    <button type="button" onClick={() => setCurrentQ(c => c - 1)} className="text-xs text-[#888] hover:text-[#000] underline">
                      ← Back
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4 text-center">
                  <div>
                    <div className="text-4xl font-black text-[#000] tabular-nums">{computedScore}</div>
                    <div className="text-xs text-[#888] mt-1">out of 100</div>
                  </div>
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    computedScore >= 75 ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' :
                    computedScore >= 50 ? 'bg-blue-50 text-blue-700 border border-blue-300' :
                    computedScore >= 25 ? 'bg-amber-50 text-amber-700 border border-amber-300' :
                    'bg-red-50 text-red-700 border border-red-300'
                  }`}>
                    {bandLabel(computedScore)}
                  </div>
                  <div className="text-left space-y-1.5 pt-2">
                    {AVAILABILITY_QUESTIONS.map(q => {
                      const ans = answers[q.id];
                      const contribution = ans !== undefined ? Math.round(ans * q.weight) : 0;
                      return (
                        <div key={q.id} className="flex items-center gap-2 text-[11px]">
                          <div className="flex-1 truncate text-[#555]">{q.text.split('?')[0]}</div>
                          <div className="w-20 bg-[#F0F0F0] rounded-full h-1.5 overflow-hidden shrink-0">
                            <div className="h-1.5 bg-blue-600 rounded-full" style={{ width: `${ans ?? 0}%` }} />
                          </div>
                          <div className="w-6 text-right font-mono text-[#888] text-[10px]">{contribution}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={handleReset} className="flex-1 px-4 py-2 border border-[#D5D5D5] text-xs text-[#555] rounded hover:bg-[#F5F5F5] transition-colors">
                      Retake
                    </button>
                    <button type="button" onClick={handleFinish} className="flex-1 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors">
                      Use this score ({computedScore})
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    full_name: '',
    institution: '',
  });

  const [candidateForm, setCandidateForm] = useState<CandidateFormState>({
    skills: '',
    experience_score: '',
    availability_score: '',
    research_interest: '',
    verification_level: 'UNVERIFIED',
  });

  const [skillInput, setSkillInput] = useState('');
  const [skillList, setSkillList] = useState<string[]>([]);

  const [profileStatus, setProfileStatus] = useState<SaveStatus>('idle');
  const [candidateStatus, setCandidateStatus] = useState<SaveStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [expertBadge, setExpertBadge] = useState<ExpertBadge | null>(null);

  // ── Load data ──────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    const profile = await authService.getCurrentProfile();
    if (!profile) { setLoading(false); return; }
    setUser(profile);
    setProfileForm({ full_name: profile.full_name, institution: profile.institution || '' });

    // Load expert badge
    if (profile.role === 'EXPERT' || profile.role === 'STUDENT') {
      const badge = await expertVerificationService.getBadge(profile.id);
      setExpertBadge(badge);
    }

    if (isSupabaseConfigured && (profile.role === 'STUDENT' || profile.role === 'EXPERT')) {
      try {
        const { data } = await supabase
          .from('candidate_profiles')
          .select('*')
          .eq('user_id', profile.id)
          .maybeSingle();

        if (data) {
          const cp = data as CandidateProfile;
          setCandidateProfile(cp);
          setSkillList(cp.skills || []);
          setCandidateForm({
            skills: (cp.skills || []).join(', '),
            experience_score: String(cp.experience_score ?? ''),
            availability_score: String(cp.availability_score ?? ''),
            research_interest: cp.research_interest || '',
            verification_level: cp.verification_level || 'UNVERIFIED',
          });
        }
      } catch (_) {}
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Skill tag helpers ──────────────────────────────────────────────────────

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skillList.includes(trimmed)) {
      setSkillList(prev => [...prev, trimmed]);
    }
    setSkillInput('');
  };

  const removeSkill = (skill: string) => {
    setSkillList(prev => prev.filter(s => s !== skill));
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill();
    }
  };

  // ── Save public profile ────────────────────────────────────────────────────

  const saveProfile = async () => {
    if (!user || !isSupabaseConfigured) return;
    setProfileStatus('saving');
    setErrorMsg('');
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: profileForm.full_name.trim(),
          institution: profileForm.institution.trim(),
        })
        .eq('id', user.id);

      if (error) throw new Error(error.message);
      setProfileStatus('saved');
      setTimeout(() => setProfileStatus('idle'), 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save profile');
      setProfileStatus('error');
    }
  };

  // ── Save candidate credentials ─────────────────────────────────────────────

  const saveCredentials = async () => {
    if (!user || !isSupabaseConfigured) return;
    setCandidateStatus('saving');
    setErrorMsg('');

    const expScore = parseFloat(candidateForm.experience_score);
    const availScore = parseFloat(candidateForm.availability_score);

    if (isNaN(expScore) || expScore < 0 || expScore > 100) {
      setErrorMsg('Experience score must be a number between 0 and 100.');
      setCandidateStatus('error');
      return;
    }
    if (isNaN(availScore) || availScore < 0 || availScore > 100) {
      setErrorMsg('Availability score must be a number between 0 and 100.');
      setCandidateStatus('error');
      return;
    }

    const payload = {
      user_id: user.id,
      skills: skillList,
      experience_score: expScore,
      availability_score: availScore,
      research_interest: candidateForm.research_interest.trim(),
      verification_level: candidateProfile?.verification_level || 'UNVERIFIED', // not editable by self
    };

    try {
      if (candidateProfile) {
        const { error } = await supabase
          .from('candidate_profiles')
          .update(payload)
          .eq('user_id', user.id);
        if (error) throw new Error(error.message);
      } else {
        const { data, error } = await supabase
          .from('candidate_profiles')
          .insert({ ...payload, id: `cp-${user.id}` })
          .select()
          .single();
        if (error) throw new Error(error.message);
        if (data) setCandidateProfile(data as CandidateProfile);
      }
      setCandidateStatus('saved');
      setTimeout(() => setCandidateStatus('idle'), 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save credentials');
      setCandidateStatus('error');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="text-sm text-[#888888] py-8 text-center tracking-wide">
        LOADING PROFILE…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-sm text-[#888888] py-8 text-center">
        Could not load profile.
      </div>
    );
  }

  const canEditCredentials = user.role === 'STUDENT' || user.role === 'EXPERT';
  const statusLabel = (s: SaveStatus) =>
    s === 'saving' ? 'Saving…' : s === 'saved' ? 'Saved ✓' : s === 'error' ? 'Error' : 'Save Changes';

  const btnClass = (s: SaveStatus) =>
    `px-4 py-2 text-xs font-medium rounded transition-colors ${
      s === 'saving'
        ? 'bg-[#666] text-white cursor-not-allowed'
        : s === 'saved'
        ? 'bg-green-700 text-white'
        : s === 'error'
        ? 'bg-red-600 text-white'
        : 'bg-[#000000] hover:bg-[#1A1A1A] text-[#FFFFFF]'
    }`;

  return (
    <div className="space-y-12 max-w-2xl">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="border-b border-[#E5E5E5] pb-8">
        <div className="text-xs font-semibold text-[#888888] uppercase tracking-widest">SETTINGS · PROFILE</div>
        <h1 className="text-3xl font-medium text-[#000000] tracking-tight mt-1">{user.full_name}</h1>
        <p className="text-sm text-[#666666] mt-1">
          {user.role} · {user.email}
          {candidateProfile && (
            <span className="ml-2 px-1.5 py-0.5 text-[10px] font-semibold border border-[#888] text-[#555] rounded uppercase">
              {candidateProfile.verification_level}
            </span>
          )}
        </p>
      </div>

      {/* Expert Badge */}
      {expertBadge && <ExpertBadgeCard badge={expertBadge} />}

      {/* Expert Apply CTA — if no badge yet */}
      {!expertBadge && (user.role === 'STUDENT' || user.role === 'EXPERT') && (
        <div className="flex items-center justify-between p-3 border border-purple-200 bg-purple-50 rounded">
          <div>
            <div className="text-xs font-semibold text-purple-800">Apply for Expert Verification</div>
            <div className="text-[10px] text-purple-600 mt-0.5">Submit credentials for admin review and earn a verified expert badge.</div>
          </div>
          <NavLink
            to="/expert-apply"
            className="px-3 py-1.5 bg-purple-700 text-white text-xs font-semibold rounded hover:bg-purple-800 transition-colors shrink-0"
          >
            Apply →
          </NavLink>
        </div>
      )}

      {/* Error banner */}
      {errorMsg && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
          {errorMsg}
        </div>
      )}

      {/* ── Section 1: Public Identity ──────────────────────────────────────── */}
      <Section
        title="Public Identity"
        subtitle="Visible to project sponsors and expert advisors."
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#444] uppercase tracking-wider block">
              Full Name
            </label>
            <input
              type="text"
              value={profileForm.full_name}
              onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))}
              className="w-full border border-[#D5D5D5] bg-white px-3 py-2 text-sm text-[#000] focus:outline-none focus:border-[#000] rounded-sm transition-colors"
              placeholder="Your full name"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#444] uppercase tracking-wider block">
              Institution / Affiliation
            </label>
            <input
              type="text"
              value={profileForm.institution}
              onChange={e => setProfileForm(f => ({ ...f, institution: e.target.value }))}
              className="w-full border border-[#D5D5D5] bg-white px-3 py-2 text-sm text-[#000] focus:outline-none focus:border-[#000] rounded-sm transition-colors"
              placeholder="e.g. IIT Bombay, NIT Trichy, AIIMS Delhi"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#444] uppercase tracking-wider block">
              Email
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full border border-[#E5E5E5] bg-[#F5F5F5] px-3 py-2 text-sm text-[#888] rounded-sm cursor-not-allowed"
            />
            <p className="text-[10px] text-[#888888]">Email is managed by your authentication provider.</p>
          </div>

          <div>
            <button
              type="button"
              onClick={saveProfile}
              disabled={profileStatus === 'saving'}
              className={btnClass(profileStatus)}
            >
              {statusLabel(profileStatus)}
            </button>
          </div>
        </div>
      </Section>

      {/* ── Section 2: Candidate Credentials (STUDENT / EXPERT only) ─────────── */}
      {canEditCredentials && (
        <Section
          title="Research Credentials"
          subtitle="Used for project matching, reward allocation, and verifiable credential issuance."
        >
          <div className="space-y-5">

            {/* Skills */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#444] uppercase tracking-wider block">
                Skills & Technologies
              </label>
              <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 border border-[#D5D5D5] bg-white rounded-sm">
                {skillList.map(skill => (
                  <SkillTag key={skill} label={skill} onRemove={() => removeSkill(skill)} />
                ))}
                <input
                  type="text"
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={handleSkillKeyDown}
                  onBlur={addSkill}
                  placeholder={skillList.length === 0 ? 'Type skill and press Enter…' : 'Add more…'}
                  className="flex-1 min-w-[140px] text-xs text-[#000] bg-transparent outline-none px-1"
                />
              </div>
              <p className="text-[10px] text-[#888]">Press Enter or comma to add each skill.</p>
            </div>

            {/* Research Interest */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#444] uppercase tracking-wider block">
                Research Interest Statement
              </label>
              <textarea
                value={candidateForm.research_interest}
                onChange={e => setCandidateForm(f => ({ ...f, research_interest: e.target.value }))}
                rows={3}
                className="w-full border border-[#D5D5D5] bg-white px-3 py-2 text-sm text-[#000] focus:outline-none focus:border-[#000] rounded-sm resize-none transition-colors"
                placeholder="e.g. Edge AI for medical imaging, NLP for legal document analysis…"
              />
              <p className="text-[10px] text-[#888]">Used by the AI matching engine to rank your fit against project requirements.</p>
            </div>

            {/* Scores */}
            <div className="grid grid-cols-1 gap-6">
              {/* Experience Score — Questionnaire */}
              <ExperienceQuestionnaire
                initialScore={candidateForm.experience_score}
                onScoreChange={score => setCandidateForm(f => ({ ...f, experience_score: score }))}
              />

              {/* Availability Score — Questionnaire */}
              <AvailabilityQuestionnaire
                initialScore={candidateForm.availability_score}
                onScoreChange={score => setCandidateForm(f => ({ ...f, availability_score: score }))}
              />
            </div>

            {/* Verification level — read only, set by admin */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#444] uppercase tracking-wider block">
                Verification Level
              </label>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 border text-xs font-semibold rounded-sm font-mono uppercase ${
                  !candidateProfile || candidateProfile.verification_level === 'UNVERIFIED'
                    ? 'bg-gray-100 text-gray-600 border-gray-300'
                    : candidateProfile.verification_level === 'VERIFIED'
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                }`}>
                  {candidateProfile?.verification_level || 'UNVERIFIED'}
                </span>
              </div>
              <div className="bg-[#F9F9F9] border border-[#E5E5E5] rounded p-3 space-y-2 text-[11px] text-[#555]">
                <div className="font-semibold text-[#333] text-xs">Verification Levels</div>
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2">
                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 border border-gray-300 rounded text-[9px] font-semibold shrink-0 mt-0.5">UNVERIFIED</span>
                    <span>Default status. Profile is complete but identity has not been reviewed by the platform.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-300 rounded text-[9px] font-semibold shrink-0 mt-0.5">VERIFIED</span>
                    <span>Identity and institution confirmed by a platform admin. Boosts your visibility in project matching.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded text-[9px] font-semibold shrink-0 mt-0.5">EXPERT_VERIFIED</span>
                    <span>Domain expertise confirmed (publications, credentials reviewed). Highest trust level; preferred by sponsors.</span>
                  </div>
                </div>
                <div className="border-t border-[#E5E5E5] pt-2 text-[#888]">
                  Verification is granted by platform administrators from the Admin panel.
                  Ensure your <strong className="text-[#555]">institution</strong>, <strong className="text-[#555]">skills</strong>, and <strong className="text-[#555]">research interest</strong> are fully filled in to be eligible.
                </div>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={saveCredentials}
                disabled={candidateStatus === 'saving'}
                className={btnClass(candidateStatus)}
              >
                {statusLabel(candidateStatus)}
              </button>
            </div>
          </div>
        </Section>
      )}

      {/* ── Section 3: Role Info ─────────────────────────────────────────────── */}
      <Section title="Platform Role" subtitle="Assigned at registration. Contact admin to change.">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 bg-[#000] text-[#FFF] text-xs font-semibold uppercase tracking-widest rounded-sm">
            {user.role}
          </span>
          <span className="text-xs text-[#666]">
            {user.role === 'STUDENT' && 'Can join projects, submit deliverables, earn rewards & credentials.'}
            {user.role === 'EXPERT' && 'Reviews deliverables, advises on novelty & integrity, earns advisory share.'}
            {user.role === 'SPONSOR' && 'Creates and funds research projects, manages charters and escrow.'}
            {user.role === 'ADMIN' && 'Full platform governance, ledger verification, and integrity oversight.'}
          </span>
        </div>
      </Section>

    </div>
  );
};

export default ProfilePage;
