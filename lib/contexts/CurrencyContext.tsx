'use client';

import { fetchLicenceeById } from '@/lib/helpers/client';
import {
  convertCurrency,
  formatAmount,
  getLicenceeCurrency,
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

type CurrencyProviderProps = {
  children: React.ReactNode;
  initialCurrency?: CurrencyCode;
};

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
  const lastAutoSetLicenceeId = useRef<string | null>(null); // Track which licencee we auto-set currency for

  // Determine if we're in "All Licencee" mode
  const isAllLicencee =
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

  // Auto-set currency for users with single licencee (non-admin/developer)
  // This runs whenever user data changes to ensure single-licencee users always get their currency
  // IMPORTANT: This must run BEFORE the localStorage effect to prevent race conditions
  useEffect(() => {
    if (!user) {
      // Clear currency when user logs out
      lastAutoSetUserId.current = null;
      lastAutoSetLicenceeId.current = null;
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
        lastAutoSetLicenceeId.current = null;
      }
      return;
    }

    // Check if user has exactly 1 licencee
    const userLicencees =
      Array.isArray(user?.assignedLicencees) &&
      user.assignedLicencees.length > 0
        ? user.assignedLicencees
        : [];
    if (userLicencees.length === 1) {
      const singleLicenceeId = userLicencees[0];

      // Get the correct currency for this licencee (synchronous, immediate)
      const mappedLicenceeCurrency = getLicenceeCurrency(singleLicenceeId);

      // For single-licencee users, ALWAYS set currency to their licencee's currency
      // This overrides any existing currency (including stale values from localStorage)
      // Only skip if we've already set it correctly for this user/licencee combination
      const alreadySetCorrectly =
        lastAutoSetUserId.current === userId &&
        lastAutoSetLicenceeId.current === singleLicenceeId &&
        displayCurrency === mappedLicenceeCurrency;

      if (
        !alreadySetCorrectly &&
        mappedLicenceeCurrency &&
        mappedLicenceeCurrency !== 'USD'
      ) {
        // Set currency immediately using mapping (no API delay)
        // This ensures currency is correct even if localStorage has stale value
        handleSetDisplayCurrency(mappedLicenceeCurrency);
        lastAutoSetUserId.current = userId;
        lastAutoSetLicenceeId.current = singleLicenceeId;

        console.log(
          `💰 [CurrencyContext] Auto-set currency to ${mappedLicenceeCurrency} for single licencee user (${singleLicenceeId}, userId: ${userId}) - was ${displayCurrency} (using immediate mapping)`
        );
      } else if (alreadySetCorrectly) {
        // Currency already correctly set, just ensure tracking is up to date
        lastAutoSetUserId.current = userId;
        lastAutoSetLicenceeId.current = singleLicenceeId;
      }

      // Then verify with API call (async, but currency already set above)
      // This ensures accuracy if API returns different name than mapping
      fetchLicenceeById(singleLicenceeId)
        .then(licencee => {
          if (licencee?.name) {
            const apiLicenceeCurrency = getLicenceeCurrency(licencee.name);

            console.log(
              `💰 [CurrencyContext] Verified licencee: ${licencee.name} (${singleLicenceeId}) -> Currency: ${apiLicenceeCurrency}`
            );

            // Update if API returns different currency than mapping
            if (
              apiLicenceeCurrency !== mappedLicenceeCurrency &&
              apiLicenceeCurrency !== 'USD'
            ) {
              handleSetDisplayCurrency(apiLicenceeCurrency);
              console.log(
                `💰 [CurrencyContext] Updated currency to ${apiLicenceeCurrency} based on API (was ${mappedLicenceeCurrency})`
              );
            }
          }
        })
        .catch(error => {
          console.warn(
            '[CurrencyContext] Failed to verify licencee via API (using mapping):',
            error
          );
          // Currency already set via mapping, so this is fine
        });
    } else {
      // User has 0 or multiple licencees - reset tracking
      if (lastAutoSetUserId.current === userId) {
        lastAutoSetUserId.current = null;
        lastAutoSetLicenceeId.current = null;
      }
    }
  }, [
    user,
    user?.assignedLicencees,
    displayCurrency,
    handleSetDisplayCurrency,
  ]);

  // Load currency from localStorage on mount (only if user is admin or has multiple licencees)
  // This runs AFTER the auto-set logic to avoid race conditions
  // IMPORTANT: This must run AFTER the auto-set effect to prevent overriding single-licencee currency
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Wait for user data to be available before loading from localStorage
      if (!user) {
        // If no user yet, don't load from localStorage (currency should be USD)
        // This prevents stale currency from persisting
        return;
      }

      // Only load from localStorage if user is not a single-licencee non-admin
      // This prevents localStorage from overriding auto-set currency for single-licencee users
      const roles = user.roles || [];
      const isAdmin = roles.includes('admin') || roles.includes('developer');
      const userLicencees =
        Array.isArray(user?.assignedLicencees) &&
        user.assignedLicencees.length > 0
          ? user.assignedLicencees
          : [];
      const isSingleLicenceeNonAdmin = !isAdmin && userLicencees.length === 1;

      // NEVER load from localStorage for single-licencee non-admin users
      // Their currency is ALWAYS auto-set based on their licencee (handled in the previous effect)
      // This prevents stale currency (like TTD) from overriding the correct currency (like BBD)
      if (isSingleLicenceeNonAdmin) {
        // Clear any stale currency from localStorage for single-licencee users
        const savedCurrency = localStorage.getItem('evolution-currency');
        if (savedCurrency) {
          console.log(
            `💰 [CurrencyContext] Clearing stale currency from localStorage for single-licencee user: ${savedCurrency}`
          );
          localStorage.removeItem('evolution-currency');
        }
        return;
      }

      // For admins or multi-licencee users, load from localStorage if not already auto-set
      if (!isSingleLicenceeNonAdmin && lastAutoSetUserId.current !== user._id) {
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
    isAllLicencee,
    shouldApplyConversion: isAllLicencee,
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
