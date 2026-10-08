import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import { authService } from '../services/authService';
import { RoleBadge } from './RoleBadge';

interface TopBarProps {
  currentUser: UserProfile;
  onUserSwitch?: (newUser: UserProfile) => void;
  onResetDemo?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ currentUser, onResetDemo }) => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await authService.signOut();
    navigate('/login', { replace: true });
  };

  return (
    <header className="h-14 bg-[#FFFFFF] border-b border-[#E5E5E5] px-6 sm:px-12 flex items-center justify-between text-xs sticky top-0 z-30">
      {/* Brand & Subtitle */}
      <div className="flex items-center gap-3">
        <span className="font-bold text-[#000000] text-sm tracking-widest uppercase cursor-pointer" onClick={() => navigate('/dashboard')}>
          PROOFRESEARCH
        </span>
        <span className="text-[12px] text-[#666666] border-l border-[#E5E5E5] pl-3 hidden md:inline">
          Research infrastructure for verifiable collaboration
        </span>
      </div>

      {/* Account Info & Sign Out */}
      <div className="flex items-center gap-4">
        {/* Authenticated User Profile */}
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-[#000000] text-[#FFFFFF] font-bold text-[10px] flex items-center justify-center">
            {currentUser.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex flex-col text-left hidden sm:flex">
            <span className="font-semibold text-[#111111] text-xs leading-tight">
              {currentUser.full_name}
            </span>
            <span className="text-[10px] text-[#666666] leading-tight font-mono">
              {currentUser.email}
            </span>
          </div>
        </div>

        {/* Role Badge */}
        <RoleBadge role={currentUser.role} />

        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          className="px-3 py-1.5 bg-[#FFFFFF] hover:bg-[#F5F5F5] text-[#111111] border border-[#E5E5E5] text-xs font-medium tracking-wide uppercase transition-colors"
        >
          Sign Out
        </button>

        {onResetDemo && (
          <button
            onClick={onResetDemo}
            title="Reset demo ledger state"
            className="px-2 py-1 text-[#666666] hover:text-[#000000] hover:bg-[#F5F5F5] rounded border border-[#E5E5E5] text-[11px] transition-colors hidden lg:inline-block"
          >
            Reset Ledger
          </button>
        )}
      </div>
    </header>
  );
};
