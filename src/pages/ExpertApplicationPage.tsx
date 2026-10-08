import React, { useState, useCallback, useEffect } from 'react';
import { UserProfile } from '../types';
import { EvidenceCategory, ExpertApplication, ScoringBreakdown } from '../types/expertVerification';
import { authService } from '../services/authService';
import { expertVerificationService, computePreliminaryScore } from '../services/expertVerificationService';
import { ExpertBadgeCard } from '../components/ExpertBadge';

// ─── Constants ────────────────────────────────────────────────────────────────

const QUALIFICATIONS = [
  'High School / 12th',
  "Bachelor's Degree (B.E / B.Tech / B.Sc)",
  "Master's Degree (M.Tech / M.Sc / MBA)",
  'PhD / Doctoral Candidate',
  'Post-Doctoral Researcher',
  'Professor / Associate Professor',
];

const DOMAINS = [
  'Artificial Intelligence / Machine Learning',
  'Biomedical Engineering',
  'Computer Vision',
  'Cybersecurity',
  'Data Science',
  'Drug Discovery',
  'Environmental Science',
  'Finance / FinTech',
  'Genomics / Bioinformatics',
  'Healthcare / Medical Technology',
  'Materials Science',
  'Natural Language Processing',
  'Physics / Quantum Computing',
  'Robotics / Automation',
  'Software Engineering',
  'Other',
];

const EVIDENCE_CATEGORIES: { value: EvidenceCategory; label: string; hint: string }[] = [
  { value: 'PHD_CERTIFICATE', label: 'PhD / Degree Certificate', hint: 'PDF, scan of degree' },
  { value: 'PUBLICATION_LIST', label: 'Publications List', hint: 'PDF or DOCX with DOIs' },
  { value: 'PATENT_DOCUMENT', label: 'Patent Document', hint: 'Granted patent certificate' },
  { value: 'INSTITUTIONAL_ID', label: 'Institutional ID / Letter', hint: 'Current employment/affiliation proof' },
  { value: 'EMPLOYMENT_PROOF', label: 'Employment Proof', hint: 'Appointment letter, payslip header' },
  { value: 'GOVERNMENT_EMPANELMENT', label: 'Government Empanelment Certificate', hint: 'Official government document' },
  { value: 'PROFESSIONAL_REFERENCE', label: 'Professional Reference Letter', hint: 'Signed letter from referee' },
  { value: 'EXPERIENCE_LETTER', label: 'Experience / Relieving Letter', hint: 'From previous employer' },
  { value: 'OTHER', label: 'Other Supporting Document', hint: 'Any other relevant document' },
];

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/png',
  'image/jpeg',
];
const MAX_FILE_MB = 10;

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  full_name: string;
  current_role_title: string;
  institution: string;
  primary_domain: string;
  secondary_domains: string[];
  years_of_experience: string;
  highest_qualification: string;
  publication_count: string;
  patent_count: string;
  government_empanelled: boolean;
  reference_contacts: string;
  expertise_statement: string;
}

interface PendingFile {
  file: File;
  category: EvidenceCategory;
  id: string;
}

type Step = 'form' | 'evidence' | 'review' | 'submitted';

// ─── Score Bar ────────────────────────────────────────────────────────────────

const ScoreBar: React.FC<{ score: ScoringBreakdown }> = ({ score }) => {
  const color =
    score.total >= 85 ? '#7c3aed' :
    score.total >= 70 ? '#2563eb' :
    score.total >= 55 ? '#059669' : '#6b7280';

  return (
    <div className="space-y-3 p-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-[#333] uppercase tracking-wider">Preliminary Score</div>
          <div className="text-[10px] text-[#888] mt-0.5">{score.tier_label}</div>
        </div>
        <div className="text-3xl font-black tabular-nums" style={{ color }}>{score.total}</div>
      </div>
      <div className="bg-[#E5E5E5] rounded-full h-2 overflow-hidden">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${score.total}%`, background: color }}
        />
      </div>
      <div className="grid grid-cols-2 gap-1.5 text-[10px] text-[#555]">
        {[
          ['Govt. Empanelment', score.government_empanelment, 30],
          ['PhD Qualification', score.phd_qualification, 25],
          ['10+ Years Exp.', score.years_experience, 20],
          ['5+ Publications', score.publications, 15],
          ['Patents', score.patents, 10],
          ['Institutional Affil.', score.institutional_affiliation, 10],
          ['References (2+)', score.references, 10],
        ].map(([label, got, max]) => (
          <div key={String(label)} className="flex items-center gap-1.5">
            <span className={got ? 'text-emerald-600' : 'text-[#BBB]'}>{got ? '✓' : '○'}</span>
            <span className="flex-1 truncate">{label}</span>
            <span className="font-mono text-[9px]">{got}/{max}</span>
          </div>
        ))}
      </div>
      <div className="text-[9px] text-[#999] border-t border-[#E5E5E5] pt-2">
        This score is a preliminary recommendation only. Final verification requires admin and committee review.
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const ExpertApplicationPage: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [existingApp, setExistingApp] = useState<ExpertApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('form');
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [currentAppId, setCurrentAppId] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    full_name: '',
    current_role_title: '',
    institution: '',
    primary_domain: '',
    secondary_domains: [],
    years_of_experience: '',
    highest_qualification: '',
    publication_count: '0',
    patent_count: '0',
    government_empanelled: false,
    reference_contacts: '',
    expertise_statement: '',
  });

  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadResults, setUploadResults] = useState<{ filename: string; ok: boolean; msg: string }[]>([]);
  const [liveScore, setLiveScore] = useState<ScoringBreakdown | null>(null);

  // Load user + check existing application
  const loadData = useCallback(async () => {
    setLoading(true);
    const profile = await authService.getCurrentProfile();
    setUser(profile);
    if (profile) {
      const app = await expertVerificationService.getMyApplication(profile.id);
      setExistingApp(app);
      if (app) {
        setCurrentAppId(app.id);
        if (app.status === 'APPROVED' || app.status === 'PENDING_REVIEW') {
          setStep('submitted');
        }
        // Pre-fill form from existing application
        setForm({
          full_name: app.full_name || profile.full_name || '',
          current_role_title: app.current_role_title || '',
          institution: app.institution || '',
          primary_domain: app.primary_domain || '',
          secondary_domains: app.secondary_domains || [],
          years_of_experience: String(app.years_of_experience || 0),
          highest_qualification: app.highest_qualification || '',
          publication_count: String(app.publication_count || 0),
          patent_count: String(app.patent_count || 0),
          government_empanelled: app.government_empanelled || false,
          reference_contacts: app.reference_contacts || '',
          expertise_statement: app.expertise_statement || '',
        });
      } else {
        setForm(f => ({ ...f, full_name: profile.full_name || '', institution: profile.institution || '' }));
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Compute live score on form changes
  useEffect(() => {
    if (!form.primary_domain) return;
    const score = computePreliminaryScore({
      government_empanelled: form.government_empanelled,
      highest_qualification: form.highest_qualification,
      years_of_experience: parseInt(form.years_of_experience) || 0,
      publication_count: parseInt(form.publication_count) || 0,
      patent_count: parseInt(form.patent_count) || 0,
      institution: form.institution,
      reference_contacts: form.reference_contacts,
    });
    setLiveScore(score);
  }, [form]);

  const setField = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm(f => ({ ...f, [key]: val }));

  const toggleDomain = (d: string) =>
    setForm(f => ({
      ...f,
      secondary_domains: f.secondary_domains.includes(d)
        ? f.secondary_domains.filter(x => x !== d)
        : [...f.secondary_domains, d],
    }));

  // ── Step 1: Submit Application ─────────────────────────────────────────────

  const handleSubmitApplication = async () => {
    if (!user) return;
    if (!form.full_name || !form.current_role_title || !form.institution || !form.primary_domain || !form.highest_qualification || !form.expertise_statement) {
      setStatusMsg({ text: 'Please fill in all required fields.', ok: false });
      return;
    }
    setSaving(true);
    setStatusMsg(null);
    const result = await expertVerificationService.submitApplication({
      userId: user.id,
      ...form,
      years_of_experience: parseInt(form.years_of_experience) || 0,
      publication_count: parseInt(form.publication_count) || 0,
      patent_count: parseInt(form.patent_count) || 0,
    });
    if (result.success && result.applicationId) {
      setCurrentAppId(result.applicationId);
      setStep('evidence');
      setStatusMsg({ text: 'Application submitted! Now upload your evidence documents.', ok: true });
    } else {
      setStatusMsg({ text: result.message, ok: false });
    }
    setSaving(false);
  };

  // ── Step 2: Upload Evidence ────────────────────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter(f => {
      if (!ACCEPTED_TYPES.includes(f.type)) { alert(`${f.name}: unsupported type. Use PDF, DOCX, TXT, PNG, or JPG.`); return false; }
      if (f.size > MAX_FILE_MB * 1024 * 1024) { alert(`${f.name}: exceeds ${MAX_FILE_MB}MB limit.`); return false; }
      return true;
    });
    setPendingFiles(prev => [
      ...prev,
      ...valid.map(f => ({ file: f, category: 'OTHER' as EvidenceCategory, id: `pf-${Date.now()}-${Math.random()}` })),
    ]);
    e.target.value = '';
  };

  const handleUploadAll = async () => {
    if (!user || !currentAppId || pendingFiles.length === 0) return;
    setUploadingFiles(true);
    const results: { filename: string; ok: boolean; msg: string }[] = [];
    for (const pf of pendingFiles) {
      const r = await expertVerificationService.uploadEvidence({
        applicationId: currentAppId,
        uploaderId: user.id,
        file: pf.file,
        category: pf.category,
      });
      results.push({ filename: pf.file.name, ok: r.success, msg: r.message });
    }
    setUploadResults(results);
    const allOk = results.every(r => r.ok);
    if (allOk) { setPendingFiles([]); }
    setUploadingFiles(false);
    setStatusMsg({ text: allOk ? 'All evidence uploaded successfully!' : 'Some uploads failed. See details below.', ok: allOk });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return <div className="text-sm text-[#888] py-10 text-center">Loading…</div>;

  if (!user) return <div className="text-sm text-[#888] py-10 text-center">Could not load profile.</div>;

  const inputCls = 'w-full border border-[#D5D5D5] bg-white px-3 py-2 text-sm text-[#000] focus:outline-none focus:border-[#000] rounded-sm transition-colors';
  const labelCls = 'text-xs font-medium text-[#444] uppercase tracking-wider block mb-1';
  const requiredMark = <span className="text-red-500 ml-0.5">*</span>;

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="pb-6 border-b border-[#E5E5E5]">
        <div className="text-[10px] font-semibold text-[#888] uppercase tracking-widest mb-1">EXPERT VERIFICATION</div>
        <h1 className="text-2xl font-medium text-[#000]">Apply for Expert Verification</h1>
        <p className="text-sm text-[#666] mt-1">
          Submit your credentials for review. A platform admin and review committee will evaluate your application.
          No AI or automated decision is used — all approvals are made by humans.
        </p>
      </div>

      {/* Status banner */}
      {statusMsg && (
        <div className={`px-4 py-3 rounded border text-sm ${statusMsg.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {statusMsg.ok ? '✓ ' : '✗ '}{statusMsg.text}
        </div>
      )}

      {/* Existing badge */}
      {existingApp?.badge && <ExpertBadgeCard badge={existingApp.badge} />}

      {/* Interactive Step Navigation Bar */}
      <div className="flex items-center gap-0 border-b border-[#E5E5E5] bg-white rounded-t">
        {(['form', 'evidence', 'review', 'submitted'] as Step[]).map((s, i) => {
          const labels = ['1. Application', '2. Evidence', '3. Review', '4. Submitted'];
          const isActive = step === s;
          const isPast = (['form', 'evidence', 'review', 'submitted'] as Step[]).indexOf(step) > i;
          return (
            <React.Fragment key={s}>
              <button
                type="button"
                onClick={() => setStep(s)}
                className={`flex-1 py-3 px-2 text-center text-[11px] font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? 'border-[#000] text-[#000] bg-neutral-50'
                    : isPast
                    ? 'border-emerald-500 text-emerald-700 hover:bg-neutral-50'
                    : 'border-transparent text-[#777] hover:text-[#000] hover:bg-neutral-50'
                }`}
              >
                {labels[i]}
              </button>
              {i < 3 && <div className="w-px h-6 bg-[#E5E5E5]" />}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Step 1: Application Form ─────────────────────────────────────────── */}
      {step === 'form' && (
        <div className="space-y-6">
          {/* Personal Info */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[#000] uppercase tracking-wider border-b border-[#E5E5E5] pb-2">
              Personal &amp; Professional Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Full Name{requiredMark}</label>
                <input className={inputCls} value={form.full_name} onChange={e => setField('full_name', e.target.value)} placeholder="Dr. Arjun Mehta" />
              </div>
              <div>
                <label className={labelCls}>Current Role / Title{requiredMark}</label>
                <input className={inputCls} value={form.current_role_title} onChange={e => setField('current_role_title', e.target.value)} placeholder="Associate Professor / Senior Scientist" />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Institution / Company{requiredMark}</label>
                <input className={inputCls} value={form.institution} onChange={e => setField('institution', e.target.value)} placeholder="IIT Bombay / DRDO / Infosys Research" />
              </div>
            </div>
          </div>

          {/* Domains */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[#000] uppercase tracking-wider border-b border-[#E5E5E5] pb-2">
              Research Domain
            </h2>
            <div>
              <label className={labelCls}>Primary Domain{requiredMark}</label>
              <select className={inputCls} value={form.primary_domain} onChange={e => setField('primary_domain', e.target.value)}>
                <option value="">Select primary domain…</option>
                {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Secondary Domains <span className="text-[#888] font-normal normal-case">(select all that apply)</span></label>
              <div className="flex flex-wrap gap-2 mt-1">
                {DOMAINS.filter(d => d !== form.primary_domain).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDomain(d)}
                    className={`px-2.5 py-1 text-[11px] border rounded transition-colors cursor-pointer ${
                      form.secondary_domains.includes(d)
                        ? 'bg-[#000] text-white border-[#000]'
                        : 'bg-white text-[#555] border-[#D5D5D5] hover:border-[#999]'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Credentials */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[#000] uppercase tracking-wider border-b border-[#E5E5E5] pb-2">
              Credentials &amp; Experience
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Highest Qualification{requiredMark}</label>
                <select className={inputCls} value={form.highest_qualification} onChange={e => setField('highest_qualification', e.target.value)}>
                  <option value="">Select…</option>
                  {QUALIFICATIONS.map(q => <option key={q} value={q}>{q}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Years of Relevant Experience</label>
                <input className={inputCls} type="number" min="0" max="60" value={form.years_of_experience}
                  onChange={e => setField('years_of_experience', e.target.value)} placeholder="10" />
              </div>
              <div>
                <label className={labelCls}>Peer-Reviewed Publications</label>
                <input className={inputCls} type="number" min="0" value={form.publication_count}
                  onChange={e => setField('publication_count', e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className={labelCls}>Patents (Granted)</label>
                <input className={inputCls} type="number" min="0" value={form.patent_count}
                  onChange={e => setField('patent_count', e.target.value)} placeholder="0" />
              </div>
            </div>

            {/* Government Empanelment */}
            <div className="flex items-start gap-3 p-3 border border-[#D5D5D5] rounded bg-[#FAFAFA]">
              <input
                id="govt-emp"
                type="checkbox"
                checked={form.government_empanelled}
                onChange={e => setField('government_empanelled', e.target.checked)}
                className="mt-0.5 cursor-pointer"
              />
              <label htmlFor="govt-emp" className="cursor-pointer">
                <div className="text-sm font-medium text-[#000]">I hold a Government Empanelment Certificate</div>
                <div className="text-[10px] text-[#888] mt-0.5">
                  e.g. DST, DRDO, ISRO, MoE, ICMR or equivalent government expert registry. You must upload proof in Step 2.
                </div>
              </label>
            </div>

            {/* References */}
            <div>
              <label className={labelCls}>Professional References <span className="text-[#888] font-normal normal-case">(2+ recommended)</span></label>
              <textarea className={inputCls} rows={3}
                value={form.reference_contacts}
                onChange={e => setField('reference_contacts', e.target.value)}
                placeholder={`Prof. Ramesh Kumar, IISc Bangalore, ramesh@iisc.ac.in\nDr. Anita Nair, TIFR Mumbai, anita@tifr.res.in`}
              />
              <p className="text-[10px] text-[#888] mt-1">One per line. Include name, institution, and contact email.</p>
            </div>
          </div>

          {/* Expertise Statement */}
          <div>
            <label className={labelCls}>Expertise Statement{requiredMark}</label>
            <textarea className={inputCls} rows={5}
              value={form.expertise_statement}
              onChange={e => setField('expertise_statement', e.target.value)}
              placeholder="Describe your specific expertise, your notable contributions to the field, and why you are qualified to review or guide research in your primary domain. Be specific about methodologies, tools, and outcomes."
            />
            <p className="text-[10px] text-[#888] mt-1">Min. 200 characters. This will be reviewed by the admin committee.</p>
          </div>

          {/* Live score preview */}
          {liveScore && <ScoreBar score={liveScore} />}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep('evidence')}
              className="flex-1 px-6 py-3 bg-[#000] text-white text-sm font-semibold rounded hover:bg-[#1A1A1A] transition-colors cursor-pointer"
            >
              Proceed to Upload Evidence →
            </button>
            <button
              onClick={() => setStep('review')}
              className="px-6 py-3 border border-[#000] text-[#000] text-sm font-semibold rounded hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              Review Application Preview →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Evidence Upload ──────────────────────────────────────────── */}
      {step === 'evidence' && (
        <div className="space-y-6">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 space-y-1">
            <div className="font-semibold">📎 Upload Supporting Evidence Documents</div>
            <div>Accepted: PDF, DOCX, TXT, PNG, JPG · Max {MAX_FILE_MB}MB per file</div>
            <div>Documents are stored as submitted and will only be reviewed by admins — never made public.</div>
          </div>

          {/* Category guide */}
          <div className="grid grid-cols-1 gap-2 text-[11px]">
            {EVIDENCE_CATEGORIES.slice(0, 7).map(cat => (
              <div key={cat.value} className="flex items-center gap-2 text-[#555]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#999] shrink-0" />
                <span className="font-semibold text-[#333]">{cat.label}</span>
                <span className="text-[#888]">— {cat.hint}</span>
              </div>
            ))}
          </div>

          {/* Existing attached evidence */}
          {existingApp?.evidence && existingApp.evidence.length > 0 && (
            <div className="space-y-2 border-t border-[#E5E5E5] pt-4">
              <div className="text-xs font-semibold text-[#333] uppercase tracking-wider">Already Uploaded Evidence Documents</div>
              <div className="space-y-1.5">
                {existingApp.evidence.map((ev, idx) => (
                  <div key={ev.id || idx} className="flex items-center justify-between p-3 border border-[#E5E5E5] rounded bg-white text-xs">
                    <div className="flex items-center gap-2 font-medium text-[#111]">
                      <span>📄</span>
                      <span>{ev.filename || `Evidence_${idx + 1}`}</span>
                    </div>
                    <span className="text-[10px] text-[#666] font-mono uppercase bg-neutral-100 px-2 py-0.5 rounded">
                      {ev.category.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending files */}
          {pendingFiles.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#333] uppercase tracking-wider">New Files Selected to Upload</div>
              {pendingFiles.map(pf => (
                <div key={pf.id} className="flex items-center gap-3 p-3 border border-[#E5E5E5] rounded bg-[#FAFAFA]">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#000] truncate">{pf.file.name}</div>
                    <div className="text-[10px] text-[#888]">{(pf.file.size / 1024).toFixed(1)} KB</div>
                  </div>
                  <select
                    value={pf.category}
                    onChange={e => setPendingFiles(prev => prev.map(p => p.id === pf.id ? { ...p, category: e.target.value as EvidenceCategory } : p))}
                    className="text-xs border border-[#D5D5D5] rounded px-2 py-1 bg-white text-[#333] focus:outline-none"
                  >
                    {EVIDENCE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <button onClick={() => setPendingFiles(prev => prev.filter(p => p.id !== pf.id))}
                    className="text-[#888] hover:text-red-600 text-lg leading-none cursor-pointer">×</button>
                </div>
              ))}
            </div>
          )}

          {/* Upload results */}
          {uploadResults.length > 0 && (
            <div className="space-y-1">
              {uploadResults.map((r, i) => (
                <div key={i} className={`text-xs px-3 py-1.5 rounded border ${r.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  {r.ok ? '✓' : '✗'} {r.filename} — {r.msg}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <label className="flex-1 cursor-pointer">
              <input type="file" multiple accept=".pdf,.docx,.txt,.png,.jpg,.jpeg" onChange={handleFileSelect} className="hidden" />
              <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-[#D5D5D5] hover:border-[#999] rounded text-sm text-[#555] transition-colors">
                <span>📂</span> Select Files
              </div>
            </label>

            <button
              onClick={handleUploadAll}
              disabled={uploadingFiles || pendingFiles.length === 0}
              className="px-6 py-3 bg-[#000] text-white text-sm font-semibold rounded hover:bg-[#1A1A1A] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {uploadingFiles ? 'Uploading…' : `Upload ${pendingFiles.length} File${pendingFiles.length !== 1 ? 's' : ''}`}
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep('form')} className="px-4 py-2 text-xs text-[#555] border border-[#D5D5D5] rounded hover:bg-[#F5F5F5] transition-colors cursor-pointer">
              ← Back to Application
            </button>
            <button onClick={() => setStep('review')} className="flex-1 px-6 py-3 bg-[#000] text-white text-sm font-semibold rounded hover:bg-[#1A1A1A] transition-colors cursor-pointer">
              Proceed to Review Application →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Application Review ───────────────────────────────────────── */}
      {step === 'review' && (
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800 flex justify-between items-center">
            <div>
              <div className="font-semibold text-sm">📋 Application Review Preview</div>
              <div>Inspect your credentials, domain details, and score breakdown before final submission.</div>
            </div>
            <button onClick={() => setStep('form')} className="px-3 py-1 bg-blue-700 text-white text-xs rounded hover:bg-blue-800 transition-colors cursor-pointer">
              Edit Form
            </button>
          </div>

          <div className="border border-[#E5E5E5] rounded-lg bg-white p-6 space-y-6">
            {/* Candidate Header Summary */}
            <div className="flex justify-between items-start border-b border-[#E5E5E5] pb-4">
              <div>
                <h2 className="text-xl font-bold text-[#000]">{form.full_name || 'Applicant Name'}</h2>
                <div className="text-xs text-[#666] mt-0.5">{form.current_role_title} · {form.institution}</div>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-neutral-100 border border-neutral-300 text-xs font-semibold uppercase text-neutral-800 rounded">
                  {form.highest_qualification || 'Qualification'}
                </span>
              </div>
            </div>

            {/* Domains & Experience */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-[#FAFAFA] border border-[#E5E5E5] rounded">
                <div className="font-semibold text-[#888] uppercase tracking-wider mb-1">Primary Domain</div>
                <div className="font-bold text-[#000]">{form.primary_domain || 'Not specified'}</div>
                {form.secondary_domains.length > 0 && (
                  <div className="mt-2 text-[11px] text-[#555]">
                    <span className="font-medium">Secondary:</span> {form.secondary_domains.join(', ')}
                  </div>
                )}
              </div>

              <div className="p-3 bg-[#FAFAFA] border border-[#E5E5E5] rounded">
                <div className="font-semibold text-[#888] uppercase tracking-wider mb-1">Track Record</div>
                <div className="space-y-1 text-[#333]">
                  <div>Experience: <strong>{form.years_of_experience || 0} years</strong></div>
                  <div>Publications: <strong>{form.publication_count || 0}</strong> | Patents: <strong>{form.patent_count || 0}</strong></div>
                  <div>Govt. Empanelled: <strong>{form.government_empanelled ? 'Yes ✓' : 'No'}</strong></div>
                </div>
              </div>
            </div>

            {/* Expertise Statement */}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-[#888] uppercase tracking-wider">Expertise Statement</div>
              <div className="p-3 bg-[#FAFAFA] border border-[#E5E5E5] rounded text-xs text-[#222] whitespace-pre-line leading-relaxed">
                {form.expertise_statement || 'No expertise statement provided yet.'}
              </div>
            </div>

            {/* References */}
            {form.reference_contacts && (
              <div className="space-y-1">
                <div className="text-xs font-semibold text-[#888] uppercase tracking-wider">Professional References</div>
                <div className="p-3 bg-[#FAFAFA] border border-[#E5E5E5] rounded text-xs text-[#444] whitespace-pre-line">
                  {form.reference_contacts}
                </div>
              </div>
            )}

            {/* Live Score Breakdown */}
            {liveScore && <ScoreBar score={liveScore} />}

            {/* Attached Evidence Summary */}
            <div className="space-y-2 border-t border-[#E5E5E5] pt-4">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-[#000] uppercase tracking-wider">Attached Evidence Files</span>
                <button onClick={() => setStep('evidence')} className="text-blue-600 hover:underline cursor-pointer">
                  + Manage Evidence Files ({existingApp?.evidence?.length || pendingFiles.length})
                </button>
              </div>
              {existingApp?.evidence && existingApp.evidence.length > 0 ? (
                <div className="space-y-1">
                  {existingApp.evidence.map((ev, idx) => (
                    <div key={ev.id || idx} className="text-xs p-2.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded flex justify-between">
                      <span className="font-medium text-[#111]">📄 {ev.filename || `Document_${idx + 1}`}</span>
                      <span className="text-[10px] text-[#666] uppercase">{ev.category.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-[#888] italic p-3 bg-[#FAFAFA] border border-[#E5E5E5] rounded">
                  No evidence files attached yet. You can still submit or add files under Step 2.
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep('evidence')} className="px-4 py-3 text-xs text-[#555] border border-[#D5D5D5] rounded hover:bg-[#F5F5F5] transition-colors cursor-pointer">
              ← Back to Evidence
            </button>
            <button
              onClick={handleSubmitApplication}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-[#000] text-white text-sm font-semibold rounded hover:bg-[#1A1A1A] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Submitting Application…' : 'Confirm & Submit Application for Review →'}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Submitted & Status ───────────────────────────────────────── */}
      {step === 'submitted' && (
        <div className="space-y-6">
          {/* Application Status Banner */}
          {existingApp ? (
            <div className="space-y-4">
              <div className="p-5 border border-[#E5E5E5] rounded-lg bg-[#FAFAFA] space-y-4">
                {/* Status pill */}
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#888]">Application Status</div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    existingApp.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                    existingApp.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-300' :
                    existingApp.status === 'NEEDS_MORE_EVIDENCE' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                    existingApp.status === 'SUSPENDED' ? 'bg-gray-100 text-gray-600 border-gray-300' :
                    'bg-blue-50 text-blue-700 border-blue-300'
                  }`}>
                    {existingApp.status.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Score */}
                <div className="grid grid-cols-3 gap-3 text-center text-[11px]">
                  <div className="p-2 bg-white border border-[#E5E5E5] rounded">
                    <div className="text-xl font-black text-[#000]">{existingApp.preliminary_score}</div>
                    <div className="text-[#888]">Preliminary Score</div>
                  </div>
                  <div className="p-2 bg-white border border-[#E5E5E5] rounded">
                    <div className="text-sm font-bold text-[#000]">{existingApp.evidence?.length || 0}</div>
                    <div className="text-[#888]">Evidence Files</div>
                  </div>
                  <div className="p-2 bg-white border border-[#E5E5E5] rounded">
                    <div className="text-sm font-bold text-[#000]">{existingApp.evidence_reviewed_count}</div>
                    <div className="text-[#888]">Docs Reviewed</div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-2 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-[#555]">Application submitted</span>
                    <span className="text-[#888] ml-auto">{new Date(existingApp.created_at).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${existingApp.status !== 'PENDING_REVIEW' ? 'bg-emerald-500' : 'bg-[#D5D5D5]'}`} />
                    <span className="text-[#555]">Under review by committee</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${existingApp.status === 'APPROVED' ? 'bg-emerald-500' : existingApp.status === 'REJECTED' ? 'bg-red-500' : 'bg-[#D5D5D5]'}`} />
                    <span className="text-[#555]">Final decision</span>
                    {existingApp.approved_at && <span className="text-[#888] ml-auto">{new Date(existingApp.approved_at).toLocaleDateString('en-IN')}</span>}
                  </div>
                </div>

                {/* Admin notes */}
                {existingApp.admin_notes && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                    <div className="font-semibold mb-1">Admin Notes</div>
                    {existingApp.admin_notes}
                  </div>
                )}
              </div>

              {/* Approved badge */}
              {existingApp.status === 'APPROVED' && existingApp.badge && (
                <ExpertBadgeCard badge={existingApp.badge} />
              )}

              {/* Action Toolbar */}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep('form')} className="flex-1 px-4 py-2.5 text-xs font-semibold text-[#333] border border-[#D5D5D5] bg-white rounded hover:bg-[#F5F5F5] transition-colors cursor-pointer">
                  ✏️ View / Edit Form
                </button>
                <button onClick={() => setStep('evidence')} className="flex-1 px-4 py-2.5 text-xs font-semibold text-[#333] border border-[#D5D5D5] bg-white rounded hover:bg-[#F5F5F5] transition-colors cursor-pointer">
                  📎 Upload More Evidence
                </button>
                <button onClick={() => setStep('review')} className="flex-1 px-4 py-2.5 text-xs font-semibold text-[#333] border border-[#D5D5D5] bg-white rounded hover:bg-[#F5F5F5] transition-colors cursor-pointer">
                  📋 View Full Application Review
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 border border-[#E5E5E5] bg-white rounded-lg text-center space-y-4">
              <div className="text-3xl">✅</div>
              <h3 className="text-base font-bold text-[#000]">Application Submitted &amp; Pending Review</h3>
              <p className="text-xs text-[#666] max-w-md mx-auto">
                Your application has been received and added to the review queue. Committee members and platform administrators will verify your credentials and evidence documents.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button onClick={() => setStep('review')} className="px-4 py-2 bg-[#000] text-white text-xs font-semibold rounded hover:bg-[#1A1A1A] transition-colors cursor-pointer">
                  Review Application Summary
                </button>
                <button onClick={() => setStep('evidence')} className="px-4 py-2 border border-[#D5D5D5] text-[#333] text-xs font-semibold rounded hover:bg-neutral-50 transition-colors cursor-pointer">
                  Upload Evidence Files
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
