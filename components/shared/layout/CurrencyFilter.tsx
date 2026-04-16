'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { getCurrencySymbol } from '@/lib/helpers/rates';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import type { CurrencyCode } from '@/shared/types/currency';

type CurrencyFilterProps = {
  className?: string;
  disabled?: boolean;
  onCurrencyChange?: (currency: CurrencyCode) => void;
  userRoles?: string[];
  hasMultipleLicencees?: boolean;
};

const CURRENCY_OPTIONS: CurrencyCode[] = ['USD', 'TTD', 'GYD', 'BBD'];

function CurrencyFilter({
  className = '',
  disabled = false,
  onCurrencyChange,
  userRoles = [],
}: CurrencyFilterProps) {
  const { displayCurrency, setDisplayCurrency } = useCurrency();
  const { setDisplayCurrency: setDashboardCurrency } = useDashBoardStore();

  const handleCurrencyChange = (value: string) => {
    const newCurrency = value as CurrencyCode;
    // Update BOTH currency states to keep them in sync
    setDisplayCurrency(newCurrency);
    setDashboardCurrency(newCurrency);
    onCurrencyChange?.(newCurrency);
  };

  const canShowSelector =
    !userRoles.includes('vault-manager') &&
    !userRoles.includes('cashier');

  if (!canShowSelector) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Select
        value={displayCurrency}
        onValueChange={handleCurrencyChange}
        disabled={disabled}
      >
        <SelectTrigger
          id="currency-select"
          className="h-8 w-auto min-w-[60px] text-sm"
          aria-label="Select currency"
        >
          <SelectValue placeholder="USD" />
        </SelectTrigger>
        <SelectContent>
          {CURRENCY_OPTIONS.map(currency => (
            <SelectItem key={currency} value={currency}>
              {`${getCurrencySymbol(currency)} ${currency}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default CurrencyFilter;

