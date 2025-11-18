'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import type {
  CurrencyCode,
  CurrencyContextType,
} from '@/shared/types/currency';
import { formatAmount, convertCurrency, getLicenseeCurrency } from '@/lib/helpers/rates';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';

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
  const { selectedLicencee } = useDashBoardStore();
  const user = useUserStore(state => state.user);
  const lastAutoSetUserId = useRef<string | null>(null); // Track which user we auto-set currency for
  const lastAutoSetLicenseeId = useRef<string | null>(null); // Track which licensee we auto-set currency for

  // Determine if we're in "All Licensee" mode
  const isAllLicensee =
    !selectedLicencee || selectedLicencee === 'all' || selectedLicencee === '';

  const handleSetDisplayCurrency = useCallback((currency: CurrencyCode) => {
    setDisplayCurrency(currency);

    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('evolution-currency', currency);
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

  // Auto-set currency for users with single licensee (non-admin/developer)
  // This runs whenever user data changes to ensure single-licensee users always get their currency
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
    const userLicensees = user.rel?.licencee || [];
    if (userLicensees.length === 1) {
      const singleLicenseeId = userLicensees[0];
      const licenseeCurrency = getLicenseeCurrency(singleLicenseeId);
      
      // For single-licensee users, ALWAYS ensure currency matches their licensee currency
      // This overrides localStorage and any previous state
      // Check every time user data is available to handle cases where:
      // - localStorage was set by a previous admin session
      // - User endpoint is called and user data is refreshed
      // - Page loads and user data becomes available
      if (licenseeCurrency !== displayCurrency) {
        handleSetDisplayCurrency(licenseeCurrency);
        lastAutoSetUserId.current = userId;
        lastAutoSetLicenseeId.current = singleLicenseeId;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `💰 Auto-set currency to ${licenseeCurrency} for single licensee user (${singleLicenseeId}, userId: ${userId}) - was ${displayCurrency}`
          );
        }
      } else {
        // Currency already matches, just update tracking
        lastAutoSetUserId.current = userId;
        lastAutoSetLicenseeId.current = singleLicenseeId;
      }
    } else {
      // User has 0 or multiple licensees - reset tracking
      if (lastAutoSetUserId.current === userId) {
        lastAutoSetUserId.current = null;
        lastAutoSetLicenseeId.current = null;
      }
    }
  }, [user, user?.rel?.licencee, displayCurrency, handleSetDisplayCurrency]);

  // Load currency from localStorage on mount (only if user is admin or has multiple licensees)
  // This runs after user data is available to make the right decision
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
      const userLicensees = user.rel?.licencee || [];
      const isSingleLicenseeNonAdmin = !isAdmin && userLicensees.length === 1;

      // Don't load from localStorage for single-licensee non-admin users
      // Their currency is auto-set based on their licensee
      if (!isSingleLicenseeNonAdmin) {
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
