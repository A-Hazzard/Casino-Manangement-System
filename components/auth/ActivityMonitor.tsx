/**
 * Activity Monitor Component
 * Monitors user activity and refreshes authentication token automatically.
 *
 * Features:
 * - Tracks user activity (mouse, keyboard, touch)
 * - Refreshes auth token every 5 minutes if user is active
 * - Prevents session expiration during active use
 * - Invisible component (renders nothing)
 *
 * @returns null - This component renders nothing
 */
'use client';

import { useActivityMonitor } from '@/lib/hooks/useActivityMonitor';

export default function ActivityMonitor() {
  // ============================================================================
  // Hooks - Activity Monitoring
  // ============================================================================
  // Monitor activity and refresh token every 5 minutes if user is active
  useActivityMonitor(true, 5 * 60 * 1000);

  // ============================================================================
  // Render - Nothing (invisible component)
  // ============================================================================
  return null; // This component renders nothing, it just monitors activity
}
