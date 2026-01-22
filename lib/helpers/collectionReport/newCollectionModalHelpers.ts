/**
 * New Collection Modal Helpers
 *
 * Helper functions for the New Collection Modal component
 *
 * Features:
 * - API calls for collections
 * - Collection data management
 * - Activity logging utilities
 */

import type { CollectionDocument } from '@/lib/types/collection';
import axios, { type AxiosError } from 'axios';

/**
 * Add a machine collection to the database
 */
export async function addMachineCollection(
  data: Partial<CollectionDocument>
): Promise<CollectionDocument> {
  try {
    console.log('📤 [addMachineCollection] Sending POST to /api/collections', {
      machineId: data.machineId,
      location: data.location,
      collector: data.collector,
      metersIn: data.metersIn,
      metersOut: data.metersOut,
    });
    const res = await axios.post('/api/collections', data);
    console.log('✅ [addMachineCollection] Response received:', res.status);
    // The API returns { success: true, data: created, calculations: {...} }
    return res.data.data;
  } catch (error) {
    console.error('❌ [addMachineCollection] Error details:', {
      error,
      url: '/api/collections',
      status: (error as AxiosError)?.response?.status,
      statusText: (error as AxiosError)?.response?.statusText,
      data: (error as AxiosError)?.response?.data,
    });
    throw error;
  }
}

/**
 * Delete a machine collection from the database
 */
export async function deleteMachineCollection(
  id: string
): Promise<{ success: boolean }> {
  const res = await axios.delete(`/api/collections?id=${id}`);
  return res.data;
}

/**
 * Update multiple collections with a report ID
 */
export async function updateCollectionsWithReportId(
  collections: CollectionDocument[],
  reportId: string
): Promise<void> {
  // Update each collection with the correct locationReportId and mark as completed
  const updatePromises = collections.map(async collection => {
    try {
      await axios.patch(`/api/collections?id=${collection._id}`, {
        locationReportId: reportId,
        isCompleted: true,
      });
    } catch (error) {
      console.error(`Failed to update collection ${collection._id}:`, error);
      throw error;
    }
  });

  await Promise.all(updatePromises);
}

/**
 * Get user display name for activity logging
 */
export function getUserDisplayName(user: {
  profile?: {
    firstName?: string;
    lastName?: string;
  };
  username?: string;
  emailAddress?: string;
}): string {
  if (!user) return 'Unknown User';

  // Check if user has profile with firstName and lastName
  if (user.profile?.firstName && user.profile?.lastName) {
    return `${user.profile.firstName} ${user.profile.lastName}`;
  }

  // If only firstName exists, use it
  if (user.profile?.firstName && !user.profile?.lastName) {
    return user.profile.firstName;
  }

  // If only lastName exists, use it
  if (!user.profile?.firstName && user.profile?.lastName) {
    return user.profile.lastName;
  }

  // If neither firstName nor lastName exist, use username
  if (user.username && user.username.trim() !== '') {
    return user.username;
  }

  // If username doesn't exist or is blank, use email
  if (user.emailAddress && user.emailAddress.trim() !== '') {
    return user.emailAddress;
  }

  // Fallback
  return 'Unknown User';
}

/**
 * Log activity to the activity logs API
 */
export async function logActivity(
  action: string,
  resource: string,
  resourceId: string,
  resourceName: string,
  details: string,
  userId: string | undefined,
  username: string,
  previousData?: Record<string, unknown> | null,
  newData?: Record<string, unknown> | null
): Promise<void> {
  try {
    const response = await fetch('/api/activity-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        resource,
        resourceId,
        resourceName,
        details,
        userId: userId || 'unknown',
        username,
        userRole: 'user',
        previousData: previousData || null,
        newData: newData || null,
        changes: [], // Will be calculated by the API
      }),
    });

    if (!response.ok) {
      console.error('Failed to log activity:', response.statusText);
    }
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}


