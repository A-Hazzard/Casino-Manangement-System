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
 * @returns Promise<MembershipStats>
 */
export async function fetchMembershipStats(
  licensee?: string,
  locationId?: string
): Promise<MembershipStats> {
  try {
    const params = new URLSearchParams();

    if (licensee && licensee !== 'all') {
      params.append('licensee', licensee);
    }

    if (locationId) {
      params.append('locationId', locationId);
    }

    const response = await axios.get(`/api/members/count?${params.toString()}`);

    return {
      membershipCount: response.data.memberCount || 0,
    };
  } catch (error) {
    console.error('Failed to fetch membership stats:', error);
    return {
      membershipCount: 0,
    };
  }
}
