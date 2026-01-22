/**
 * saveUserHelper
 *
 * Helper function for saving user updates with change detection and activity logging.
 */

import type { User } from '@/lib/types/administration';
import {
  detectChanges,
  filterMeaningfulChanges,
  getChangesSummary,
} from '@/lib/utils/changeDetection';
import { toast } from 'sonner';
import { updateUser } from './data';

type SaveUserParams = {
  selectedUser: User;
  updated: Partial<User> & { password?: string };
  currentUser: User | null;
  getUserDisplayName: () => string;
  selectedLicencee: string | null;
  selectedStatus: string;
  itemsPerBatch: number;
  onSuccess: (updatedUserData: User) => void;
  onError: (error: unknown) => void;
};

export async function saveUserHelper({
  selectedUser,
  updated,
  currentUser,
  getUserDisplayName,
  onSuccess,
  onError,
}: SaveUserParams): Promise<void> {
  // Validate that we have at least one field to update
  const hasUpdates =
    updated.username !== undefined ||
    updated.email !== undefined ||
    updated.emailAddress !== undefined ||
    updated.roles !== undefined ||
    updated.profile !== undefined ||
    updated.profilePicture !== undefined ||
    updated.password !== undefined ||
    updated.assignedLocations !== undefined ||
    updated.assignedLicensees !== undefined ||
    (updated as { isEnabled?: boolean }).isEnabled !== undefined ||
    (updated as { enabled?: boolean }).enabled !== undefined;

  if (!hasUpdates) {
    toast.error('No changes detected. Please update at least one field.');
    return;
  }

  // Normalize email values for comparison
  const normalizedOriginalEmail = (
    selectedUser.email ||
    selectedUser.emailAddress ||
    ''
  ).trim();
  const normalizedUpdatedEmail = (
    updated.email ||
    updated.emailAddress ||
    ''
  ).trim();

  // Build comparison objects - ONLY include fields that were actually sent
  const originalData: Record<string, unknown> = {};
  const formDataComparison: Record<string, unknown> = {};

  if (updated.username !== undefined) {
    originalData.username = selectedUser.username;
    formDataComparison.username = updated.username;
  }

  if (updated.email !== undefined || updated.emailAddress !== undefined) {
    originalData.email = normalizedOriginalEmail;
    formDataComparison.email = normalizedUpdatedEmail;
    originalData.emailAddress = normalizedOriginalEmail;
    formDataComparison.emailAddress = normalizedUpdatedEmail;
  }

  if (updated.roles !== undefined) {
    originalData.roles = selectedUser.roles || [];
    formDataComparison.roles = updated.roles || [];
  }

  if (updated.profile !== undefined) {
    originalData.profile = selectedUser.profile;
    formDataComparison.profile = updated.profile;
  }

  if (updated.profilePicture !== undefined) {
    originalData.profilePicture = selectedUser.profilePicture;
    formDataComparison.profilePicture = updated.profilePicture;
  }

  if (updated.assignedLocations !== undefined) {
    originalData.assignedLocations = selectedUser.assignedLocations;
    formDataComparison.assignedLocations = updated.assignedLocations;
  }

  if (updated.assignedLicensees !== undefined) {
    originalData.assignedLicensees = selectedUser.assignedLicensees;
    formDataComparison.assignedLicensees = updated.assignedLicensees;
  }

  if (updated.password !== undefined) {
    formDataComparison.password = updated.password;
  }

  // Detect changes
  const changes = detectChanges(originalData, formDataComparison);
  const meaningfulChanges = filterMeaningfulChanges(changes);

  if (meaningfulChanges.length === 0) {
    toast.info('No changes detected');
    return;
  }

  // Check if permission-related fields changed
  const permissionFieldsChanged = meaningfulChanges.some(change => {
    const fieldPath = change.path;
    return (
      fieldPath === 'roles' ||
      fieldPath.startsWith('rel') ||
      fieldPath === 'assignedLocations' ||
      fieldPath === 'assignedLicensees'
    );
  });

  // Build update payload
  const updatePayload: Record<string, unknown> = { _id: selectedUser._id };

  if (updated.username !== undefined) {
    updatePayload.username = updated.username;
  }
  if (updated.email !== undefined || updated.emailAddress !== undefined) {
    updatePayload.emailAddress = updated.emailAddress || updated.email;
    updatePayload.email = updated.email || updated.emailAddress;
  }
  if (updated.roles !== undefined) {
    updatePayload.roles = updated.roles;
  }
  if (updated.profile !== undefined) {
    updatePayload.profile = updated.profile;
  }
  if (updated.profilePicture !== undefined) {
    updatePayload.profilePicture = updated.profilePicture;
  }
  if (updated.password !== undefined) {
    updatePayload.password = updated.password;
  }
  if ('isEnabled' in updated && updated.isEnabled !== undefined) {
    updatePayload.isEnabled = updated.isEnabled;
  } else if ('enabled' in updated && updated.enabled !== undefined) {
    updatePayload.isEnabled = updated.enabled;
  }
  if (updated.assignedLocations !== undefined) {
    updatePayload.assignedLocations = updated.assignedLocations;
  }
  if (updated.assignedLicensees !== undefined) {
    updatePayload.assignedLicensees = updated.assignedLicensees;
  }

  if (permissionFieldsChanged) {
    updatePayload.$inc = { sessionVersion: 1 };
  }

  try {
    const response = await updateUser(updatePayload as never);
    const updatedUserData = response.data?.user;

    // Log the update activity
    try {
      const changesSummary = getChangesSummary(meaningfulChanges);
      await fetch('/api/activity-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update',
          resource: 'user',
          resourceId: selectedUser._id,
          resourceName: selectedUser.username,
          details: `Updated user: ${changesSummary}`,
          userId: currentUser?._id || 'unknown',
          username: getUserDisplayName(),
          userRole: 'user',
          previousData: originalData,
          newData: updatePayload,
          changes: meaningfulChanges.map(change => ({
            field: change.field,
            oldValue: change.oldValue,
            newValue: change.newValue,
          })),
        }),
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to log activity:', error);
      }
    }

    if (updatedUserData) {
      onSuccess(updatedUserData);
    }

    // Show success message
    if (permissionFieldsChanged) {
      const locationChanges = meaningfulChanges.filter(
        c =>
          c.path.startsWith('assignedLocations') ||
          c.path === 'assignedLocations' ||
          c.path === 'assignedLicensees'
      );
      if (locationChanges.length > 0) {
        toast.success(
          `User updated successfully. Note: The user may need to log out and log back in for location permission changes to take effect.`
        );
      } else {
        toast.success(
          `User updated successfully: ${getChangesSummary(meaningfulChanges)}`
        );
      }
    } else {
      toast.success(
        `User updated successfully: ${getChangesSummary(meaningfulChanges)}`
      );
    }
  } catch (error) {
    let errorMessage = 'Failed to update user';

    if (error && typeof error === 'object') {
      const axiosError = error as {
        response?: {
          data?: { message?: string; error?: string };
          status?: number;
        };
        message?: string;
      };

      if (axiosError.response?.data) {
        errorMessage =
          axiosError.response.data.message ||
          axiosError.response.data.error ||
          errorMessage;
      } else if (axiosError.message) {
        errorMessage = axiosError.message;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    toast.error(errorMessage);
    onError(error);
  }
}
