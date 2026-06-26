/**
 * @module app/api/lib/helpers/collectionReport/crActivityLogger
 *
 * - Activity-logging helpers for the collection-report routes.
 *   Extracted to keep route handlers focused on HTTP concerns.
 */

import {
  logActivity,
  mapDeletedFieldsToChanges,
} from '../activityLogger';
import { Machine } from '@/app/api/lib/models/machines';
import type { CollectionDocument } from '@/lib/types/collection';
import type { CollectionReportDocument } from '@/shared/types';
import type { CreateCollectionReportPayload } from '@/lib/types/api';
import type { GamingMachine } from '@shared/types';

// ============================================================================
// PATCH activity log
// ============================================================================

type PatchUser = {
  _id: unknown;
  emailAddress: unknown;
};

type PatchBody = Partial<CreateCollectionReportPayload> & { action?: string };

function isDifferentValue(oldVal: unknown, newVal: unknown): boolean {
  if (oldVal === newVal) return false;
  if (oldVal == null || newVal == null) return (oldVal == null) !== (newVal == null);
  if (typeof oldVal === 'number' || typeof newVal === 'number') {
    return Number(oldVal) !== Number(newVal);
  }
  if (typeof oldVal === 'boolean' || typeof newVal === 'boolean') {
    return Boolean(oldVal) !== Boolean(newVal);
  }
  if (oldVal instanceof Date || newVal instanceof Date) {
    try {
      const t1 = new Date(oldVal as Date).getTime();
      const t2 = new Date(newVal as Date).getTime();
      if (!isNaN(t1) && !isNaN(t2)) return t1 !== t2;
    } catch {
      // fall through to string comparison
    }
  }
  if (typeof oldVal === 'string' && typeof newVal === 'string') {
    const t1 = Date.parse(oldVal);
    const t2 = Date.parse(newVal);
    if (!isNaN(t1) && !isNaN(t2)) return t1 !== t2;
    return oldVal.trim() !== newVal.trim();
  }
  return String(oldVal).trim() !== String(newVal).trim();
}

export async function logCRPatchActivity(params: {
  existingReport: { toObject(): Record<string, unknown>; locationName?: string };
  existingCollections: CollectionDocument[];
  body: PatchBody;
  resolvedReportId: string;
  ipAddress: string | undefined;
  userAgent: string | null;
  currentUser: PatchUser;
}): Promise<void> {
  const {
    existingReport,
    existingCollections,
    body,
    resolvedReportId,
    ipAddress,
    userAgent,
    currentUser,
  } = params;

  try {
    const updateChanges: { field: string; oldValue: unknown; newValue: unknown }[] = [];
    const existingReportObj = existingReport.toObject();

    const fieldsToTrack = [
      'locationName',
      'amountCollected',
      'amountToCollect',
      'variance',
      'partnerProfit',
      'taxes',
    ];
    fieldsToTrack.forEach(field => {
      const newVal = (body as Record<string, unknown>)[field];
      const oldVal = existingReportObj[field];
      if (newVal !== undefined && isDifferentValue(oldVal, newVal)) {
        updateChanges.push({ field, oldValue: oldVal, newValue: newVal });
      }
    });

    if (body.machines && Array.isArray(body.machines)) {
      const oldMachineIds = existingCollections.map(col => col.machineId as string);
      const newMachineIds = (body.machines as { machineId: string }[]).map(m => m.machineId);

      const added = (
        body.machines as { machineId: string; machineName?: string; machineCustomName?: string }[]
      ).filter(m => !oldMachineIds.includes(m.machineId));

      const removed = (
        existingCollections as { machineId: string; machineName?: string; machineCustomName?: string }[]
      ).filter(col => !newMachineIds.includes(col.machineId));

      if (added.length > 0) {
        updateChanges.push({
          field: 'machines_added',
          oldValue: null,
          newValue: added.map(m => m.machineCustomName || m.machineName || m.machineId).join(', '),
        });
      }
      if (removed.length > 0) {
        updateChanges.push({
          field: 'machines_removed',
          oldValue: removed.map(col => col.machineCustomName || col.machineName || col.machineId).join(', '),
          newValue: null,
        });
      }
    }

    await logActivity({
      action: 'UPDATE',
      details: `Updated collection report for ${existingReport.locationName} (${updateChanges.length} changes)`,
      ipAddress,
      userAgent: userAgent ?? undefined,
      userId: currentUser._id as string,
      username: currentUser.emailAddress as string,
      metadata: {
        userId: currentUser._id as string,
        resource: 'collection-report',
        resourceId: resolvedReportId,
        resourceName: `${existingReport.locationName}`,
        changes: updateChanges,
      },
    });
  } catch (logError) {
    console.error('[logCRPatchActivity] Failed to log activity:', logError);
  }
}

// ============================================================================
// CREATE activity log
// ============================================================================

type CreateUser = {
  _id?: unknown;
  id?: unknown;
  sub?: unknown;
  emailAddress?: unknown;
  username?: unknown;
  roles?: unknown;
};

function buildMachineName(m: GamingMachine): string {
  const parts: string[] = [];
  if (m.custom?.name) parts.push(m.custom.name);
  const manufacturer = m.manuf || m.manufacturer;
  if (manufacturer) parts.push(manufacturer);
  return parts.length > 0
    ? `${m.serialNumber} (${parts.join(', ')})`
    : m.serialNumber;
}

export async function logCRCreateActivity(params: {
  body: CreateCollectionReportPayload;
  result: { success: boolean; report?: unknown };
  sanitizedBody: CreateCollectionReportPayload;
  ipAddress: string | undefined;
  userAgent: string | null;
  currentUser: CreateUser;
}): Promise<void> {
  const { body, result, sanitizedBody, ipAddress, userAgent, currentUser } =
    params;

  try {
    const machineIds = (body.machines || [])
      .map(m => String(m.machineId))
      .filter(Boolean);
    const machineDocuments =
      machineIds.length > 0
        ? await Machine.find({ _id: { $in: machineIds } }).lean<
            GamingMachine[]
          >()
        : [];
    const machineNameMap = new Map<string, GamingMachine>(
      machineDocuments.map(m => [String(m._id), m])
    );

    const collectorDisplay =
      body.collectorName || body.collector || 'Unknown';

    const createChanges = [
      { field: 'locationName', oldValue: null, newValue: body.locationName },
      { field: 'collector', oldValue: null, newValue: collectorDisplay },
      { field: 'amountCollected', oldValue: null, newValue: body.amountCollected },
      { field: 'amountToCollect', oldValue: null, newValue: body.amountToCollect },
      { field: 'variance', oldValue: null, newValue: body.variance },
      { field: 'partnerProfit', oldValue: null, newValue: body.partnerProfit },
      { field: 'taxes', oldValue: null, newValue: body.taxes },
      { field: 'machines', oldValue: null, newValue: body.machines?.length || 0 },
    ];

    if (body.machines && Array.isArray(body.machines)) {
      body.machines.forEach((machineItem, index) => {
        const machineDoc = machineNameMap.get(String(machineItem.machineId));
        const machineName = machineDoc
          ? buildMachineName(machineDoc)
          : `Machine ${index + 1}`;
        createChanges.push({
          field: `machine_${index}_details`,
          oldValue: null,
          newValue: `${machineName}: In: ${machineItem.metersIn}, Out: ${machineItem.metersOut}${machineItem.prevMetersIn !== undefined ? ` (Prev: ${machineItem.prevMetersIn} In, ${machineItem.prevMetersOut} Out)` : ''}${machineItem.ramClear ? ', RAM Cleared' : ''}`,
        });
      });
    }

    const enrichedMachines = (body.machines || []).map(machineItem => {
      const machineDoc = machineNameMap.get(String(machineItem.machineId));
      return {
        ...machineItem,
        serialNumber: machineDoc?.serialNumber,
        customName: machineDoc?.custom?.name,
        manuf: machineDoc?.manuf || machineDoc?.manufacturer,
        displayName: machineDoc ? buildMachineName(machineDoc) : undefined,
      };
    });

    const userId = (currentUser._id ||
      currentUser.id ||
      currentUser.sub) as string | undefined;
    const username =
      (currentUser.emailAddress as string | undefined) ||
      (currentUser.username as string | undefined);

    await logActivity({
      action: 'CREATE',
      details: `Created collection report for ${body.locationName} by ${collectorDisplay} (${body.machines?.length || 0} machines, $${body.amountCollected} collected)`,
      ipAddress,
      userAgent: userAgent ?? undefined,
      userId,
      username,
      metadata: {
        userId: (currentUser._id ||
          currentUser.id ||
          currentUser.sub) as string,
        userEmail: currentUser.emailAddress as string,
        userRole: (currentUser.roles as string[])?.[0] || 'user',
        resource: 'collection-report',
        resourceId: result.report
          ? String((result.report as { _id: unknown })._id)
          : sanitizedBody.locationReportId,
        resourceName: `${body.locationName} - ${collectorDisplay}`,
        changes: createChanges,
        previousData: null,
        newData: {
          ...(result.report &&
          (result.report as { toObject?: () => Record<string, unknown> })
            .toObject
            ? (
                result.report as { toObject: () => Record<string, unknown> }
              ).toObject()
            : result.report || {}),
          machines: enrichedMachines,
        },
      },
    });
  } catch (logError) {
    console.error('[logCRCreateActivity] Failed to log activity:', logError);
  }
}

// ============================================================================
// DELETE activity log
// ============================================================================

export async function logCRDeletionActivity(params: {
  existingReport: CollectionReportDocument;
  associatedCollections: CollectionDocument[];
  resolvedReportId: string;
  ipAddress: string | undefined;
  userAgent: string | null;
  currentUser: PatchUser;
}): Promise<void> {
  const {
    existingReport,
    associatedCollections,
    resolvedReportId,
    ipAddress,
    userAgent,
    currentUser,
  } = params;

  const changes = mapDeletedFieldsToChanges(existingReport || {});

  const collectionLogs = associatedCollections.map(collection => {
    const collectionChanges = mapDeletedFieldsToChanges(collection || {});
    return logActivity({
      action: 'DELETE',
      details: `Deleted collection for machine "${collection.machineCustomName || collection.machineName || collection.machineId || 'Machine'}" as part of collection report deletion`,
      ipAddress,
      userAgent: userAgent ?? undefined,
      userId: currentUser._id as string,
      username: currentUser.emailAddress as string,
      metadata: {
        resource: 'collection',
        resourceId: String(collection._id),
        resourceName: collection.machineCustomName || collection.machineName || collection.machineId || 'Machine',
        changes: collectionChanges,
        previousData: collection,
        newData: null,
      },
    });
  });

  await Promise.all([
    logActivity({
      action: 'DELETE',
      details: `Deleted collection report for ${existingReport.locationName}`,
      ipAddress,
      userAgent: userAgent ?? undefined,
      userId: currentUser._id as string,
      username: currentUser.emailAddress as string,
      metadata: {
        resource: 'collection-report',
        resourceId: resolvedReportId,
        resourceName: existingReport.locationName,
        changes,
        previousData: { ...existingReport, collections: associatedCollections },
        newData: null,
      },
    }),
    ...collectionLogs,
  ]);
}
