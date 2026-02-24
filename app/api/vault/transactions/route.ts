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

import { getUserLocationFilter } from '@/app/api/lib/helpers/licenseeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { NextRequest, NextResponse } from 'next/server';
import { GamingLocations } from '../../lib/models/gaminglocations';

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
    // STEP 3: Database connection & Licensee filtering
    // ============================================================================
    await connectDB();

    const allowedLocationIds = await getUserLocationFilter(
      (userPayload?.assignedLicensees as string[]) || [],
      undefined,
      (userPayload?.assignedLocations as string[]) || [],
      (userPayload?.roles as string[]) || []
    );

    const query: any = {};

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
       query.$or = [
          { notes: searchRegex },
          { auditComment: searchRegex },
          { performedBy: searchRegex }
       ];
       // Try numeric search if possible
       const numSearch = parseFloat(search);
       if (!isNaN(numSearch)) {
          query.$or.push({ amount: numSearch });
       }
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
        const locations = await GamingLocations.find({ 
            _id: { $in: transactions.map(tx => tx.locationId) } 
        }, { name: 1 }).lean();
        
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
    const userIds = new Set<string>();
    const machineIds = new Set<string>();

    finalTransactions.forEach((tx: any) => {
        if (tx.performedBy) userIds.add(tx.performedBy);
        if (tx.from?.type === 'cashier' && tx.from.id) userIds.add(tx.from.id);
        if (tx.to?.type === 'cashier' && tx.to.id) userIds.add(tx.to.id);
        
        if (tx.from?.type === 'machine' && tx.from.id) machineIds.add(tx.from.id);
        if (tx.to?.type === 'machine' && tx.to.id) machineIds.add(tx.to.id);

        if (tx.expenseDetails?.isMachineRepair && tx.expenseDetails.machineIds?.length > 0) {
            tx.expenseDetails.machineIds.forEach((id: string) => machineIds.add(id));
        }
    });

    const userMap: Record<string, any> = {};
    const machineMap: Record<string, any> = {};

    if (userIds.size > 0) {
        const UserModel = (await import('@/app/api/lib/models/user')).default;
        const users = await UserModel.find(
            { _id: { $in: Array.from(userIds) } }, 
            { 'profile.firstName': 1, 'profile.lastName': 1, username: 1 }
        ).lean();

        users.forEach((u: any) => {
            userMap[String(u._id)] = u;
        });
    }

    if (machineIds.size > 0) {
        const { Machine } = await import('@/app/api/lib/models/machines');
        const machines = await Machine.find(
            { _id: { $in: Array.from(machineIds) } },
            { serialNumber: 1, 'custom.name': 1, game: 1, installedGame: 1, gameType: 1 }
        ).lean();

        machines.forEach((m: any) => {
            machineMap[String(m._id)] = m;
        });
    }

    finalTransactions = finalTransactions.map((tx: any) => {
        const updatedTx = { ...tx };
        
        // 1. Performer Name
        const perfUser = userMap[tx.performedBy];
        if (perfUser && perfUser.profile?.firstName) {
            updatedTx.performedByName = `${perfUser.profile.firstName} ${perfUser.profile.lastName}`;
        }

        // 2. Source Name
        if (tx.from?.type === 'cashier' && tx.from.id) {
            const cashier = userMap[tx.from.id];
            if (cashier && cashier.profile?.firstName) {
                updatedTx.fromName = `Cashier (${cashier.profile.firstName} ${cashier.profile.lastName})`;
            }
        } else if (tx.from?.type === 'machine' && tx.from.id) {
            const machine = machineMap[tx.from.id];
            if (machine) {
                const sn = machine.serialNumber?.trim();
                const name = machine.custom?.name?.trim();
                updatedTx.fromName = `Machine (${sn || name || tx.from.id})`;
            } else {
                updatedTx.fromName = `Machine (${tx.from.id})`;
            }
        }

        // 3. Destination Name
        if (tx.to?.type === 'cashier' && tx.to.id) {
            const cashier = userMap[tx.to.id];
            if (cashier && cashier.profile?.firstName) {
                updatedTx.toName = `Cashier (${cashier.profile.firstName} ${cashier.profile.lastName})`;
            }
        } else if (tx.to?.type === 'machine' && tx.to.id) {
            const machine = machineMap[tx.to.id];
            if (machine) {
                const sn = machine.serialNumber?.trim();
                const name = machine.custom?.name?.trim();
                updatedTx.toName = `Machine (${sn || name || tx.to.id})`;
            } else {
                updatedTx.toName = `Machine (${tx.to.id})`;
            }
        }

        // 4. Populate machineDetails for details modal (BR-03 compliance)
        const allAssociatedMachineIds = new Set<string>();
        if (tx.from?.type === 'machine' && tx.from.id) allAssociatedMachineIds.add(tx.from.id);
        if (tx.to?.type === 'machine' && tx.to.id) allAssociatedMachineIds.add(tx.to.id);
        if (tx.expenseDetails?.machineIds?.length > 0) {
            tx.expenseDetails.machineIds.forEach((id: string) => allAssociatedMachineIds.add(id));
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
    finalTransactions.forEach((tx: any) => {
        if (tx.expenseDetails && tx.expenseDetails.machineIds) {
            delete tx.expenseDetails.machineIds;
        }
    });

    // ============================================================================
    // STEP 5: Return success response
    // ============================================================================
    return NextResponse.json({
      success: true,
      items: finalTransactions,
      transactions: finalTransactions, // Keep for backward compatibility
      total,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
