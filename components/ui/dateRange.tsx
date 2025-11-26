/**
 * Date Range Component
 * Simple date range input component with start and end date inputs.
 *
 * Features:
 * - Start and end date inputs
 * - Apply button to set custom date range
 * - Date formatting
 * - Filter state management
 *
 * @param CustomDateRange - Current custom date range
 * @param setCustomDateRange - Callback to update date range
 * @param setActiveFilters - Callback to update active filters
 */
import { Button } from './button';
import { DateRangeProps } from '@/lib/types/componentProps';

export default function DateRange({
  CustomDateRange,
  setCustomDateRange,
  setActiveFilters,
}: Pick<
  DateRangeProps,
  'CustomDateRange' | 'setCustomDateRange' | 'setActiveFilters'
>) {
  return (
    <div className="mt-4 flex flex-wrap justify-center gap-4">
      <input
        type="date"
        value={
          (CustomDateRange.startDate instanceof Date
            ? CustomDateRange.startDate
            : new Date(CustomDateRange.startDate || new Date())
          )
            .toISOString()
            .split('T')[0]
        }
        onChange={e =>
          setCustomDateRange({
            ...CustomDateRange,
            startDate: new Date(e.target.value),
          })
        }
        className="rounded-lg border border-gray-300 p-2"
      />
      <input
        type="date"
        value={CustomDateRange.endDate.toISOString().split('T')[0]}
        onChange={e =>
          setCustomDateRange({
            ...CustomDateRange,
            endDate: new Date(e.target.value),
          })
        }
        className="rounded-lg border border-gray-300 p-2"
      />
      <Button
        onClick={() => {
          setActiveFilters({
            Today: false,
            Yesterday: false,
            last7days: false,
            last30days: false,
            Custom: true,
          });
        }}
        className="self-center rounded-lg bg-buttonActive px-4 py-2 text-white"
      >
        Apply
      </Button>
    </div>
  );
}
