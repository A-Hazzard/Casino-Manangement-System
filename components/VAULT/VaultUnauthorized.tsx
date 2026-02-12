/**
 * Vault Unauthorized Component
 *
 * Displays access denied message for users who don't have permission to access VAULT.
 * Shows user's role and allows logout while keeping sidebar visible.
 *
 * Features:
 * - Clear access denied message
 * - Role display
 * - Logout button
 * - Sidebar remains visible for navigation
 *
 * @module components/VAULT/VaultUnauthorized
 */
'use client';

import { Button } from '@/components/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { logoutUser } from '@/lib/helpers/client';
import { useUserStore } from '@/lib/store/userStore';
import { AlertTriangle, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function VaultUnauthorized() {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const { user, clearUser } = useUserStore();
  const router = useRouter();

  // ============================================================================
  // Event Handlers
  // ============================================================================
  /**
   * Handle logout action
   * Calls logout API, clears user state, and redirects to login page
   */
  const handleLogout = async () => {
    await logoutUser();
    clearUser();
    router.push('/login');
  };

  // ============================================================================
  // Computed Values
  // ============================================================================
  /**
   * Format user role for display
   * Capitalizes first letter of first role, defaults to 'User' if no roles
   */
  const userRole =
    user?.roles && user.roles.length > 0
      ? user.roles[0].charAt(0).toUpperCase() + user.roles[0].slice(1)
      : 'User';

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-4 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">Access Denied</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-gray-600">
            Your role <span className="font-semibold">{userRole}</span> does not
            have permission to access Vault Management.
          </p>
          <p className="text-center text-sm text-gray-500">
            Please contact your manager to request access.
          </p>
          <div className="pt-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
