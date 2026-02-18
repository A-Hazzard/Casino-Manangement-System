/**
 * Shift Status Banner Component
 *
 * Displays pending shift status and review banners for cashiers.
 *
 * @module components/VAULT/cashier/sections/ShiftStatusBanner
 */
'use client';

import { Button } from '@/components/shared/ui/button';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import type { CashierShift } from '@/shared/types/vault';
import { AlertCircle, Clock, Loader2 } from 'lucide-react';

type ShiftStatusBannerProps = {
  status: string;
  shift: CashierShift | null;
  refreshing: boolean;
  onRefresh: () => void;
  onCancel: () => void;
  pendingVmApproval?: any;
  pendingRequest?: any;
  onConfirm?: (requestId: string) => void;
  onCancelRequest?: (requestId: string) => void;
};

export default function ShiftStatusBanner({
  status,
  shift,
  refreshing,
  onRefresh,
  onCancel,
  pendingVmApproval,
  pendingRequest,
  onConfirm,
  onCancelRequest,
}: ShiftStatusBannerProps) {
  const { formatAmount } = useCurrencyFormat();

  const isPendingStart = status === 'pending_start';
  const isPendingReview = status === 'pending_review';

  if (pendingVmApproval) {
    const isStartRequest = !pendingVmApproval.type || pendingVmApproval.requestNotes?.toLowerCase().includes('initial');
    const isIncrease = (pendingVmApproval.type === 'increase' || isStartRequest) && pendingVmApproval.type !== 'decrease';

    return (
      <div className="bg-green-50 border-l-4 border-green-500 p-4 animate-in fade-in slide-in-from-top-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <Clock className="h-5 w-5 text-green-500" aria-hidden="true" />
          </div>
          <div className="ml-3 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-green-800">
                {isStartRequest ? 'Shift Approved!' : isIncrease ? 'Float Request Approved!' : 'Return Approved!'}
              </p>
              <p className="text-sm text-green-700 mt-1">
                {isIncrease ? (
                  <>Vault Manager has prepared <strong>{formatAmount(pendingVmApproval.approvedAmount)}</strong> for you. Please collect the cash and confirm receipt.</>
                ) : (
                  <>Vault Manager has approved your return of <strong>{formatAmount(pendingVmApproval.approvedAmount)}</strong>. Please hand over the cash and wait for VM confirmation.</>
                )}
              </p>

              {isIncrease && (() => {
                  const denominationsToShow = pendingVmApproval.approvedDenominations && pendingVmApproval.approvedDenominations.length > 0 
                      ? pendingVmApproval.approvedDenominations 
                      : pendingVmApproval.requestedDenominations;

                  if (denominationsToShow && denominationsToShow.length > 0) {
                      return (
                          <div className="bg-white/60 rounded-md p-3 text-xs border border-green-200 mt-3 shadow-sm inline-block min-w-[200px]">
                              <div className="flex justify-between items-center mb-2 border-b border-green-100 pb-1">
                                  <span className="font-bold text-green-800 uppercase tracking-wider text-[10px]">Prepared Breakdown</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                  {denominationsToShow
                                      .filter((d: any) => d.quantity > 0)
                                      .sort((a: any, b: any) => b.denomination - a.denomination)
                                      .map((d: any, i: number) => (
                                      <div key={i} className="flex flex-col items-center justify-center bg-green-50 border border-green-100 rounded px-2 py-1 min-w-[3rem]">
                                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">${d.denomination}</span>
                                          <span className="text-sm font-black text-green-900">{d.quantity}</span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      );
                  }
                  return null;
              })()}

            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              {isIncrease ? (
                <Button
                  onClick={() => onConfirm?.(pendingVmApproval._id)}
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white shadow-sm font-bold"
                  size="sm"
                >
                  Confirm & Receive Cash
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-xs text-green-600 italic font-bold py-2 px-3 bg-green-100/50 rounded-lg">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  VM is confirming receipt...
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCancelRequest?.(pendingVmApproval._id)}
                className="w-full sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50 font-medium"
              >
                Disapprove
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (pendingRequest) {
    const isIncrease = pendingRequest.type === 'increase';
    return (
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <Clock className="h-5 w-5 text-blue-400" aria-hidden="true" />
          </div>
          <div className="ml-3 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
             <div>
               <p className="text-sm font-medium text-blue-800">
                 {isIncrease ? 'Float Increase Requested' : 'Float Return Requested'}
               </p>
               <p className="text-sm text-blue-700 mt-1">
                 Your request for <strong>{formatAmount(pendingRequest.requestedAmount)}</strong> is waiting for Vault Manager approval.
               </p>
             </div>
             <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onRefresh} className="text-blue-700 border-blue-200">
                    Refresh Status
                </Button>
                {onCancelRequest && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onCancelRequest(pendingRequest._id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Cancel Request
                  </Button>
                )}
                {refreshing && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'active' && shift?.vmReviewNotes) {
    const discrepancy = (shift.cashierEnteredBalance || 0) - (shift.expectedClosingBalance || 0);

    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 animate-in fade-in slide-in-from-top-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-800">
                Shift Closure Rejected
              </p>
              <p className="text-sm text-red-700 mt-1">
                Your previous end-shift request was rejected by the manager:
                <br/>
                <span className="font-medium italic">"{shift.vmReviewNotes}"</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/50 rounded-lg p-3 border border-red-100">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">System Expected</span>
              <span className="text-sm font-black text-gray-900">{formatAmount(shift.expectedClosingBalance || 0)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">You Entered</span>
              <span className="text-sm font-black text-gray-900">{formatAmount(shift.cashierEnteredBalance || 0)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Discrepancy</span>
              <span className={`text-sm font-black ${discrepancy > 0.01 ? 'text-red-600' : discrepancy < -0.01 ? 'text-green-600' : 'text-gray-600'}`}>
                {discrepancy > 0.01 ? '+' : ''}{formatAmount(discrepancy)}
              </span>
            </div>
          </div>

          {shift.cashierEnteredDenominations && shift.cashierEnteredDenominations.length > 0 && (
            <div className="bg-white/30 rounded p-2 text-xs border border-red-100">
              <p className="font-semibold mb-1 text-red-800 uppercase tracking-wider text-[10px]">Your Counted Breakdown:</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {shift.cashierEnteredDenominations
                  .filter(d => d.quantity > 0)
                  .sort((a, b) => b.denomination - a.denomination)
                  .map((d, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-gray-500">${d.denomination}:</span>
                    <span className="font-bold text-gray-900">{d.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-red-600 font-medium">
            Please verify your physical cash against the counts above and re-submit your closure.
          </p>
        </div>
      </div>
    );
  }

  if (!isPendingStart && !isPendingReview) return null;

  if (isPendingStart) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <Clock className="h-5 w-5 text-yellow-400" aria-hidden="true" />
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm text-yellow-700">
              Your shift request is <strong>Waiting for Approval</strong> from the Vault Manager.
              <br/>
              Total Requested: {formatAmount(shift?.openingBalance || 0)}
            </p>
            
            {shift?.openingDenominations && shift.openingDenominations.length > 0 && (
              <div className="mt-3 bg-white/50 rounded p-2 text-xs border border-yellow-200 inline-block">
                <p className="font-semibold mb-1 text-yellow-800 uppercase tracking-wider">Breakdown:</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {shift.openingDenominations
                    .filter(d => d.quantity > 0)
                    .map((d, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-gray-500">${d.denomination}:</span>
                      <span className="font-medium text-gray-900">{d.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4 mt-2 items-center">
                <Button variant="link" size="sm" onClick={onRefresh} className="text-yellow-800 p-0 h-auto">
                    Check Status
                </Button>
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={onCancel} 
                  className="text-red-700 p-0 h-auto hover:text-red-800"
                >
                    Cancel Request
                </Button>
                {refreshing && (
                  <div className="flex items-center gap-1.5 ml-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-600" />
                    <span className="text-xs text-yellow-600 italic">Checking request...</span>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isPendingReview) {
    const hasDiscrepancy = Math.abs(shift?.discrepancy || 0) > 0.01;

    return (
      <div className="bg-orange-50 border-l-4 border-orange-400 p-4 animate-pulse">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-orange-400" aria-hidden="true" />
          </div>
          <div className="ml-3 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-orange-800">
                Shift Under Review
              </p>
              <p className="text-sm text-orange-700 mt-1">
                {hasDiscrepancy 
                  ? "Your shift is being reviewed by the Vault Manager due to a balance discrepancy."
                  : "Your shift has been submitted. Please wait while the Vault Manager completes the review."}
                <br/>
                <span className="text-xs italic mt-1 block">Your session will automatically end once the review is finalized by your manager.</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onRefresh} className="text-orange-800 border-orange-200">
                    Refresh Status
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onCancel} 
                  className="text-red-700 hover:text-red-800 hover:bg-red-50"
                >
                    Cancel Submission
                </Button>
                {refreshing && <Loader2 className="h-4 w-4 animate-spin text-orange-500" />}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
