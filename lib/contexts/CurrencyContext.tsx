'use client';

import { ReactNode } from 'react';
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
import { 
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
 } from 'react';


type CurrencyProviderProps = {
  children: ReactNode;
  initialCurrency?: CurrencyCode;
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined
);

export function CurrencyProvider({
  children,
  initialCurrency = 'USD',
}: CurrencyProviderProps) {
  // Initialize state from dashboard store or localStorage if available
  const { 
    displayCurrency: storeDisplayCurrency, 
    setDisplayCurrency: setDashboardCurrency,
    selectedLicencee 
  } = useDashBoardStore();

  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>(() => {
    // Priority 1: Persistent store (if already loaded)
    if (storeDisplayCurrency && storeDisplayCurrency !== 'USD') {
      return storeDisplayCurrency;
    }
    // Priority 2: LocalStorage (direct access for immediate mount consistency)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('evolution-currency') as CurrencyCode;
      if (saved && ['USD', 'TTD', 'GYD', 'BBD'].includes(saved)) {
        return saved;
      }
    }
    return initialCurrency;
  });

  const user = useUserStore(state => state.user);
  const lastAutoSetUserId = useRef<string | null>(null); // Track which user we auto-set currency for
  const lastAutoSetLicenceeId = useRef<string | null>(null); // Track which licencee we auto-set currency for
  const lastActiveLicenceeId = useRef<string | null>(
    selectedLicencee ?? null
  ); // Track active licencee to detect changes

  // Sync with store if it changes elsewhere
  useEffect(() => {
    if (storeDisplayCurrency && storeDisplayCurrency !== displayCurrency) {
      setDisplayCurrency(storeDisplayCurrency);
    }
  }, [storeDisplayCurrency, displayCurrency]);

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
            // Update if API returns different currency than mapping
            if (
              apiLicenceeCurrency !== mappedLicenceeCurrency &&
              apiLicenceeCurrency !== 'USD'
            ) {
              handleSetDisplayCurrency(apiLicenceeCurrency);
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

  const roles = user?.roles || [];
  const isAdmin = roles.includes('admin') || roles.includes('developer');
  const userLicencees = Array.isArray(user?.assignedLicencees)
    ? user.assignedLicencees
    : [];
  const isSingleLicenceeNonAdmin = !isAdmin && userLicencees.length === 1;

  // Handle currency sync for admins or multi-licencee users when licencee changes
  useEffect(() => {
    // Skip for single-licencee users (handled by dedicated effect)
    if (isSingleLicenceeNonAdmin) return;

    // Detect if the licencee has actually changed in the dashboard store
    if (selectedLicencee !== lastActiveLicenceeId.current) {
      lastActiveLicenceeId.current = selectedLicencee || 'all';

      // Only perform auto-sync if we're switching TO a specific licencee (not "All")
      // Switching TO "All" should persist the current currency choice
      const isSwitchingToSpecific =
        selectedLicencee && selectedLicencee !== 'all' && selectedLicencee !== '';

      if (isSwitchingToSpecific) {
        // Sync to the native currency of the new licencee
        const mappedCurrency = getLicenceeCurrency(selectedLicencee);
        
        // CRITICAL FIX: Only auto-switch if the current currency is 'USD' (default)
        // This ensures if the user manually chose GYD, it persists even when switching licencees
        if (mappedCurrency && mappedCurrency !== displayCurrency && displayCurrency === 'USD') {
          handleSetDisplayCurrency(mappedCurrency);
        }

        // Verify with API for accuracy
        fetchLicenceeById(selectedLicencee)
          .then(licencee => {
            if (licencee?.name) {
              const apiCurrency = getLicenceeCurrency(licencee.name);
              // Only auto-switch if no manual choice was made (current is USD or matches the initial mapping)
              if (apiCurrency && apiCurrency !== mappedCurrency && (displayCurrency === 'USD' || displayCurrency === mappedCurrency)) {
                handleSetDisplayCurrency(apiCurrency);
              }
            }
          })
          .catch(() => {
            // Mapping is sufficient if API fails
          });
      }
    }
  }, [
    selectedLicencee,
    isSingleLicenceeNonAdmin,
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

      // NEVER load from localStorage for single-licencee non-admin users
      // Their currency is ALWAYS auto-set based on their licencee (handled in the previous effect)
      if (isSingleLicenceeNonAdmin) {
        // Clear any stale currency from localStorage for single-licencee users
        const savedCurrency = localStorage.getItem('evolution-currency');
        if (savedCurrency) {
          localStorage.removeItem('evolution-currency');
        }
        return;
      }

      // For admins or multi-licencee users, load from localStorage if not already auto-set
      const savedCurrency = localStorage.getItem('evolution-currency') as CurrencyCode;
      if (
        savedCurrency &&
        ['USD', 'TTD', 'GYD', 'BBD'].includes(savedCurrency) &&
        savedCurrency !== displayCurrency
      ) {
        setDisplayCurrency(savedCurrency);
      }
    }
  }, [user, isSingleLicenceeNonAdmin]); // Reduced dependencies to prevent infinite loop

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
