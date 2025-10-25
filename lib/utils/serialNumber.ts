/**
 * Utility function to get the best available serial number identifier
 * Uses fallback order: serialNumber -> custom.name -> machineId
 *
 * @param cabinet - Cabinet object with potential serial number fields
 * @returns The best available serial number identifier
 */
export function getSerialNumberIdentifier(cabinet: {
  serialNumber?: string;
  custom?: { name?: string };
  machineId?: string;
}): string {
  // Primary: serialNumber
  if (cabinet.serialNumber && cabinet.serialNumber.trim() !== '') {
    return cabinet.serialNumber;
  }

  // Fallback 1: custom.name
  if (cabinet.custom?.name && cabinet.custom.name.trim() !== '') {
    return cabinet.custom.name;
  }

  // Fallback 2: machineId
  if (cabinet.machineId && cabinet.machineId.trim() !== '') {
    return cabinet.machineId;
  }

  // Final fallback: "N/A"
  return 'N/A';
}
