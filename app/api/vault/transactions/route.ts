/**
 * Vault Transactions API
 *
 * GET /api/vault/transactions
 *
 * Retrieves transaction history for the vault.
 * Supports filtering by type, date range, and pagination.
 *
 * @module app/api/vault/transactions/route
 */

import { getUserLocationFilter } from '@/app/api/lib/helpers/licenceeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { NextRequest, NextResponse } from 'next/server';
import { GamingLocations } from '../../lib/models/gaminglocations';
import type { LocationDocument } from '@/lib/types/common';

export async function GET(request: NextRequest) {
  try {
    // ============================================================================
    // STEP 1: Authentication & Authorization
    // ============================================================================
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const userRoles = (userPayload?.roles as string[]) || [];
    const hasVMAccess = userRoles.some(role =>
      ['developer', 'admin', 'manager', 'vault-manager'].includes(
        role.toLowerCase()
      )
    );
    if (!hasVMAccess) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 2: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const page = parseInt(searchParams.get('page') || '1');
    const requestedLimit = parseInt(searchParams.get('limit') || '20');
    const limit = Math.min(requestedLimit, 100); // Cap at 100 items at a time
    const skip = (page - 1) * limit;

    // ============================================================================
    // STEP 3: Database connection & Licencee filtering
    // ============================================================================
    await connectDB();

    const allowedLocationIds = await getUserLocationFilter(
      (userPayload?.assignedLicencees as string[]) || [],
      undefined,
      (userPayload?.assignedLocations as string[]) || [],
      (userPayload?.roles as string[]) || []
    );

    const query: Record<string, unknown> = {};

    if (!locationId || locationId === 'all') {
      if (allowedLocationIds !== 'all') {
        query.locationId = { $in: allowedLocationIds };
      }
      // If allowedLocationIds is 'all', we don't need a locationId filter (query everything)
    } else {
      if (
        allowedLocationIds !== 'all' &&
        !allowedLocationIds.includes(locationId as string)
      ) {
        return NextResponse.json(
          { success: false, error: 'Access denied for this location' },
          { status: 403 }
        );
      }
      query.locationId = locationId;
    }

    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    if (type && type !== 'all') {
      if (type.includes(',')) {
        query.type = { $in: type.split(',') };
      } else {
        query.type = type;
      }
    }

    // Status filter - mapped to transaction properties
    if (status && status !== 'all') {
      if (status === 'voided') {
        query.isVoid = true;
      } else if (status === 'completed') {
        query.isVoid = false;
      }
    }

    if (search) {
      // Basic search on notes or amount
      const searchRegex = { $regex: search, $options: 'i' };
      const orConditions: Record<string, unknown>[] = [
        { notes: searchRegex },
        { auditComment: searchRegex },
        { performedBy: searchRegex }
      ];
      // Try numeric search if possible
      const numSearch = parseFloat(search);
      if (!isNaN(numSearch)) {
        orConditions.push({ amount: numSearch });
      }
      query.$or = orConditions;
    }

    const transactions = await VaultTransactionModel.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await VaultTransactionModel.countDocuments(query);

    // If global view, attach location names
    let finalTransactions = transactions;
    if (locationId === 'all' || !locationId) {
      const locations = (await GamingLocations.find({
        _id: { $in: transactions.map(tx => tx.locationId) }
      }, { _id: 1, name: 1, gameDayOffset: 1 }).lean()) as unknown as Pick<LocationDocument, '_id' | 'name' | 'gameDayOffset'>[];

      const nameMap = locations.reduce((acc, loc) => {
        acc[String(loc._id)] = loc.name;
        return acc;
      }, {} as Record<string, string>);

      finalTransactions = transactions.map(tx => ({
        ...tx,
        locationName: nameMap[tx.locationId] || 'Unknown'
      }));
    }

    // ============================================================================
    // STEP 4: Populate Names (Cashiers, Performers, and Machines)
    // ============================================================================
    interface TransactionSourceDest { type: string; id?: string }
    interface ExpenseDetails { isMachineRepair?: boolean; machineIds?: string[] }
    interface BaseTransaction {
      performedBy: string;
      from?: TransactionSourceDest;
      to?: TransactionSourceDest;
      expenseDetails?: ExpenseDetails;
      locationId: string;
      serialNumber?: string;
      custom?: { name?: string };
      game?: string;
      installedGame?: string;
      gameType?: string;
      performedByName?: string;
      fromName?: string;
      toName?: string;
      machineDetails?: Array<{ identifier: string; game: string; gameType: string }>;
    }

    const userIds = new Set<string>();
    const machineIds = new Set<string>();

    type PopulatedTransactions = Array<BaseTransaction & Record<string, unknown>>;
    let populatedTransactions: PopulatedTransactions = (finalTransactions as unknown[]).map(tx => tx as BaseTransaction & Record<string, unknown>);

    populatedTransactions.forEach((t) => {
      if (t.performedBy) userIds.add(t.performedBy);
      if (t.from?.type === 'cashier' && t.from.id) userIds.add(t.from.id);
      if (t.to?.type === 'cashier' && t.to.id) userIds.add(t.to.id);

      if (t.from?.type === 'machine' && t.from.id) machineIds.add(t.from.id);
      if (t.to?.type === 'machine' && t.to.id) machineIds.add(t.to.id);

      if (t.expenseDetails?.isMachineRepair && t.expenseDetails.machineIds && t.expenseDetails.machineIds.length > 0) {
        t.expenseDetails.machineIds.forEach((id: string) => machineIds.add(id));
      }
    });

    interface PopulatedUser {
      _id: string;
      profile?: { firstName?: string; lastName?: string };
      username?: string;
    }

    interface PopulatedMachine {
      _id: string;
      serialNumber?: string;
      custom?: { name?: string };
      game?: string;
      installedGame?: string;
      gameType?: string;
    }

    const userMap: Record<string, PopulatedUser> = {};
    const machineMap: Record<string, PopulatedMachine> = {};

    if (userIds.size > 0) {
      const UserModel = (await import('@/app/api/lib/models/user')).default;
      const users = await UserModel.find(
        { _id: { $in: Array.from(userIds) } },
        { 'profile.firstName': 1, 'profile.lastName': 1, username: 1 }
      ).lean();

      (users as unknown as PopulatedUser[]).forEach((u: PopulatedUser) => {
        userMap[String(u._id)] = u;
      });
    }

    if (machineIds.size > 0) {
      const { Machine } = await import('@/app/api/lib/models/machines');
      const machines = await Machine.find(
        { _id: { $in: Array.from(machineIds) } },
        { serialNumber: 1, 'custom.name': 1, game: 1, installedGame: 1, gameType: 1 }
      ).lean();

      (machines as unknown as PopulatedMachine[]).forEach((m: PopulatedMachine) => {
        machineMap[String(m._id)] = m;
      });
    }

    populatedTransactions = populatedTransactions.map((tx) => {
      const originalTx = tx;
      const updatedTx = { ...originalTx };

      // 1. Performer Name
      const perfUser = userMap[originalTx.performedBy];
      if (perfUser && perfUser.profile?.firstName) {
        updatedTx.performedByName = `${perfUser.profile.firstName} ${perfUser.profile.lastName}`;
      }

      // 2. Source Name
      const from = originalTx.from;
      if (from?.type === 'cashier' && from.id) {
        const cashier = userMap[from.id];
        if (cashier && cashier.profile?.firstName) {
          updatedTx.fromName = `Cashier (${cashier.profile.firstName} ${cashier.profile.lastName})`;
        }
      } else if (from?.type === 'machine' && from.id) {
        const machine = machineMap[from.id];
        if (machine) {
          const sn = machine.serialNumber?.trim();
          const name = machine.custom?.name?.trim();
          updatedTx.fromName = `Machine (${sn || name || from.id})`;
        } else {
          updatedTx.fromName = `Machine (${from.id})`;
        }
      }

      // 3. Destination Name
      const to = originalTx.to;
      if (to?.type === 'cashier' && to.id) {
        const cashier = userMap[to.id];
        if (cashier && cashier.profile?.firstName) {
          updatedTx.toName = `Cashier (${cashier.profile.firstName} ${cashier.profile.lastName})`;
        }
      } else if (to?.type === 'machine' && to.id) {
        const machine = machineMap[to.id];
        if (machine) {
          const sn = machine.serialNumber?.trim();
          const name = machine.custom?.name?.trim();
          updatedTx.toName = `Machine (${sn || name || to.id})`;
        } else {
          updatedTx.toName = `Machine (${to.id})`;
        }
      }

      // 4. Populate machineDetails for details modal (BR-03 compliance)
      const allAssociatedMachineIds = new Set<string>();
      if (from?.type === 'machine' && from.id) allAssociatedMachineIds.add(from.id);
      if (to?.type === 'machine' && to.id) allAssociatedMachineIds.add(to.id);
      const expenseMachineIds = originalTx.expenseDetails?.machineIds;
      if (expenseMachineIds && expenseMachineIds.length > 0) {
        expenseMachineIds.forEach((id: string) => allAssociatedMachineIds.add(id));
      }

      if (allAssociatedMachineIds.size > 0) {
        updatedTx.machineDetails = Array.from(allAssociatedMachineIds).map((id: string) => {
          const m = machineMap[id];
          if (!m) return { identifier: id, game: 'N/A', gameType: 'N/A' };

          const sn = m.serialNumber?.trim() || '';
          const name = m.custom?.name?.trim() || '';
          const game = m.game || m.installedGame || '';
          const gameType = m.gameType || '';
          const mainId = sn || name || 'N/A';

          return {
            identifier: name && name !== mainId ? `${mainId} (${name})` : mainId,
            game: game.trim(),
            gameType: gameType.trim()
          };
        });
      }

      return updatedTx;
    });

    // Final cleanup of internal IDs from response
    populatedTransactions.forEach((t) => {
      if (t.expenseDetails && t.expenseDetails.machineIds) {
        delete t.expenseDetails.machineIds;
      }
    });

    // ============================================================================
    // STEP 5: Return success response
    // ============================================================================
    return NextResponse.json({
      success: true,
      items: populatedTransactions,
      transactions: populatedTransactions, // Keep for backward compatibility
      total,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error fetching transactions:', errorMessage);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
