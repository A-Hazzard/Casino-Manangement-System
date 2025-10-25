import { differenceInMinutes } from 'date-fns';
import type { GamingMachine as CabinetDetail } from '@/shared/types/entities';

/**
 * Check if cabinet is online based on last activity
 */
export function isCabinetOnline(cabinet: CabinetDetail): boolean {
  if (!cabinet?.lastActivity) return false;

  const lastActive = new Date(cabinet.lastActivity);
  return differenceInMinutes(new Date(), lastActive) <= 3;
}

/**
 * Get communication mode from cabinet data
 */
export function getCommunicationMode(cabinet: CabinetDetail): string {
  if (cabinet?.smibConfig?.coms?.comsMode !== undefined) {
    const mode = cabinet.smibConfig.coms.comsMode;
    if (mode === 0) return 'sas';
    if (mode === 1) return 'non sas';
    return 'IGT';
  }
  return 'undefined';
}

/**
 * Get firmware version from cabinet data
 */
export function getFirmwareVersion(cabinet: CabinetDetail): string {
  if (
    cabinet?.smibVersion?.firmware &&
    typeof cabinet.smibVersion.firmware === 'string'
  ) {
    const firmware = cabinet.smibVersion.firmware;
    if (firmware.includes('v1-0-4-1')) {
      return 'Cloudy v1.0.4.1';
    } else if (firmware.includes('v1-0-4')) {
      return 'Cloudy v1.0.4';
    } else {
      return 'Cloudy v1.0';
    }
  }
  return 'Cloudy v1.0.4';
}

/**
 * Get cabinet display name
 */
export function getCabinetDisplayName(cabinet: CabinetDetail): string {
  return (
    cabinet?.serialNumber ||
    (cabinet as { origSerialNumber?: string })?.origSerialNumber ||
    (cabinet as { machineId?: string })?.machineId ||
    'GMID1'
  );
}

/**
 * Get cabinet location display
 */
export function getCabinetLocationDisplay(cabinet: CabinetDetail): {
  locationName: string;
  country: string;
} {
  const locationName = cabinet?.locationName || 'Unknown Location';
  let country = 'Trinidad and Tobago';
  let locationNamePart = locationName;

  if (locationName.includes(',')) {
    const parts = locationName.split(',');
    country = parts.slice(1).join(',').trim() || 'Trinidad and Tobago';
    locationNamePart = parts[0] || locationName;
  }

  return {
    locationName: locationNamePart,
    country,
  };
}

/**
 * Get SMIB ID from cabinet data
 */
export function getSmibId(cabinet: CabinetDetail): string {
  return cabinet?.relayId || cabinet?.smibBoard || 'e831cdfa8464';
}

/**
 * Get WiFi network name from cabinet data
 */
export function getWifiNetworkName(cabinet: CabinetDetail): string {
  return cabinet?.smibConfig?.net?.netStaSSID || 'Dynamic 1 - Staff Wifi';
}

/**
 * Get firmware string from cabinet data
 */
export function getFirmwareString(cabinet: CabinetDetail): string {
  return cabinet?.smibVersion?.firmware || 'FAC_v1-0-4(v1-0-4)';
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Debounce function for API calls
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
