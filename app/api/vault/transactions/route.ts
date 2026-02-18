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
