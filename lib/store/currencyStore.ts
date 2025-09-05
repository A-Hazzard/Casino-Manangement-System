import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CurrencyCode, ExchangeRates } from "@/shared/types";
import { getLicenseeDefaultCurrency } from "@/lib/helpers/rates";
import { formatMoney } from "@/lib/utils/currency";

interface CurrencyState {
  // State
  displayCurrency: CurrencyCode;
  isUserOverride: boolean;
  exchangeRates: ExchangeRates | null;
  isLoading: boolean;
  error: string | null;
  selectedLicensee: string | null;

  // Actions
  setDisplayCurrency: (currency: CurrencyCode) => void;
  setSelectedLicensee: (licensee: string | null) => void;
  resetToDefault: () => void;
  formatAmount: (amount: number, originalCurrency?: CurrencyCode) => string;
  fetchExchangeRates: () => Promise<void>;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      // Initial state
      displayCurrency: "USD",
      isUserOverride: false,
      exchangeRates: null,
      isLoading: false,
      error: null,
      selectedLicensee: null,

      // Set display currency (user override)
      setDisplayCurrency: (currency: CurrencyCode) => {
        set({
          displayCurrency: currency,
          isUserOverride: true,
        });
      },

      // Set selected licensee and update default currency
      setSelectedLicensee: (licensee: string | null) => {
        const state = get();
        const newLicensee = licensee;

        // If user hasn't overridden, update to licensee default
        if (!state.isUserOverride) {
          const defaultCurrency = newLicensee
            ? getLicenseeDefaultCurrency(newLicensee)
            : "USD";
          set({
            selectedLicensee: newLicensee,
            displayCurrency: defaultCurrency,
          });
        } else {
          // Just update licensee, keep user's currency choice
          set({ selectedLicensee: newLicensee });
        }
      },

      // Reset to licensee default
      resetToDefault: () => {
        const state = get();
        const defaultCurrency = state.selectedLicensee
          ? getLicenseeDefaultCurrency(state.selectedLicensee)
          : "USD";
        set({
          displayCurrency: defaultCurrency,
          isUserOverride: false,
        });
      },

      // Format amount with currency conversion
      formatAmount: (
        amount: number,
        originalCurrency: CurrencyCode = "USD"
      ) => {
        const state = get();

        if (
          !state.exchangeRates ||
          originalCurrency === state.displayCurrency
        ) {
          return formatMoney(amount, state.displayCurrency);
        }

        try {
          const convertedAmount =
            (amount / state.exchangeRates.rates[originalCurrency]) *
            state.exchangeRates.rates[state.displayCurrency];
          return formatMoney(convertedAmount, state.displayCurrency);
        } catch {
          // Fallback to original amount if conversion fails
          return formatMoney(amount, originalCurrency);
        }
      },

      // Fetch exchange rates
      fetchExchangeRates: async () => {
        // Only fetch on client side
        if (typeof window === "undefined") return;

        set({ isLoading: true, error: null });

        try {
          const response = await fetch("/api/rates");
          if (!response.ok) {
            throw new Error("Failed to fetch exchange rates");
          }

          const data = await response.json();
          if (data.success) {
            const rates: ExchangeRates = {
              ...data.data,
              lastUpdated: new Date(data.data.lastUpdated),
            };
            set({ exchangeRates: rates, error: null });
          } else {
            throw new Error(data.message || "Failed to fetch rates");
          }
        } catch (err) {
          console.error("Error fetching exchange rates:", err);
          set({
            error: err instanceof Error ? err.message : "Unknown error",
          });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: "currency-storage",
      partialize: (state) => ({
        displayCurrency: state.displayCurrency,
        isUserOverride: state.isUserOverride,
      }),
    }
  )
);

// Only initialize on client side
if (typeof window !== "undefined") {
  // Initial fetch
  useCurrencyStore.getState().fetchExchangeRates();

  // Set up periodic refresh (every 30 minutes)
  setInterval(() => {
    useCurrencyStore.getState().fetchExchangeRates();
  }, 30 * 60 * 1000);
}
