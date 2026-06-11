/**
 * Vault Expense Operations Helper
 *
 * This file contains helper functions for vault expense operations.
 * It supports:
 * - Permission checking for vault managers
 * - GridFS attachment upload for expense receipts
 * - Machine detail resolution for repair expenses
 * - Expense query building for the GET endpoint
 *
 * @module app/api/lib/helpers/vault/expenseOperations
 */

import type { GamingMachine, VaultTransactionDocument } from '@shared/types';
import { GridFSBucket, type Db } from 'mongodb';
import { Readable } from 'stream';

type MachineDetail = {
  identifier: string;
  game: string;
  gameType: string;
};

const VAULT_MANAGER_ROLES = ['developer', 'admin', 'manager', 'vault-manager'];

/**
 * Check if user has vault manager permissions
 *
 * @param {string[]} userRoles - Array of user role strings
 * @returns {boolean} True if user has permission
 */
export function checkVaultManagerPermission(userRoles: string[]): boolean {
  if (!Array.isArray(userRoles) || userRoles.length === 0) return false;

  return userRoles
    .map(role => String(role).toLowerCase())
    .some(role => VAULT_MANAGER_ROLES.includes(role));
}

/**
 * Upload an expense attachment to GridFS
 *
 * @param {File} file - The file to upload
 * @param {unknown} db - MongoDB database instance
 * @param {{ _id: string }} userPayload - The authenticated user
 * @returns {Promise<{ attachmentId: unknown; attachmentName: string } | null>}
 */
export async function uploadExpenseAttachment(
  file: File,
  db: unknown,
  userPayload: { _id: string }
): Promise<{ attachmentId: unknown; attachmentName: string } | null> {
  if (!file || !(file instanceof File) || file.size === 0) {
    console.error('[uploadExpenseAttachment] file is required');
    return null;
  }

  if (!db) {
    console.error('[uploadExpenseAttachment] db is required');
    return null;
  }

  if (!userPayload || !userPayload._id) {
    console.error('[uploadExpenseAttachment] userPayload._id is required');
    return null;
  }

  try {
    const bucket = new GridFSBucket(db as unknown as Db, {
      bucketName: 'vault_attachments',
    });
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadStream = bucket.openUploadStream(file.name, {
      metadata: {
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        uploadedAt: new Date(),
        uploadedBy: userPayload._id,
        context: 'expense_receipt',
      },
    });
    await new Promise<void>((resolve, reject) => {
      Readable.from(buffer)
        .pipe(uploadStream)
        .on('error', reject)
        .on('finish', () => resolve());
    });
    return { attachmentId: uploadStream.id, attachmentName: file.name };
  } catch (e) {
    console.error(
      '[uploadExpenseAttachment] Error:',
      e instanceof Error ? e.message : 'Unknown error'
    );
    return null;
  }
}

/**
 * Resolve machine IDs to display details for repair expenses
 *
 * @param {string[]} machineIds - Array of machine identifiers
 * @returns {Promise<MachineDetail[]>} Array of machine details
 */
export async function resolveExpenseMachineDetails(
  machineIds: string[]
): Promise<MachineDetail[]> {
  if (!Array.isArray(machineIds) || machineIds.length === 0) return [];

  const { Machine } = await import('@/app/api/lib/models/machines');
  const machineList = await Machine.find({
    _id: { $in: machineIds },
  }).lean<GamingMachine[]>();

  return machineIds.map((id: string) => {
    const found = machineList.find(
      (item: GamingMachine) =>
        String(item._id) === id ||
        String(item.machineId) === id ||
        item.serialNumber === id
    );

    if (!found) return { identifier: id, game: 'N/A', gameType: 'N/A' };

    const customName =
      found.custom &&
      typeof found.custom === 'object' &&
      'name' in found.custom
        ? (found.custom as { name?: string }).name
        : undefined;
    const mainId =
      (found.serialNumber || '').trim() || customName?.trim() || 'N/A';

    return {
      identifier: customName ? `${mainId} (${customName})` : mainId,
      game: ((found.game || found.installedGame || '') as string).trim(),
      gameType: (found.gameType || '').trim(),
    };
  });
}

/**
 * Enrich expense documents with resolved machine details for repair expenses.
 * Processes a batch of expenses with a single DB query.
 *
 * @param {VaultTransactionDocument[]} expenses - Array of expense documents
 */
export async function enrichExpenseMachineDetails(
  expenses: VaultTransactionDocument[]
): Promise<void> {
  if (!Array.isArray(expenses) || expenses.length === 0) return;

  const missingIds = new Set<string>();
  for (const expense of expenses) {
    const details = expense.expenseDetails as
      | Record<string, unknown>
      | undefined;
    if (
      details?.isMachineRepair &&
      Array.isArray(details.machineIds) &&
      !Array.isArray(details.machineDetails)
    ) {
      for (const id of details.machineIds as string[]) {
        missingIds.add(id);
      }
    }
  }

  if (missingIds.size === 0) return;

  const uniqueIds = Array.from(missingIds);
  const allDetails = await resolveExpenseMachineDetails(uniqueIds);
  const idToIndex = new Map<string, number>();
  uniqueIds.forEach((id, index) => idToIndex.set(id, index));

  for (const expense of expenses) {
    const details = expense.expenseDetails as
      | Record<string, unknown>
      | undefined;
    if (
      details?.isMachineRepair &&
      Array.isArray(details.machineIds) &&
      !Array.isArray(details.machineDetails)
    ) {
      details.machineDetails = (details.machineIds as string[]).map(id => {
        const idx = idToIndex.get(id);
        return idx !== undefined
          ? allDetails[idx]
          : { identifier: id, game: 'N/A', gameType: 'N/A' };
      });
    }
  }
}

/**
 * Build a MongoDB query for expense transactions from search params
 *
 * @param {URLSearchParams} searchParams - Request URL search params
 * @param {'all' | string[]} allowedLocs - User's accessible locations
 * @returns {{ query: Record<string, unknown>; error?: string }} Query and optional error
 */
export function buildExpenseQuery(
  searchParams: URLSearchParams,
  allowedLocs: string[] | 'all'
): { query: Record<string, unknown>; error?: string } {
  const locationId = searchParams.get('locationId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const category = searchParams.get('category');

  const query: Record<string, unknown> = { type: 'expense' };
  let error: string | undefined;

  if (locationId) {
    if (allowedLocs !== 'all' && !allowedLocs.includes(locationId)) {
      error = 'Location access denied';
    } else {
      query.locationId = locationId;
    }
  } else if (allowedLocs !== 'all') {
    query.locationId = { $in: allowedLocs };
  }

  if (startDate || endDate) {
    const timestampQuery: { $gte?: Date; $lte?: Date } = {};
    if (startDate) timestampQuery.$gte = new Date(startDate);
    if (endDate) timestampQuery.$lte = new Date(endDate);
    query.timestamp = timestampQuery;
  }

  if (category) query['to.id'] = category;

  return { query, error };
}
