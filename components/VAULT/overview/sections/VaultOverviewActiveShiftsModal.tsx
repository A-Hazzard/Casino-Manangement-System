/**
 * Vault Overview Active Shifts Modal Component
 *
 * Displays active and pending review shifts that block daily vault closure.
 *
 * @module components/VAULT/overview/sections/VaultOverviewActiveShiftsModal
 */
'use client';

import { Button } from '@/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';
import { safeFormatDate } from '@/lib/utils/date/formatting';
import type { CashDesk, UnbalancedShiftInfo } from '@/shared/types/vault';
import { AlertCircle, ArrowRight, Clock, RotateCcw } from 'lucide-react';

interface VaultOverviewActiveShiftsModalProps {
  open: boolean;
  onClose: () => void;
  activeShifts: CashDesk[];
  pendingShifts: UnbalancedShiftInfo[];
  onReviewShift: (shiftId: string) => void;
  onForceCloseShift: (cashier: CashDesk) => void;
  isBlurred?: boolean;
}

export default function VaultOverviewActiveShiftsModal({
  open,
  onClose,
  activeShifts,
  pendingShifts,
  onReviewShift,
  onForceCloseShift,
  isBlurred = false,
}: VaultOverviewActiveShiftsModalProps) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();

  // ============================================================================
  // Computed
  // ============================================================================
  const totalBlocked = activeShifts.length + pendingShifts.length;

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent
        className={cn(
          'flex h-[100dvh] w-full flex-col overflow-hidden rounded-none border-none p-0 shadow-2xl transition-all duration-300 md:h-auto md:max-w-[750px] md:rounded-xl',
          isBlurred && 'pointer-events-none scale-[0.98] blur-sm brightness-50'
        )}
      >
        {/* Premium Header - Fixed on mobile */}
        <DialogHeader className="shrink-0 border-b border-red-100 bg-gradient-to-r from-red-50 to-white p-5 text-left md:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100/50 shadow-inner">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black leading-tight text-gray-900">
                Cannot Close Operations
              </DialogTitle>
              <DialogDescription className="font-medium text-red-700/80">
                <strong>{totalBlocked}</strong> active item
                {totalBlocked > 1 ? 's' : ''} blocking closure
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Content Area */}
        <div className="custom-scrollbar flex-1 space-y-8 overflow-y-auto bg-[#fcfcfd] p-4 md:p-6">
          {/* Active Shifts Section */}
          {activeShifts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="ml-1 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                  Active Shifts (On-Duty)
                </h3>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-400">
                  {activeShifts.length} Shift
                  {activeShifts.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {activeShifts.map(shift => (
                  <div
                    key={shift._id}
                    className="group relative overflow-hidden rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="absolute bottom-0 right-0 top-0 w-1 bg-green-500/20 transition-colors group-hover:bg-green-500" />
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black tracking-tight text-gray-900">
                            {shift.cashierName}
                          </span>
                          <span className="items-center rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase text-green-700">
                            Active
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Started:{' '}
                            {safeFormatDate(shift.lastAudit, {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </span>
                          <span className="flex items-center gap-1 font-mono text-gray-600">
                            ${shift.balance?.toLocaleString()} Float
                          </span>
                        </div>
                      </div>
                      <Button
                        onClick={() => onForceCloseShift(shift)}
                        className="h-10 w-full border border-red-100 bg-red-50 text-[10px] font-black uppercase tracking-widest text-red-600 shadow-none transition-all hover:bg-red-600 hover:text-white sm:w-auto"
                      >
                        <RotateCcw className="mr-2 h-3.5 w-3.5" />
                        Force End Shift
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Review Section */}
          {pendingShifts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="ml-1 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-600">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  Needs Review (Awaiting Resolution)
                </h3>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                  {pendingShifts.length} Shift
                  {pendingShifts.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {pendingShifts.map(shift => (
                  <div
                    key={shift.shiftId}
                    className="group relative overflow-hidden rounded-xl border border-amber-100 bg-amber-50/30 p-4 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="absolute bottom-0 right-0 top-0 w-1 bg-amber-500/20 transition-colors group-hover:bg-amber-500" />
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black tracking-tight text-gray-900">
                            {shift.cashierName}
                          </span>
                          <span className="items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight text-amber-700">
                            Pending Review
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold tracking-tight text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Closed:{' '}
                            {safeFormatDate(shift.closedAt, {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </span>
                          <span
                            className={cn(
                              'flex items-center gap-1',
                              shift.discrepancy !== 0
                                ? 'text-red-600'
                                : 'text-green-600'
                            )}
                          >
                            Variance: {formatAmount(shift.discrepancy)}
                          </span>
                        </div>
                      </div>
                      <Button
                        onClick={() => onReviewShift(shift.shiftId)}
                        className="h-10 w-full bg-amber-600 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-amber-200 hover:bg-amber-700 sm:w-auto"
                      >
                        <ArrowRight className="mr-2 h-3.5 w-3.5" />
                        Open Review
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State protection (shouldn't happen given component logic) */}
          {totalBlocked === 0 && (
            <div className="flex flex-col items-center justify-center space-y-4 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <AlertCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">All Clear!</h4>
                <p className="text-sm text-gray-500">
                  All shifts have been resolved. You can now close the day.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <DialogFooter className="shrink-0 flex-row justify-end space-x-3 border-t bg-gray-50 p-4 md:p-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-12 w-full border-2 px-8 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-white md:w-auto"
          >
            Close Window
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
