/**
 * Activity Types
 * Frontend-specific types for activity log grouping and processing.
 *
 * Defines types for displaying activity logs in the frontend with
 * grouped entries, icons, and formatted descriptions.
 */
import type { ActivityLog } from '@/app/api/lib/types/activityLog';

// Frontend-specific activity types
export type ActivityGroup = {
  range: string;
  entries: ProcessedActivityEntry[];
};

export type ProcessedActivityEntry = {
  id: string;
  time: string;
  type: string;
  icon: string;
  iconBg: string;
  user: {
    email: string;
    role: string;
  };
  description: string;
  originalActivity: ActivityLog;
};
