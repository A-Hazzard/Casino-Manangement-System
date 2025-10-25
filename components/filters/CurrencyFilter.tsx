'use client';

import React from 'react';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { getCurrencyName, getCurrencySymbol } from '@/lib/helpers/rates';
import type { CurrencyCode } from '@/shared/types/currency';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CurrencyFilterProps {
  className?: string;
  disabled?: boolean;
  onCurrencyChange?: (currency: CurrencyCode) => void;
}

const CURRENCY_OPTIONS: CurrencyCode[] = ['USD', 'TTD', 'GYD', 'BBD'];

export function CurrencyFilter({
  className = '',
  disabled = false,
  onCurrencyChange,
}: CurrencyFilterProps) {
  const { displayCurrency, setDisplayCurrency, isAllLicensee } = useCurrency();

  const handleCurrencyChange = (value: string) => {
    const newCurrency = value as CurrencyCode;
    setDisplayCurrency(newCurrency);
    onCurrencyChange?.(newCurrency);
  };

  // Don't render if not in "All Licensee" mode
  if (!isAllLicensee) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label
        htmlFor="currency-select"
        className="hidden text-sm font-medium text-gray-700 sm:block"
      >
        Currency:
      </label>
      <Select
        value={displayCurrency}
        onValueChange={handleCurrencyChange}
        disabled={disabled}
      >
        <SelectTrigger
          id="currency-select"
          className="h-8 w-24 text-sm sm:w-32"
          aria-label="Select currency"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CURRENCY_OPTIONS.map(currency => (
            <SelectItem key={currency} value={currency}>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {getCurrencySymbol(currency)}
                </span>
                <span className="text-sm text-gray-600">{currency}</span>
                <span className="text-xs text-gray-500">
                  {getCurrencyName(currency)}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default CurrencyFilter;
