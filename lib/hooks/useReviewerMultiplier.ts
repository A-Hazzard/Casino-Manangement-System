/**
 * Hook to apply reviewer multiplier to financial values.
 *
 * When the logged-in user has the 'reviewer' role and a multiplier set,
 * this hook provides a function to scale money in, money out, and jackpot values.
 *
 * The multiplier is stored as a decimal (e.g. 0.5 = 50%).
 * Values are multiplied by the multiplier: value * multiplier.
 */

import { useUserStore } from '@/lib/store/userStore';
import { useMemo } from 'react';

export function useReviewerMultiplier() {
  const user = useUserStore(state => state.user);

  const { isReviewer, multiplier } = useMemo(() => {
    const roles = user?.roles || [];
    const isRev = roles.includes('reviewer');
    const mult = isRev && user?.multiplier != null ? user.multiplier : null;
    return { isReviewer: isRev, multiplier: mult };
  }, [user?.roles, user?.multiplier]);

  /**
   * Apply the reviewer multiplier to a financial value.
   * Only applies if the user is a reviewer with a valid multiplier.
   */
  const applyMultiplier = (value: number): number => {
    if (multiplier == null) return value;
    return value * multiplier;
  };

  return { isReviewer, multiplier, applyMultiplier };
}
