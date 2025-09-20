import type { ReportTab } from "@/lib/types";

/**
 * Configuration for reports tabs
 * Defines available tabs, their icons, descriptions, and permission requirements
 */
export const REPORTS_TABS_CONFIG: ReportTab[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "📊",
    description: "Real-time overview of casino operations and KPIs",
  },
  {
    id: "locations",
    label: "Locations",
    icon: "🏢",
    description: "Location performance analysis and comparisons",
  },
  {
    id: "machines",
    label: "Machines",
    icon: "🎰",
    description: "Individual machine performance and revenue tracking",
  },
  {
    id: "meters",
    label: "Meters",
    icon: "📈",
    description: "Meter readings and financial data by location",
  },
];

/**
 * Animation variants for reports components
 */
export const REPORTS_ANIMATIONS = {
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
