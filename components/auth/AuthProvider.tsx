/**
 * Auth Provider Component
 * Initializes authentication context without handling redirects.
 *
 * Features:
 * - Initializes authentication state
 * - Provides auth context to child components
 * - No redirect logic (handled by ProtectedRoute)
 * - Minimal wrapper for auth initialization
 *
 * @param children - Child components to render
 */
'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import type React from 'react';

type AuthProviderProps = {
  children: React.ReactNode;
};

export default function AuthProvider({ children }: AuthProviderProps) {
  // ============================================================================
  // Hooks - Initialize Auth
  // ============================================================================
  // Just provide the auth context without redirects
  useAuth(); // Initialize auth but don't use the return values for redirects

  // ============================================================================
  // Render
  // ============================================================================
  return <>{children}</>;
}
