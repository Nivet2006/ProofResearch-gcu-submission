import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService, SignUpData } from '../services/authService';

const PRESET_ACCOUNTS = [
  { label: 'Dr. Vikram Seth (Sponsor)', email: 'sponsor@medvision.io', role: 'SPONSOR', password: 'Password123!' },
  { label: 'Rahul Sharma (Student)', email: 'rahul@student.edu', role: 'STUDENT', password: 'Password123!' },
  { label: 'Priya Patel (Student)', email: 'priya@student.edu', role: 'STUDENT', password: 'Password123!' },
  { label: 'Dr. Ananya Rao (Expert)', email: 'ananya@research.edu', role: 'EXPERT', password: 'Password123!' },
  { label: 'Platform Admin (Admin)', email: 'admin@proofresearch.org', role: 'ADMIN', password: 'Password123!' }
];

const DOMAINS = [
  'Artificial Intelligence & ML',
  'Biomedical & Genomics',
  'Quantum Computing',
  'Cryptography & Blockchain',
  'Clean Energy & Nanotech',
  'Robotics & Autonomous Systems',
  'Social Sciences & Economics',
  'Other Interdisciplinary Research'
];

const ACADEMIC_LEVELS = [
  'Undergraduate Student',
  'Postgraduate / Master\'s Student',
  'PhD Candidate / Postdoctoral Researcher',
  'Assistant / Associate Professor',
  'Senior Faculty / Department Head',
  'Industry Research Scientist / Lead'
];

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Mode: 'signin' | 'signup'
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  // Sign In state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Sign Up Questionnaire state
  const [signUpData, setSignUpData] = useState<SignUpData>({
    email: '',
    password: '',
    full_name: '',
    role: 'STUDENT',
    institution: '',
    research_domain: DOMAINS[0],
    academic_standing: ACADEMIC_LEVELS[0],
    bio: ''
  });
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status & error state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateEmailAlert, setDuplicateEmailAlert] = useState<string | null>(null);

  // Return url if redirected from protected route
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    setDuplicateEmailAlert(null);

    try {
      await authService.signInWithPassword(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDuplicateEmailAlert(null);

    // Basic Validation
    if (!signUpData.full_name.trim()) {
      setError('Full Name is required.');
      return;
    }
    if (!signUpData.email.trim()) {
      setError('Email Address is required.');
      return;
    }
    if (!signUpData.password) {
      setError('Password is required.');
      return;
    }
    if (signUpData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (signUpData.password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!signUpData.institution.trim()) {
      setError('Institution / University / Company name is required.');
      return;
    }

    setLoading(true);

    try {
      await authService.signUpWithPassword(signUpData);
      // Auto login after sign up
      await authService.signInWithPassword(signUpData.email, signUpData.password);
      navigate(from, { replace: true });
    } catch (err: any) {
      const errMsg = err.message || '';
      if (errMsg.startsWith('ACCOUNT_EXISTS:')) {
        const existingEmail = errMsg.split(':')[1] || signUpData.email;
        setDuplicateEmailAlert(existingEmail);
        setError(null);
      } else {
        setError(errMsg || 'Account creation failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fillPreset = (presetEmail: string, presetPassword = 'Password123!') => {
    setMode('signin');
    setEmail(presetEmail);
    setPassword(presetPassword);
    setError(null);
    setDuplicateEmailAlert(null);
  };

  const switchToLoginWithEmail = (targetEmail: string) => {
    setMode('signin');
    setEmail(targetEmail);
    setPassword('');
    setError(null);
    setDuplicateEmailAlert(null);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col justify-center items-center px-4 py-12 font-sans text-[#111111]">
      <div className="w-full max-w-lg bg-[#FFFFFF] border border-[#E5E5E5] p-8 rounded-none shadow-sm">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight text-[#000000] uppercase">
            PROOFRESEARCH
          </h1>
          <p className="text-xs text-[#666666] mt-1">
            Research infrastructure for verifiable collaboration
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex border-b border-[#E5E5E5] mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError(null);
              setDuplicateEmailAlert(null);
            }}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer ${
              mode === 'signin'
                ? 'border-[#000000] text-[#000000] bg-neutral-50'
                : 'border-transparent text-[#888888] hover:text-[#111111]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
              setDuplicateEmailAlert(null);
            }}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer ${
              mode === 'signup'
                ? 'border-[#000000] text-[#000000] bg-neutral-50'
                : 'border-transparent text-[#888888] hover:text-[#111111]'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Duplicate Email Warning Alert */}
        {duplicateEmailAlert && (
          <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-500 text-xs text-amber-900">
            <div className="font-bold flex items-center gap-1.5 text-sm mb-1">
              <span>⚠️ Account Already Exists</span>
            </div>
            <p className="mb-3 leading-relaxed">
              An account registered with <strong>{duplicateEmailAlert}</strong> already exists on ProofResearch. One person with an email cannot create duplicate accounts.
            </p>
            <button
              type="button"
              onClick={() => switchToLoginWithEmail(duplicateEmailAlert)}
              className="bg-amber-900 hover:bg-black text-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Sign In to {duplicateEmailAlert} →
            </button>
          </div>
        )}

        {/* Generic Error Alert */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 border-l-2 border-red-600 text-xs text-red-900">
            <span className="font-semibold">Error:</span> {error}
          </div>
        )}

        {/* SIGN IN FORM */}
        {mode === 'signin' && (
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@institution.edu"
                required
                className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E5E5E5] text-xs text-[#111111] focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 rounded-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E5E5E5] text-xs text-[#111111] focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 rounded-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#000000] hover:bg-[#222222] text-[#FFFFFF] font-medium py-2.5 px-4 text-xs tracking-wider uppercase transition-all duration-150 ease-out active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* CREATE ACCOUNT QUESTIONNAIRE FORM */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUpSubmit} className="space-y-4 text-left">
            <div className="bg-neutral-50 p-3 border border-neutral-200 mb-2">
              <span className="text-[11px] font-bold text-neutral-800 uppercase tracking-wider block">
                ProofResearch Member Questionnaire
              </span>
              <span className="text-[10px] text-neutral-500 block">
                Please complete your research profile to set up your account.
              </span>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-2">
                Select Your Primary Role <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'STUDENT', label: 'Student', desc: 'Researcher & Scholar', icon: '🎓' },
                  { key: 'EXPERT', label: 'Domain Expert', desc: 'Peer Reviewer & Evaluator', icon: '🔬' },
                  { key: 'SPONSOR', label: 'Sponsor', desc: 'Funder & Organization', icon: '🏢' }
                ].map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setSignUpData({ ...signUpData, role: r.key as any })}
                    className={`p-2.5 text-left border transition-all cursor-pointer flex flex-col justify-between ${
                      signUpData.role === r.key
                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                        : 'bg-white text-neutral-800 border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    <div>
                      <div className="text-sm mb-0.5">{r.icon}</div>
                      <div className="text-xs font-bold">{r.label}</div>
                    </div>
                    <div className={`text-[9px] mt-1 ${signUpData.role === r.key ? 'text-neutral-300' : 'text-neutral-500'}`}>
                      {r.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={signUpData.full_name}
                onChange={(e) => setSignUpData({ ...signUpData, full_name: e.target.value })}
                placeholder="e.g. Rahul Sharma or Dr. Ananya Rao"
                required
                className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E5E5E5] text-xs text-[#111111] focus:outline-none focus:border-neutral-900"
              />
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={signUpData.email}
                onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                placeholder="yourname@institution.edu"
                required
                className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E5E5E5] text-xs text-[#111111] focus:outline-none focus:border-neutral-900"
              />
              <span className="text-[10px] text-neutral-500 mt-0.5 block">
                Must be unique. If an account already exists with this email, you will be directed to Sign In.
              </span>
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={signUpData.password}
                  onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                  placeholder="Min 6 chars"
                  required
                  className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E5E5E5] text-xs text-[#111111] focus:outline-none focus:border-neutral-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  required
                  className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E5E5E5] text-xs text-[#111111] focus:outline-none focus:border-neutral-900"
                />
              </div>
            </div>

            {/* Institution */}
            <div>
              <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-1">
                Institution / Organization <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={signUpData.institution}
                onChange={(e) => setSignUpData({ ...signUpData, institution: e.target.value })}
                placeholder="e.g. National Institute of Technology, IIT, MedVision Labs"
                required
                className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E5E5E5] text-xs text-[#111111] focus:outline-none focus:border-neutral-900"
              />
            </div>

            {/* Questionnaire Questionnaire - Research Domain */}
            <div>
              <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-1">
                Primary Research Domain
              </label>
              <select
                value={signUpData.research_domain}
                onChange={(e) => setSignUpData({ ...signUpData, research_domain: e.target.value })}
                className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E5E5E5] text-xs text-[#111111] focus:outline-none focus:border-neutral-900"
              >
                {DOMAINS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Questionnaire Questionnaire - Academic Standing */}
            <div>
              <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-1">
                Academic Standing / Experience Level
              </label>
              <select
                value={signUpData.academic_standing}
                onChange={(e) => setSignUpData({ ...signUpData, academic_standing: e.target.value })}
                className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E5E5E5] text-xs text-[#111111] focus:outline-none focus:border-neutral-900"
              >
                {ACADEMIC_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            {/* Questionnaire Questionnaire - Bio */}
            <div>
              <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-1">
                Research Statement / Bio <span className="text-neutral-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                value={signUpData.bio}
                onChange={(e) => setSignUpData({ ...signUpData, bio: e.target.value })}
                placeholder="Briefly state your key research interests or goals..."
                className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5E5] text-xs text-[#111111] focus:outline-none focus:border-neutral-900"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#000000] hover:bg-[#222222] text-[#FFFFFF] font-medium py-3 px-4 text-xs tracking-wider uppercase transition-all duration-150 ease-out active:scale-[0.98] disabled:opacity-50 cursor-pointer mt-2"
            >
              {loading ? 'Creating Account & Setting Up Profile...' : 'Complete Registration & Sign In'}
            </button>
          </form>
        )}

        {/* Quick Demo Pre-fill Section */}
        <div className="mt-8 pt-6 border-t border-[#E5E5E5]">
          <span className="block text-[11px] font-semibold text-[#666666] uppercase tracking-wider mb-3">
            Quick Pre-seeded Account Selector
          </span>
          <div className="space-y-1.5">
            {PRESET_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => fillPreset(acc.email)}
                className={`w-full text-left px-3 py-2 text-xs border transition-all duration-150 flex justify-between items-center cursor-pointer active:scale-[0.99] ${
                  email === acc.email && mode === 'signin'
                    ? 'bg-neutral-100 border-neutral-900 font-semibold text-neutral-900'
                    : 'bg-[#F5F5F5] hover:bg-neutral-200/60 text-[#111111] border-[#E5E5E5]'
                }`}
              >
                <span>{acc.label}</span>
                <span className="text-[10px] text-[#666666] font-mono">{acc.role}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-[11px] text-[#888888]">
          Authenticated via Supabase Auth & PostgreSQL RLS
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

