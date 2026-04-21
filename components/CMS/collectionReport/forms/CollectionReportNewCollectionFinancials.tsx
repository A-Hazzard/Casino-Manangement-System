/**
 * New Collection Financials Component
 *
 * Handles financial inputs for the New Collection Modal.
 *
 * Features:
 * - Taxes, Advance, Variance inputs
 * - Amount To Collect (auto-calculated)
 * - Collected Amount with tooltip
 * - Balance Correction with tooltip
 * - Previous Balance (auto-calculated)
 * - Reason fields
 *
 * @param financials - Object containing all financial data (taxes, advance, variance, etc.)
 * @param baseBalanceCorrection - The base correction value used as the starting point for reconciliation
 * @param isProcessing - Loading state for async operations
 * @param onFinancialsChange - Callback triggered when any shared financial field value changes
 * @param onBaseBalanceCorrectionChange - Callback triggered when the base balance correction is updated
 * @param onCollectedAmountChange - Callback triggered when the physical collected amount is updated
 */

'use client';

import { CalculationHelp } from '@/components/shared/ui/CalculationHelp';
import { Input } from '@/components/shared/ui/input';
import { Textarea } from '@/components/shared/ui/textarea';
import { Info } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/shared/ui/tooltip';

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
          <label className="mb-2 flex items-center text-sm font-medium text-gray-700">
            Taxes:
            <CalculationHelp 
              title="Taxes" 
              formula="Value entered manually" 
              description="Government or administrative taxes applied to the profit share."
            />
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
          <label className="mb-2 flex items-center text-sm font-medium text-gray-700">
            Advance:
            <CalculationHelp 
              title="Advance" 
              formula="Value entered manually" 
              description="Upfront payment or loan provided to the partner before this collection."
            />
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
          <label className="mb-2 flex items-center text-sm font-medium text-gray-700">
            Variance:
            <CalculationHelp 
              title="Variance" 
              formula="Value entered manually" 
              description="Expected vs actual money difference (e.g., incorrect payout, theft, or machine error)."
            />
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
          <label className="mb-2 flex items-center text-sm font-bold text-gray-700">
            Amount To Collect:{' '}
            <span className="text-red-500 ml-1">*</span>
            <CalculationHelp 
              title="Amount to Collect" 
              formula="(Meters Profit - Variance - Advance) - Partner Share + Opening Balance" 
              description="This is the ESTIMATED target amount. It starts with the machine revenue (Meters In - Out), subtracts manual adjustments (Advance/Variance) and the Partner's share, and then adds the opening balance carried over from the previous collection."
            />
          </label>
          <Input
            type="text"
            placeholder="0"
            value={financials.amountToCollect}
            readOnly
            className="cursor-not-allowed bg-gray-50 font-semibold text-gray-900"
            title="This value is automatically calculated"
          />
          <p className="mt-1 text-[10px] text-gray-500 italic">
            Computed automatically based on meters and settings.
          </p>
        </div>
        <div>
          <label className="mb-2 flex items-center text-sm font-bold text-gray-700">
            Collected Amount:
            <CalculationHelp 
              title="Collected Amount" 
              formula="The actual physical cash you counted" 
              description="Enter the EXACT total amount of physical cash retrieving from all machines. The system compares this to the 'Amount to Collect' to determine the shortage or overage for the next report."
            />
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
          <p className="mt-1.5 text-xs leading-tight font-medium">
            {(baseBalanceCorrection.trim() === '' && financials.balanceCorrection.trim() === '') 
              ? <span className="text-amber-600 flex items-center gap-1.5 bg-amber-50 p-2 rounded border border-amber-200">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  Locked: Enter a Balance Correction first (even if 0) to unlock this field.
                </span>
              : <span className="text-blue-700 bg-blue-50 p-2 rounded border border-blue-200 block">
                  Action: Count all physical cash collected from machines and enter the exact total here.
                </span>}
          </p>
        </div>
        <div>
          <label className="mb-2 flex items-center text-sm font-bold text-gray-700">
            Balance Correction:{' '}
            <span className="text-red-500 ml-1">*</span>
            <CalculationHelp 
              title="Balance Correction" 
              formula="Manual Adjustment + (Collected - Amount to Collect)" 
              description="This field shows the final balance for the current location. It's calculated by taking the manual correction and adding the current collection difference (Shortage/Overage). You must set a manual value here first to unlock the 'Collected Amount' field."
            />
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
          <p className="mt-1.5 text-xs leading-tight font-medium">
            {financials.collectedAmount.trim() !== '' 
              ? <span className="text-amber-600 flex items-center gap-1.5 bg-amber-50 p-2 rounded border border-amber-200">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  Note: Clear the 'Collected Amount' above if you need to re-adjust this field.
                </span> 
              : <span className="text-gray-600 bg-gray-50 p-2 rounded border border-gray-200 block">
                  Required: Set the opening balance or adjustments for this collection batch.
                </span>}
          </p>
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
          <label className="mb-2 flex items-center text-sm font-medium text-gray-700">
            Previous Balance:
            <CalculationHelp 
              title="Current/New Balance" 
              formula="Collected Amount - Amount to Collect" 
              description="The difference between what you actually collected and what the system expected. A negative value means a shortage. This net result is carried forward to the next collection report automatically."
            />
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

      {/* Financial Reconciliation Summary Breakdown */}
      <div className="mt-6 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-5 shadow-sm">
        <h5 className="mb-4 flex items-center gap-2 text-sm font-bold text-blue-900">
          <Info className="h-4 w-4 text-blue-600" />
          Batch Financial Reconciliation Summary
        </h5>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Target Collection</p>
            <p className="text-lg font-black text-blue-900">${financials.amountToCollect || '0.00'}</p>
            <p className="text-[10px] text-blue-700/70 italic leading-tight">
              Expected amount based on meters and profit share.
            </p>
          </div>
          
          <div className="space-y-1 border-l border-blue-100 pl-4 md:border-l md:pl-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Actual Collected</p>
            <p className="text-lg font-black text-blue-900">${financials.collectedAmount || '0.00'}</p>
            <p className="text-[10px] text-blue-700/70 italic leading-tight">
              Total physical cash retrieving from all machines.
            </p>
          </div>
          
          <div className="space-y-1 border-l border-blue-100 pl-4 md:border-l md:pl-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">New Carry-Over Balance</p>
            <p className={`text-lg font-black ${Number(financials.previousBalance) < 0 ? 'text-red-600' : 'text-green-600'}`}>
              ${financials.previousBalance || '0.00'}
            </p>
            <p className="text-[10px] text-blue-700/70 italic leading-tight">
              The shortage/overage results for the next collection.
            </p>
          </div>
        </div>

        <div className="mt-5 border-t border-blue-100 pt-4">
          <div className="flex flex-col gap-2 rounded-lg bg-white/50 p-3 border border-blue-50">
            <p className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500"></span>
              The Reconciliation Breakdown:
            </p>
            <p className="text-xs font-mono text-blue-800 leading-relaxed bg-blue-50/50 p-2 rounded">
              <span className="font-bold text-blue-600">{financials.collectedAmount || '0.00'}</span> (Actual) 
              <span className="mx-1.5 text-blue-400">minus</span>
              <span className="font-bold text-blue-600">{financials.amountToCollect || '0.00'}</span> (Target)
              <span className="mx-2 text-blue-400 font-bold">=</span>
              <span className={`font-bold ${Number(financials.previousBalance) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {financials.previousBalance || '0.00'}
              </span> (New Balance)
            </p>
            <p className="text-[10px] text-gray-500 italic mt-1">
              Note: The 'Balance Correction' set earlier acts as the opening anchor to reconcile this batch.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}


