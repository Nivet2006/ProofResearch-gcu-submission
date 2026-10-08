import React from 'react';
import { UserRole } from '../types';

interface RoleBadgeProps {
  role: UserRole;
  size?: 'sm' | 'md';
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, size = 'md' }) => {
  const isSm = size === 'sm';

  return (
    <span
      className={`inline-flex items-center font-medium border border-[#E5E5E5] bg-[#F5F5F5] text-[#111111] rounded tracking-tight ${
        isSm ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs'
      }`}
    >
      {role.charAt(0) + role.slice(1).toLowerCase()}
    </span>
  );
};
