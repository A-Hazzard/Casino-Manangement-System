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
}: ShiftStatusBannerProps) {
  const { formatAmount } = useCurrencyFormat();

  const isPendingStart = status === 'pending_start';
  const isPendingReview = status === 'pending_review';

  if (pendingVmApproval) {
    const isStartRequest = !pendingVmApproval.type;
    const isIncrease = pendingVmApproval.type === 'increase' || isStartRequest;

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
            </div>
            {isIncrease && (
              <Button
                onClick={() => onConfirm?.(pendingVmApproval._id)}
                className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
                size="sm"
              >
                Confirm & Receive Cash
              </Button>
            )}
            {!isIncrease && (
              <div className="flex items-center gap-2 text-xs text-green-600 italic font-medium">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Waiting for VM to confirm receipt...
              </div>
            )}
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
                {refreshing && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
             </div>
          </div>
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
    return (
      <div className="bg-orange-50 border-l-4 border-orange-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-orange-400" aria-hidden="true" />
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm text-orange-700">
              Your shift is <strong>Under Review</strong>.
              <br/>
              Please contact your Vault Manager to resolve any discrepancies.
            </p>
            <div className="flex items-center gap-4 mt-2">
                <Button variant="link" size="sm" onClick={onRefresh} className="text-orange-800 p-0 h-auto">
                    Check Status
                </Button>
                {refreshing && (
                    <div className="flex items-center gap-1.5">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-600" />
                        <span className="text-xs text-orange-600 italic">Checking status...</span>
                    </div>
                )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
