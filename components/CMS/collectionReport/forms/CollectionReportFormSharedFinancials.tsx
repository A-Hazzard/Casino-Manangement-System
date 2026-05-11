'use client';

type SharedFinancialsFormProps = {
  taxes: string;
  advance: string;
  onTaxesChange: (value: string) => void;
  onAdvanceChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * CollectionReportFormSharedFinancials Component
 * Reusable form for shared batch financial inputs (taxes and advance)
 * Used in collection report creation and editing modals
 */
export default function CollectionReportFormSharedFinancials({
  taxes,
  advance,
  onTaxesChange,
  onAdvanceChange,
  disabled = false,
  className = '',
}: SharedFinancialsFormProps) {
  return (
    <div className={className}>
      <h3 className="mb-3 text-base font-semibold">
        Shared Financials for Batch
      </h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Taxes */}
        <div>
          <label className="mb-1 block text-sm font-medium">Taxes</label>
          <input
            type="text"
            placeholder="0"
            value={taxes}
            onChange={e => {
              const val = e.target.value;
              if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                onTaxesChange(val);
              }
            }}
            disabled={disabled}
            className="w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
          />
        </div>

        {/* Advance */}
        <div>
          <label className="mb-1 block text-sm font-medium">Advance</label>
          <input
            type="text"
            placeholder="0"
            value={advance}
            onChange={e => {
              const val = e.target.value;
              if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                onAdvanceChange(val);
              }
            }}
            disabled={disabled}
            className="w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
          />
        </div>
      </div>
    </div>
  );
}
