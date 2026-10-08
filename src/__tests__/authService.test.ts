import { describe, it, expect, beforeEach } from 'vitest';
import { authService, SignUpData } from '../services/authService';

const mockStorage: Record<string, string> = {};
if (typeof localStorage === 'undefined') {
  (global as any).localStorage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, value: string) => { mockStorage[key] = value; },
    removeItem: (key: string) => { delete mockStorage[key]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
  };
}

describe('authService - Registration & Login Questionnaire Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('detects existing pre-seeded account emails correctly', async () => {
    const exists = await authService.checkEmailExists('rahul@student.edu');
    expect(exists).toBe(true);
  });

  it('detects pre-seeded email case-insensitively', async () => {
    const exists = await authService.checkEmailExists('SPONSOR@MEDVISION.IO');
    expect(exists).toBe(true);
  });

  it('returns false for non-existent email', async () => {
    const exists = await authService.checkEmailExists('new.student@university.edu');
    expect(exists).toBe(false);
  });

  it('prevents account creation if email already exists', async () => {
    const duplicateData: SignUpData = {
      email: 'rahul@student.edu',
      password: 'Password123!',
      full_name: 'Rahul Duplicate',
      role: 'STUDENT',
      institution: 'Another College'
    };

    await expect(authService.signUpWithPassword(duplicateData)).rejects.toThrow('ACCOUNT_EXISTS:rahul@student.edu');
  });

  it('creates new account with questionnaire data when email is unique', async () => {
    const uniqueEmail = `scholar_${Date.now()}@cambridge.edu`;
    const newAccountData: SignUpData = {
      email: uniqueEmail,
      password: 'SecurePassword123!',
      full_name: 'Dr. Jane Goodall',
      role: 'EXPERT',
      institution: 'University of Cambridge',
      research_domain: 'Biomedical & Genomics',
      academic_standing: 'Senior Faculty / Department Head',
      bio: 'Leading researcher in primate behavior & genomics.'
    };

    const userProfile = await authService.signUpWithPassword(newAccountData);
    expect(userProfile.email).toBe(uniqueEmail.toLowerCase());
    expect(userProfile.full_name).toBe('Dr. Jane Goodall');
    expect(userProfile.role).toBe('EXPERT');
    expect(userProfile.institution).toBe('University of Cambridge');
  });

  it('allows logging in with newly registered account credentials', async () => {
    const uniqueEmail = `test_user_${Date.now()}@nit.edu`;
    const newAccountData: SignUpData = {
      email: uniqueEmail,
      password: 'MyPassword123!',
      full_name: 'Test Student',
      role: 'STUDENT',
      institution: 'NIT Trichy'
    };

    await authService.signUpWithPassword(newAccountData);

    const loggedInUser = await authService.signInWithPassword(uniqueEmail, 'MyPassword123!');
    expect(loggedInUser).toBeDefined();
    expect(loggedInUser.email).toBe(uniqueEmail.toLowerCase());
    expect(loggedInUser.full_name).toBe('Test Student');
  });
});
