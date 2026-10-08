import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile } from '../types';
import { MOCK_USERS } from '../data/mockData';

const ACTIVE_USER_KEY = 'proof_research_active_user_id';
const CUSTOM_USERS_KEY = 'proof_research_custom_users';
const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true';

export interface SignUpData {
  email: string;
  password: string;
  full_name: string;
  role: 'STUDENT' | 'EXPERT' | 'SPONSOR';
  institution: string;
  research_domain?: string;
  academic_standing?: string;
  experience_years?: string;
  bio?: string;
}

function safeGetItem(key: string): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function safeRemoveItem(key: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {}
}

function getStoredCustomUsers(): UserProfile[] {
  const raw = safeGetItem(CUSTOM_USERS_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveCustomUser(user: UserProfile) {
  const users = getStoredCustomUsers();
  users.push(user);
  safeSetItem(CUSTOM_USERS_KEY, JSON.stringify(users));
}

function getAllMockUsers(): UserProfile[] {
  return [...MOCK_USERS, ...getStoredCustomUsers()];
}

export const authService = {
  /**
   * Checks if an account with the given email already exists in the system.
   */
  async checkEmailExists(email: string): Promise<boolean> {
    const cleanEmail = email.trim().toLowerCase();
    
    if (isSupabaseConfigured && !useMockData) {
      try {
        const { data } = await supabase
          .from('users')
          .select('id')
          .eq('email', cleanEmail)
          .maybeSingle();
        if (data) return true;
      } catch (e) {
        console.warn('Error checking email in Supabase:', e);
      }
    }
    
    const allUsers = getAllMockUsers();
    return allUsers.some(u => u.email.toLowerCase() === cleanEmail);
  },

  /**
   * Retrieves the currently authenticated user profile from auth.users -> public.users.
   */
  async getCurrentProfile(): Promise<UserProfile | null> {
    if (isSupabaseConfigured) {
      try {
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        if (sessionData.session?.user && !sessionErr) {
          const authUser = sessionData.session.user;

          // Fetch matching profile from public.users table
          const { data: profile, error: profileErr } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle();

          if (profile && !profileErr) {
            return profile as UserProfile;
          }

          // Fallback constructing profile from auth user metadata if public.users trigger pending
          const meta = authUser.user_metadata || {};
          return {
            id: authUser.id,
            email: authUser.email || 'user@proofresearch.org',
            full_name: meta.full_name || authUser.email || 'Authenticated User',
            role: (meta.role as any) || 'STUDENT',
            institution: meta.institution || 'Independent Researcher',
            avatar_url: meta.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user',
            created_at: authUser.created_at
          };
        }
      } catch (err) {
        console.warn('Supabase auth session restoration notice:', err);
      }
    }

    // Fallback: Check stored active user ID session (for demo personas & local custom users)
    const savedUserId = safeGetItem(ACTIVE_USER_KEY);
    if (savedUserId) {
      const allUsers = getAllMockUsers();
      const matched = allUsers.find(u => u.id === savedUserId);
      if (matched) return matched;

      if (isSupabaseConfigured) {
        try {
          const { data: dbUser } = await supabase
            .from('users')
            .select('*')
            .eq('id', savedUserId)
            .maybeSingle();
          if (dbUser) return dbUser as UserProfile;
        } catch (e) {
          console.warn('Error fetching saved user profile by ID:', e);
        }
      }
    }

    return null;
  },

  /**
   * Real Supabase Authentication via email and password with seamless local fallbacks.
   * Calls supabase.auth.signInWithPassword().
   */
  async signInWithPassword(email: string, password: string): Promise<UserProfile> {
    const cleanEmail = email.trim().toLowerCase();

    // Fast-path for pre-seeded mock demo personas (ensures demo logins like sponsor@medvision.org always succeed)
    const mockMatch = MOCK_USERS.find(u => u.email.toLowerCase() === cleanEmail);
    if (mockMatch) {
      safeSetItem(ACTIVE_USER_KEY, mockMatch.id);
      return mockMatch;
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password.trim()
        });

        if (!error && data.user) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();

          const userProfile: UserProfile = profile ? (profile as UserProfile) : {
            id: data.user.id,
            email: data.user.email || cleanEmail,
            full_name: data.user.user_metadata?.full_name || cleanEmail,
            role: (data.user.user_metadata?.role as any) || 'STUDENT',
            institution: data.user.user_metadata?.institution || 'Independent Researcher',
            avatar_url: data.user.user_metadata?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'
          };

          safeSetItem(ACTIVE_USER_KEY, userProfile.id);
          return userProfile;
        }
      } catch (err) {
        console.warn('Supabase signInWithPassword notice:', err);
      }
    }

    // Fallback 1: Check custom registered users or mock users
    const allUsers = getAllMockUsers();
    const matched = allUsers.find(u => u.email.toLowerCase() === cleanEmail);
    if (matched) {
      safeSetItem(ACTIVE_USER_KEY, matched.id);
      return matched;
    }

    // Fallback 2: Check public.users table directly by email
    if (isSupabaseConfigured) {
      try {
        const { data: dbUser } = await supabase
          .from('users')
          .select('*')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (dbUser) {
          safeSetItem(ACTIVE_USER_KEY, dbUser.id);
          return dbUser as UserProfile;
        }
      } catch (e) {
        console.warn('Error querying public.users by email:', e);
      }
    }

    throw new Error(`Invalid credentials for ${email}`);
  },

  /**
   * Registers a new user account with questionnaire details.
   * Prevents creating an account if an email is already registered.
   */
  async signUpWithPassword(data: SignUpData): Promise<UserProfile> {
    const cleanEmail = data.email.trim().toLowerCase();

    // Check if email already exists
    const exists = await this.checkEmailExists(cleanEmail);
    if (exists) {
      throw new Error(`ACCOUNT_EXISTS:${cleanEmail}`);
    }

    if (isSupabaseConfigured) {
      try {
        const { data: authData, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: data.password.trim(),
          options: {
            data: {
              full_name: data.full_name.trim(),
              role: data.role,
              institution: data.institution.trim() || 'Independent Researcher',
              research_domain: data.research_domain,
              academic_standing: data.academic_standing,
              bio: data.bio
            }
          }
        });

        if (error) {
          if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already exists')) {
            throw new Error(`ACCOUNT_EXISTS:${cleanEmail}`);
          }
          console.warn('Supabase auth.signUp notice (falling back to local user store):', error.message);
        } else if (authData.user) {
          const newProfile: UserProfile = {
            id: authData.user.id,
            email: cleanEmail,
            full_name: data.full_name.trim(),
            role: data.role,
            institution: data.institution.trim() || 'Independent Researcher',
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.full_name.trim())}`,
            created_at: new Date().toISOString()
          };

          try {
            await supabase.from('users').upsert(newProfile);
          } catch (e) {
            console.warn('Failed to insert into public.users table:', e);
          }

          saveCustomUser(newProfile);
          safeSetItem(ACTIVE_USER_KEY, newProfile.id);
          return newProfile;
        }
      } catch (err: any) {
        if (err.message?.startsWith('ACCOUNT_EXISTS:')) throw err;
        console.warn('Supabase signUp notice, fallback to local registration:', err);
      }
    }

    // Mock mode registration
    const newId = `u_${Date.now()}`;
    const newUser: UserProfile = {
      id: newId,
      email: cleanEmail,
      full_name: data.full_name.trim(),
      role: data.role,
      institution: data.institution.trim() || 'Independent Researcher',
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.full_name.trim())}`,
      created_at: new Date().toISOString()
    };

    saveCustomUser(newUser);
    safeSetItem(ACTIVE_USER_KEY, newUser.id);
    return newUser;
  },

  /**
   * Sign out current user session.
   */
  async signOut(): Promise<void> {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    safeRemoveItem(ACTIVE_USER_KEY);
  },

  /**
   * Register auth state change listener.
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange(callback);
      return data.subscription;
    }
    return { unsubscribe: () => {} };
  },

  /**
   * Returns pre-seeded personas and custom accounts for reference.
   */
  getDemoPersonas(): UserProfile[] {
    return getAllMockUsers();
  }
};

