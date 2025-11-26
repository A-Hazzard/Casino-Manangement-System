/**
 * Machine Utilities
 *
 * Utility functions for machine status and display operations.
 *
 * Features:
 * - Online/offline status checking
 * - Machine display ID extraction
 * - Activity threshold handling
 */

// ============================================================================
// Machine Status Functions
// ============================================================================
/**
 * Returns true if the given lastActivity is within the threshold window.
 * Missing lastActivity is treated as offline.
 */
export function isMachineOnline(
  lastActivity: string | Date | null | undefined,
  thresholdMs: number = 3 * 60 * 1000
): boolean {
  if (!lastActivity) return false;
  const last = new Date(lastActivity).getTime();
  if (Number.isNaN(last)) return false;
  return Date.now() - last <= thresholdMs;
}

/**
 * Returns true if the machine is considered offline with the given threshold.
 */
export function isMachineOffline(
  lastActivity: string | Date | null | undefined,
  thresholdMs: number = 3 * 60 * 1000
): boolean {
  return !isMachineOnline(lastActivity, thresholdMs);
}

// ============================================================================
// Machine Display ID Functions
// ============================================================================
/**
 * Returns a display identifier for a machine, prioritizing fields in order:
 * 1) serialNumber
 * 2) origSerialNumber
 * 3) machineId
 * 4) _id
 * 5) fallback "Unknown"
 */
export function getMachineDisplayId(machine: Record<string, unknown>): string {
  if (!machine || typeof machine !== 'object') return 'Unknown';
  const pick = (...vals: Array<unknown>): string | undefined => {
    for (const v of vals) {
      if (typeof v === 'string') {
        const trimmed = v.trim();
        if (trimmed.length > 0) return trimmed;
      } else if (typeof v === 'number') {
        return String(v);
      }
    }
    return undefined;
  };

  return (
    pick(
      machine.serialNumber,
      machine.origSerialNumber,
      machine.machineId,
      machine._id?.toString?.(),
      machine.machineName
    ) || 'Unknown'
  );
}
