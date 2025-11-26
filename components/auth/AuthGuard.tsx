/**
 * Auth Guard Component
 * Global authentication guard that protects all routes except public pages.
 *
 * Features:
 * - Redirects to login if user is not authenticated
 * - Allows access to public routes (login, unauthorized)
 * - Shows loading spinner while redirecting
 * - Client-side only authentication check
 * - Works with useUserStore for global auth state
 *
 * @param children - Child components to render if authenticated
 */
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUserStore } from '@/lib/store/userStore';
import type React from 'react';

type AuthGuardProps = {
  children: React.ReactNode;
};

export default function AuthGuard({ children }: AuthGuardProps) {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const { user } = useUserStore();
  const router = useRouter();
  const pathname = usePathname();

  // Routes that don't require authentication
  const publicRoutes = ['/login', '/unauthorized'];
  const isPublicRoute = publicRoutes.includes(pathname);

  // ============================================================================
  // Effects - Authentication Check
  // ============================================================================
  useEffect(() => {
    // Only check authentication on client side
    if (typeof window === 'undefined') return;

    // Allow access to public routes
    if (isPublicRoute) {
      return;
    }

    // Redirect to login if user is null
    if (!user) {
      console.warn('User not authenticated, redirecting to login');
      router.push('/login');
      return;
    }
  }, [user, router, pathname, isPublicRoute]);

  // ============================================================================
  // Render - Loading or Protected Content
  // ============================================================================

  // Don't render children if user is null and not on a public route
  if (!user && !isPublicRoute) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return <>{children}</>;
}
