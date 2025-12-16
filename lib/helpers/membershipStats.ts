/**
 * Membership Statistics Helper
 * Helper functions for fetching member counts (not location counts)
 */

import axios from 'axios';

export type MembershipStats = {
  membershipCount: number;
};

/**
 * Fetches member count from the API
 * @param licensee - Licensee ID to filter by
 * @param locationId - Optional location ID for specific location stats
 * @param machineTypeFilter - Optional filter string (comma-separated) for SMIB/No SMIB/Local Server/Membership
 * @param signal - Optional AbortSignal to cancel the request
 * @returns Promise<MembershipStats>
 */
export async function fetchMembershipStats(
  licensee?: string,
  locationId?: string,
  machineTypeFilter?: string | null,
  signal?: AbortSignal
): Promise<MembershipStats> {
  try {
    const params = new URLSearchParams();

    if (licensee && licensee !== 'all') {
      params.append('licensee', licensee);
    }

    if (locationId) {
      params.append('locationId', locationId);
    }

    if (machineTypeFilter) {
      params.append('machineTypeFilter', machineTypeFilter);
    }

    const response = await axios.get(
      `/api/members/count?${params.toString()}`,
      {
        signal,
      }
    );

    return {
      membershipCount: response.data.memberCount || 0,
    };
  } catch (error) {
    // Check if this is a cancellation error - don't log those
    const isCancellation =
      axios.isCancel(error) ||
      (error instanceof Error &&
        (error.name === 'AbortError' ||
          error.message === 'canceled' ||
          error.message === 'The user aborted a request.')) ||
      (error &&
        typeof error === 'object' &&
        'code' in error &&
        (error.code === 'ERR_CANCELED' || error.code === 'ECONNABORTED'));

    // Only log non-cancellation errors
    if (!isCancellation) {
    console.error('Failed to fetch membership stats:', error);
    }

    // Re-throw cancellation errors so useAbortableRequest can handle them silently
    if (isCancellation) {
      throw error;
    }

    return {
      membershipCount: 0,
    };
  }
}
