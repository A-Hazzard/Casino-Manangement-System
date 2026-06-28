'use client';

import { FC } from 'react';
import { Button } from '@/components/shared/ui/button';
import { CustomSelect } from '@/components/shared/ui/custom-select';
import { cn } from '@/lib/utils';
import { endOfMonth, format, setMonth, setYear, startOfMonth } from 'date-fns';
import { useMemo } from 'react';
import { DateRange as RDPDateRange } from 'react-day-picker';

type MonthYearPickerProps = {
  value?: RDPDateRange;
  onChange: (range?: RDPDateRange) => void;
  onSetLastMonth: () => void;
  disabled?: boolean;
  variant?: 'default' | 'filterBar';
};

export const CollectionReportMonthlyMonthYearPicker: FC<
  MonthYearPickerProps
> = ({
  value,
  onChange,
  onSetLastMonth,
  disabled = false,
  variant = 'default',
}) => {
  const isFilterBar = variant === 'filterBar';

  const selectedMonth = value?.from
    ? value.from.getMonth().toString()
    : new Date().getMonth().toString();
  const selectedYear = value?.from
    ? value.from.getFullYear().toString()
    : new Date().getFullYear().toString();

  const monthOptions = useMemo(
    () => [
      { value: '0', label: 'January' },
      { value: '1', label: 'February' },
      { value: '2', label: 'March' },
      { value: '3', label: 'April' },
      { value: '4', label: 'May' },
      { value: '5', label: 'June' },
      { value: '6', label: 'July' },
      { value: '7', label: 'August' },
      { value: '8', label: 'September' },
      { value: '9', label: 'October' },
      { value: '10', label: 'November' },
      { value: '11', label: 'December' },
    ],
    []
  );

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= 2020; year--) {
      years.push({ value: year.toString(), label: year.toString() });
    }
    return years;
  }, []);

  const handleMonthChange = (month: string) => {
    const monthIndex = parseInt(month, 10);
    const baseDate = value?.from || new Date();
    const newDate = setMonth(baseDate, monthIndex);

    onChange({
      from: startOfMonth(newDate),
      to: endOfMonth(newDate),
    });
  };

  const handleYearChange = (year: string) => {
    const yearNum = parseInt(year, 10);
    const baseDate = value?.from || new Date();
    const newDate = setYear(baseDate, yearNum);

    onChange({
      from: startOfMonth(newDate),
      to: endOfMonth(newDate),
    });
  };

  const selectTriggerClass = isFilterBar
    ? 'h-11 w-full rounded-md border-0 bg-white text-sm font-medium text-gray-800 shadow-sm focus:ring-2 focus:ring-white/40'
    : 'h-10 w-full border-gray-300 bg-white font-semibold shadow-sm';

  const lastMonthButtonClass = isFilterBar
    ? 'h-11 w-full rounded-md border border-white/30 bg-white/10 text-sm font-semibold text-white hover:bg-white/20'
    : 'h-10 shrink-0 rounded-lg border-gray-300 bg-white px-4 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-100';

  return (
    <div
      className={cn(
        'flex flex-col gap-2',
        !isFilterBar && 'flex-wrap items-center gap-2 sm:flex-row'
      )}
    >
      {isFilterBar && (
        <p className="text-xs font-semibold uppercase tracking-wide text-white/90">
          Period
        </p>
      )}

      <div
        className={cn(
          'grid gap-2',
          isFilterBar ? 'grid-cols-1' : 'flex flex-1 flex-wrap items-center gap-2'
        )}
      >
        <Button
          type="button"
          variant="outline"
          className={lastMonthButtonClass}
          onClick={onSetLastMonth}
          disabled={disabled}
        >
          Last Month
        </Button>

        <div
          className={cn(
            'grid gap-2',
            isFilterBar ? 'grid-cols-2' : 'flex flex-1 items-center gap-2'
          )}
        >
          <CustomSelect
            value={selectedMonth}
            onValueChange={handleMonthChange}
            options={monthOptions}
            placeholder="Month"
            disabled={disabled}
            triggerClassName={selectTriggerClass}
          />
          <CustomSelect
            value={selectedYear}
            onValueChange={handleYearChange}
            options={yearOptions}
            placeholder="Year"
            disabled={disabled}
            triggerClassName={selectTriggerClass}
          />
        </div>
      </div>

      {isFilterBar && value?.from && (
        <p className="text-xs text-white/80">
          Viewing{' '}
          <span className="font-semibold text-white">
            {format(value.from, 'MMMM yyyy')}
          </span>
        </p>
      )}
    </div>
  );
};
