'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { getCurrencyName, getCurrencySymbol } from '@/lib/helpers/rates';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import type { CurrencyCode } from '@/shared/types/currency';

interface CurrencyFilterProps {
  className?: string;
  disabled?: boolean;
  onCurrencyChange?: (currency: CurrencyCode) => void;
  userRoles?: string[];
  hasMultipleLicensees?: boolean;
}

const CURRENCY_OPTIONS: CurrencyCode[] = ['USD', 'TTD', 'GYD', 'BBD'];

export function CurrencyFilter({
  className = '',
  disabled = false,
  onCurrencyChange,
  userRoles = [],
  hasMultipleLicensees = false,
}: CurrencyFilterProps) {
  const { displayCurrency, setDisplayCurrency, isAllLicensee } = useCurrency();
  const { setDisplayCurrency: setDashboardCurrency } = useDashBoardStore();

  const handleCurrencyChange = (value: string) => {
    const newCurrency = value as CurrencyCode;
    // Update BOTH currency states to keep them in sync
    setDisplayCurrency(newCurrency);
    setDashboardCurrency(newCurrency);
    onCurrencyChange?.(newCurrency);
  };

  // Only show currency selector when "All Licensees" is selected and the user
  // is either an admin/developer or a non-admin with multiple licensees.
  const isAdminOrDev =
    userRoles.includes('admin') || userRoles.includes('developer');
  const canShowSelector = isAllLicensee && (isAdminOrDev || hasMultipleLicensees);

  if (!canShowSelector) {
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
