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
import { isTabAvailable } from '@/lib/constants/maintenance';
import { Building2, ChartNoAxesCombined, Gamepad2 } from 'lucide-react';

/**
 * Configuration for reports tabs
 * Defines available tabs, their icons, descriptions, and permission requirements
 */
export const REPORTS_TABS_CONFIG: ReportTab[] = [
  {
    id: 'meters',
    label: 'Meters',
    icon: ChartNoAxesCombined,
    description: 'Meter readings and financial data by location',
    available: isTabAvailable('reports', 'meters'),
  },
  {
    id: 'locations',
    label: 'Locations',
    icon: Building2,
    description: 'Location performance analysis and comparisons',
    available: isTabAvailable('reports', 'locations'),
  },
  {
    id: 'machines',
    label: 'Cabinets',
    icon: Gamepad2,
    description: 'Individual cabinet performance and revenue tracking',
    available: isTabAvailable('reports', 'machines'),
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
