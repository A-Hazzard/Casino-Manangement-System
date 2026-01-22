/**
 * Vault Quick Actions Section Component
 *
 * Section containing quick action buttons for vault operations.
 *
 * Features:
 * - Add Cash button (opens Add Cash modal)
 * - Remove Cash button (opens Remove Cash modal)
 * - Record Expense button (opens Record Expense modal)
 * - Large, touch-friendly buttons
 * - Responsive grid layout
 *
 * @module components/VAULT/sections/VaultQuickActionsSection
 */
'use client';

import { Button } from '@/components/shared/ui/button';
import { Minus, Plus, Receipt } from 'lucide-react';

type VaultQuickActionsSectionProps = {
  onAddCash: () => void;
  onRemoveCash: () => void;
  onRecordExpense: () => void;
};

export default function VaultQuickActionsSection({
  onAddCash,
  onRemoveCash,
  onRecordExpense,
}: VaultQuickActionsSectionProps) {
  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        <span className="text-gray-400">→</span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Add Cash Button - Green for positive action */}
        <Button
          onClick={onAddCash}
          className="h-auto min-h-[80px] flex-col gap-2 bg-button text-white hover:bg-button/90 py-4"
          size="lg"
        >
          <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="text-sm sm:text-base font-semibold">Add Cash</span>
        </Button>

        {/* Remove Cash Button - Orange for withdrawal action */}
        <Button
          onClick={onRemoveCash}
          className="h-auto min-h-[80px] flex-col gap-2 bg-orangeHighlight text-white hover:bg-orangeHighlight/90 py-4"
          size="lg"
        >
          <Minus className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="text-sm sm:text-base font-semibold">Remove Cash</span>
        </Button>

        {/* Record Expense Button - Blue for informational action */}
        <Button
          onClick={onRecordExpense}
          className="h-auto min-h-[80px] flex-col gap-2 bg-lighterBlueHighlight text-white hover:bg-lighterBlueHighlight/90 py-4"
          size="lg"
        >
          <Receipt className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="text-sm sm:text-base font-semibold">Record Expense</span>
        </Button>
      </div>
    </div>
  );
}