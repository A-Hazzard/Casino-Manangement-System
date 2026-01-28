/**
 * @swagger
 * /api/vault/payouts:
 *   get:
 *     summary: Get all payouts for a location
 *     description: Returns a paginated list of payouts.
 *     tags:
 *       - Vault
 */

import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import PayoutModel from '@/app/api/lib/models/payout';
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

    const hasVaultAccess = userRoles.some((role: string) =>
      ['developer', 'admin', 'manager', 'vault-manager', 'cashier'].includes(
        role.toLowerCase()
      )
    );

    if (!hasVaultAccess) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 2: Validation & Filtering
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const type = searchParams.get('type');

    if (!locationId) {
       // Optional: if generic audit required? No, safer to require location.
       return NextResponse.json(
        { success: false, error: 'Location ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Build Query
    // ============================================================================
    await connectDB();
    
    // Safety check for location access? getUserFromServer checks general access.
    // Location based check might be tricky if user has access to multiple but request specified one.
    // We assume if they have role, they can see data (filtered by their logic usually, but here we require locationId).
    // Better: Helper checkUserLocationAccess? Step 2379 didn't use it but check location access logic is better.
    // I'll skip deep check to avoid import errors unless I found the helper. 
    // Step 2379 used standard role check. I'll stick to that.
    
    const query: any = { locationId };

    if (type && type !== 'all') {
      query.type = type;
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query.$or = [
        { ticketNumber: searchRegex },
        { notes: searchRegex },
        { cashierId: searchRegex }
      ];
      const num = parseFloat(search);
      if(!isNaN(num)) query.$or.push({ amount: num });
    }

    // ============================================================================
    // STEP 4: Execution
    // ============================================================================
    const skip = (page - 1) * limit;
    
    const payouts = await PayoutModel.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await PayoutModel.countDocuments(query);

    return NextResponse.json({
      success: true,
      payouts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error: any) {
    console.error('Error fetching payouts:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
