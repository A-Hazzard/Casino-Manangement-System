"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Globe } from "lucide-react";
import { useCurrencyStore } from "@/lib/store/currencyStore";
import type { CurrencyCode } from "@/shared/types";
import { getCurrencySymbol, getCurrencyName } from "@/lib/utils/currency";

interface CurrencySelectorProps {
  className?: string;
}

/**
 * Simple Currency Selector Component
 * Uses Zustand store for state management
 */
export default function CurrencySelector({
  className = "",
}: CurrencySelectorProps) {
  const {
    displayCurrency,
    setDisplayCurrency,
    isUserOverride,
    resetToDefault,
  } = useCurrencyStore();

  const currencies: CurrencyCode[] = ["USD", "TTD", "GYD", "BBD"];

  const handleCurrencyChange = (currency: CurrencyCode) => {
    setDisplayCurrency(currency);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`flex items-center gap-2 ${className}`}
        >
          <Globe className="h-4 w-4" />
          <span className="font-medium">
            {getCurrencySymbol(displayCurrency)} {displayCurrency}
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {currencies.map((currency) => (
          <DropdownMenuItem
            key={currency}
            onClick={() => handleCurrencyChange(currency)}
            className={`flex items-center justify-between ${
              displayCurrency === currency ? "bg-accent" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{getCurrencySymbol(currency)}</span>
              <span>{currency}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {getCurrencyName(currency)}
            </span>
          </DropdownMenuItem>
        ))}
        {isUserOverride && (
          <>
            <div className="border-t my-1" />
            <DropdownMenuItem
              onClick={resetToDefault}
              className="text-sm text-muted-foreground"
            >
              Reset to Default
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
