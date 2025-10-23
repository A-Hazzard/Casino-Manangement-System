"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import type {
  CurrencyCode,
  CurrencyContextType,
} from "@/shared/types/currency";
import { formatAmount, convertCurrency } from "@/lib/helpers/rates";
import { useDashBoardStore } from "@/lib/store/dashboardStore";

interface CurrencyProviderProps {
  children: React.ReactNode;
  initialCurrency?: CurrencyCode;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined
);

export function CurrencyProvider({
  children,
  initialCurrency = "USD",
}: CurrencyProviderProps) {
  const [displayCurrency, setDisplayCurrency] =
    useState<CurrencyCode>(initialCurrency);
  const { selectedLicencee } = useDashBoardStore();

  // Determine if we're in "All Licensee" mode
  const isAllLicensee =
    !selectedLicencee || selectedLicencee === "all" || selectedLicencee === "";

  // Update isAllLicensee based on current licensee selection
  // This should be called from components that know the current licensee
  // const _updateLicenseeStatus = useCallback((licensee: string | null | undefined) => {
  //   const shouldConvert = !licensee || licensee === 'all' || licensee === '';
  //   setIsAllLicensee(shouldConvert);
  // }, []);

  const handleSetDisplayCurrency = useCallback((currency: CurrencyCode) => {
    setDisplayCurrency(currency);

    // Store in localStorage for persistence
    if (typeof window !== "undefined") {
      localStorage.setItem("evolution-currency", currency);
    }
  }, []);

  const formatAmountWithCurrency = useCallback(
    (amount: number, currency?: CurrencyCode) => {
      return formatAmount(amount, currency || displayCurrency);
    },
    [displayCurrency]
  );

  const convertAmountWithCurrency = useCallback(
    (amount: number, from: CurrencyCode, to: CurrencyCode) => {
      return convertCurrency(amount, from, to);
    },
    []
  );

  // Load currency from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCurrency = localStorage.getItem(
        "evolution-currency"
      ) as CurrencyCode;
      if (
        savedCurrency &&
        ["USD", "TTD", "GYD", "BBD"].includes(savedCurrency)
      ) {
        setDisplayCurrency(savedCurrency);
      }
    }
  }, []);

  const value: CurrencyContextType = {
    displayCurrency,
    setDisplayCurrency: handleSetDisplayCurrency,
    formatAmount: formatAmountWithCurrency,
    convertAmount: convertAmountWithCurrency,
    isAllLicensee,
    shouldApplyConversion: isAllLicensee,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextType {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
