/**
 * Developer Route Component
 * Strict route guard that allows ONLY the developer role.
 *
 * Rule: if the user's roles contain `developer`, render — regardless of any
 * other role (owner/admin included) or transient auth/loading state. Every
 * non-developer is redirected away. Unlike ProtectedRoute, admin/owner do NOT
 * bypass this guard.
 *
 * @param children - Child components to render for developers
 */

'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

type DeveloperRouteProps = {
  children: ReactNode;
};

export default function DeveloperRoute({ children }: DeveloperRouteProps) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const roles = (user?.roles ?? []) as string[];
  const isDeveloper = roles.includes('developer');
  const rolesLoaded = roles.length > 0;

  // ============================================================================
  // Effects
  // ============================================================================
  useEffect(() => {
    // Developer access is decided purely on the role — allow and stop here.
    if (isDeveloper) return;
    // Wait until auth + roles have resolved before redirecting anyone away.
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (rolesLoaded) {
      router.replace('/unauthorized');
    }
  }, [isDeveloper, isLoading, user, rolesLoaded, router]);

  // ============================================================================
  // Render
  // ============================================================================
  // Developers render immediately — never blocked by loading/enabled state.
  if (isDeveloper) return <>{children}</>;
  return <></>;
}
