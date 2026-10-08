import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { UserProfile, UserRole } from '../types';
import { authService } from '../services/authService';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, allowedRoles }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    // Check initial user profile
    authService.getCurrentProfile().then((profile) => {
      if (isMounted) {
        setCurrentUser(profile);
        setLoading(false);
      }
    });

    // Listen for auth changes (sign in, sign out, token refresh)
    const subscription = authService.onAuthStateChange(async (_event, _session) => {
      const profile = await authService.getCurrentProfile();
      if (isMounted) {
        setCurrentUser(profile);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center text-[#666666] text-xs font-medium tracking-wide">
        AUTHENTICATING...
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return (
      <div className="p-8 text-center bg-[#FFFFFF] border border-[#E5E5E5] m-8">
        <h2 className="text-sm font-bold text-[#000000] uppercase tracking-wider mb-2">
          Access Restricted
        </h2>
        <p className="text-xs text-[#666666] mb-4">
          Your role ({currentUser.role}) does not have permission to access this page.
        </p>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-[#000000] text-[#FFFFFF] text-xs uppercase tracking-wider"
        >
          Go Back
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGuard;
