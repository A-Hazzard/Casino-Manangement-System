/**
 * Vault Overview Quick Actions Section Component
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
 * @module components/VAULT/overview/sections/VaultOverviewQuickActionsSection
 */
'use client';

import { Button } from '@/components/shared/ui/button';
import { History, Landmark, Minus, Plus, Receipt, RefreshCw, Users } from 'lucide-react';

type VaultOverviewQuickActionsSectionProps = {
  onAddCash: () => void;
  onRemoveCash: () => void;
  onRecordExpense: () => void;
  onManageCashiers?: () => void;
  onSoftCount?: () => void;
  onViewActivityLog?: () => void;
  onCloseVault?: () => void;
  isShiftActive?: boolean;
  isReconciled?: boolean;
  isStaleShift?: boolean;
  isAdminOrDev?: boolean;
};

export default function VaultOverviewQuickActionsSection({
  onAddCash,
  onRemoveCash,
  onRecordExpense,
  onManageCashiers,
  onSoftCount,
  onViewActivityLog,
  onCloseVault,
  isShiftActive = false,
  isReconciled = false,
  isStaleShift = false,
  isAdminOrDev = false,
}: VaultOverviewQuickActionsSectionProps) {
  // Operational buttons are disabled if shift is not active, not reconciled, OR stale
  const operationalDisabled = (!isShiftActive || !isReconciled || isStaleShift);
  const disabledClasses = operationalDisabled ? "opacity-40 cursor-not-allowed" : "";
  
  // Navigation-only buttons are enabled even if shift is not active
  const navDisabledClasses = "";

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        <span className="text-gray-400">→</span>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {/* Add Cash Button - Green for positive action */}
        {!isAdminOrDev && (
          <Button
            onClick={onAddCash}
            className={`h-auto min-h-[70px] flex-col gap-1 bg-button py-3 text-white hover:bg-button/90 ${disabledClasses}`}
            size="sm"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-xs font-semibold sm:text-sm line-clamp-1">Add Cash</span>
          </Button>
        )}

        {/* Remove Cash Button - Orange for withdrawal action */}
        {!isAdminOrDev && (
          <Button
            onClick={onRemoveCash}
            className={`h-auto min-h-[70px] flex-col gap-1 bg-orangeHighlight py-3 text-white hover:bg-orangeHighlight/90 ${disabledClasses}`}
            size="sm"
          >
            <Minus className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-xs font-semibold sm:text-sm line-clamp-1">
              Remove Cash
            </span>
          </Button>
        )}

        {/* Record Expense Button - Blue for informational action */}
        {!isAdminOrDev && (
          <Button
            onClick={onRecordExpense}
            className={`h-auto min-h-[70px] flex-col gap-1 bg-lighterBlueHighlight py-3 text-white hover:bg-lighterBlueHighlight/90 ${disabledClasses}`}
            size="sm"
          >
            <Receipt className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-xs font-semibold sm:text-sm line-clamp-1">
              Record Expense
            </span>
          </Button>
        )}

        {/* Soft Count - Indigo */}
        {!isAdminOrDev && onSoftCount && (
          <Button
            onClick={onSoftCount}
            className={`h-auto min-h-[70px] flex-col gap-1 bg-indigo-600 py-3 text-white hover:bg-indigo-700 ${disabledClasses}`}
            size="sm"
            title="Count collected cash and add it to vault inventory"
          >
            <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-xs font-semibold sm:text-sm line-clamp-1">
              Soft Count
            </span>
          </Button>
        )}

        {/* Manage Cashiers Button - Teal for admin action */}
        {onManageCashiers && (
          <Button
            onClick={onManageCashiers}
            className={`h-auto min-h-[70px] flex-col gap-1 bg-teal-600 py-3 text-white hover:bg-teal-700 ${navDisabledClasses}`}
            size="sm"
          >
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-xs font-semibold sm:text-sm line-clamp-1">
              Manage Cashiers
            </span>
          </Button>
        )}

        {/* Activity Log - Blue/Gray */}
        {!isAdminOrDev && onViewActivityLog && (
          <Button
            onClick={onViewActivityLog}
            className={`h-auto min-h-[70px] flex-col gap-1 bg-slate-600 py-3 text-white hover:bg-slate-700 ${navDisabledClasses}`}
            size="sm"
            title="View complete audit trail of vault operations"
          >
            <History className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-xs font-semibold sm:text-sm line-clamp-1">
              Activity Log
            </span>
          </Button>
        )}

        {/* Close Vault Button - Orange highlight for end of day */}
        {!isAdminOrDev && onCloseVault && (
          <Button
            onClick={onCloseVault}
            className={`h-auto min-h-[70px] flex-col gap-1 bg-orange-600 py-3 text-white hover:bg-orange-700 ${!isShiftActive ? "opacity-40 cursor-not-allowed" : ""}`}
            size="sm"
            title="Submit final counts and close the vault day"
          >
            <Landmark className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-xs font-semibold sm:text-sm line-clamp-1">
              Close Day
            </span>
          </Button>
        )}
      </div>
    </div>
  );
}
