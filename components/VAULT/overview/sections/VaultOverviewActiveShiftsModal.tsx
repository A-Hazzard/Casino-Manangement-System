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
  const { formatAmount } = useCurrencyFormat();

  const totalBlocked = activeShifts.length + pendingShifts.length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent 
        className={cn(
          "w-full h-[100dvh] md:h-auto md:max-w-[750px] flex flex-col p-0 overflow-hidden rounded-none md:rounded-xl border-none shadow-2xl transition-all duration-300",
          isBlurred && "blur-sm brightness-50 pointer-events-none scale-[0.98]"
        )}
      >
        {/* Premium Header - Fixed on mobile */}
        <DialogHeader className="p-5 md:p-6 bg-gradient-to-r from-red-50 to-white border-b border-red-100 shrink-0 text-left">
          <div className="flex items-center gap-3">
             <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100/50 shadow-inner">
                <AlertCircle className="h-6 w-6 text-red-600" />
             </div>
             <div>
                <DialogTitle className="text-xl font-black text-gray-900 leading-tight">
                  Cannot Close Operations
                </DialogTitle>
                <DialogDescription className="text-red-700/80 font-medium">
                  <strong>{totalBlocked}</strong> active item{totalBlocked > 1 ? 's' : ''} blocking closure
                </DialogDescription>
             </div>
          </div>
        </DialogHeader>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 custom-scrollbar bg-[#fcfcfd]">
          {/* Active Shifts Section */}
          {activeShifts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  Active Shifts (On-Duty)
                </h3>
                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {activeShifts.length} Shift{activeShifts.length > 1 ? 's' : ''}
                </span>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                {activeShifts.map((shift) => (
                  <div key={shift._id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-all group overflow-hidden relative">
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-green-500/20 group-hover:bg-green-500 transition-colors" />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-gray-900 tracking-tight">{shift.cashierName}</span>
                          <span className="text-[10px] items-center px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-bold uppercase">Active</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-[11px] text-gray-400 font-bold">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Started: {safeFormatDate(shift.lastAudit, { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                          <span className="flex items-center gap-1 font-mono text-gray-600">${shift.balance?.toLocaleString()} Float</span>
                        </div>
                      </div>
                      <Button 
                        onClick={() => onForceCloseShift(shift)}
                        className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-100 h-10 w-full sm:w-auto font-black uppercase text-[10px] tracking-widest shadow-none transition-all"
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-2" />
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
                <h3 className="text-xs font-black uppercase tracking-widest text-amber-600 ml-1 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  Needs Review (Awaiting Resolution)
                </h3>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  {pendingShifts.length} Shift{pendingShifts.length > 1 ? 's' : ''}
                </span>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                {pendingShifts.map((shift) => (
                  <div key={shift.shiftId} className="bg-amber-50/30 rounded-xl border border-amber-100 shadow-sm p-4 hover:shadow-md transition-all group overflow-hidden relative">
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-amber-500/20 group-hover:bg-amber-500 transition-colors" />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-gray-900 tracking-tight">{shift.cashierName}</span>
                          <span className="text-[10px] items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold uppercase tracking-tight">Pending Review</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-[11px] text-gray-500 font-bold tracking-tight">
                           <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Closed: {safeFormatDate(shift.closedAt, { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                           <span className={cn(
                             "flex items-center gap-1",
                             shift.discrepancy !== 0 ? "text-red-600" : "text-green-600"
                           )}>
                             Variance: {formatAmount(shift.discrepancy)}
                           </span>
                        </div>
                      </div>
                      <Button 
                        onClick={() => onReviewShift(shift.shiftId)}
                        className="bg-amber-600 text-white hover:bg-amber-700 h-10 w-full sm:w-auto font-black uppercase text-[10px] tracking-widest shadow-lg shadow-amber-200"
                      >
                        <ArrowRight className="h-3.5 w-3.5 mr-2" />
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
             <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                    <AlertCircle className="h-8 w-8 text-green-600" />
                </div>
                <div>
                   <h4 className="font-bold text-gray-900">All Clear!</h4>
                   <p className="text-sm text-gray-500">All shifts have been resolved. You can now close the day.</p>
                </div>
             </div>
          )}
        </div>

        {/* Fixed Footer */}
        <DialogFooter className="p-4 md:p-6 bg-gray-50 border-t shrink-0 flex-row justify-end space-x-3">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="h-12 px-8 font-black uppercase text-[10px] tracking-widest border-2 hover:bg-white transition-all w-full md:w-auto"
          >
            Close Window
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

