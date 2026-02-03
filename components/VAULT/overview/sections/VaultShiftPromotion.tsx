/**
 * Vault Shift Promotion Banner
 *
 * Prompt to start a vault shift if none is active.
 *
 * @module components/VAULT/overview/sections/VaultShiftPromotion
 */
'use client';

import { Button } from '@/components/shared/ui/button';
import { TrendingUp } from 'lucide-react';

type VaultShiftPromotionProps = {
  activeShiftId?: string | null;
  onStartShift: () => void;
};

export default function VaultShiftPromotion({
  activeShiftId,
  onStartShift,
}: VaultShiftPromotionProps) {
  if (activeShiftId) return null;

  return (
    <div className="rounded-lg bg-orange-50 border border-orange-200 p-6 shadow-sm animate-in zoom-in duration-300">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-orange-900">Vault Shift Required</h3>
            <p className="text-orange-700 text-sm">You must open the vault before cashiers can start their shifts and perform operations.</p>
          </div>
        </div>
        <Button 
          onClick={onStartShift}
          className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-8 h-12 shadow-md hover:shadow-lg transition-all"
        >
          Start Vault Shift
        </Button>
      </div>
    </div>
  );
}
