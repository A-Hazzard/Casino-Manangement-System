/**
 * Vault Overview Shift Promotion Banner
 *
 * Prompt to start a vault shift if none is active.
 *
 * @module components/VAULT/overview/sections/VaultOverviewShiftPromotion
 */
'use client';

import { Button } from '@/components/shared/ui/button';
import { TrendingUp } from 'lucide-react';

type VaultOverviewShiftPromotionProps = {
  activeShiftId?: string | null;
  onStartShift: () => void;
};

export default function VaultOverviewShiftPromotion({
  activeShiftId,
  onStartShift,
}: VaultOverviewShiftPromotionProps) {
  // ============================================================================
  // Render
  // ============================================================================
  if (activeShiftId) return null;

  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50 p-6 shadow-sm duration-300 animate-in zoom-in">
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-orange-900">
              Vault Shift Required
            </h3>
            <p className="text-sm text-orange-700">
              You must open the vault before cashiers can start their shifts and
              perform operations.
            </p>
          </div>
        </div>
        <Button
          onClick={onStartShift}
          className="h-12 bg-orange-600 px-8 font-bold text-white shadow-md transition-all hover:bg-orange-700 hover:shadow-lg"
        >
          Start Vault Shift
        </Button>
      </div>
    </div>
  );
}
