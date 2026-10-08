import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { UserProfile } from '../types';
import { authService } from '../services/authService';
import { LedgerVerificationView } from '../components/LedgerVerification';

export const LedgerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const projectId = id || 'p1111111-1111-1111-1111-111111111111';
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    authService.getCurrentProfile().then(setUser);
  }, []);

  if (!user) return null;

  return (
    <div className="space-y-8">
      <div className="pb-6 border-b border-[#E5E5E5]">
        <div className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-1">
          LEDGER
        </div>
        <h1 className="text-3xl font-medium text-[#000000]">Audit Ledger</h1>
        <p className="text-sm text-[#666666] mt-1">
          Append-only SHA-256 cryptographic hash log for tamper-evident provenance tracking.
        </p>
      </div>

      <LedgerVerificationView projectId={projectId} userRole={user.role} />
    </div>
  );
};
