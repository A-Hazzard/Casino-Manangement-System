/**
 * New Collection Financials Component
 *
 * Handles financial inputs for the New Collection Modal
 *
 * Features:
 * - Taxes, Advance, Variance inputs
 * - Amount To Collect (auto-calculated)
 * - Collected Amount with tooltip
 * - Balance Correction with tooltip
 * - Previous Balance (auto-calculated)
 * - Reason fields
 */

'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type FinancialsData = {
  taxes: string;
  advance: string;
  variance: string;
  varianceReason: string;
  amountToCollect: string;
  collectedAmount: string;
  balanceCorrection: string;
  balanceCorrectionReason: string;
  previousBalance: string;
  reasonForShortagePayment: string;
};

type NewCollectionFinancialsProps = {
  financials: FinancialsData;
  baseBalanceCorrection: string;
  isProcessing: boolean;
  onFinancialsChange: (updates: Partial<FinancialsData>) => void;
  onBaseBalanceCorrectionChange: (value: string) => void;
  onCollectedAmountChange: (value: string) => void;
};

export default function CollectionReportNewCollectionFinancials({
  financials,
  baseBalanceCorrection,
  isProcessing,
  onFinancialsChange,
  onBaseBalanceCorrectionChange,
  onCollectedAmountChange,
}: NewCollectionFinancialsProps) {
  return (
    <>
      <hr className="my-4 border-gray-300" />
      <p className="text-center text-lg font-semibold text-gray-700">
        Shared Financials for Batch
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Taxes:
          </label>
          <Input
            type="text"
            placeholder="0"
            value={financials.taxes}
            onChange={e =>
              (/^-?\d*\.?\d*$/.test(e.target.value) || e.target.value === '') &&
              onFinancialsChange({ taxes: e.target.value })
            }
            disabled={isProcessing}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Advance:
          </label>
          <Input
            type="text"
            placeholder="0"
            value={financials.advance}
            onChange={e =>
              (/^-?\d*\.?\d*$/.test(e.target.value) || e.target.value === '') &&
              onFinancialsChange({ advance: e.target.value })
            }
            disabled={isProcessing}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Variance:
          </label>
          <Input
            type="text"
            placeholder="0"
            value={financials.variance}
            onChange={e =>
              (/^-?\d*\.?\d*$/.test(e.target.value) || e.target.value === '') &&
              onFinancialsChange({ variance: e.target.value })
            }
            disabled={isProcessing}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Variance Reason:
          </label>
          <Textarea
            placeholder="Variance Reason"
            value={financials.varianceReason}
            onChange={e => onFinancialsChange({ varianceReason: e.target.value })}
            className="min-h-[40px]"
            disabled={isProcessing}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Amount To Collect:{' '}
            <span className="text-red-500">*</span>{' '}
            <span className="text-xs text-gray-400">(Auto-calculated)</span>
          </label>
          <Input
            type="text"
            placeholder="0"
            value={financials.amountToCollect}
            readOnly
            className="cursor-not-allowed bg-gray-100"
            title="This value is automatically calculated"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Collected Amount:
          </label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Input
                    type="text"
                    placeholder="0"
                    value={financials.collectedAmount}
                    onChange={e => {
                      if (
                        /^-?\d*\.?\d*$/.test(e.target.value) ||
                        e.target.value === ''
                      ) {
                        onCollectedAmountChange(e.target.value);
                      }
                    }}
                    disabled={
                      isProcessing ||
                      (baseBalanceCorrection.trim() === '' &&
                        financials.balanceCorrection.trim() === '')
                    }
                  />
                </div>
              </TooltipTrigger>
              {isProcessing ||
              (baseBalanceCorrection.trim() === '' &&
                financials.balanceCorrection.trim() === '') ? (
                <TooltipContent>
                  <p>
                    {isProcessing
                      ? 'Please wait until processing completes.'
                      : 'Enter a Balance Correction first, then the Collected Amount will unlock.'}
                  </p>
                </TooltipContent>
              ) : null}
            </Tooltip>
          </TooltipProvider>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Balance Correction:{' '}
            <span className="text-red-500">*</span>
          </label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Input
                    type="text"
                    placeholder="0"
                    value={financials.balanceCorrection}
                    onChange={e => {
                      if (
                        /^-?\d*\.?\d*$/.test(e.target.value) ||
                        e.target.value === ''
                      ) {
                        const newBalanceCorrection = e.target.value;
                        onFinancialsChange({ balanceCorrection: newBalanceCorrection });
                        onBaseBalanceCorrectionChange(newBalanceCorrection);
                      }
                    }}
                    className="border-gray-300 bg-white focus:border-primary"
                    title="Balance correction amount (editable)"
                    disabled={
                      isProcessing || financials.collectedAmount.trim() !== ''
                    }
                  />
                </div>
              </TooltipTrigger>
              {isProcessing || financials.collectedAmount.trim() !== '' ? (
                <TooltipContent>
                  <p>
                    {isProcessing
                      ? 'Please wait until processing completes.'
                      : 'Clear the Collected Amount to edit the Balance Correction.'}
                  </p>
                </TooltipContent>
              ) : null}
            </Tooltip>
          </TooltipProvider>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Balance Correction Reason:
          </label>
          <Textarea
            placeholder="Correction Reason"
            value={financials.balanceCorrectionReason}
            onChange={e =>
              onFinancialsChange({ balanceCorrectionReason: e.target.value })
            }
            className="min-h-[40px]"
            disabled={isProcessing}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Previous Balance:{' '}
            <span className="text-xs text-gray-400">
              (Auto-calculated: collected amount - amount to collect)
            </span>
          </label>
          <Input
            type="text"
            placeholder="0"
            value={financials.previousBalance}
            onChange={e =>
              onFinancialsChange({ previousBalance: e.target.value })
            }
            className="border-gray-300 bg-white focus:border-primary"
            title="Auto-calculated as collected amount minus amount to collect (editable)"
            disabled={isProcessing}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Reason For Shortage Payment:
          </label>
          <Textarea
            placeholder="Shortage Reason"
            value={financials.reasonForShortagePayment}
            onChange={e =>
              onFinancialsChange({ reasonForShortagePayment: e.target.value })
            }
            className="min-h-[40px]"
            disabled={isProcessing}
          />
        </div>
      </div>
    </>
  );
}

