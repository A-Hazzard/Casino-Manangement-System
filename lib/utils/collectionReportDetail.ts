/**
 * Collection Report Detail Utility Functions
 *
 * Utility functions for formatting and processing collection report detail data.
 *
 * Features:
 * - SAS time formatting
 * - Machine sorting utilities
 */

// ============================================================================
// Date Formatting Functions
// ============================================================================

/**
 * Format SAS time for display
 * @param dateString - Date string to format
 * @returns Formatted date string or "No SAS Time" if invalid
 */
export function formatSasTime(dateString: string): string {
  // Handle missing/empty dates
  if (!dateString || dateString === '-' || dateString === '') {
    return 'No SAS Time';
  }

  try {
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'No SAS Time';
    }
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };
    return date.toLocaleDateString('en-US', options);
  } catch {
    return 'No SAS Time'; // Better than showing "Invalid Date"
  }
}

// ============================================================================
// Sorting Functions
// ============================================================================

/**
 * Sort machines alphabetically and numerically
 * Handles machine IDs like "Machine1", "Machine2", "Machine10" correctly
 * @param machines - Array of machine metrics to sort
 * @returns Sorted array of machines
 */
export function sortMachinesAlphabetically<
  T extends { machineId?: string | number },
>(machines: T[]): T[] {
  return machines.sort((a, b) => {
    const nameA = (a.machineId || '').toString();
    const nameB = (b.machineId || '').toString();

    // Extract the base name and number parts
    const matchA = nameA.match(/^(.+?)(\d+)?$/);
    const matchB = nameB.match(/^(.+?)(\d+)?$/);

    if (!matchA || !matchB) {
      return nameA.localeCompare(nameB);
    }

    const [, baseA, numA] = matchA;
    const [, baseB, numB] = matchB;

    // First compare the base part alphabetically
    const baseCompare = baseA.localeCompare(baseB);
    if (baseCompare !== 0) {
      return baseCompare;
    }

    // If base parts are the same, compare numerically
    const numAInt = numA ? parseInt(numA, 10) : 0;
    const numBInt = numB ? parseInt(numB, 10) : 0;

    return numAInt - numBInt;
  });
}
