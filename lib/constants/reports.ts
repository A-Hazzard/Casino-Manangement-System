/**
 * Reports Constants
 * Configuration for reports page tabs and navigation.
 *
 * Includes:
 * - Reports tabs configuration (meters, locations, machines, logistics)
 * - Tab icons, descriptions, and permission requirements
 * Used by reports page components for consistent tab navigation.
 */
import type { ReportTab } from '@/lib/types';

/**
 * Configuration for reports tabs
 * Defines available tabs, their icons, descriptions, and permission requirements
 */
export const REPORTS_TABS_CONFIG: ReportTab[] = [
  {
    id: 'meters',
    label: 'Meters',
    icon: '📈',
    description: 'Meter readings and financial data by location',
  },
  {
    id: 'locations',
    label: 'Locations',
    icon: '🏢',
    description: 'Location performance analysis and comparisons',
  },
  {
    id: 'machines',
    label: 'Machines',
    icon: '🎰',
    description: 'Individual machine performance and revenue tracking',
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
