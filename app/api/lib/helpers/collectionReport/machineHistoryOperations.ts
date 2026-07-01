import { CollectionReport } from '@/app/api/lib/models/collectionReport';
import { Collections } from '@/app/api/lib/models/collections';
import { Machine } from '@/app/api/lib/models/machines';
import {
  ReportedMachine,
  type ReportedMachineDocument,
} from '@/app/api/lib/models/reportedMachines';
import type { ICollectionReport } from '@/lib/types/api';
import type { CollectionDocument } from '@/lib/types/collection';
import type { MachineReportHistoryEntry } from '@shared/types/collectionReportHistory';
import type { GamingMachine } from '@shared/types/entities';

const DELETED_CUTOFF = new Date('2025-01-01');

function isActiveRecord(deletedAt: Date | null | undefined): boolean {
  if (!deletedAt) return true;
  return deletedAt < DELETED_CUTOFF;
}

function resolveMachineGross(collection: CollectionDocument): number {
  if (typeof collection.movement?.gross === 'number') {
    return collection.movement.gross;
  }
  const drop = collection.metersIn - collection.prevIn;
  const payout = collection.metersOut - collection.prevOut;
  return drop - payout;
}

function resolveSasGross(collection: CollectionDocument): number | null {
  const sasGross = collection.sasMeters?.gross;
  if (typeof sasGross === 'number' && !Number.isNaN(sasGross)) {
    return sasGross;
  }
  return null;
}

function resolveVariation(
  machineGross: number,
  sasGross: number | null
): number | null {
  if (sasGross === null || Number.isNaN(sasGross)) {
    return null;
  }
  return machineGross - sasGross;
}

function resolveV2MachineGross(reported: ReportedMachineDocument): number {
  if (typeof reported.movement?.machineGross === 'number') {
    return reported.movement.machineGross;
  }
  const manualIn = reported.manualMetersIn ?? reported.sasMetersIn ?? 0;
  const manualOut = reported.manualMetersOut ?? reported.sasMetersOut ?? 0;
  const prevIn = reported.prevSasMetersIn ?? 0;
  const prevOut = reported.prevSasMetersOut ?? 0;
  return manualIn - prevIn - (manualOut - prevOut);
}

function resolveCollectedAt(
  primary: Date | string | undefined,
  fallback: Date | string | undefined
): string {
  const value = primary ?? fallback;
  if (!value) return new Date(0).toISOString();
  return new Date(value).toISOString();
}

function buildV1Entries(
  collections: CollectionDocument[],
  reportsById: Map<string, ICollectionReport>
): MachineReportHistoryEntry[] {
  const latestByReport = new Map<string, CollectionDocument>();

  for (const collection of collections) {
    const reportId = collection.locationReportId;
    if (!reportId) continue;

    const existing = latestByReport.get(reportId);
    if (!existing) {
      latestByReport.set(reportId, collection);
      continue;
    }

    const existingTime = new Date(existing.timestamp).getTime();
    const currentTime = new Date(collection.timestamp).getTime();
    if (currentTime > existingTime) {
      latestByReport.set(reportId, collection);
    }
  }

  const entries: MachineReportHistoryEntry[] = [];

  for (const [reportId, collection] of latestByReport.entries()) {
    const report = reportsById.get(reportId);
    if (report?.deletedAt && !isActiveRecord(report.deletedAt)) {
      continue;
    }

    const machineGross = resolveMachineGross(collection);
    const sasGross = resolveSasGross(collection);

    entries.push({
      reportId,
      reportVersion: 1,
      collectedAt: resolveCollectedAt(
        collection.collectionTime ?? collection.timestamp,
        report?.timestamp
      ),
      locationName: report?.locationName ?? collection.location ?? 'Unknown',
      collectorName:
        report?.collectorName ?? collection.collector ?? 'Unknown',
      machineGross,
      sasGross,
      variation: resolveVariation(machineGross, sasGross),
      metersIn: collection.metersIn,
      metersOut: collection.metersOut,
      reportGross: report?.totalGross,
      timeframeStart: report?.timestamp
        ? new Date(report.timestamp).toISOString()
        : undefined,
      timeframeEnd: report?.previousCollectionTime
        ? new Date(report.previousCollectionTime).toISOString()
        : undefined,
    });
  }

  return entries;
}

function buildV2Entries(
  reportedMachines: ReportedMachineDocument[]
): MachineReportHistoryEntry[] {
  return reportedMachines
    .filter(reported => isActiveRecord(reported.deletedAt))
    .map(reported => {
      const machineGross = resolveV2MachineGross(reported);
      const sasGross =
        typeof reported.sasGross === 'number' ? reported.sasGross : null;

      return {
        reportId: reported.sessionId,
        reportVersion: 2 as const,
        collectedAt: resolveCollectedAt(
          reported.sessionEndTime ?? reported.updatedAt,
          reported.createdAt
        ),
        locationName: reported.locationName ?? 'Unknown',
        collectorName: reported.collectorName ?? reported.collector ?? 'Unknown',
        machineGross,
        sasGross,
        variation: resolveVariation(machineGross, sasGross),
        metersIn: reported.manualMetersIn ?? reported.sasMetersIn ?? 0,
        metersOut: reported.manualMetersOut ?? reported.sasMetersOut ?? 0,
      };
    });
}

export async function getMachineReportHistory(
  machineId: string,
  allowedLocationIds: string[] | 'all'
): Promise<MachineReportHistoryEntry[]> {
  if (!machineId) {
    return [];
  }

  const machine = await Machine.findOne({ _id: machineId }).lean<GamingMachine>();
  if (!machine) {
    return [];
  }

  const machineLocationId = String(machine.gamingLocation ?? '');
  if (
    allowedLocationIds !== 'all' &&
    machineLocationId &&
    !allowedLocationIds.includes(machineLocationId)
  ) {
    return [];
  }

  const collectionFilter: Record<string, unknown> = {
    machineId,
    isCompleted: true,
    locationReportId: { $ne: '' },
  };

  if (allowedLocationIds !== 'all') {
    collectionFilter.location = { $in: allowedLocationIds };
  }

  const collections = await Collections.find(collectionFilter)
    .sort({ timestamp: -1 })
    .lean<CollectionDocument[]>();

  const reportIds = [
    ...new Set(
      collections
        .map(collection => collection.locationReportId)
        .filter(Boolean)
    ),
  ];

  const reports = reportIds.length
    ? await CollectionReport.find({
        locationReportId: { $in: reportIds },
      }).lean<ICollectionReport[]>()
    : [];

  const reportsById = new Map<string, ICollectionReport>();
  for (const report of reports) {
    if (report.locationReportId) {
      reportsById.set(report.locationReportId, report);
    }
  }

  const v1Entries = buildV1Entries(collections, reportsById).filter(entry => {
    const report = reportsById.get(entry.reportId);
    return !report?.deletedAt || isActiveRecord(report.deletedAt);
  });

  const v2Filter: Record<string, unknown> = {
    machineId,
    sessionStatus: 'submitted',
    $or: [{ deletedAt: null }, { deletedAt: { $lt: DELETED_CUTOFF } }],
  };

  if (allowedLocationIds !== 'all') {
    v2Filter.locationId = { $in: allowedLocationIds };
  }

  const reportedMachines = await ReportedMachine.find(v2Filter)
    .sort({ sessionEndTime: -1, createdAt: -1 })
    .lean<ReportedMachineDocument[]>();

  const v2Entries = buildV2Entries(reportedMachines);

  return [...v1Entries, ...v2Entries].sort(
    (entryA, entryB) =>
      new Date(entryB.collectedAt).getTime() -
      new Date(entryA.collectedAt).getTime()
  );
}
