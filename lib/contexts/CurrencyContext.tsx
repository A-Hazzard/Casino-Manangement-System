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
      lastAutoSetUserId.current = null;
      lastAutoSetLicenseeId.current = null;
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

      // Skip if we already set currency for this user/licensee combination
      if (
        lastAutoSetUserId.current === userId &&
        lastAutoSetLicenseeId.current === singleLicenseeId
      ) {
        return; // Already set, don't re-fetch
      }

      // Fetch licensee name to properly resolve currency
      // getLicenseeCurrency uses getLicenseeName which relies on LICENSEE_MAPPING,
      // but we should fetch from API to ensure accuracy
      fetchLicenseeById(singleLicenseeId)
        .then(licensee => {
          if (licensee?.name) {
            const licenseeCurrency = getLicenseeCurrency(licensee.name);

            if (process.env.NODE_ENV === 'development') {
              console.log(
                `💰 [CurrencyContext] Fetched licensee: ${licensee.name} (${singleLicenseeId}) -> Currency: ${licenseeCurrency}`
              );
            }

            // For single-licensee users, ALWAYS ensure currency matches their licensee currency
            // This overrides localStorage and any previous state
            if (licenseeCurrency !== displayCurrency) {
              handleSetDisplayCurrency(licenseeCurrency);
              lastAutoSetUserId.current = userId;
              lastAutoSetLicenseeId.current = singleLicenseeId;

              if (process.env.NODE_ENV === 'development') {
                console.log(
                  `💰 [CurrencyContext] Auto-set currency to ${licenseeCurrency} for single licensee user (${licensee.name}/${singleLicenseeId}, userId: ${userId}) - was ${displayCurrency}`
                );
              }
            } else {
              // Currency already matches, just update tracking
              lastAutoSetUserId.current = userId;
              lastAutoSetLicenseeId.current = singleLicenseeId;
            }
          } else {
            // Fallback: use getLicenseeCurrency with ID (uses LICENSEE_MAPPING)
            const licenseeCurrency = getLicenseeCurrency(singleLicenseeId);
            if (
              licenseeCurrency !== displayCurrency &&
              licenseeCurrency !== 'USD'
            ) {
              handleSetDisplayCurrency(licenseeCurrency);
              lastAutoSetUserId.current = userId;
              lastAutoSetLicenseeId.current = singleLicenseeId;

              if (process.env.NODE_ENV === 'development') {
                console.log(
                  `💰 [CurrencyContext] Auto-set currency to ${licenseeCurrency} for single licensee user (${singleLicenseeId}, userId: ${userId}) - was ${displayCurrency} (using fallback mapping)`
                );
              }
            }
          }
        })
        .catch(error => {
          if (process.env.NODE_ENV === 'development') {
            console.warn(
              '[CurrencyContext] Failed to fetch licensee for currency auto-set:',
              error
            );
          }
          // Fallback: use getLicenseeCurrency with ID
          const licenseeCurrency = getLicenseeCurrency(singleLicenseeId);
          if (
            licenseeCurrency !== displayCurrency &&
            licenseeCurrency !== 'USD'
          ) {
            handleSetDisplayCurrency(licenseeCurrency);
            lastAutoSetUserId.current = userId;
            lastAutoSetLicenseeId.current = singleLicenseeId;
          }
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
        // If no user yet, load from localStorage as fallback (will be overridden if single-licensee user)
        const savedCurrency = localStorage.getItem(
          'evolution-currency'
        ) as CurrencyCode;
        if (
          savedCurrency &&
          ['USD', 'TTD', 'GYD', 'BBD'].includes(savedCurrency)
        ) {
          setDisplayCurrency(savedCurrency);
        }
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

      // Don't load from localStorage for single-licensee non-admin users
      // Their currency is auto-set based on their licensee (handled in the previous effect)
      // Also skip if we've already auto-set currency for this user
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
