'use client';

import { FC } from 'react';
import { Button } from '@/components/shared/ui/button';
import { CustomSelect } from '@/components/shared/ui/custom-select';
import { endOfMonth, setMonth, setYear, startOfMonth } from 'date-fns';
import {  useMemo  } from 'react';

import { DateRange as RDPDateRange } from 'react-day-picker';

type MonthYearPickerProps = {
  value?: RDPDateRange;
  onChange: (range?: RDPDateRange) => void;
  onSetLastMonth: () => void;
  disabled?: boolean;
};

/**
 * MonthYearPicker Component
 * A specialized date picker that only allows selecting Month and Year.
 * Returns a date range covering the entire selected month.
 */
export const CollectionReportMonthlyMonthYearPicker: FC<MonthYearPickerProps> = ({
  value,
  onChange,
  onSetLastMonth,
  disabled = false,
}) => {
  // Current selections
  const selectedMonth = value?.from ? value.from.getMonth().toString() : new Date().getMonth().toString();
  const selectedYear = value?.from ? value.from.getFullYear().toString() : new Date().getFullYear().toString();

  // Options for months
  const monthOptions = useMemo(() => [
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
  ], []);

  // Options for years (from 2020 to current year)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear; y >= 2020; y--) {
      years.push({ value: y.toString(), label: y.toString() });
    }
    return years;
  }, []);

  const handleMonthChange = (month: string) => {
    const monthIdx = parseInt(month);
    const baseDate = value?.from || new Date();
    const newDate = setMonth(baseDate, monthIdx);
    
    onChange({
      from: startOfMonth(newDate),
      to: endOfMonth(newDate),
    });
  };

  const handleYearChange = (year: string) => {
    const yearNum = parseInt(year);
    const baseDate = value?.from || new Date();
    const newDate = setYear(baseDate, yearNum);
    
    onChange({
      from: startOfMonth(newDate),
      to: endOfMonth(newDate),
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        className="h-10 shrink-0 rounded-lg border-gray-300 bg-white px-4 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-100"
        onClick={onSetLastMonth}
        disabled={disabled}
      >
        Last Month
      </Button>

      <div className="flex flex-1 items-center gap-2">
        <div className="min-w-[130px]">
          <CustomSelect
            value={selectedMonth}
            onValueChange={handleMonthChange}
            options={monthOptions}
            placeholder="Month"
            disabled={disabled}
            triggerClassName="bg-white border-gray-300 font-semibold h-10 shadow-sm w-full"
          />
        </div>
        <div className="w-24 shrink-0">
          <CustomSelect
            value={selectedYear}
            onValueChange={handleYearChange}
            options={yearOptions}
            placeholder="Year"
            disabled={disabled}
            triggerClassName="bg-white border-gray-300 font-semibold h-10 shadow-sm w-full"
          />
        </div>
      </div>
    </div>
  );
};
