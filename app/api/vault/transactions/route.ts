/**
 * Vault Transactions API
 */

import { getUserLocationFilter } from '@/app/api/lib/helpers/licenceeFilter';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { getMoneyOutAndJackpotScale } from '@/app/api/lib/utils/reviewerScale';
import type { ExtendedVaultTransaction } from '@/shared/types/vault';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { NextRequest, NextResponse } from 'next/server';
import { GamingLocations } from '../../lib/models/gaminglocations';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import type {
  GamingMachine,
  GamingLocationDocument,
  VaultTransactionDocument,
} from '@shared/types';
import type { LeanUserDocument } from 'shared/types/auth';

/**
 * Main GET handler for vault transactions.
 *
 * STEP 1: Authorization and permission check.
 * STEP 2: Parse query parameters (locationId, page, limit, type, status, search).
 * STEP 3: Handle location authorization filtering.
 * STEP 4: Build database query based on filters.
 * STEP 5: Fetch transactions and total count from DB.
 * STEP 6: Enrich transactions with location, user, and machine details.
 * STEP 7: Apply reviewer multiplier scaling if applicable.
 * STEP 8: Return formatted response with pagination.
 *
 * @param {NextRequest} request - The incoming Next.js request.
 * @param {string} request.url - URL containing searchParams:
 *   - locationId: Filter by location ID (or 'all').
 *   - page: Page number for pagination (default: 1).
 *   - limit: Items per page (default: 20, max: 100).
 *   - type: Filter by transaction type(s) (comma-separated).
 *   - status: Filter by status (e.g., 'voided').
 *   - search: Generic search query for notes/metadata.
 * @returns {Promise<NextResponse>} Paginated vault transaction list with enriched metadata.
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/vault/transactions';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    try {
      const normalizedRoles = userRoles.map(role => String(role).toLowerCase());
      const hasVMAccess = normalizedRoles.some(role =>
        ['developer', 'admin', 'manager', 'vault-manager'].includes(role)
      );
      if (!hasVMAccess) {
        logRouteError(
          functionName,
          'GET',
          '/api/vault/transactions',
          'Insufficient permissions',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      const { searchParams } = new URL(request.url);
      const locationId = searchParams.get('locationId');
      const page = parseInt(searchParams.get('page') || '1');
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
      const skip = (page - 1) * limit;

      const allowedLocationIds = await getUserLocationFilter(
        (userPayload?.assignedLicencees as string[]) || [],
        undefined,
        (userPayload?.assignedLocations as string[]) || [],
        userRoles
      );

      const query: Record<string, unknown> = {};
      if (!locationId || locationId === 'all') {
        if (allowedLocationIds !== 'all')
          query.locationId = { $in: allowedLocationIds };
      } else {
        if (
          allowedLocationIds !== 'all' &&
          !allowedLocationIds.includes(locationId)
        ) {
          logRouteError(
            functionName,
            'GET',
            '/api/vault/transactions',
            'Access denied',
            user
          );
          return NextResponse.json(
            { success: false, error: 'Access denied' },
            { status: 403 }
          );
        }
        query.locationId = locationId;
      }

      const type = searchParams.get('type');
      const status = searchParams.get('status');
      const search = searchParams.get('search');

      if (type && type !== 'all')
        query.type = type.includes(',') ? { $in: type.split(',') } : type;
      if (status && status !== 'all') query.isVoid = status === 'voided';

      if (search) {
        const searchRegex = { $regex: search, $options: 'i' };
        const orConditions: Record<string, unknown>[] = [
          { notes: searchRegex },
          { auditComment: searchRegex },
          { performedBy: searchRegex },
        ];
        const numericSearch = parseFloat(search);
        if (!isNaN(numericSearch)) orConditions.push({ amount: numericSearch });
        query.$or = orConditions;
      }

      const [transactions, total] = await Promise.all([
        VaultTransactionModel.find(query)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit)
          .lean<VaultTransactionDocument[]>(),
        VaultTransactionModel.countDocuments(query),
      ]);

      let finalTx: ExtendedVaultTransaction[] =
        transactions as unknown as ExtendedVaultTransaction[];
      if (locationId === 'all' || !locationId) {
        const locationIds = transactions.map(tx => tx.locationId);
        const locations = await GamingLocations.find(
          { _id: { $in: locationIds } },
          { _id: 1, name: 1 }
        )
          .lean<GamingLocationDocument[]>()
          .then(docs =>
            docs.map(doc => ({ _id: String(doc._id), name: doc.name }))
          );
        const locationNameMap = locations.reduce(
          (acc, location) => {
            acc[location._id] = location.name;
            return acc;
          },
          {} as Record<string, string>
        );
        finalTx = transactions.map(tx => ({
          ...(tx as unknown as Record<string, unknown>),
          locationName: locationNameMap[tx.locationId] || 'Unknown',
        })) as unknown as ExtendedVaultTransaction[];
      }

      const userIds = new Set<string>();
      const machineIds = new Set<string>();
      finalTx.forEach(tx => {
        if (tx.performedBy) userIds.add(tx.performedBy);
        const from = tx.from;
        const to = tx.to;
        if (from?.type === 'cashier' && from.id) userIds.add(from.id);
        if (to?.type === 'cashier' && to.id) userIds.add(to.id);
        if (from?.type === 'machine' && from.id) machineIds.add(from.id);
        if (to?.type === 'machine' && to.id) machineIds.add(to.id);
        if (tx.expenseDetails?.machineIds?.length)
          tx.expenseDetails.machineIds.forEach(id => machineIds.add(id));
      });

      const [userMap, machineMap] = await Promise.all([
        userIds.size
          ? (await import('@/app/api/lib/models/user')).default
              .find(
                { _id: { $in: Array.from(userIds) } },
                { 'profile.firstName': 1, 'profile.lastName': 1, username: 1 }
              )
              .lean<LeanUserDocument[]>()
              .then(users =>
                users.reduce(
                  (acc, userDoc) => {
                    acc[String(userDoc._id)] = userDoc as Record<
                      string,
                      unknown
                    >;
                    return acc;
                  },
                  {} as Record<string, Record<string, unknown>>
                )
              )
          : Promise.resolve({} as Record<string, Record<string, unknown>>),
        machineIds.size
          ? (await import('@/app/api/lib/models/machines')).Machine.find(
              { _id: { $in: Array.from(machineIds) } },
              {
                serialNumber: 1,
                'custom.name': 1,
                game: 1,
                installedGame: 1,
                gameType: 1,
              }
            )
              .lean<GamingMachine[]>()
              .then(machines =>
                machines.reduce(
                  (acc, machine) => {
                    acc[String(machine._id)] = machine as Record<
                      string,
                      unknown
                    >;
                    return acc;
                  },
                  {} as Record<string, Record<string, unknown>>
                )
              )
          : Promise.resolve({} as Record<string, Record<string, unknown>>),
      ]);

      const populated = finalTx.map(tx => {
        const result: Record<string, unknown> = {
          ...(tx as unknown as Record<string, unknown>),
        };
        const performedByKey = tx.performedBy ?? '';
        const performer = userMap[performedByKey] as
          | { profile?: { firstName?: string; lastName?: string } }
          | undefined;
        if (performer?.profile?.firstName)
          result.performedByName = `${performer.profile.firstName} ${performer.profile.lastName}`;

        const formatActor = (
          actor: { type: string; id?: string } | undefined
        ) => {
          if (actor?.type === 'cashier' && actor.id) {
            const cashierData = userMap[actor.id] as
              | { profile?: { firstName?: string; lastName?: string } }
              | undefined;
            return cashierData?.profile?.firstName
              ? `Cashier (${cashierData.profile.firstName} ${cashierData.profile.lastName})`
              : `Cashier (${actor.id})`;
          }
          if (actor?.type === 'machine' && actor.id) {
            const machineData = machineMap[actor.id] as
              | { serialNumber?: string; custom?: { name?: string } }
              | undefined;
            return machineData
              ? `Machine (${
                  String(machineData.serialNumber || '').trim() ||
                  String(machineData.custom?.name || '').trim() ||
                  actor.id
                })`
              : `Machine (${actor.id})`;
          }
          return null;
        };

        const fromName = formatActor(tx.from);
        const toName = formatActor(tx.to);
        if (fromName) result.fromName = fromName;
        if (toName) result.toName = toName;

        const relatedMachineIds = new Set<string>();
        if (tx.from?.type === 'machine' && tx.from.id)
          relatedMachineIds.add(tx.from.id);
        if (tx.to?.type === 'machine' && tx.to.id)
          relatedMachineIds.add(tx.to.id);
        if (tx.expenseDetails?.machineIds?.length)
          tx.expenseDetails.machineIds.forEach(id => relatedMachineIds.add(id));

        if (relatedMachineIds.size > 0) {
          result.machineDetails = Array.from(relatedMachineIds).map(id => {
            const machineData = machineMap[id] as
              | {
                  serialNumber?: string;
                  custom?: { name?: string };
                  game?: string;
                  installedGame?: string;
                  gameType?: string;
                }
              | undefined;
            if (!machineData)
              return { identifier: id, game: 'N/A', gameType: 'N/A' };
            const serialNumber = String(machineData.serialNumber || '').trim();
            const customName = String(machineData.custom?.name || '').trim();
            const game = String(
              machineData.game || machineData.installedGame || ''
            );
            const gameType = String(machineData.gameType || '');
            const mainIdentifier = serialNumber || customName || 'N/A';
            return {
              identifier:
                customName && customName !== mainIdentifier
                  ? `${mainIdentifier} (${customName})`
                  : mainIdentifier,
              game: game.trim(),
              gameType: gameType.trim(),
            };
          });
        }
        return result;
      });

      // ============================================================================
      // Reviewer Multiplier Scaling
      // ============================================================================
      populated.forEach(transaction => {
        const transactionScale = getMoneyOutAndJackpotScale(
          userPayload as {
            moneyOutAndJackpotMultiplier?: number | null;
            roles?: string[];
            reviewerMultiplierStartTime?: Date | string | null;
          },
          (transaction as { timestamp?: Date | string | null }).timestamp ??
            null
        );

        if (transactionScale !== 1 && typeof transaction.amount === 'number') {
          transaction.amount *= transactionScale;
        }
      });

      populated.forEach(transaction => {
        const expenseDetails = transaction.expenseDetails as
          | {
              machineIds?: string[];
            }
          | undefined;
        if (expenseDetails?.machineIds) delete expenseDetails.machineIds;
      });

      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/vault/transactions',
        populated.length,
        user,
        duration
      );

      return NextResponse.json({
        success: true,
        items: populated,
        total,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to fetch vault transactions';
      logRouteError(
        functionName,
        'GET',
        '/api/vault/transactions',
        errorMessage,
        user
      );
      console.error('[Vault Transactions API] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  });
}
