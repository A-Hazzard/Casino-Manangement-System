import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Machine } from '@/app/api/lib/models/machines';
import type { LocationDocument } from '@/shared/types/models';
import type { GamingMachine } from '@shared/types';

export type SmibClassificationResult = {
  fullSMIBs: boolean;
  semiSMIBs: boolean;
  noSMIBLocation: boolean;
};

type SmibBulkOp = {
  updateOne: {
    filter: { _id: string };
    update: {
      $set: { fullSMIBs: boolean; semiSMIBs: boolean; noSMIBLocation: boolean };
    };
  };
};

type LocationWithMachines = {
  location: LocationDocument;
  machines: GamingMachine[];
};

export async function classifyLocationSmibStatus(
  location: LocationDocument,
  locationToMachines: Map<string, GamingMachine[]>
): Promise<SmibClassificationResult> {
  const locId = String(location._id);
  const machines = locationToMachines.get(locId) ?? [];
  const withRelay = machines.filter(
    m => m.relayId && String(m.relayId).trim()
  ).length;

  const computedFull = machines.length > 0 && withRelay === machines.length;
  const computedSemi =
    machines.length > 0 && withRelay > 0 && withRelay < machines.length;
  const computedNone = !computedFull && !computedSemi;

  return {
    fullSMIBs: computedFull,
    semiSMIBs: computedSemi,
    noSMIBLocation: computedNone,
  };
}

export async function syncAllLocationSmibStatuses(
  locationsWithMachines: LocationWithMachines[]
): Promise<{ synced: number; unchanged: number }> {
  const smibBulkOps: SmibBulkOp[] = [];

  for (const item of locationsWithMachines) {
    const locId = String(item.location._id);
    const locName = item.location.name || locId;
    const machines = item.machines ?? [];
    const withRelay = machines.filter(
      m => m.relayId && String(m.relayId).trim()
    ).length;

    const computedFull = machines.length > 0 && withRelay === machines.length;
    const computedSemi =
      machines.length > 0 && withRelay > 0 && withRelay < machines.length;
    const computedNone = !computedFull && !computedSemi;

    const storedFull = Boolean(item.location.fullSMIBs);
    const storedSemi = Boolean(item.location.semiSMIBs);
    const storedNone = Boolean(item.location.noSMIBLocation);

    const unchanged =
      storedFull === computedFull &&
      storedSemi === computedSemi &&
      storedNone === computedNone;

    if (!unchanged) {
      console.log(
        `[SMIB Classification] "${locName}" (${locId}) - queuing update: ` +
          `fullSMIBs:${storedFull}->${computedFull}, semiSMIBs:${storedSemi}->${computedSemi}, noSMIB:${storedNone}->${computedNone}`
      );
      smibBulkOps.push({
        updateOne: {
          filter: { _id: locId },
          update: {
            $set: {
              fullSMIBs: computedFull,
              semiSMIBs: computedSemi,
              noSMIBLocation: computedNone,
            },
          },
        },
      });
    }
  }

  let synced = 0;
  const unchanged = locationsWithMachines.length - smibBulkOps.length;

  if (smibBulkOps.length > 0) {
    console.log(
      `[SMIB Classification] Writing ${smibBulkOps.length} update(s) to DB`
    );
    try {
      const bulkResult = await GamingLocations.bulkWrite(smibBulkOps);
      synced = bulkResult.modifiedCount;
      console.log(
        `[SMIB Classification] bulkWrite complete - modified: ${bulkResult.modifiedCount}, matched: ${bulkResult.matchedCount}`
      );
    } catch (err) {
      console.error(`[SMIB Classification] bulkWrite failed:`, err);
    }
  } else {
    console.log(
      `[SMIB Classification] All locations up to date - no DB writes needed`
    );
  }

  return { synced, unchanged };
}

export async function fetchLocationsWithMachinesForSmib(
  locationIds: string[]
): Promise<LocationWithMachines[]> {
  const locations = await GamingLocations.find({
    _id: { $in: locationIds },
  }).lean<LocationDocument[]>();

  const allMachinesData = await Machine.find({
    gamingLocation: { $in: locationIds },
  }).lean<GamingMachine[]>();

  const locationToMachines = new Map<string, GamingMachine[]>();
  for (const m of allMachinesData) {
    const locId = String(m.gamingLocation!);
    if (!locationToMachines.has(locId)) locationToMachines.set(locId, []);
    locationToMachines.get(locId)!.push(m);
  }

  return locations.map(location => ({
    location,
    machines: locationToMachines.get(String(location._id)) ?? [],
  }));
}

export type SmibSyncStatus = {
  lastSync: Date | null;
  isStale: boolean;
  staleAfterHours: number;
};

export async function getSmibSyncStatus(): Promise<SmibSyncStatus> {
  const staleAfterHours = 1;
  const lastSync = await GamingLocations.findOne(
    { fullSMIBs: { $exists: true } },
    { updatedAt: 1 }
  )
    .sort({ updatedAt: -1 })
    .lean<{ updatedAt: Date }>()
    .then(doc => doc?.updatedAt ?? null);

  const now = new Date();
  const isStale =
    !lastSync ||
    now.getTime() - lastSync.getTime() > staleAfterHours * 60 * 60 * 1000;

  return { lastSync, isStale, staleAfterHours };
}
