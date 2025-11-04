'use client';

import React from 'react';

type FinancialSummaryFormProps = {
  amountToCollect: string;
  variance: string;
  varianceReason: string;
  collectedAmount: string;
  balanceCorrection: string;
  balanceCorrectionReason: string;
  previousBalance: string;
  reasonForShortagePayment: string;
  onVarianceChange: (value: string) => void;
  onVarianceReasonChange: (value: string) => void;
  onCollectedAmountChange: (value: string) => void;
  onBalanceCorrectionChange: (value: string) => void;
  onBalanceCorrectionReasonChange: (value: string) => void;
  onPreviousBalanceChange: (value: string) => void;
  onReasonForShortagePaymentChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * FinancialSummaryForm Component
 * Reusable form for financial summary inputs
 * Used in collection report creation and editing modals
 */
export const FinancialSummaryForm: React.FC<FinancialSummaryFormProps> = ({
  amountToCollect,
  variance,
  varianceReason,
  collectedAmount,
  balanceCorrection,
  balanceCorrectionReason,
  previousBalance,
  reasonForShortagePayment,
  onVarianceChange,
  onVarianceReasonChange,
  onCollectedAmountChange,
  onBalanceCorrectionChange,
  onBalanceCorrectionReasonChange,
  onPreviousBalanceChange,
  onReasonForShortagePaymentChange,
  disabled = false,
  className = '',
}) => {
  return (
    <div className={className}>
      <h3 className="text-lg font-semibold mb-4 text-center text-gray-700">
        Financial Summary
      </h3>

      <div className="space-y-4">
        {/* Amount to Collect - Read Only */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Amount to Collect *
          </label>
          <input
            type="text"
            value={amountToCollect}
            readOnly
            className="w-full p-3 border rounded-lg bg-gray-100 font-semibold text-gray-700"
            title="Auto-calculated based on machine data and financial inputs"
          />
        </div>

        {/* Balance Correction */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Balance Correction
          </label>
          <input
            type="text"
            placeholder="0"
            value={balanceCorrection}
            onChange={(e) => {
              const val = e.target.value;
              if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                onBalanceCorrectionChange(val);
              }
            }}
            disabled={disabled || collectedAmount.trim() !== ''}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            title="Balance correction amount (editable)"
          />
          {collectedAmount.trim() !== '' && (
            <p className="text-xs text-gray-500 mt-1">
              Clear the Collected Amount to edit the Balance Correction.
            </p>
          )}
        </div>

        {/* Collected Amount */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Collected Amount
          </label>
          <input
            type="text"
            placeholder="0.00"
            value={collectedAmount}
            onChange={(e) => {
              const val = e.target.value;
              if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                onCollectedAmountChange(val);
              }
            }}
            disabled={disabled}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* Variance */}
        <div>
          <label className="block text-sm font-medium mb-1">Variance</label>
          <input
            type="text"
            placeholder="0"
            value={variance}
            onChange={(e) => {
              const val = e.target.value;
              if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                onVarianceChange(val);
              }
            }}
            disabled={disabled}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* Variance Reason */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Variance Reason
          </label>
          <textarea
            placeholder="Variance Reason"
            value={varianceReason}
            onChange={(e) => onVarianceReasonChange(e.target.value)}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] disabled:bg-gray-100 disabled:cursor-not-allowed"
            disabled={disabled}
          />
        </div>

        {/* Balance Correction Reason */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Balance Correction Reason
          </label>
          <textarea
            placeholder="Correction Reason"
            value={balanceCorrectionReason}
            onChange={(e) => onBalanceCorrectionReasonChange(e.target.value)}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] disabled:bg-gray-100 disabled:cursor-not-allowed"
            disabled={disabled}
          />
        </div>

        {/* Previous Balance */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Previous Balance
          </label>
          <input
            type="text"
            placeholder="0"
            value={previousBalance}
            onChange={(e) => {
              const val = e.target.value;
              if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                onPreviousBalanceChange(val);
              }
            }}
            disabled={disabled}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            title="Auto-calculated as collected amount minus amount to collect (editable)"
          />
        </div>

        {/* Reason for Shortage Payment */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Reason for Shortage Payment
          </label>
          <textarea
            placeholder="Reason"
            value={reasonForShortagePayment}
            onChange={(e) => onReasonForShortagePaymentChange(e.target.value)}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] disabled:bg-gray-100 disabled:cursor-not-allowed"
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
};

