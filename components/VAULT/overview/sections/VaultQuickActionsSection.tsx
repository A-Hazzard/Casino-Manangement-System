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
import { Minus, Plus, Receipt, Users, Monitor, RefreshCw } from 'lucide-react';

type VaultQuickActionsSectionProps = {
  onAddCash: () => void;
  onRemoveCash: () => void;
  onRecordExpense: () => void;
  onManageCashiers?: () => void;
  onMachineCollection?: () => void;
  onSoftCount?: () => void;
};

export default function VaultQuickActionsSection({
  onAddCash,
  onRemoveCash,
  onRecordExpense,
  onManageCashiers,
  onMachineCollection,
  onSoftCount,
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {/* Add Cash Button - Green for positive action */}
        <Button
          onClick={onAddCash}
          className="h-auto min-h-[80px] flex-col gap-2 bg-button py-4 text-white hover:bg-button/90"
          size="lg"
        >
          <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="text-sm font-semibold sm:text-base">Add Cash</span>
        </Button>

        {/* Remove Cash Button - Orange for withdrawal action */}
        <Button
          onClick={onRemoveCash}
          className="h-auto min-h-[80px] flex-col gap-2 bg-orangeHighlight py-4 text-white hover:bg-orangeHighlight/90"
          size="lg"
        >
          <Minus className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="text-sm font-semibold sm:text-base">
            Remove Cash
          </span>
        </Button>

        {/* Record Expense Button - Blue for informational action */}
        <Button
          onClick={onRecordExpense}
          className="h-auto min-h-[80px] flex-col gap-2 bg-lighterBlueHighlight py-4 text-white hover:bg-lighterBlueHighlight/90"
          size="lg"
        >
          <Receipt className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="text-sm font-semibold sm:text-base">
            Record Expense
          </span>
        </Button>

        {/* Machine Collection - Purple */}
        {onMachineCollection && (
          <Button
            onClick={onMachineCollection}
            className="h-auto min-h-[80px] flex-col gap-2 bg-purple-600 py-4 text-white hover:bg-purple-700"
            size="lg"
          >
            <Monitor className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="text-sm font-semibold sm:text-base">
              Collection
            </span>
          </Button>
        )}

        {/* Soft Count - Indigo */}
        {onSoftCount && (
          <Button
            onClick={onSoftCount}
            className="h-auto min-h-[80px] flex-col gap-2 bg-indigo-600 py-4 text-white hover:bg-indigo-700"
            size="lg"
          >
            <RefreshCw className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="text-sm font-semibold sm:text-base">
              Soft Count
            </span>
          </Button>
        )}

        {/* Manage Cashiers Button - Teal for admin action */}
        {onManageCashiers && (
          <Button
            onClick={onManageCashiers}
            className="h-auto min-h-[80px] flex-col gap-2 bg-teal-600 py-4 text-white hover:bg-teal-700"
            size="lg"
          >
            <Users className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="text-sm font-semibold sm:text-base">
              Manage Cashiers
            </span>
          </Button>
        )}
      </div>
    </div>
  );
}
