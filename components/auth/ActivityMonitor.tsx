'use client';

import { useActivityMonitor } from '@/lib/hooks/useActivityMonitor';

/**
 * Client component that monitors user activity and refreshes authentication token
 * Prevents session expiration while user is actively using the application
 */
export default function ActivityMonitor() {
  // Monitor activity and refresh token every 5 minutes if user is active
  useActivityMonitor(true, 5 * 60 * 1000);

  return null; // This component renders nothing, it just monitors activity
}
