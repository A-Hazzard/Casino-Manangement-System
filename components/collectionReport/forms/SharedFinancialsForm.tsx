'use client';

import React from 'react';

type SharedFinancialsFormProps = {
  taxes: string;
  advance: string;
  onTaxesChange: (value: string) => void;
  onAdvanceChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * SharedFinancialsForm Component
 * Reusable form for shared batch financial inputs (taxes and advance)
 * Used in collection report creation and editing modals
 */
export const SharedFinancialsForm: React.FC<SharedFinancialsFormProps> = ({
  taxes,
  advance,
  onTaxesChange,
  onAdvanceChange,
  disabled = false,
  className = '',
}) => {
  return (
    <div className={className}>
      <h3 className="text-base font-semibold mb-3">
        Shared Financials for Batch
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Taxes */}
        <div>
          <label className="block text-sm font-medium mb-1">Taxes</label>
          <input
            type="text"
            placeholder="0"
            value={taxes}
            onChange={(e) => {
              const val = e.target.value;
              if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                onTaxesChange(val);
              }
            }}
            disabled={disabled}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* Advance */}
        <div>
          <label className="block text-sm font-medium mb-1">Advance</label>
          <input
            type="text"
            placeholder="0"
            value={advance}
            onChange={(e) => {
              const val = e.target.value;
              if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                onAdvanceChange(val);
              }
            }}
            disabled={disabled}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
};

