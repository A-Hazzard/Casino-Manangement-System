'use client';

import { fetchLicenseeById } from '@/lib/helpers/clientLicensees';
import {
  convertCurrency,
  formatAmount,
  getLicenseeCurrency,
} from '@/lib/helpers/rates';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import type {
  CurrencyCode,
  CurrencyContextType,
} from '@/shared/types/currency';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

interface CurrencyProviderProps {
  children: React.ReactNode;
  initialCurrency?: CurrencyCode;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined
);

export function CurrencyProvider({
  children,
  initialCurrency = 'USD',
}: CurrencyProviderProps) {
  const [displayCurrency, setDisplayCurrency] =
    useState<CurrencyCode>(initialCurrency);
  const { selectedLicencee, setDisplayCurrency: setDashboardCurrency } =
    useDashBoardStore();
  const user = useUserStore(state => state.user);
  const lastAutoSetUserId = useRef<string | null>(null); // Track which user we auto-set currency for
  const lastAutoSetLicenseeId = useRef<string | null>(null); // Track which licensee we auto-set currency for

  // Determine if we're in "All Licensee" mode
  const isAllLicensee =
    !selectedLicencee || selectedLicencee === 'all' || selectedLicencee === '';

  const handleSetDisplayCurrency = useCallback(
    (currency: CurrencyCode) => {
      setDisplayCurrency(currency);
      setDashboardCurrency(currency); // Sync with DashboardStore

      // Store in localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('evolution-currency', currency);
      }
    },
    [setDashboardCurrency]
  );

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

  // Auto-set currency for users with single licensee (non-admin/developer)
  // This runs whenever user data changes to ensure single-licensee users always get their currency
  // IMPORTANT: This must run BEFORE the localStorage effect to prevent race conditions
  useEffect(() => {
    if (!user) {
      // Clear currency when user logs out
      lastAutoSetUserId.current = null;
      lastAutoSetLicenseeId.current = null;
      // Reset to USD when no user (will be set correctly when user logs in)
      if (displayCurrency !== 'USD') {
        setDisplayCurrency('USD');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('evolution-currency');
        }
      }
      return;
    }

    const userId = user._id;
    const roles = user.roles || [];
    const isAdmin = roles.includes('admin') || roles.includes('developer');

    // Don't auto-set for admins/developers - they can choose their currency
    if (isAdmin) {
      // Reset tracking if user is admin (in case they were previously a regular user)
      if (lastAutoSetUserId.current === userId) {
        lastAutoSetUserId.current = null;
        lastAutoSetLicenseeId.current = null;
      }
      return;
    }

    // Check if user has exactly 1 licensee
    const userLicensees =
      Array.isArray(user?.assignedLicensees) &&
      user.assignedLicensees.length > 0
        ? user.assignedLicensees
        : [];
    if (userLicensees.length === 1) {
      const singleLicenseeId = userLicensees[0];

      // Get the correct currency for this licensee (synchronous, immediate)
      const mappedLicenseeCurrency = getLicenseeCurrency(singleLicenseeId);

      // For single-licensee users, ALWAYS set currency to their licensee's currency
      // This overrides any existing currency (including stale values from localStorage)
      // Only skip if we've already set it correctly for this user/licensee combination
      const alreadySetCorrectly =
        lastAutoSetUserId.current === userId &&
        lastAutoSetLicenseeId.current === singleLicenseeId &&
        displayCurrency === mappedLicenseeCurrency;

      if (
        !alreadySetCorrectly &&
        mappedLicenseeCurrency &&
        mappedLicenseeCurrency !== 'USD'
      ) {
        // Set currency immediately using mapping (no API delay)
        // This ensures currency is correct even if localStorage has stale value
        handleSetDisplayCurrency(mappedLicenseeCurrency);
        lastAutoSetUserId.current = userId;
        lastAutoSetLicenseeId.current = singleLicenseeId;

        console.log(
          `💰 [CurrencyContext] Auto-set currency to ${mappedLicenseeCurrency} for single licensee user (${singleLicenseeId}, userId: ${userId}) - was ${displayCurrency} (using immediate mapping)`
        );
      } else if (alreadySetCorrectly) {
        // Currency already correctly set, just ensure tracking is up to date
        lastAutoSetUserId.current = userId;
        lastAutoSetLicenseeId.current = singleLicenseeId;
      }

      // Then verify with API call (async, but currency already set above)
      // This ensures accuracy if API returns different name than mapping
      fetchLicenseeById(singleLicenseeId)
        .then(licensee => {
          if (licensee?.name) {
            const apiLicenseeCurrency = getLicenseeCurrency(licensee.name);

            console.log(
              `💰 [CurrencyContext] Verified licensee: ${licensee.name} (${singleLicenseeId}) -> Currency: ${apiLicenseeCurrency}`
            );

            // Update if API returns different currency than mapping
            if (
              apiLicenseeCurrency !== mappedLicenseeCurrency &&
              apiLicenseeCurrency !== 'USD'
            ) {
              handleSetDisplayCurrency(apiLicenseeCurrency);
              console.log(
                `💰 [CurrencyContext] Updated currency to ${apiLicenseeCurrency} based on API (was ${mappedLicenseeCurrency})`
              );
            }
          }
        })
        .catch(error => {
          console.warn(
            '[CurrencyContext] Failed to verify licensee via API (using mapping):',
            error
          );
          // Currency already set via mapping, so this is fine
        });
    } else {
      // User has 0 or multiple licensees - reset tracking
      if (lastAutoSetUserId.current === userId) {
        lastAutoSetUserId.current = null;
        lastAutoSetLicenseeId.current = null;
      }
    }
  }, [
    user,
    user?.assignedLicensees,
    displayCurrency,
    handleSetDisplayCurrency,
  ]);

  // Load currency from localStorage on mount (only if user is admin or has multiple licensees)
  // This runs AFTER the auto-set logic to avoid race conditions
  // IMPORTANT: This must run AFTER the auto-set effect to prevent overriding single-licensee currency
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Wait for user data to be available before loading from localStorage
      if (!user) {
        // If no user yet, don't load from localStorage (currency should be USD)
        // This prevents stale currency from persisting
        return;
      }

      // Only load from localStorage if user is not a single-licensee non-admin
      // This prevents localStorage from overriding auto-set currency for single-licensee users
      const roles = user.roles || [];
      const isAdmin = roles.includes('admin') || roles.includes('developer');
      const userLicensees =
        Array.isArray(user?.assignedLicensees) &&
        user.assignedLicensees.length > 0
          ? user.assignedLicensees
          : [];
      const isSingleLicenseeNonAdmin = !isAdmin && userLicensees.length === 1;

      // NEVER load from localStorage for single-licensee non-admin users
      // Their currency is ALWAYS auto-set based on their licensee (handled in the previous effect)
      // This prevents stale currency (like TTD) from overriding the correct currency (like BBD)
      if (isSingleLicenseeNonAdmin) {
        // Clear any stale currency from localStorage for single-licensee users
        const savedCurrency = localStorage.getItem('evolution-currency');
        if (savedCurrency) {
          console.log(
            `💰 [CurrencyContext] Clearing stale currency from localStorage for single-licensee user: ${savedCurrency}`
          );
          localStorage.removeItem('evolution-currency');
        }
        return;
      }

      // For admins or multi-licensee users, load from localStorage if not already auto-set
      if (!isSingleLicenseeNonAdmin && lastAutoSetUserId.current !== user._id) {
        const savedCurrency = localStorage.getItem(
          'evolution-currency'
        ) as CurrencyCode;
        if (
          savedCurrency &&
          ['USD', 'TTD', 'GYD', 'BBD'].includes(savedCurrency)
        ) {
          setDisplayCurrency(savedCurrency);
        }
      }
    }
  }, [user, setDisplayCurrency]);

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
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
