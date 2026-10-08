import React from 'react';
import { accessLogService } from '../services/accessLogService';

interface ConfidentialWatermarkProps {
  userId: string;
  userEmail: string;
  artifactId: string;
  children: React.ReactNode;
}

export const ConfidentialWatermark: React.FC<ConfidentialWatermarkProps> = ({
  userId,
  userEmail,
  artifactId,
  children
}) => {
  const watermarkText = accessLogService.generateWatermark(userId, userEmail, artifactId);

  return (
    <div className="relative overflow-hidden group">
      {/* Watermark Overlay */}
      <div 
        className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4 opacity-20 select-none overflow-hidden"
        aria-hidden="true"
      >
        <div className="text-[10px] font-mono text-[#D32F2F] tracking-widest uppercase rotate-[-12deg] transform origin-top-left space-y-8">
          <div>{watermarkText}</div>
          <div>{watermarkText}</div>
          <div>{watermarkText}</div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-0">
        {children}
      </div>
    </div>
  );
};
