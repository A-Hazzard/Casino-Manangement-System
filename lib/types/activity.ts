import type { ActivityLog } from "@/app/api/lib/types/activityLog";

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
