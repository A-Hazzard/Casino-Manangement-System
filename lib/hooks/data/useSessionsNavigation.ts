/**
 * Sessions Navigation Custom Hook
 *
 * Provides a custom hook for managing sessions navigation and routing.
 * It handles navigation to session events, session details, and provides
 * back navigation functionality.
 *
 * Features:
 * - Navigate to session events page
 * - Navigate to session details page
 * - Back navigation support
 * - Navigation state checking
 */

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

type UseSessionsNavigationReturn = {
  navigateToSessionEvents: (sessionId: string, machineId: string) => void;
  navigateToSessionDetails: (sessionId: string) => void;
  navigateBack: () => void;
  canNavigateBack: boolean;
};

export function useSessionsNavigation(): UseSessionsNavigationReturn {
  const router = useRouter();

  // Navigate to session events page
  const navigateToSessionEvents = useCallback(
    (sessionId: string, machineId: string) => {
      router.push(`/sessions/${sessionId}/${machineId}/events`);
    },
    [router]
  );

  // Navigate to session details page
  const navigateToSessionDetails = useCallback(
    (sessionId: string) => {
      router.push(`/sessions/${sessionId}`);
    },
    [router]
  );

  // Navigate back to previous page
  const navigateBack = useCallback(() => {
    router.back();
  }, [router]);

  // Check if navigation back is possible
  const canNavigateBack = useCallback(() => {
    return window.history.length > 1;
  }, []);

  return {
    navigateToSessionEvents,
    navigateToSessionDetails,
    navigateBack,
    canNavigateBack: canNavigateBack(),
  };
}
