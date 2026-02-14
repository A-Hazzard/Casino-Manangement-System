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

    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'locationId is required' },
        { status: 400 }
      );
    }

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

    if (
      allowedLocationIds !== 'all' &&
      !allowedLocationIds.includes(locationId)
    ) {
      return NextResponse.json(
        { success: false, error: 'Access denied for this location' },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 4: Fetch transactions
    // ============================================================================
    // Build query
    const query: any = { locationId };

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

    // ============================================================================
    // STEP 5: Return success response
    // ============================================================================
    return NextResponse.json({
      success: true,
      items: transactions,
      transactions, // Keep for backward compatibility
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
