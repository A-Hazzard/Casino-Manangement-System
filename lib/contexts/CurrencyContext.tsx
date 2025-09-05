"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import type { CurrencyCode, ExchangeRates, CurrencyMeta } from "@/shared/types";
import { getLicenseeDefaultCurrency } from "@/lib/helpers/rates";
import { formatMoney } from "@/lib/utils/currency";

interface CurrencyContextType {
  // State
  displayCurrency: CurrencyCode;
  isUserOverride: boolean;
  exchangeRates: ExchangeRates | null;
  currencyMeta: CurrencyMeta | null;

  // Actions
  setDisplayCurrency: (currency: CurrencyCode) => void;
  resetToDefault: () => void;
  formatAmount: (amount: number, originalCurrency?: CurrencyCode) => string;

  // Utilities
  isLoading: boolean;
  error: string | null;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined
);

interface CurrencyProviderProps {
  children: ReactNode;
  selectedLicensee?: string;
}

/**
 * Currency Context Provider
 * Manages currency state and provides conversion utilities across the app
 */
export function CurrencyProvider({
  children,
  selectedLicensee,
}: CurrencyProviderProps) {
  const [displayCurrency, setDisplayCurrencyState] =
    useState<CurrencyCode>("USD");
  const [isUserOverride, setIsUserOverride] = useState(false);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get default currency for selected licensee
  const getDefaultCurrency = useCallback((): CurrencyCode => {
    if (!selectedLicensee) return "USD";
    return getLicenseeDefaultCurrency(selectedLicensee);
  }, [selectedLicensee]);

  // Initialize currency from localStorage or licensee default
  useEffect(() => {
    try {
      const storedCurrency = localStorage.getItem(
        "selectedCurrency"
      ) as CurrencyCode;
      const defaultCurrency = getDefaultCurrency();

      let finalCurrency: CurrencyCode;
      let finalIsOverride: boolean;

      if (
        storedCurrency &&
        ["TTD", "GYD", "BBD", "USD"].includes(storedCurrency)
      ) {
        finalCurrency = storedCurrency;
        finalIsOverride = true;
      } else {
        finalCurrency = defaultCurrency;
        finalIsOverride = false;
      }

      setDisplayCurrencyState(finalCurrency);
      setIsUserOverride(finalIsOverride);

      // Update localStorage if not already set
      if (!localStorage.getItem("selectedCurrency")) {
        localStorage.setItem("selectedCurrency", finalCurrency);
      }
    } catch {
      // Fallback to default currency if there's an error
      const defaultCurrency = getDefaultCurrency();
      setDisplayCurrencyState(defaultCurrency);
      setIsUserOverride(false);
    }
  }, [selectedLicensee, getDefaultCurrency]);

  // Fetch exchange rates
  useEffect(() => {
    const fetchRates = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/rates");
        if (!response.ok) {
          throw new Error("Failed to fetch exchange rates");
        }

        const data = await response.json();
        if (data.success) {
          // Convert ISO string back to Date object
          const rates: ExchangeRates = {
            ...data.data,
            lastUpdated: new Date(data.data.lastUpdated),
          };
          setExchangeRates(rates);
        } else {
          throw new Error(data.message || "Failed to fetch rates");
        }
      } catch (err) {
        console.error("Error fetching exchange rates:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRates();

    // Refresh rates every 30 minutes
    const interval = setInterval(fetchRates, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Set display currency (user override)
  const setDisplayCurrency = (currency: CurrencyCode) => {
    setDisplayCurrencyState(currency);
    setIsUserOverride(true);
    localStorage.setItem("selectedCurrency", currency);
  };

  // Reset to licensee default
  const resetToDefault = () => {
    const defaultCurrency = getDefaultCurrency();
    setDisplayCurrencyState(defaultCurrency);
    setIsUserOverride(false);
    localStorage.removeItem("selectedCurrency");
  };

  // Format amount with currency conversion
  const formatAmount = (
    amount: number,
    originalCurrency?: CurrencyCode
  ): string => {
    if (!exchangeRates) {
      return formatMoney(amount, displayCurrency);
    }

    // If no original currency specified, assume USD (base currency)
    const sourceCurrency = originalCurrency || "USD";

    return formatMoney(amount, displayCurrency, exchangeRates, sourceCurrency);
  };

  // Create currency metadata for API responses
  const currencyMeta: CurrencyMeta | null = exchangeRates
    ? {
        displayCurrency,
        baseCurrency: exchangeRates.baseCurrency,
        ratesFetchedAt: exchangeRates.lastUpdated,
        exchangeRate: exchangeRates.rates[displayCurrency],
      }
    : null;

  const value: CurrencyContextType = {
    displayCurrency,
    isUserOverride,
    exchangeRates,
    currencyMeta,
    setDisplayCurrency,
    resetToDefault,
    formatAmount,
    isLoading,
    error,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

/**
 * Hook to use currency context
 */
export function useCurrency(): CurrencyContextType {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
