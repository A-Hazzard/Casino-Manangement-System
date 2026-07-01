export type MachineIdSource = {
  machineId?: string | null;
  _id?: string | null;
  id?: string | null;
};

export function resolveMachineRouteId(
  source: MachineIdSource | string | null | undefined
): string | undefined {
  if (!source) {
    return undefined;
  }

  if (typeof source === 'string') {
    const trimmed = source.trim();
    return trimmed || undefined;
  }

  const resolvedMachineId = source.machineId?.trim();
  if (resolvedMachineId) {
    return resolvedMachineId;
  }

  const documentId = source._id?.trim();
  if (documentId) {
    return documentId;
  }

  const id = source.id?.trim();
  return id || undefined;
}

export type GmNumberSource = {
  custom?: { name?: string | null } | null;
  customName?: string | null;
  machineCustomName?: string | null;
  machineName?: string | null;
  gmNumber?: string | null;
};

export type SerialNumberSource = {
  serialNumber?: string | null;
};

export function resolveGmNumber(
  source: GmNumberSource | string | null | undefined
): string | undefined {
  if (!source) {
    return undefined;
  }

  if (typeof source === 'string') {
    const trimmed = source.trim();
    return trimmed || undefined;
  }

  const fromCustom = source.custom?.name?.trim();
  if (fromCustom) {
    return fromCustom;
  }

  const fromCustomName = source.customName?.trim();
  if (fromCustomName) {
    return fromCustomName;
  }

  const fromMachineCustomName = source.machineCustomName?.trim();
  if (fromMachineCustomName) {
    return fromMachineCustomName;
  }

  const fromMachineName = source.machineName?.trim();
  if (fromMachineName) {
    return fromMachineName;
  }

  const fromGmNumber = source.gmNumber?.trim();
  return fromGmNumber || undefined;
}

export function resolveSerialNumber(
  source: SerialNumberSource | string | null | undefined
): string | undefined {
  if (!source) {
    return undefined;
  }

  if (typeof source === 'string') {
    const trimmed = source.trim();
    return trimmed || undefined;
  }

  const serial = source.serialNumber?.trim();
  return serial || undefined;
}
