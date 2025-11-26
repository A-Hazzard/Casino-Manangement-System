/**
 * Global Sidebar Wrapper Component
 * Wraps the application sidebar and initializes global interceptors.
 *
 * Features:
 * - Conditionally renders sidebar (hidden on login page)
 * - Initializes axios interceptors for database mismatch detection
 * - Provides sidebar overlay for mobile responsiveness
 * - Manages sidebar visibility based on route
 *
 * @returns AppSidebar with overlay or null for login page
 */
'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarOverlay } from '@/components/ui/sidebar';
import { setupAxiosInterceptors } from '@/lib/utils/axiosInterceptor';

export default function GlobalSidebarWrapper() {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const pathname = usePathname();

  // ============================================================================
  // Effects - Initialize Interceptors
  // ============================================================================
  // Initialize axios interceptors for database mismatch detection
  useEffect(() => {
    setupAxiosInterceptors();
  }, []);

  // ============================================================================
  // Render - Conditional Sidebar
  // ============================================================================
  if (pathname === '/login') return null;
  return (
    <>
      <AppSidebar />
      <SidebarOverlay />
    </>
  );
}
