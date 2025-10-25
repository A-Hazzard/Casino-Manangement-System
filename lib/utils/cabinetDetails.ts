import { GamingMachine } from '@/shared/types/entities';
import { TimePeriod } from '../types/api';

type ExtendedCabinetDetail = GamingMachine & {
  lastCommunication?: string | Date;
};

// DebounceFunction is a generic function type for debounce utilities
type DebounceFunction = (...args: unknown[]) => unknown;

/**
 * Creates a debounced version of a function
 * @param func - The function to debounce
 * @param wait - The debounce wait time in milliseconds
 * @returns A debounced function
 */
export function debounce<T extends DebounceFunction>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>): void => {
    if (timeout) clearTimeout(timeout);

    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Determines if a cabinet is online based on last communication time
 * @param cabinet - The cabinet to check
 * @returns Whether the cabinet is online or not
 */
export function isCabinetOnline(
  cabinet: ExtendedCabinetDetail | null
): boolean {
  if (!cabinet || !cabinet.lastCommunication) return false;

  const lastComm = new Date(cabinet.lastCommunication);
  const now = new Date();

  // Consider cabinet online if last communication was within the past hour
  const diff = now.getTime() - lastComm.getTime();
  const oneHour = 60 * 60 * 1000;

  return diff < oneHour;
}

/**
 * Returns valid time period filters for cabinet metrics
 * @returns Array of time period filter options
 */
export function getTimePeriodFilters(): { label: string; value: TimePeriod }[] {
  return [
    { label: 'Today', value: 'Today' as TimePeriod },
    { label: 'Yesterday', value: 'Yesterday' as TimePeriod },
    { label: 'Last 7 days', value: '7d' as TimePeriod },
    { label: '30 days', value: '30d' as TimePeriod },
    { label: 'Custom', value: 'Custom' as TimePeriod },
  ];
}
