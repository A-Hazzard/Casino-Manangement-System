/**
 * Edit Collection Financials Component
 *
 * Handles financial inputs and report update for the Edit Collection Modal.
 */

'use client';

import { Button } from '@/components/shared/ui/button';
import { CalculationHelp } from '@/components/shared/ui/CalculationHelp';
import { Input } from '@/components/shared/ui/input';
import { Textarea } from '@/components/shared/ui/textarea';

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
  isUpdateReportEnabled: boolean;
  onUpdateReport: () => Promise<void>;
};

export default function CollectionReportEditFinancials({
  financials,
  setFinancials,
  baseBalanceCorrection,
  setBaseBalanceCorrection,
  isProcessing,
  isUpdateReportEnabled,
  onUpdateReport,
}: EditCollectionFinancialsProps) {
  const onFinancialsChange = (updates: Partial<FinancialsData>) => {
    setFinancials({ ...financials, ...updates });
  };

  return (
    <div className="mt-6 border-t border-gray-300 pt-6">
      <p className="mb-4 text-lg font-semibold text-gray-700">Financials</p>

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
          <label className="mb-1 flex items-center text-sm font-medium text-grayHighlight">
            Amount To Collect:
            <CalculationHelp 
              title="Amount to Collect" 
              formula="(Gross - Variance - Advance) - PartnerProfit + PrevBalance" 
              description="The total cash that the collector is expected to retrieve from the machines at this location."
            />
          </label>
          <Input
            type="text"
            value={financials.amountToCollect}
            readOnly
            className="bg-gray-100 cursor-not-allowed"
          />
        </div>

        {/* Collected Amount */}
        <div>
          <label className="mb-1 flex items-center text-sm font-medium text-grayHighlight">
            Collected Amount:
            <CalculationHelp 
              title="Collected Amount" 
              formula="Value entered manually" 
              description="The actual amount of cash retrieved and counted by the collector."
            />
          </label>
          <Input
            type="text"
            value={financials.collectedAmount}
            onChange={e => {
              if (
                /^-?\d*\.?\d*$/.test(e.target.value) ||
                e.target.value === ''
              ) {
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
            }}
            disabled={
              isProcessing ||
              (baseBalanceCorrection === '' &&
                financials.balanceCorrection === '')
            }
          />
        </div>

        {/* Balance Correction */}
        <div>
          <label className="mb-1 flex items-center text-sm font-medium text-grayHighlight">
            Balance Correction:
            <CalculationHelp 
              title="Balance Correction" 
              formula="Value entered manually" 
              description="Adjustment made to resolve any ongoing balance issues from previous periods."
            />
          </label>
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
              title="Previous Balance" 
              formula="Collected Amount - Amount to Collect" 
              description="Automatically tracks shortages or overages. This becomes the balance for the next collection."
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

      <div className="mt-8 flex justify-end">
        <Button
          onClick={onUpdateReport}
          disabled={!isUpdateReportEnabled || isProcessing}
          className="bg-green-600 px-8 py-6 text-lg font-bold text-white hover:bg-green-700"
        >
          {isProcessing ? 'Updating Report...' : 'UPDATE COLLECTION REPORT'}
        </Button>
      </div>
    </div>
  );
}

