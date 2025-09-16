import type { MembersTab } from "@/lib/types/members";

/**
 * Configuration for members tabs
 * Defines available tabs, their icons, descriptions, and permission requirements
 */
export const MEMBERS_TABS_CONFIG: MembersTab[] = [
  {
    id: "members",
    label: "Members List",
    icon: "users",
    description: "View and manage all members",
    requiredRoles: ["admin", "manager"],
    requiredPermissions: ["members:read"],
  },
  {
    id: "summary-report",
    label: "Summary Report",
    icon: "bar-chart",
    description: "Analytics and member insights",
    requiredRoles: ["admin", "manager"],
    requiredPermissions: ["members:read", "reports:read"],
  },
];

/**
 * Animation variants for members components
 */
export const MEMBERS_ANIMATIONS = {
  pageVariants: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  tabVariants: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },
} as const;
