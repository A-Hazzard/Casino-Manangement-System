/**
 * Collection Report V2 — Session Operations Helper
 *
 * Extracted shared and duplicated logic from the sessions list route and
 * the session detail route. Handles user payload extraction, aggregation
 * pipelines, machine mapping, Drive cleanup, and supplemental meter fix.
 *
 * @module app/api/lib/helpers/collectionReportV2/sessionOperations
 */

import { ReportedMachine } from '@/app/api/lib/models/reportedMachines';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import { Collections } from '@/app/api/lib/models/collections';
import UserModel from '@/app/api/lib/models/user';
import { determineAllowedLocationIds } from '@/app/api/lib/helpers/collectionReport/queries';
import { calculateDateRangeForTimePeriod } from '@/app/api/lib/helpers/collectionReport/queries';
import { fixSmibMeterAfterSupplementalDeletion } from '@/app/api/lib/helpers/collectionReport/smibMeterFix';
import { generateMongoId } from '@/lib/utils/id';
import { resolveLicenceeId } from '@/lib/utils/licencee';
import { deleteDriveFile, deleteDriveFolder } from '@/lib/utils/drive';
import type { TimePeriod } from '@/app/api/lib/types';
import type { MeterDocument, DateRangeFilter } from '@shared/types';
import type {
  ReportedMachineDocument,
  ReportedMachineMovement,
} from '@/app/api/lib/models/reportedMachines';
import type { PipelineStage } from 'mongoose';

// ============================================================================
// Types
// ============================================================================

export type UserPayloadInfo = {
  roles: string[];
  assignedLicencees: string[];
  assignedLocations: string[];
};

export type SessionSortConfig = {
  sortKey: string;
  sortDirection: number;
};

export type SessionQueryParams = {
  licencee: string | undefined;
  timePeriod: TimePeriod | undefined;
  startDateStr: string | null;
  endDateStr: string | null;
  search: string | undefined;
  searchType: string;
  page: number;
  limit: number;
  sortField: string;
  sortDirection: string;
};

export type V2MachineEntry = {
  machineId: string;
  machineName: string;
  machineCustomName: string;
  serialNumber: string;
  manufacturer: string;
  game: string;
  sasMetersIn: number;
  sasMetersOut: number;
  collectionTime: Date | null;
  previousCollectionTime?: Date | null;
  sequenceOrder: number;
};

export type ReportedMachineInput = {
  _id: string;
  sessionId: string;
  sessionStatus: 'in-progress' | 'submitted';
  locationId: string;
  locationName: string;
  licencee: string;
  machineId: string;
  machineName: string;
  machineCustomName: string;
  serialNumber: string;
  manufacturer: string;
  game: string;
  collector: string;
  collectorName: string;
  sasMetersIn: number;
  sasMetersOut: number;
  sequenceOrder: number;
  sessionStartTime: Date | undefined;
  sessionEndTime: Date;
  sasStartTime: Date | undefined;
  status: 'pending' | 'captured' | 'confirmed' | 'skipped';
};

export type SessionListItem = {
  _id: string;
  sessionId: string;
  sessionStatus: string;
  locationId: string;
  locationName: string;
  licencee: string;
  collector: string;
  collectorName: string;
  machinesTotal: number;
  machinesCaptured: number;
  machinesConfirmed: number;
  machinesSkipped: number;
  totalMachineGross: number;
  totalSasGross: number;
  totalGrossDifference: number;
  createdAt: Date;
  collectorFirstName: string;
  collectorLastName: string;
  collectorEmail: string;
  noSMIBLocation: boolean;
};

export type CollectorDetails = {
  collectorFirstName: string | undefined;
  collectorLastName: string | undefined;
  collectorEmail: string | undefined;
};

export type SessionMachineResponse = {
  reportedMachineId: string;
  machineId: string;
  machineName: string;
  machineCustomName: string;
  serialNumber: string;
  manufacturer: string;
  game: string;
  status: string;
  sequenceOrder: number;
  sasMetersIn: number | null;
  sasMetersOut: number | null;
  sasGross: number | null;
  manualMetersIn: number | null | undefined;
  manualMetersOut: number | null | undefined;
  prevSasMetersIn: number | undefined;
  prevSasMetersOut: number | undefined;
  movement: ReportedMachineMovement | undefined;
  machineGross: number;
  variation: number | null;
  sasStartTime: Date | undefined;
  sasEndTime: Date | undefined;
  sessionStartTime: Date | undefined;
  sessionEndTime: Date | undefined;
  imageData: string | undefined;
  driveFileId: string | undefined;
  metersMatch: boolean | undefined;
  hasRelay: boolean;
  ramClear: boolean;
  ramClearMetersIn: number | undefined;
  ramClearMetersOut: number | undefined;
  isSupplemental: boolean;
  lastCollectionTime: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SessionSummaryResponse = {
  sessionId: string;
  sessionStatus: string;
  locationId: string;
  locationName: string;
  licencee: string;
  collector: string;
  collectorName: string;
  collectorFirstName: string | undefined;
  collectorLastName: string | undefined;
  collectorEmail: string | undefined;
  sessionStartTime: Date | undefined;
  sessionEndTime: Date | undefined;
  machinesTotal: number;
  machinesCaptured: number;
  machinesConfirmed: number;
  machinesSkipped: number;
  createdAt: Date;
};

export type SessionDetailResponse = SessionSummaryResponse & {
  machines: SessionMachineResponse[];
};

// ============================================================================
// User Payload Extraction
// ============================================================================

export function extractUserPayload(
  userPayload: Record<string, unknown>
): UserPayloadInfo {
  const roles = (userPayload.roles as string[]) || [];
  const assignedLicencees =
    (userPayload.assignedLicencees as string[]) || [];
  const assignedLocations =
    (userPayload.assignedLocations as string[]) || [];
  return { roles, assignedLicencees, assignedLocations };
}

// ============================================================================
// Licencee Parameter Resolution
// ============================================================================

export function resolveLicenceeParam(
  rawLicencee: string | null
): string | undefined {
  if (!rawLicencee || rawLicencee === 'all') return undefined;
  return resolveLicenceeId(rawLicencee) || rawLicencee;
}

// ============================================================================
// Sort Configuration
// ============================================================================

export function buildSessionSortConfig(
  sortField: string,
  sortDirection: string
): SessionSortConfig {
  let sortKey = 'createdAt';
  switch (sortField) {
    case 'location':
      sortKey = 'locationName';
      break;
    case 'collector':
      sortKey = 'collectorName';
      break;
    case 'matched':
      sortKey = 'machinesConfirmed';
      break;
    case 'machineGross':
      sortKey = 'totalMachineGross';
      break;
    case 'sasGross':
      sortKey = 'totalSasGross';
      break;
    case 'variation':
      sortKey = 'totalGrossDifference';
      break;
    case 'created':
    default:
      sortKey = 'createdAt';
      break;
  }
  const sortDirectionValue = sortDirection === 'asc' ? 1 : -1;
  return { sortKey, sortDirection: sortDirectionValue };
}

// ============================================================================
// Date Range Construction
// ============================================================================

export function buildDateFilter(
  timePeriod: TimePeriod | undefined,
  startDateStr: string | null,
  endDateStr: string | null
): DateRangeFilter | undefined {
  const dateRange = calculateDateRangeForTimePeriod(
    timePeriod,
    startDateStr || undefined,
    endDateStr || undefined
  );
  if (!dateRange?.startDate && !dateRange?.endDate) return undefined;
  const dateFilter: DateRangeFilter = {};
  if (dateRange.startDate) dateFilter.$gte = dateRange.startDate;
  if (dateRange.endDate) dateFilter.$lte = dateRange.endDate;
  return dateFilter;
}

// ============================================================================
// Session List Match Stage Builder
// ============================================================================

export function buildSessionListMatchStage(
  licencee: string | undefined,
  allowedLocationIds: string[] | 'all',
  dateFilter: DateRangeFilter | undefined,
  search: string | undefined,
  searchType: string
): Record<string, unknown> {
  const matchStage: Record<string, unknown> = {};
  if (licencee) matchStage.licencee = licencee;
  if (allowedLocationIds !== 'all') {
    matchStage.locationId = { $in: allowedLocationIds };
  }
  if (dateFilter) matchStage.createdAt = dateFilter;

  if (search) {
    let searchKey = 'collectorName';
    switch (searchType) {
      case 'location':
        searchKey = 'locationName';
        break;
      case 'sessionId':
        searchKey = 'sessionId';
        break;
      case 'locationId':
        searchKey = 'locationId';
        break;
      default:
        searchKey = 'collectorName';
    }
    matchStage.$and = [
      { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] },
      { [searchKey]: { $regex: search, $options: 'i' } },
    ];
  } else {
    matchStage.$or = [{ deletedAt: null }, { deletedAt: { $exists: false } }];
  }

  return matchStage;
}

// ============================================================================
// Session List Aggregation Pipeline
// ============================================================================

export function buildSessionListPipeline(
  matchStage: Record<string, unknown>,
  sortKey: string,
  sortDirection: number,
  page: number,
  limit: number
): PipelineStage[] {
  return [
    { $match: matchStage },
    {
      $lookup: {
        from: 'machines',
        localField: 'machineId',
        foreignField: '_id',
        as: 'machineDoc',
      },
    },
    {
      $unwind: {
        path: '$machineDoc',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: '$sessionId',
        sessionId: { $first: '$sessionId' },
        sessionStatus: { $first: '$sessionStatus' },
        locationId: { $first: '$locationId' },
        locationName: { $first: '$locationName' },
        licencee: { $first: '$licencee' },
        collector: { $first: '$collector' },
        collectorName: { $first: '$collectorName' },
        machinesTotal: { $sum: 1 },
        machinesCaptured: {
          $sum: {
            $cond: [{ $in: ['$status', ['captured', 'confirmed']] }, 1, 0],
          },
        },
        machinesConfirmed: {
          $sum: {
            $cond: [
              {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$machineDoc.relayId', null] },
                      {
                        $ne: [{ $ifNull: ['$machineDoc.relayId', ''] }, ''],
                      },
                    ],
                  },
                  { $eq: ['$status', 'confirmed'] },
                  { $in: ['$status', ['captured', 'confirmed']] },
                ],
              },
              1,
              0,
            ],
          },
        },
        machinesSkipped: {
          $sum: { $cond: [{ $eq: ['$status', 'skipped'] }, 1, 0] },
        },
        totalMachineGross: {
          $sum: {
            $cond: [
              { $ifNull: ['$movement.machineGross', false] },
              '$movement.machineGross',
              {
                $subtract: [
                  { $ifNull: ['$manualMetersIn', '$sasMetersIn'] },
                  { $ifNull: ['$manualMetersOut', '$sasMetersOut'] },
                ],
              },
            ],
          },
        },
        totalSasGross: {
          $sum: {
            $cond: [
              { $ifNull: ['$sasGross', false] },
              '$sasGross',
              {
                $subtract: [
                  { $ifNull: ['$sasMetersIn', 0] },
                  { $ifNull: ['$sasMetersOut', 0] },
                ],
              },
            ],
          },
        },
        createdAt: { $min: '$createdAt' },
        deletedAt: { $first: '$deletedAt' },
      },
    },
    {
      $addFields: {
        totalGrossDifference: {
          $subtract: ['$totalMachineGross', '$totalSasGross'],
        },
      },
    },
    { $sort: { [sortKey]: sortDirection as 1 | -1, _id: 1 } },
    { $skip: page * limit },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        let: { collectorId: '$collector' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$collectorId'] } } },
          {
            $project: {
              _id: 0,
              firstName: { $ifNull: ['$profile.firstName', ''] },
              lastName: { $ifNull: ['$profile.lastName', ''] },
              emailAddress: { $ifNull: ['$emailAddress', ''] },
            },
          },
        ],
        as: 'collectorDetails',
      },
    },
    {
      $unwind: {
        path: '$collectorDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        collectorFirstName: '$collectorDetails.firstName',
        collectorLastName: '$collectorDetails.lastName',
        collectorEmail: '$collectorDetails.emailAddress',
      },
    },
    { $project: { collectorDetails: 0 } },
    {
      $lookup: {
        from: 'gaminglocations',
        let: { locId: '$locationId' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$locId'] } } },
          {
            $project: {
              _id: 0,
              noSMIBLocation: { $ifNull: ['$noSMIBLocation', false] },
            },
          },
        ],
        as: 'locationDetails',
      },
    },
    {
      $unwind: {
        path: '$locationDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        noSMIBLocation: {
          $ifNull: ['$locationDetails.noSMIBLocation', false],
        },
      },
    },
    { $project: { locationDetails: 0 } },
  ];
}

// ============================================================================
// Session Count Aggregation
// ============================================================================

export function buildSessionCountPipeline(
  matchStage: Record<string, unknown>
): PipelineStage[] {
  return [
    { $match: matchStage },
    { $group: { _id: '$sessionId' } },
    { $count: 'total' },
  ];
}

// ============================================================================
// Previous Session End Time Lookup
// ============================================================================

export async function lookupPreviousSessionEndTime(
  locationId: string
): Promise<Date | null> {
  const previousSession = await ReportedMachine.findOne({
    locationId,
    sessionStatus: 'submitted',
    sessionEndTime: { $exists: true, $ne: null },
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  })
    .sort({ sessionEndTime: -1 })
    .select('sessionEndTime')
    .lean<{ sessionEndTime?: Date }>();
  return previousSession?.sessionEndTime ?? null;
}

// ============================================================================
// Last Collection Times Lookup (per machine)
// ============================================================================

export async function lookupLastSessionEndTimes(
  machineIds: string[],
  excludedSessionId?: string
): Promise<Map<string, Date>> {
  // Query both V1 and V2 simultaneously — pick the MOST RECENT per machine
  // regardless of which version it came from.

  // V2: most recent submitted ReportedMachine.sasEndTime per machineId
  const v2Match: Record<string, unknown> = {
    machineId: { $in: machineIds },
    sessionStatus: 'submitted',
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  };
  if (excludedSessionId) {
    v2Match._id = { $nin: [excludedSessionId] };
  }

  const [v2Submissions, v1Submissions] = await Promise.all([
    ReportedMachine.aggregate<{ _id: string; sasEndTime: Date }>([
      { $match: v2Match },
      { $sort: { sasEndTime: -1 } },
      { $group: { _id: '$machineId', sasEndTime: { $first: '$sasEndTime' } } },
    ]),
    Collections.aggregate<{ _id: string; sasEndTime: Date }>([
      {
        $match: {
          machineId: { $in: machineIds },
          isCompleted: true,
          'sasMeters.sasEndTime': { $exists: true },
        },
      },
      { $sort: { 'sasMeters.sasEndTime': -1 } },
      {
        $group: {
          _id: '$machineId',
          sasEndTime: { $first: '$sasMeters.sasEndTime' },
        },
      },
    ]),
  ]);

  // Merge: for each machine, pick the MORE RECENT sasEndTime from either version
  const result = new Map<string, Date>();
  for (const v2Sub of v2Submissions) {
    result.set(v2Sub._id, v2Sub.sasEndTime);
  }
  for (const v1Sub of v1Submissions) {
    const existing = result.get(v1Sub._id);
    if (!existing || v1Sub.sasEndTime.getTime() > existing.getTime()) {
      result.set(v1Sub._id, v1Sub.sasEndTime);
    }
  }

  return result;
}

// ============================================================================
// Machine to V2 Format Mapping
// ============================================================================

export function mapMachinesToV2Format(
  machines: Array<Record<string, unknown>>
): V2MachineEntry[] {
  return machines.map((machine, index) => {
    const sasMeters = machine.sasMeters as
      | { drop?: number; totalCancelledCredits?: number }
      | undefined;
    const collectionMeters = machine.collectionMeters as
      | { metersIn?: number; metersOut?: number }
      | undefined;
    const custom = machine.custom as { name?: string } | undefined;
    const sasIn = sasMeters?.drop ?? 0;
    const sasOut = sasMeters?.totalCancelledCredits ?? 0;
    const fallbackIn = collectionMeters?.metersIn ?? 0;
    const fallbackOut = collectionMeters?.metersOut ?? 0;

    return {
      machineId: String(machine._id),
      machineName:
        (machine.machineName as string | undefined) || String(machine._id),
      machineCustomName: custom?.name || '',
      serialNumber: (machine.serialNumber as string | undefined) || '',
      manufacturer: (machine.manufacturer as string | undefined) || '',
      game: (machine.game as string | undefined) || '',
      sasMetersIn: sasIn || fallbackIn,
      sasMetersOut: sasOut || fallbackOut,
      collectionTime: (machine.collectionTime as Date | undefined) || null,
      previousCollectionTime: (machine.previousCollectionTime as Date | undefined) || null,
      sequenceOrder: index,
    };
  });
}

// ============================================================================
// Build ReportedMachine Documents for Insert
// ============================================================================

export async function buildReportedMachineDocs(
  machineList: V2MachineEntry[],
  sessionId: string,
  locationId: string,
  locationName: string,
  licencee: string,
  collectorId: string,
  collectorName: string,
  sessionStartTime: Date | undefined,
  sessionEndTime: Date,
  lastCollectionMap: Map<string, Date>
): Promise<{
  reportedMachineDocs: ReportedMachineInput[];
  machineIds: string[];
}> {
  const machineIds = await Promise.all(
    machineList.map(() => generateMongoId())
  );

  const reportedMachineDocs = machineList.map((machine, index) => {
    const sasStartTime =
      lastCollectionMap.get(machine.machineId) ??
      machine.previousCollectionTime ??
      machine.collectionTime ??
      undefined;

    return {
      _id: machineIds[index],
      sessionId,
      sessionStatus: 'in-progress' as const,
      locationId,
      locationName,
      licencee,
      machineId: machine.machineId,
      machineName: machine.machineName,
      machineCustomName: machine.machineCustomName,
      serialNumber: machine.serialNumber,
      manufacturer: machine.manufacturer,
      game: machine.game,
      collector: collectorId,
      collectorName,
      sasMetersIn: machine.sasMetersIn,
      sasMetersOut: machine.sasMetersOut,
      sequenceOrder: machine.sequenceOrder,
      sessionStartTime: sessionStartTime ?? undefined,
      sessionEndTime,
      sasStartTime,
      status: 'pending' as const,
    };
  });

  return { reportedMachineDocs, machineIds };
}

// ============================================================================
// Collector Details Lookup
// ============================================================================

export async function lookupCollectorDetails(
  collectorId: string
): Promise<CollectorDetails> {
  const result: CollectorDetails = {
    collectorFirstName: undefined,
    collectorLastName: undefined,
    collectorEmail: undefined,
  };

  if (!collectorId) return result;

  const collectorUser = await UserModel.findOne({ _id: collectorId })
    .select('profile.firstName profile.lastName emailAddress')
    .lean<{
      profile?: { firstName?: string; lastName?: string };
      emailAddress?: string;
    }>();

  if (collectorUser) {
    result.collectorFirstName = collectorUser.profile?.firstName;
    result.collectorLastName = collectorUser.profile?.lastName;
    result.collectorEmail = collectorUser.emailAddress;
  }

  return result;
}

// ============================================================================
// Session Machine Response Builder
// ============================================================================

export function buildSessionMachineResponse(
  machines: ReportedMachineDocument[],
  lastCollectionMap: Map<string, Date>,
  hasRelayMap: Map<string, boolean>,
  liveSasMetersMap: Map<
    string,
    { drop?: number; totalCancelledCredits?: number }
  >
): SessionMachineResponse[] {
  return machines.map(machine => {
    const machineId = machine.machineId as string;
    const machineHasRelay = hasRelayMap.get(machineId) ?? false;
    const liveSas = liveSasMetersMap.get(machineId);
    const sasMetersInVal = machine.sasMetersIn as number | null | undefined;
    const sasMetersOutVal = machine.sasMetersOut as number | null | undefined;

    const resolvedSasMetersIn =
      sasMetersInVal != null
        ? sasMetersInVal
        : !machineHasRelay
          ? ((machine.manualMetersIn as number | null) ?? null)
          : (liveSas?.drop ?? null);

    const resolvedSasMetersOut =
      sasMetersOutVal != null
        ? sasMetersOutVal
        : !machineHasRelay
          ? ((machine.manualMetersOut as number | null) ?? null)
          : (liveSas?.totalCancelledCredits ?? null);

    const effectiveManualIn =
      machine.metersMatch === true
        ? (resolvedSasMetersIn ?? 0)
        : ((machine.manualMetersIn as number | null) ?? resolvedSasMetersIn ?? 0);

    const effectiveManualOut =
      machine.metersMatch === true
        ? (resolvedSasMetersOut ?? 0)
        : ((machine.manualMetersOut as number | null) ?? resolvedSasMetersOut ?? 0);

    const sasGrossVal = machine.sasGross as number | null | undefined;
    const sasGross =
      sasGrossVal !== undefined && sasGrossVal !== null
        ? sasGrossVal
        : resolvedSasMetersIn !== null && resolvedSasMetersOut !== null
          ? resolvedSasMetersIn - resolvedSasMetersOut
          : null;

    const movementVal = machine.movement as
      | { machineGross?: number }
      | undefined;
    const machineGross =
      movementVal?.machineGross ?? effectiveManualIn - effectiveManualOut;

    const getLastCollectionTime = (machineIdInner: string): Date | null =>
      lastCollectionMap.get(machineIdInner) ?? null;

    return {
      reportedMachineId: machine._id as string,
      machineId,
      machineName: machine.machineName as string,
      machineCustomName: machine.machineCustomName as string,
      serialNumber: machine.serialNumber as string,
      manufacturer: machine.manufacturer as string,
      game: machine.game as string,
      status: machine.status as string,
      sequenceOrder: machine.sequenceOrder as number,
      sasMetersIn: resolvedSasMetersIn,
      sasMetersOut: resolvedSasMetersOut,
      sasGross,
      manualMetersIn: machine.manualMetersIn as number | null | undefined,
      manualMetersOut: machine.manualMetersOut as number | null | undefined,
      prevSasMetersIn: machine.prevSasMetersIn as number | undefined,
      prevSasMetersOut: machine.prevSasMetersOut as number | undefined,
      movement: machine.movement as ReportedMachineMovement | undefined,
      machineGross,
      variation: sasGross !== null ? machineGross - sasGross : null,
      sasStartTime: machine.sasStartTime as Date | undefined,
      sasEndTime: machine.sasEndTime as Date | undefined,
      sessionStartTime: machine.sessionStartTime as Date | undefined,
      sessionEndTime: machine.sessionEndTime as Date | undefined,
      imageData: (machine.tempImageData as string | undefined)
        || (machine.driveFileId
          ? `/api/collection-reports-v2/drive-files/${machine.driveFileId as string}`
          : undefined),
      driveFileId: (machine.driveFileId as string | undefined) || undefined,
      metersMatch: !machineHasRelay ? true : (machine.metersMatch as boolean | undefined),
      hasRelay: machineHasRelay,
      ramClear: (machine.ramClear as boolean) === true,
      ramClearMetersIn: machine.ramClearMetersIn as number | undefined,
      ramClearMetersOut: machine.ramClearMetersOut as number | undefined,
      isSupplemental: (machine.isSupplemental as boolean) === true,
      lastCollectionTime: getLastCollectionTime(machineId),
      createdAt: machine.createdAt as Date,
      updatedAt: machine.updatedAt as Date,
    };
  });
}

// ============================================================================
// Build Session Summary
// ============================================================================

export function buildSessionSummary(
  sessionId: string,
  machines: ReportedMachineDocument[],
  hasRelayMap: Map<string, boolean>,
  collectorDetails: CollectorDetails
): SessionSummaryResponse {
  const machinesCaptured = machines.filter(m =>
    ['captured', 'confirmed'].includes(m.status as string)
  ).length;

  const machinesConfirmed = machines.filter(m => {
    const machineHasRelay = hasRelayMap.get(m.machineId as string) ?? false;
    if (!machineHasRelay) {
      return ['captured', 'confirmed'].includes(m.status as string);
    }
    return m.status === 'confirmed';
  }).length;

  const machinesSkipped = machines.filter(
    m => m.status === 'skipped'
  ).length;

  return {
    sessionId,
    sessionStatus: machines[0].sessionStatus,
    locationId: machines[0].locationId,
    locationName: machines[0].locationName,
    licencee: machines[0].licencee,
    collector: machines[0].collector,
    collectorName: machines[0].collectorName,
    collectorFirstName: collectorDetails.collectorFirstName,
    collectorLastName: collectorDetails.collectorLastName,
    collectorEmail: collectorDetails.collectorEmail,
    sessionStartTime: machines[0].sessionStartTime,
    sessionEndTime: machines[0].sessionEndTime,
    machinesTotal: machines.length,
    machinesCaptured,
    machinesConfirmed,
    machinesSkipped,
    createdAt: machines[0].createdAt,
  };
}

// ============================================================================
// Session Detail Data Builder
// ============================================================================

export async function buildSessionDetailResponse(
  sessionId: string,
  machines: ReportedMachineDocument[]
): Promise<SessionDetailResponse> {
  const machineIds = [...new Set(machines.map(m => m.machineId as string))];
  const currentMachineIds = machines.map(m =>
    (m as { _id: string })._id.toString()
  );

  const lastCollectionMap = await lookupLastSessionEndTimes(
    machineIds,
    currentMachineIds[0]
  );

  const machineDocs = await Machine.find({
    _id: { $in: machineIds },
  })
    .select('collectionTime previousCollectionTime sasMeters relayId')
    .lean<
      Array<{
        _id: string;
        collectionTime?: Date;
        previousCollectionTime?: Date;
        sasMeters?: { drop?: number; totalCancelledCredits?: number };
        relayId?: string | null;
      }>
    >();

  const liveSasMetersMap = new Map(
    machineDocs.map(m => [
      String(m._id),
      {
        drop: m.sasMeters?.drop,
        totalCancelledCredits: m.sasMeters?.totalCancelledCredits,
      },
    ])
  );

  const hasRelayMap = new Map(
    machineDocs.map(m => [String(m._id), !!m.relayId])
  );

  // Fallback: previousCollectionTime > collectionTime (for SAS start resolution)
  for (const machineDoc of machineDocs) {
    const mid = String(machineDoc._id);
    if (!lastCollectionMap.has(mid)) {
      const prevTime = machineDoc.previousCollectionTime ?? machineDoc.collectionTime;
      if (prevTime) {
        lastCollectionMap.set(mid, prevTime);
      }
    }
  }

  const collectorId = machines[0].collector;
  const collectorDetails = await lookupCollectorDetails(collectorId);

  const sessionSummary = buildSessionSummary(
    sessionId,
    machines,
    hasRelayMap,
    collectorDetails
  );

  const machineResponses = buildSessionMachineResponse(
    machines,
    lastCollectionMap,
    hasRelayMap,
    liveSasMetersMap
  );

  return {
    ...sessionSummary,
    machines: machineResponses,
  };
}

// ============================================================================
// Delete Session Drive Assets
// ============================================================================

export async function deleteSessionDriveAssets(
  sessionId: string
): Promise<void> {
  const sessionMachines = await ReportedMachine.find(
    { sessionId },
    'driveFileId driveFolderId'
  ).lean<Array<{ driveFileId?: string; driveFolderId?: string }>>();

  const deletionTasks = sessionMachines.map(async machine => {
    const folderId = machine.driveFolderId;
    const fileId = machine.driveFileId;

    if (folderId) {
      await deleteDriveFolder(folderId).catch(err =>
        console.error(
          `[deleteSessionDriveAssets] Failed to delete Drive folder ${folderId}:`,
          err
        )
      );
    } else if (fileId) {
      await deleteDriveFile(fileId).catch(err =>
        console.error(
          `[deleteSessionDriveAssets] Failed to delete Drive file ${fileId}:`,
          err
        )
      );
    }
  });

  await Promise.allSettled(deletionTasks);
}

// ============================================================================
// Fix Supplemental Meters Before Deletion
// ============================================================================

export async function fixSupplementalMetersBeforeDelete(
  sessionId: string
): Promise<void> {
  const supplementalMeters = await Meters.find({
    locationSession: sessionId,
    isSupplemental: true,
  }).lean<MeterDocument[]>();

  if (supplementalMeters.length === 0) return;

  const byMachine = new Map<string, MeterDocument[]>();
  for (const meter of supplementalMeters) {
    const machineId = String(meter.machine);
    if (!byMachine.has(machineId)) byMachine.set(machineId, []);
    byMachine.get(machineId)!.push(meter);
  }

  for (const [machineId, meters] of byMachine) {
    const sorted = [...meters].sort(
      (mA, mB) =>
        new Date(mA.readAt).getTime() - new Date(mB.readAt).getTime()
    );
    await fixSmibMeterAfterSupplementalDeletion(
      machineId,
      sorted[sorted.length - 1].readAt,
      sorted[0].readAt
    );
  }
}

// ============================================================================
// Session Location Access Check
// ============================================================================

export async function verifySessionLocationAccess(
  sessionLocationId: string,
  userRoles: string[],
  userLicencees: string[],
  userLocations: string[]
): Promise<boolean> {
  const allowedLocationIds = await determineAllowedLocationIds(
    userRoles,
    userLicencees,
    userLocations
  );

  return allowedLocationIds === 'all' || allowedLocationIds.includes(sessionLocationId);
}
