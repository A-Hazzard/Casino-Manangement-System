/**
 * TempPasswordGate Component
 *
 * A global gate that blocks access to the application for all users
 * (including Developers and Admins) who require a password security update.
 *
 * Behaviour:
 * - Reads the current user from the store.
 * - If the user has requiresPasswordUpdate === true,
 *   renders the PasswordUpdateModal in forced/blocking mode over all pages.
 * - On successful password update, refreshes the current-user data and
 *   allows the user to continue without a full logout/redirect since a
 *   temp-password change does NOT require a session version bump.
 * - Includes a Logout button so the user is never truly stuck.
 *
 * @module components/shared/providers/TempPasswordGate
 */
'use client';

import PasswordUpdateModal from '@/components/shared/ui/PasswordUpdateModal';
import { logoutUser } from '@/lib/helpers/client';
import { useUserStore } from '@/lib/store/userStore';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

export default function TempPasswordGate() {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const { user, setUser, clearUser } = useUserStore();
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  // ============================================================================
  // Computed Values
  // ============================================================================
  const needsPasswordChange = user?.requiresPasswordUpdate === true;
  const isCashier =
    Array.isArray(user?.roles) &&
    user.roles.some(
      (r: string) => typeof r === 'string' && r.toLowerCase() === 'cashier'
    );
  const isCashierTempChange = isCashier && user?.tempPasswordChanged === false;

  // ============================================================================
  // Handlers
  // ============================================================================

  /**
   * Calls /api/profile to update the password then refreshes current-user.
   * Returns null on success, or an error message string on failure.
   */
  const handlePasswordUpdate = useCallback(
    async (
      currentPassword: string,
      newPassword: string,
      phone?: string
    ): Promise<string | null> => {
      setLoading(true);
      try {
        const response = await fetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            username: user?.username || '',
            firstName: user?.profile?.firstName || '',
            lastName: user?.profile?.lastName || '',
            emailAddress: user?.emailAddress || '',
            phone: phone || user?.profile?.phoneNumber || '',
            currentPassword,
            newPassword,
            confirmPassword: newPassword,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          return (
            data.errors?.currentPassword ||
            data.errors?.newPassword ||
            data.message ||
            'Failed to update password. Please try again.'
          );
      }

        // Update store and invalidate query to prevent stale data flicker
        if (data.user) {
          setUser({ ...user!, ...data.user, tempPasswordChanged: true });
        }
        
        // Invalidate current-user query so that other components get the fresh data
        await queryClient.invalidateQueries({ queryKey: ['current-user'] });

        return null; // success
      } catch {
        return 'An unexpected error occurred. Please try again.';
      } finally {
        setLoading(false);
      }
    },
    [user, setUser]
  );

  const handleLogout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      clearUser();
      window.location.href = '/login';
    }
  }, [clearUser]);

  // ============================================================================
  // Render — only mount the modal when it is actually needed
  // ============================================================================
  if (!needsPasswordChange) return null;

  return (
    <>
      <PasswordUpdateModal
        open={true}
        onUpdate={handlePasswordUpdate}
        loading={loading}
        isForced={true}
        isCashierTempChange={isCashierTempChange}
        onLogout={handleLogout}
        initialPhone={user?.profile?.phoneNumber || ''}
      />
    </>
  );
}
