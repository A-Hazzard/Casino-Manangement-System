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
import type { CashierShift, Denomination } from '@/shared/types/vault';
import { AlertCircle, Clock, Loader2 } from 'lucide-react';

type PendingVmApproval = {
  _id: string;
  type?: string;
  requestNotes?: string;
  approvedAmount?: number;
  approvedDenominations?: Denomination[];
  requestedDenominations?: Denomination[];
};

type PendingFloatRequest = {
  _id: string;
  type?: string;
  requestedAmount?: number;
};

type ShiftStatusBannerProps = {
  status: string;
  shift: CashierShift | null;
  refreshing: boolean;
  onRefresh: () => void;
  onCancel: () => void;
  pendingVmApproval?: PendingVmApproval | null;
  pendingRequest?: PendingFloatRequest | null;
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
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();

  // ============================================================================
  // Computed
  // ============================================================================
  const isPendingStart = status === 'pending_start';
  const isPendingReview = status === 'pending_review';

  // ============================================================================
  // Render
  // ============================================================================

  // Guard: approved VM float — show receipt confirmation banner
  if (pendingVmApproval) {
    const isStartRequest =
      !pendingVmApproval.type ||
      pendingVmApproval.requestNotes?.toLowerCase().includes('initial');
    const isIncrease =
      (pendingVmApproval.type === 'increase' || isStartRequest) &&
      pendingVmApproval.type !== 'decrease';

    return (
      <div className="mb-4 border-l-4 border-green-500 bg-green-50 p-4 animate-in fade-in slide-in-from-top-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <Clock className="h-5 w-5 text-green-500" aria-hidden="true" />
          </div>
          <div className="ml-3 flex flex-1 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">
                {isStartRequest
                  ? 'Shift Approved!'
                  : isIncrease
                    ? 'Float Request Approved!'
                    : 'Return Approved!'}
              </p>
              <p className="mt-1 text-sm text-green-700">
                {isIncrease ? (
                  <>
                    Vault Manager has prepared{' '}
                    <strong>
                      {formatAmount(pendingVmApproval.approvedAmount ?? 0)}
                    </strong>{' '}
                    for you. Please collect the cash and confirm receipt.
                  </>
                ) : (
                  <>
                    Vault Manager has approved your return of{' '}
                    <strong>
                      {formatAmount(pendingVmApproval.approvedAmount ?? 0)}
                    </strong>
                    . Please hand over the cash and wait for VM confirmation.
                  </>
                )}
              </p>

              {isIncrease &&
                (() => {
                  const denominationsToShow =
                    pendingVmApproval.approvedDenominations &&
                    pendingVmApproval.approvedDenominations.length > 0
                      ? pendingVmApproval.approvedDenominations
                      : pendingVmApproval.requestedDenominations;

                  if (denominationsToShow && denominationsToShow.length > 0) {
                    return (
                      <div className="mt-3 inline-block min-w-[200px] rounded-md border border-green-200 bg-white/60 p-3 text-xs shadow-sm">
                        <div className="mb-2 flex items-center justify-between border-b border-green-100 pb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-green-800">
                            Prepared Breakdown
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {denominationsToShow
                            .filter((denomination: Denomination) => denomination.quantity > 0)
                            .sort(
                              (a: Denomination, b: Denomination) =>
                                b.denomination - a.denomination
                            )
                            .map((denomination: Denomination, index: number) => (
                              <div
                                key={index}
                                className="flex min-w-[3rem] flex-col items-center justify-center rounded border border-green-100 bg-green-50 px-2 py-1"
                              >
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                  ${denomination.denomination}
                                </span>
                                <span className="text-sm font-black text-green-900">
                                  {denomination.quantity}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
            </div>
            <div className="flex flex-col items-center gap-2 sm:flex-row">
              {isIncrease ? (
                <Button
                  onClick={() => onConfirm?.(pendingVmApproval._id)}
                  className="w-full bg-green-600 font-bold text-white shadow-sm hover:bg-green-700 sm:w-auto"
                  size="sm"
                >
                  Confirm & Receive Cash
                </Button>
              ) : (
                <div className="flex items-center gap-2 rounded-lg bg-green-100/50 px-3 py-2 text-xs font-bold italic text-green-600">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  VM is confirming receipt...
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCancelRequest?.(pendingVmApproval._id)}
                className="w-full font-medium text-red-600 hover:bg-red-50 hover:text-red-700 sm:w-auto"
              >
                Disapprove
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'active' && shift?.vmReviewNotes) {
    const discrepancy =
      (shift.cashierEnteredBalance || 0) - (shift.expectedClosingBalance || 0);

    return (
      <div className="mb-4 border-l-4 border-red-500 bg-red-50 p-4 animate-in fade-in slide-in-from-top-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <AlertCircle
                className="h-5 w-5 text-red-500"
                aria-hidden="true"
              />
            </div>
            <div>
              <p className="text-sm font-bold text-red-800">
                Shift Closure Rejected
              </p>
              <p className="mt-1 text-sm text-red-700">
                Your previous end-shift request was rejected by the manager:
                <br />
                <span className="font-medium italic">
                  "{shift.vmReviewNotes}"
                </span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-lg border border-red-100 bg-white/50 p-3 sm:grid-cols-3">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                System Expected
              </span>
              <span className="text-sm font-black text-gray-900">
                {formatAmount(shift.expectedClosingBalance || 0)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                You Entered
              </span>
              <span className="text-sm font-black text-gray-900">
                {formatAmount(shift.cashierEnteredBalance || 0)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Discrepancy
              </span>
              <span
                className={`text-sm font-black ${discrepancy > 0.01 ? 'text-red-600' : discrepancy < -0.01 ? 'text-green-600' : 'text-gray-600'}`}
              >
                {discrepancy > 0.01 ? '+' : ''}
                {formatAmount(discrepancy)}
              </span>
            </div>
          </div>

          {shift.cashierEnteredDenominations &&
            shift.cashierEnteredDenominations.length > 0 && (
              <div className="rounded border border-red-100 bg-white/30 p-2 text-xs">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-red-800">
                  Your Counted Breakdown:
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {shift.cashierEnteredDenominations
                    .filter(denom => denom.quantity > 0)
                    .sort((a, b) => b.denomination - a.denomination)
                    .map((denomination, index) => (
                      <div key={index} className="flex gap-2">
                        <span className="text-gray-500">
                          ${denomination.denomination}:
                        </span>
                        <span className="font-bold text-gray-900">
                          {denomination.quantity}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

          <p className="text-xs font-medium text-red-600">
            Please verify your physical cash against the counts above and
            re-submit your closure.
          </p>
        </div>
      </div>
    );
  }

  if (isPendingStart) {
    return (
      <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <Clock className="h-5 w-5 text-yellow-400" aria-hidden="true" />
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm text-yellow-700">
              Your shift request is <strong>Waiting for Approval</strong> from
              the Vault Manager.
              <br />
              Total Requested: {formatAmount(shift?.openingBalance || 0)}
            </p>

            {shift?.openingDenominations &&
              shift.openingDenominations.length > 0 && (
                <div className="mt-3 inline-block rounded border border-yellow-200 bg-white/50 p-2 text-xs">
                  <p className="mb-1 font-semibold uppercase tracking-wider text-yellow-800">
                    Breakdown:
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {shift.openingDenominations
                      .filter(denom => denom.quantity > 0)
                      .map((denomination, index) => (
                        <div key={index} className="flex gap-2">
                          <span className="text-gray-500">
                            ${denomination.denomination}:
                          </span>
                          <span className="font-medium text-gray-900">
                            {denomination.quantity}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

            <div className="mt-2 flex items-center gap-4">
              <Button
                variant="link"
                size="sm"
                onClick={onRefresh}
                className="h-auto p-0 text-yellow-800"
              >
                Check Status
              </Button>
              <Button
                variant="link"
                size="sm"
                onClick={onCancel}
                className="h-auto p-0 text-red-700 hover:text-red-800"
              >
                Cancel Request
              </Button>
              {refreshing && (
                <div className="ml-2 flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-600" />
                  <span className="text-xs italic text-yellow-600">
                    Checking request...
                  </span>
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
      <div className="animate-pulse border-l-4 border-orange-400 bg-orange-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle
              className="h-5 w-5 text-orange-400"
              aria-hidden="true"
            />
          </div>
          <div className="ml-3 flex flex-1 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-orange-800">
                Shift Under Review
              </p>
              <p className="mt-1 text-sm text-orange-700">
                {hasDiscrepancy
                  ? 'Your shift is being reviewed by the Vault Manager due to a balance discrepancy.'
                  : 'Your shift has been submitted. Please wait while the Vault Manager completes the review.'}
                <br />
                <span className="mt-1 block text-xs italic">
                  Your session will automatically end once the review is
                  finalized by your manager.
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="border-orange-200 text-orange-800"
              >
                Refresh Status
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="text-red-700 hover:bg-red-50 hover:text-red-800"
              >
                Cancel Submission
              </Button>
              {refreshing && (
                <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Generic Pending Request (Float increase/decrease for active shifts)
  if (pendingRequest) {
    const isIncrease = pendingRequest.type === 'increase';
    return (
      <div className="mb-4 border-l-4 border-blue-400 bg-blue-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <Clock className="h-5 w-5 text-blue-400" aria-hidden="true" />
          </div>
          <div className="ml-3 flex flex-1 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">
                {isIncrease
                  ? 'Float Increase Requested'
                  : 'Float Return Requested'}
              </p>
              <p className="mt-1 text-sm text-blue-700">
                Your request for{' '}
                <strong>
                  {formatAmount(pendingRequest.requestedAmount ?? 0)}
                </strong>{' '}
                is waiting for Vault Manager approval.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="border-blue-200 text-blue-700"
              >
                Refresh Status
              </Button>
              {onCancelRequest && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCancelRequest(pendingRequest._id)}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  Cancel Request
                </Button>
              )}
              {refreshing && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
