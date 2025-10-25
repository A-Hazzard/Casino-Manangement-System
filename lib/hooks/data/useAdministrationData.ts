/**
 * Custom hook for managing administration data fetching and state
 * Handles users, licensees, and activity logs data management
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { fetchUsers } from '@/lib/helpers/administration';
import type {
  User,
  UseAdministrationDataProps,
  UseAdministrationDataReturn,
} from '@/lib/types/administration';
import type { Licensee } from '@/lib/types/licensee';
import { ActivityLogData } from '@/lib/types/hooks';

export function useAdministrationData({
  selectedLicencee,
  activeSection,
}: UseAdministrationDataProps): UseAdministrationDataReturn {
  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [licensees] = useState<Licensee[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogData[]>([]);

  // Loading states
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingLicensees] = useState(false);
  const [loadingActivityLogs, setLoadingActivityLogs] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Fetch users data
  const fetchUsersData = useCallback(async () => {
    setLoadingUsers(true);
    setError(null);

    try {
      const usersData = await fetchUsers(selectedLicencee);
      setUsers(usersData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch users';
      setError(errorMessage);
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  }, [selectedLicencee]);

  // Note: fetchLicensees function is not available in helpers
  // Licensees data fetching is not implemented yet

  // Fetch activity logs data
  const fetchActivityLogsData = useCallback(async () => {
    setLoadingActivityLogs(true);
    setError(null);

    try {
      // This would be implemented based on the actual API
      // const logsData = await fetchActivityLogs(selectedLicencee);
      // setActivityLogs(logsData);
      setActivityLogs([]);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch activity logs';
      setError(errorMessage);
      toast.error('Failed to load activity logs');
    } finally {
      setLoadingActivityLogs(false);
    }
  }, []);

  // Refresh methods
  const refreshUsers = useCallback(async () => {
    await fetchUsersData();
  }, [fetchUsersData]);

  const refreshLicensees = useCallback(async () => {
    // Licensees data fetching is not implemented yet
  }, []);

  const refreshActivityLogs = useCallback(async () => {
    await fetchActivityLogsData();
  }, [fetchActivityLogsData]);

  const refreshAllData = useCallback(async () => {
    await Promise.all([fetchUsersData(), fetchActivityLogsData()]);
  }, [fetchUsersData, fetchActivityLogsData]);

  // Load data based on active section
  useEffect(() => {
    if (activeSection === 'users') {
      fetchUsersData();
    } else if (activeSection === 'licensees') {
      // Licensees data fetching is not implemented yet
    } else if (activeSection === 'activity-logs') {
      fetchActivityLogsData();
    }
  }, [activeSection, fetchUsersData, fetchActivityLogsData]);

  return {
    users,
    licensees,
    activityLogs,
    loadingUsers,
    loadingLicensees,
    loadingActivityLogs,
    error,
    refreshUsers,
    refreshLicensees,
    refreshActivityLogs,
    refreshAllData,
  };
}
