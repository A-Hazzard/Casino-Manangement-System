/**
 * Edit Collection Financials Component
 *
 * Handles financial inputs and report update for the Edit Collection Modal.
 *
 * Features:
 * - Taxes, advance, and variance adjustment fields
 * - Automated Target Collection calculation
 * - Dynamic collection reconciliation summary
 * - Shortage/Overage carry-over visualization
 * - Locked field validation with tooltips
 *
 * @param financials - Persistent state object for all report financial data
 * @param setFinancials - Functional state setter for the financials object
 * @param baseBalanceCorrection - Anchor value for the opening balance of this specific report
 * @param setBaseBalanceCorrection - Setter for the base balance correction
 * @param isProcessing - Loading state indicating active API communication or heavy computation
 * @param onCollectedAmountChange - Optional specialized callback for collected amount updates
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

type EditCollectionFinancialsProps = {
  financials: FinancialsData;
  setFinancials: (data: FinancialsData) => void;
  baseBalanceCorrection: string;
  setBaseBalanceCorrection: (val: string) => void;
  isProcessing: boolean;
  onCollectedAmountChange?: (value: string) => void;
};

export default function CollectionReportEditFinancials({
  financials,
  setFinancials,
  baseBalanceCorrection,
  setBaseBalanceCorrection,
  isProcessing,
  onCollectedAmountChange,
}: EditCollectionFinancialsProps) {
  const onFinancialsChange = (updates: Partial<FinancialsData>) => {
    setFinancials({ ...financials, ...updates });
  };

  return (
    <div className="mt-6 border-t border-gray-300 pt-6">
      <p className="mb-4 text-center text-lg font-semibold text-gray-700">Report Financials</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Taxes */}
        <div>
          <label className="mb-1 flex items-center text-sm font-medium text-grayHighlight">
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

        {/* Advance */}
        <div>
          <label className="mb-1 flex items-center text-sm font-medium text-grayHighlight">
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

        {/* Variance */}
        <div>
          <label className="mb-1 flex items-center text-sm font-medium text-grayHighlight">
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

        {/* Variance Reason */}
        <div>
          <label className="mb-1 block text-sm font-medium text-grayHighlight">
            Variance Reason:
          </label>
          <Textarea
            value={financials.varianceReason}
            onChange={e =>
              onFinancialsChange({ varianceReason: e.target.value })
            }
            className="min-h-[40px]"
            disabled={isProcessing}
          />
        </div>

        {/* Amount To Collect */}
        <div>
          <label className="mb-1 flex items-center text-sm font-bold text-gray-700">
            Amount To Collect:
            <CalculationHelp 
              title="Amount to Collect" 
              formula="(Meters Profit - Variance - Advance) - Partner Share + Opening Balance" 
              description="This is the ESTIMATED target amount. It starts with the machine revenue (Meters In - Out), subtracts manual adjustments (Advance/Variance) and the Partner's share, and then adds the opening balance carried over from the previous collection."
            />
          </label>
          <Input
            type="text"
            value={financials.amountToCollect}
            readOnly
            className="bg-gray-50 cursor-not-allowed font-semibold text-gray-900"
          />
          <p className="mt-1 text-[10px] text-gray-500 italic">
            Computed automatically based on meters and settings.
          </p>
        </div>

        {/* Collected Amount */}
        <div>
          <label className="mb-1 flex items-center text-sm font-bold text-gray-700">
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
                    value={financials.collectedAmount}
                    onChange={e => {
                      if (
                        /^-?\d*\.?\d*$/.test(e.target.value) ||
                        e.target.value === ''
                      ) {
                        if (onCollectedAmountChange) {
                            onCollectedAmountChange(e.target.value);
                        } else {
                            const val = e.target.value;
                            const amountToCollect = Number(financials.amountToCollect) || 0;
                            const collected = Number(val) || 0;
                            const correction = Number(baseBalanceCorrection) || 0;
                            const previousBalance =
                              collected - amountToCollect - correction;

                            onFinancialsChange({
                              collectedAmount: val,
                              previousBalance: previousBalance.toFixed(2),
                              balanceCorrection: (correction + previousBalance).toFixed(2),
                            });
                        }
                      }
                    }}
                    disabled={
                      isProcessing ||
                      (baseBalanceCorrection === '' &&
                        financials.balanceCorrection === '')
                    }
                  />
                </div>
              </TooltipTrigger>
              {isProcessing ||
              (baseBalanceCorrection === '' &&
                financials.balanceCorrection === '') ? (
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
            {(baseBalanceCorrection === '' && financials.balanceCorrection === '') 
              ? <span className="text-amber-600 flex items-center gap-1.5 bg-amber-50 p-2 rounded border border-amber-200">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  Locked: Enter a Balance Correction first (even if 0) to unlock this field.
                </span>
              : <span className="text-blue-700 bg-blue-50 p-2 rounded border border-blue-200 block">
                  Action: Count all physical cash collected from machines and enter the exact total here.
                </span>}
          </p>
        </div>

        {/* Balance Correction */}
        <div>
          <label className="mb-1 flex items-center text-sm font-bold text-gray-700">
            Balance Correction:
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
                    value={financials.balanceCorrection}
                    onChange={e => {
                      if (
                        /^-?\d*\.?\d*$/.test(e.target.value) ||
                        e.target.value === ''
                      ) {
                        onFinancialsChange({ balanceCorrection: e.target.value });
                        setBaseBalanceCorrection(e.target.value);
                      }
                    }}
                    disabled={isProcessing || financials.collectedAmount !== ''}
                  />
                </div>
              </TooltipTrigger>
              {isProcessing || financials.collectedAmount !== '' ? (
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
            {financials.collectedAmount !== '' 
              ? <span className="text-amber-600 flex items-center gap-1.5 bg-amber-50 p-2 rounded border border-amber-200">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  Note: Clear the 'Collected Amount' above if you need to re-adjust this field.
                </span> 
              : <span className="text-gray-600 bg-gray-50 p-2 rounded border border-gray-200 block">
                  Required: Set the opening balance or adjustments for this collection batch.
                </span>}
          </p>
        </div>

        {/* Correction Reason */}
        <div>
          <label className="mb-1 block text-sm font-medium text-grayHighlight">
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

        {/* Previous Balance */}
        <div>
          <label className="mb-1 flex items-center text-sm font-medium text-grayHighlight">
            Previous Balance:
            <CalculationHelp 
              title="Current/New Balance" 
              formula="Collected Amount - Amount to Collect" 
              description="The difference between what you actually collected and what the system expected. A negative value means a shortage. This net result is carried forward to the next collection report automatically."
            />
          </label>
          <Input
            type="text"
            value={financials.previousBalance}
            onChange={e =>
              onFinancialsChange({ previousBalance: e.target.value })
            }
            disabled={isProcessing}
          />
        </div>

        {/* Shortage Reason */}
        <div>
          <label className="mb-1 block text-sm font-medium text-grayHighlight">
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
      <div className="mt-8 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-5 shadow-sm">
        <h5 className="mb-4 flex items-center gap-2 text-sm font-bold text-blue-900">
          <Info className="h-4 w-4 text-blue-600" />
          Report Financial Reconciliation Summary
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
              Note: The 'Balance Correction' set in this batch acts as the opening anchor to reconcile this report.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}

