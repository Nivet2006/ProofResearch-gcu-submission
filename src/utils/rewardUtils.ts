import { RewardSplit, Charter } from '../types';

export const DEFAULT_REWARD_SPLIT: RewardSplit = {
  platformFeePercent: 10,
  aiComputeReservePercent: 5,
  expertSharePercent: 30,
  studentPoolPercent: 40,
  reservePercent: 15,
};

/**
  * Safely parses and normalizes reward split percentages from any charter or terms object.
  * Preserves default values (10/5/30/40/15) if no configuration exists.
  */
export function parseRewardSplit(rewardTerms?: any, rewardSplitDirect?: RewardSplit): RewardSplit {
  if (rewardSplitDirect) {
    return {
      platformFeePercent: Number(rewardSplitDirect.platformFeePercent),
      aiComputeReservePercent: Number(rewardSplitDirect.aiComputeReservePercent),
      expertSharePercent: Number(rewardSplitDirect.expertSharePercent),
      studentPoolPercent: Number(rewardSplitDirect.studentPoolPercent),
      reservePercent: Number(rewardSplitDirect.reservePercent),
    };
  }

  if (!rewardTerms || typeof rewardTerms !== 'object') {
    return { ...DEFAULT_REWARD_SPLIT };
  }

  const getPercent = (keyCamel: string, keySnake: string, fallbackDecKey: string, defaultVal: number): number => {
    if (typeof rewardTerms[keyCamel] === 'number' && !isNaN(rewardTerms[keyCamel])) {
      return rewardTerms[keyCamel];
    }
    if (typeof rewardTerms[keySnake] === 'number' && !isNaN(rewardTerms[keySnake])) {
      return rewardTerms[keySnake];
    }
    if (typeof rewardTerms[fallbackDecKey] === 'number' && !isNaN(rewardTerms[fallbackDecKey])) {
      const val = rewardTerms[fallbackDecKey];
      return val <= 1 ? Number((val * 100).toFixed(4)) : val;
    }
    return defaultVal;
  };

  const platform = getPercent('platformFeePercent', 'platform_fee_percent', 'platform', DEFAULT_REWARD_SPLIT.platformFeePercent);
  const ai = getPercent('aiComputeReservePercent', 'ai_compute_reserve_percent', 'ai_reserve', DEFAULT_REWARD_SPLIT.aiComputeReservePercent);
  const expert = getPercent('expertSharePercent', 'expert_share_percent', 'expert_share', DEFAULT_REWARD_SPLIT.expertSharePercent);
  const student = getPercent('studentPoolPercent', 'student_pool_percent', 'student_pool', DEFAULT_REWARD_SPLIT.studentPoolPercent);
  const reserve = getPercent('reservePercent', 'reserve_percent', 'reserve', DEFAULT_REWARD_SPLIT.reservePercent);

  return {
    platformFeePercent: Number(platform),
    aiComputeReservePercent: Number(ai),
    expertSharePercent: Number(expert),
    studentPoolPercent: Number(student),
    reservePercent: Number(reserve),
  };
}

/**
  * Strict validation for reward configuration:
  * - Values must be valid numbers (no NaN)
  * - Values must be >= 0 and <= 100
  * - Total sum must equal exactly 100%
  */
export function validateRewardSplit(split: Partial<RewardSplit>): { isValid: boolean; error?: string } {
  const { platformFeePercent, aiComputeReservePercent, expertSharePercent, studentPoolPercent, reservePercent } = split;
  const fields = [
    { name: 'Platform Fee', value: platformFeePercent },
    { name: 'AI Compute Reserve', value: aiComputeReservePercent },
    { name: 'Expert Share', value: expertSharePercent },
    { name: 'Student Pool', value: studentPoolPercent },
    { name: 'Reserve / Buffer', value: reservePercent },
  ];

  for (const field of fields) {
    if (field.value === undefined || field.value === null || typeof field.value !== 'number' || isNaN(field.value)) {
      return { isValid: false, error: `${field.name} must be a valid number.` };
    }
    if (field.value < 0) {
      return { isValid: false, error: `${field.name} cannot be negative.` };
    }
    if (field.value > 100) {
      return { isValid: false, error: `${field.name} cannot exceed 100%.` };
    }
  }

  const sum = Number(
    (
      (platformFeePercent as number) +
      (aiComputeReservePercent as number) +
      (expertSharePercent as number) +
      (studentPoolPercent as number) +
      (reservePercent as number)
    ).toFixed(4)
  );

  if (sum !== 100) {
    return { isValid: false, error: `Allocation must total 100%. Current total: ${sum}%` };
  }

  return { isValid: true };
}

export interface CategoryBreakdown {
  platformFeeAmount: number;
  aiComputeReserveAmount: number;
  expertShareAmount: number;
  studentPoolAmount: number;
  reserveAmount: number;
  totalBudget: number;
}

/**
  * Money-safe category breakdown using integer paise arithmetic.
  * Remainder strategy: any rounding remainder in category paise is added to Reserve Buffer.
  */
export function calculateCategoryBreakdown(budget: number, split: RewardSplit): CategoryBreakdown {
  if (budget <= 0) {
    return {
      platformFeeAmount: 0,
      aiComputeReserveAmount: 0,
      expertShareAmount: 0,
      studentPoolAmount: 0,
      reserveAmount: 0,
      totalBudget: 0,
    };
  }

  const totalPaise = Math.round(budget * 100);

  const expertPaise = Math.round((totalPaise * split.expertSharePercent) / 100);
  const studentPaise = Math.round((totalPaise * split.studentPoolPercent) / 100);
  const aiPaise = Math.round((totalPaise * split.aiComputeReservePercent) / 100);
  const platformPaise = Math.round((totalPaise * split.platformFeePercent) / 100);
  
  // Calculate reserve paise as the exact remainder to ensure 100% budget conservation
  const sumCalculatedPaise = expertPaise + studentPaise + aiPaise + platformPaise;
  const reservePaise = totalPaise - sumCalculatedPaise;

  return {
    expertShareAmount: expertPaise / 100,
    studentPoolAmount: studentPaise / 100,
    aiComputeReserveAmount: aiPaise / 100,
    platformFeeAmount: platformPaise / 100,
    reserveAmount: Math.max(0, reservePaise) / 100,
    totalBudget: budget,
  };
}

export interface StudentDistributionResult {
  userId: string;
  impactScore: number;
  rawWeight: number;
  normalizedWeight: number; // e.g. 0.50
  percentageShare: number; // e.g. 50
  payoutAmount: number; // e.g. 20000
}

/**
  * Money-safe student pool distribution using reviewed impact weights.
  * Normalizes weights if un-normalized, and allocates any paise remainder to primary contributor.
  */
export function calculateStudentDistribution(
  studentPoolAmount: number,
  contributors: { userId: string; impactScore: number }[]
): StudentDistributionResult[] {
  if (studentPoolAmount <= 0 || contributors.length === 0) {
    return contributors.map(c => ({
      userId: c.userId,
      impactScore: c.impactScore,
      rawWeight: c.impactScore,
      normalizedWeight: 0,
      percentageShare: 0,
      payoutAmount: 0,
    }));
  }

  const totalScore = contributors.reduce((acc, c) => acc + (c.impactScore > 0 ? c.impactScore : 0), 0);
  if (totalScore <= 0) {
    // Equal distribution if no positive impact scores exist
    const poolPaise = Math.round(studentPoolAmount * 100);
    const equalPaise = Math.floor(poolPaise / contributors.length);
    let remainderPaise = poolPaise - (equalPaise * contributors.length);

    return contributors.map((c, idx) => {
      const extra = idx === 0 ? remainderPaise : 0;
      const finalPaise = equalPaise + extra;
      const norm = 1 / contributors.length;
      return {
        userId: c.userId,
        impactScore: c.impactScore,
        rawWeight: c.impactScore,
        normalizedWeight: Number(norm.toFixed(6)),
        percentageShare: Number((norm * 100).toFixed(4)),
        payoutAmount: finalPaise / 100,
      };
    });
  }

  const poolPaise = Math.round(studentPoolAmount * 100);
  let distributedPaiseSum = 0;

  const initialResults = contributors.map(c => {
    const rawScore = c.impactScore > 0 ? c.impactScore : 0;
    const normWeight = rawScore / totalScore;
    const amountPaise = Math.round(poolPaise * normWeight);
    distributedPaiseSum += amountPaise;

    return {
      userId: c.userId,
      impactScore: c.impactScore,
      rawWeight: rawScore,
      normalizedWeight: Number(normWeight.toFixed(6)),
      percentageShare: Number((normWeight * 100).toFixed(4)),
      amountPaise,
    };
  });

  // Handle rounding remainder deterministically by adjusting highest impact contributor
  const remainderPaise = poolPaise - distributedPaiseSum;
  if (remainderPaise !== 0 && initialResults.length > 0) {
    // Find index of student with highest rawWeight
    let maxIdx = 0;
    for (let i = 1; i < initialResults.length; i++) {
      if (initialResults[i].rawWeight > initialResults[maxIdx].rawWeight) {
        maxIdx = i;
      }
    }
    initialResults[maxIdx].amountPaise += remainderPaise;
  }

  return initialResults.map(r => ({
    userId: r.userId,
    impactScore: r.impactScore,
    rawWeight: r.rawWeight,
    normalizedWeight: r.normalizedWeight,
    percentageShare: r.percentageShare,
    payoutAmount: r.amountPaise / 100,
  }));
}
