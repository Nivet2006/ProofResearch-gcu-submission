import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { UserProfile } from '../types';
import { authService } from '../services/authService';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { ledgerService } from '../services/ledgerService';

interface AppShellProps {
  children: React.ReactNode;
  activeProjectId?: string;
  onUserChange?: (user: UserProfile | null) => void;
}

export const AppShell: React.FC<AppShellProps> = ({ children, activeProjectId, onUserChange }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    authService.getCurrentProfile().then(user => {
      if (isMounted) {
        setCurrentUser(user);
        setLoading(false);
        if (onUserChange) onUserChange(user);
      }
    });

    const subscription = authService.onAuthStateChange(async () => {
      const updatedUser = await authService.getCurrentProfile();
      if (isMounted) {
        setCurrentUser(updatedUser);
        setLoading(false);
        if (onUserChange) onUserChange(updatedUser);
      }
    });

    return () => {
      isMounted = false;
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, []);

  const handleResetDemo = () => {
    ledgerService.resetDemoLedger();
    window.location.reload();
  };

  // On login route, don't show TopBar or Sidebar shell
  if (location.pathname === '/login') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center text-[#666666] text-xs font-medium tracking-wide">
        AUTHENTICATING PROOFRESEARCH...
      </div>
    );
  }

  // If not logged in and not on /login, AuthGuard will handle redirect to /login
  if (!currentUser) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans text-[#111111]">
      <TopBar currentUser={currentUser} onResetDemo={handleResetDemo} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar role={currentUser.role} activeProjectId={activeProjectId} />
        <main className="flex-1 overflow-y-auto bg-[#FAFAFA] px-6 sm:px-12 py-8 md:py-12">
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppShell;
