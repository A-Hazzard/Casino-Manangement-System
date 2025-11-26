/**
 * UI Constants
 * Core UI constants including color palettes, time frames, and filter options.
 *
 * Includes:
 * - Color palette for charts and UI elements
 * - Time frame options (Today, Yesterday, 7d, 30d, Custom)
 * - Filter value mappings
 * - Licensee options for filtering
 * - Mathematical constants (RADIAN for pie charts)
 * Used throughout the application for consistent UI styling and filtering.
 */
import { TimeFrames } from '../types';
import { licenceeOption } from '../types';
import { TimePeriod } from '@/shared/types/common';

/**
 * Color palette used for charts and UI elements throughout the dashboard (e.g., PieChart, StatCards)
 */
export const colorPalette = [
  '#94F394', // Green
  '#96E3D4', // Teal
  '#FFA203', // Orange
  '#5A69E7', // Blue
  '#F9687D', // Red
  '#8A7FFF', // Purple
  '#E8A837', // Yellow
  '#FF6B93', // Pink
  '#53B3E7', // Light Blue
  '#F4C542', // Gold
];

/**
 * List of time frame options for filtering dashboard data.
 * Used in PcLayout, MobileLayout, and CustomSelect for selecting time periods.
 */
export const timeFrames: TimeFrames[] = [
  { time: 'Today', value: 'Today' as TimePeriod },
  { time: 'Yesterday', value: 'Yesterday' as TimePeriod },
  { time: 'Last 7 days', value: '7d' as TimePeriod },
  { time: 'Last 30 days', value: '30d' as TimePeriod },
];

/**
 * Maps human-readable time frame labels to their corresponding TimePeriod values.
 * Used in Header and filter logic to convert UI selections to API parameters.
 */
export const filterValueMap = {
  Today: 'Today' as TimePeriod,
  Yesterday: 'Yesterday' as TimePeriod,
  last7days: '7d' as TimePeriod,
  last30days: '30d' as TimePeriod,
  Custom: 'Custom' as TimePeriod,
};

/**
 * List of licencee options for filtering data by licencee.
 * Used in LicenceeSelect dropdown and Header for licencee filtering.
 */
export const licenceeOptions: licenceeOption[] = [
  { label: 'All Licencee', value: '' },
  { label: 'TTG', value: '9a5db2cb29ffd2d962fd1d91' },
  { label: 'Cabana', value: 'c03b094083226f216b3fc39c' },
  { label: 'Barbados', value: '732b094083226f216b3fc11a' },
];

/**
 * Constant for converting degrees to radians, used in pie chart label calculations (e.g., app/page.tsx).
 */
export const RADIAN = Math.PI / 180;
