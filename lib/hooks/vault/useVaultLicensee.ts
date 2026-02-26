import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import { useMemo } from 'react';

/**
 * Hook to get the effective licensee ID for vault operations.
 * 
 * Logic:
 * 1. If user is NOT an admin/developer and has assigned licensees, use the first one.
 * 2. Otherwise, use the selected licensee from the dashboard store.
 * 
 * This ensures that Vault Managers and Cashiers see their own currency,
 * while Admins can switch between licensees.
 */
export function useVaultLicensee() {
  const { user } = useUserStore();
  const { selectedLicensee, setSelectedLicensee } = useDashBoardStore();

  const isAdminOrDev = useMemo(() => {
    return user?.roles?.some(r => ['admin', 'developer'].includes(r.toLowerCase()));
  }, [user?.roles]);

  const effectiveLicenseeId = useMemo(() => {
    // If not admin, prioritize assigned licensees
    if (!isAdminOrDev && user?.assignedLicensees && user.assignedLicensees.length > 0) {
      return user.assignedLicensees[0];
    }
    // Otherwise use dashboard selection (for admins)
    return selectedLicensee;
  }, [isAdminOrDev, user?.assignedLicensees, selectedLicensee]);

  return {
    licenseeId: effectiveLicenseeId,
    isAdminOrDev,
    setLicenseeId: setSelectedLicensee
  };
}
