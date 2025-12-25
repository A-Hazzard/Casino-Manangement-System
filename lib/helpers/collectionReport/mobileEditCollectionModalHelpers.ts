/**
 * Mobile Edit Collection Modal Helpers
 *
 * Helper functions for the Mobile Edit Collection Modal hook.
 * Contains utility functions extracted from useMobileEditCollectionModal.
 */

/**
 * Utility function for proper alphabetical and numerical sorting
 */
export function sortMachinesAlphabetically<
  T extends { name?: string; machineName?: string; serialNumber?: string },
>(machines: T[]): T[] {
  return machines.sort((a, b) => {
    const nameA = (a.name || a.machineName || a.serialNumber || '').toString();
    const nameB = (b.name || b.machineName || b.serialNumber || '').toString();

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



