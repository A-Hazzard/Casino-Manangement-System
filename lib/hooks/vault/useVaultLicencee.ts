import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
/**
 * Hook to get the effective licencee ID for vault operations.
 *
 * Logic:
 * 1. If user is NOT an admin/developer and has assigned licencees, use the first one.
 * 2. Otherwise, use the selected licencee from the dashboard store.
 *
 * This ensures that Vault Managers and Cashiers see their own currency,
 * while Admins can switch between licencees.
 */
export function useVaultLicencee() {
  // ============================================================================
  // State & Hooks
  // ============================================================================

  const { user } = useUserStore();
  const { selectedLicencee, setSelectedLicencee } = useDashBoardStore();

  // ============================================================================
  // Computed
  // ============================================================================

  const isAdminOrDev = (() => {
    return user?.roles?.some(role =>
      ['admin', 'developer'].includes(role.toLowerCase())
    );
  })();

  const effectiveLicenceeId = (() => {
    // If not admin, prioritize assigned licencees
    if (
      !isAdminOrDev &&
      user?.assignedLicencees &&
      user.assignedLicencees.length > 0
    ) {
      return user.assignedLicencees[0];
    }
    // Otherwise use dashboard selection (for admins)
    return selectedLicencee;
  })();

  return {
    licenceeId: effectiveLicenceeId,
    isAdminOrDev,
    setLicenceeId: setSelectedLicencee,
  };
}
