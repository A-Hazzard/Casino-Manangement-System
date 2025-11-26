/**
 * Members Constants
 * Configuration for members page tabs and animations.
 *
 * Includes:
 * - Members tabs configuration (list, summary report)
 * - Animation variants for members page and tab transitions
 * Used by members page components for consistent navigation and animations.
 */
import type { MembersTab } from '@/shared/types/entities';

/**
 * Configuration for members tabs
 * Defines available tabs, their icons, descriptions, and permission requirements
 */
export const MEMBERS_TABS_CONFIG: MembersTab[] = [
  {
    id: 'members',
    label: 'Members List',
    icon: 'users',
    description: 'View and manage all members',
  },
  {
    id: 'summary-report',
    label: 'Summary Report',
    icon: 'bar-chart',
    description: 'Analytics and member insights',
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
