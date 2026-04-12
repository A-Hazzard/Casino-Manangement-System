/**
 * Vault Transactions API
 */

import { getUserLocationFilter } from '@/app/api/lib/helpers/licenceeFilter';
import type { VaultTransactionDocument } from '@/app/api/lib/types/models';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { NextRequest, NextResponse } from 'next/server';
import { GamingLocations } from '../../lib/models/gaminglocations';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';

type TxWithLocation = VaultTransactionDocument & { locationName?: string };

export async function GET(request: NextRequest) {
  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    try {
      const normalizedRoles = userRoles.map(r => String(r).toLowerCase());
      const hasVMAccess = normalizedRoles.some(role =>
        ['developer', 'admin', 'manager', 'vault-manager'].includes(role)
      );
      if (!hasVMAccess)
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 }
        );

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
        const sr = { $regex: search, $options: 'i' };
        const orConditions: Record<string, unknown>[] = [
          { notes: sr },
          { auditComment: sr },
          { performedBy: sr },
        ];
        const ns = parseFloat(search);
        if (!isNaN(ns)) orConditions.push({ amount: ns });
        query.$or = orConditions;
      }

      const [transactions, total] = await Promise.all([
        VaultTransactionModel.find(query)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        VaultTransactionModel.countDocuments(query),
      ]);

      let finalTx: TxWithLocation[] =
        transactions as unknown as TxWithLocation[];
      if (locationId === 'all' || !locationId) {
        const locIds = transactions.map(tx => tx.locationId);
        const locations = (await GamingLocations.find(
          { _id: { $in: locIds } },
          { _id: 1, name: 1 }
        )
          .lean()
          .then(loc =>
            loc.map(l => ({ _id: String(l._id), name: l.name as string }))
          )) as { _id: string; name: string }[];
        const nMap = locations.reduce(
          (acc, loc) => {
            acc[loc._id] = loc.name;
            return acc;
          },
          {} as Record<string, string>
        );
        finalTx = transactions.map(tx => ({
          ...(tx as unknown as Record<string, unknown>),
          locationName: nMap[tx.locationId] || 'Unknown',
        })) as unknown as TxWithLocation[];
      }

      const uIds = new Set<string>();
      const mIds = new Set<string>();
      finalTx.forEach(tx => {
        if (tx.performedBy) uIds.add(tx.performedBy);
        const from = tx.from;
        const to = tx.to;
        if (from?.type === 'cashier' && from.id) uIds.add(from.id);
        if (to?.type === 'cashier' && to.id) uIds.add(to.id);
        if (from?.type === 'machine' && from.id) mIds.add(from.id);
        if (to?.type === 'machine' && to.id) mIds.add(to.id);
        if (tx.expenseDetails?.machineIds?.length)
          tx.expenseDetails.machineIds.forEach(id => mIds.add(id));
      });

      const [userMap, machineMap] = await Promise.all([
        uIds.size
          ? (await import('@/app/api/lib/models/user')).default
              .find(
                { _id: { $in: Array.from(uIds) } },
                { 'profile.firstName': 1, 'profile.lastName': 1, username: 1 }
              )
              .lean()
              .then(users =>
                users.reduce(
                  (acc, u) => {
                    acc[String(u._id)] = u as Record<string, unknown>;
                    return acc;
                  },
                  {} as Record<string, Record<string, unknown>>
                )
              )
          : Promise.resolve({} as Record<string, Record<string, unknown>>),
        mIds.size
          ? (await import('@/app/api/lib/models/machines')).Machine.find(
              { _id: { $in: Array.from(mIds) } },
              {
                serialNumber: 1,
                'custom.name': 1,
                game: 1,
                installedGame: 1,
                gameType: 1,
              }
            )
              .lean()
              .then(machines =>
                machines.reduce(
                  (acc, m) => {
                    acc[String(m._id)] = m as Record<string, unknown>;
                    return acc;
                  },
                  {} as Record<string, Record<string, unknown>>
                )
              )
          : Promise.resolve({} as Record<string, Record<string, unknown>>),
      ]);

      const populated = finalTx.map(tx => {
        const res: Record<string, unknown> = {
          ...(tx as unknown as Record<string, unknown>),
        };
        const performedByKey = tx.performedBy ?? '';
        const perf = userMap[performedByKey] as
          | { profile?: { firstName?: string; lastName?: string } }
          | undefined;
        if (perf?.profile?.firstName)
          res.performedByName = `${perf.profile.firstName} ${perf.profile.lastName}`;

        const formatActor = (
          actor: { type: string; id?: string } | undefined
        ) => {
          if (actor?.type === 'cashier' && actor.id) {
            const c = userMap[actor.id] as
              | { profile?: { firstName?: string; lastName?: string } }
              | undefined;
            return c?.profile?.firstName
              ? `Cashier (${c.profile.firstName} ${c.profile.lastName})`
              : `Cashier (${actor.id})`;
          }
          if (actor?.type === 'machine' && actor.id) {
            const m = machineMap[actor.id] as
              | { serialNumber?: string; custom?: { name?: string } }
              | undefined;
            return m
              ? `Machine (${
                  String(m.serialNumber || '').trim() ||
                  String(m.custom?.name || '').trim() ||
                  actor.id
                })`
              : `Machine (${actor.id})`;
          }
          return null;
        };

        const fromName = formatActor(tx.from);
        const toName = formatActor(tx.to);
        if (fromName) res.fromName = fromName;
        if (toName) res.toName = toName;

        const aMIds = new Set<string>();
        if (tx.from?.type === 'machine' && tx.from.id) aMIds.add(tx.from.id);
        if (tx.to?.type === 'machine' && tx.to.id) aMIds.add(tx.to.id);
        if (tx.expenseDetails?.machineIds?.length)
          tx.expenseDetails.machineIds.forEach(id => aMIds.add(id));

        if (aMIds.size > 0) {
          res.machineDetails = Array.from(aMIds).map(id => {
            const m = machineMap[id] as
              | {
                  serialNumber?: string;
                  custom?: { name?: string };
                  game?: string;
                  installedGame?: string;
                  gameType?: string;
                }
              | undefined;
            if (!m) return { identifier: id, game: 'N/A', gameType: 'N/A' };
            const sn = String(m.serialNumber || '').trim();
            const nm = String(m.custom?.name || '').trim();
            const g = String(m.game || m.installedGame || '');
            const gt = String(m.gameType || '');
            const main = sn || nm || 'N/A';
            return {
              identifier: nm && nm !== main ? `${main} (${nm})` : main,
              game: g.trim(),
              gameType: gt.trim(),
            };
          });
        }
        return res;
      });

      // ============================================================================
      // Reviewer Multiplier Scaling
      // ============================================================================
      const reviewerMult = (userPayload as { multiplier?: number | null })?.multiplier ?? null;
      if (reviewerMult !== null) {
        const mult = 1 - reviewerMult;
        populated.forEach(t => {
          if (typeof t.amount === 'number') {
            t.amount *= mult;
          }
        });
      }

      populated.forEach(t => {
        const expenseDetails = t.expenseDetails as
          | {
              machineIds?: string[];
            }
          | undefined;
        if (expenseDetails?.machineIds) delete expenseDetails.machineIds;
      });
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
    } catch (error: unknown) {
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
