import React, { useState, useEffect } from 'react';
import { RewardSplit } from '../types';
import { validateRewardSplit, DEFAULT_REWARD_SPLIT } from '../utils/rewardUtils';

interface RewardConfigEditorProps {
  initialSplit?: RewardSplit;
  onChange?: (split: RewardSplit, isValid: boolean) => void;
  onSave?: (split: RewardSplit) => void;
  readOnly?: boolean;
}

export const RewardConfigEditor: React.FC<RewardConfigEditorProps> = ({
  initialSplit = DEFAULT_REWARD_SPLIT,
  onChange,
  onSave,
  readOnly = false,
}) => {
  const [split, setSplit] = useState<RewardSplit>(initialSplit);
  const [validation, setValidation] = useState<{ isValid: boolean; error?: string }>({ isValid: true });

  useEffect(() => {
    setSplit(initialSplit);
    const res = validateRewardSplit(initialSplit);
    setValidation(res);
  }, [initialSplit]);

  const handleChange = (field: keyof RewardSplit, value: string) => {
    if (readOnly) return;
    const num = value === '' ? NaN : parseFloat(value);
    const nextSplit = { ...split, [field]: num };
    setSplit(nextSplit);

    const res = validateRewardSplit(nextSplit);
    setValidation(res);
    if (onChange) {
      onChange(nextSplit, res.isValid);
    }
  };

  const currentTotal = Number(
    (
      (isNaN(split.platformFeePercent) ? 0 : split.platformFeePercent) +
      (isNaN(split.aiComputeReservePercent) ? 0 : split.aiComputeReservePercent) +
      (isNaN(split.expertSharePercent) ? 0 : split.expertSharePercent) +
      (isNaN(split.studentPoolPercent) ? 0 : split.studentPoolPercent) +
      (isNaN(split.reservePercent) ? 0 : split.reservePercent)
    ).toFixed(4)
  );

  return (
    <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded p-6 space-y-6 text-xs text-[#000000]">
      <div className="border-b border-[#E5E5E5] pb-3 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold text-[#888888] uppercase tracking-wider block">
            PROJECT CHARTER GOVERNANCE
          </span>
          <h3 className="text-base font-semibold text-[#000000] mt-0.5">
            REWARD & CREDIT SPLIT
          </h3>
        </div>
        <span className="text-[11px] text-[#666666]">
          Configure milestone payout percentages for this charter version
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        {/* Platform Fee */}
        <div className="space-y-1.5 bg-[#F9F9F9] p-3 rounded border border-[#E5E5E5]">
          <label className="block text-[11px] font-medium text-[#666666]">
            Platform Fee
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              disabled={readOnly}
              value={isNaN(split.platformFeePercent) ? '' : split.platformFeePercent}
              onChange={(e) => handleChange('platformFeePercent', e.target.value)}
              className="w-full bg-[#FFFFFF] border border-[#CCCCCC] focus:border-[#000000] rounded px-2.5 py-1.5 text-xs font-semibold text-[#000000] outline-none transition-colors text-right"
            />
            <span className="font-semibold text-[#666666]">%</span>
          </div>
          <span className="text-[10px] text-[#888888] block">Platform infrastructure & Ops</span>
        </div>

        {/* AI Compute Reserve */}
        <div className="space-y-1.5 bg-[#F9F9F9] p-3 rounded border border-[#E5E5E5]">
          <label className="block text-[11px] font-medium text-[#666666]">
            AI Compute Reserve
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              disabled={readOnly}
              value={isNaN(split.aiComputeReservePercent) ? '' : split.aiComputeReservePercent}
              onChange={(e) => handleChange('aiComputeReservePercent', e.target.value)}
              className="w-full bg-[#FFFFFF] border border-[#CCCCCC] focus:border-[#000000] rounded px-2.5 py-1.5 text-xs font-semibold text-[#000000] outline-none transition-colors text-right"
            />
            <span className="font-semibold text-[#666666]">%</span>
          </div>
          <span className="text-[10px] text-[#888888] block">Visible project compute cost</span>
        </div>

        {/* Expert Share */}
        <div className="space-y-1.5 bg-[#F9F9F9] p-3 rounded border border-[#E5E5E5]">
          <label className="block text-[11px] font-medium text-[#666666]">
            Expert Share
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              disabled={readOnly}
              value={isNaN(split.expertSharePercent) ? '' : split.expertSharePercent}
              onChange={(e) => handleChange('expertSharePercent', e.target.value)}
              className="w-full bg-[#FFFFFF] border border-[#CCCCCC] focus:border-[#000000] rounded px-2.5 py-1.5 text-xs font-semibold text-[#000000] outline-none transition-colors text-right"
            />
            <span className="font-semibold text-[#666666]">%</span>
          </div>
          <span className="text-[10px] text-[#888888] block">Expert reviewer / advisor</span>
        </div>

        {/* Student Pool */}
        <div className="space-y-1.5 bg-[#F9F9F9] p-3 rounded border border-[#E5E5E5]">
          <label className="block text-[11px] font-medium text-[#666666]">
            Student Pool
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              disabled={readOnly}
              value={isNaN(split.studentPoolPercent) ? '' : split.studentPoolPercent}
              onChange={(e) => handleChange('studentPoolPercent', e.target.value)}
              className="w-full bg-[#FFFFFF] border border-[#CCCCCC] focus:border-[#000000] rounded px-2.5 py-1.5 text-xs font-semibold text-[#000000] outline-none transition-colors text-right"
            />
            <span className="font-semibold text-[#666666]">%</span>
          </div>
          <span className="text-[10px] text-[#888888] block">Split by contribution weights</span>
        </div>

        {/* Reserve / Buffer */}
        <div className="space-y-1.5 bg-[#F9F9F9] p-3 rounded border border-[#E5E5E5]">
          <label className="block text-[11px] font-medium text-[#666666]">
            Reserve / Buffer
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              disabled={readOnly}
              value={isNaN(split.reservePercent) ? '' : split.reservePercent}
              onChange={(e) => handleChange('reservePercent', e.target.value)}
              className="w-full bg-[#FFFFFF] border border-[#CCCCCC] focus:border-[#000000] rounded px-2.5 py-1.5 text-xs font-semibold text-[#000000] outline-none transition-colors text-right"
            />
            <span className="font-semibold text-[#666666]">%</span>
          </div>
          <span className="text-[10px] text-[#888888] block">Contingency buffer</span>
        </div>
      </div>

      {/* Validation Status Footer */}
      <div className="pt-3 border-t border-[#E5E5E5] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-xs">
            Total Allocation: <strong className={currentTotal === 100 ? 'text-[#008000]' : 'text-[#D32F2F]'}>{currentTotal}%</strong>
          </span>

          {validation.isValid ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#E8F5E9] text-[#2E7D32]">
              ✓ Total: 100%
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#FFEBEE] text-[#C62828]">
              ⚠ {validation.error}
            </span>
          )}
        </div>

        {!readOnly && onSave && (
          <button
            type="button"
            disabled={!validation.isValid}
            onClick={() => onSave(split)}
            className="px-4 py-2 bg-[#000000] hover:bg-[#1A1A1A] disabled:opacity-50 text-[#FFFFFF] font-medium rounded transition-colors text-xs shrink-0"
          >
            Save & Update Charter Split
          </button>
        )}
      </div>
    </div>
  );
};
