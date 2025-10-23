/**
 * Simple machine display utility without brackets
 * Fallback hierarchy: serialNumber > custom.name > origSerialNumber > machineId
 */

type MachineLike = {
  serialNumber?: string;
  custom?: { name?: string };
  machineCustomName?: string;
  origSerialNumber?: string;
  machineId?: string;
  _id?: string;
};

/**
 * Gets the display name for a machine using fallback hierarchy
 * @param machine - The machine object
 * @returns Simple display name without brackets
 */
export function getMachineDisplayName(machine: MachineLike): string {
  // 1. Try serialNumber (if not empty/whitespace)
  if (machine.serialNumber && machine.serialNumber.trim() !== "") {
    return machine.serialNumber.trim();
  }

  // 2. Try custom.name or machineCustomName
  const customName = machine.custom?.name || machine.machineCustomName;
  if (customName && customName.trim() !== "") {
    return customName.trim();
  }

  // 3. Try origSerialNumber
  if (machine.origSerialNumber && machine.origSerialNumber.trim() !== "") {
    return machine.origSerialNumber.trim();
  }

  // 4. Fallback to machineId or _id
  return machine.machineId || machine._id || "Unknown Machine";
}
