/**
 * Vault Activity Reports API
 *
 * GET /api/reports/vault-activity
 *
 * Retrieves advanced vault activity reports with filtering.
 *
 * @module app/api/reports/vault-activity/route
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { NextRequest, NextResponse } from 'next/server';

interface VaultActivityQuery {
  locationId?: string;
  startDate?: string;
  endDate?: string;
  type?: string;
  performedBy?: string;
}

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

    // ============================================================================
    // STEP 2: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const query: VaultActivityQuery = {
      locationId: searchParams.get('locationId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      type: searchParams.get('type') || undefined,
      performedBy: searchParams.get('performedBy') || undefined,
    };

    // ============================================================================
    // STEP 3: Database connection
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 4: Build query filters
    // ============================================================================
    const filters: any = {};

    if (query.locationId) {
      filters.locationId = query.locationId;
    }

    if (query.startDate || query.endDate) {
      filters.timestamp = {};
      if (query.startDate) {
        filters.timestamp.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        filters.timestamp.$lte = new Date(query.endDate);
      }
    }

    if (query.type) {
      filters.type = query.type;
    }

    if (query.performedBy) {
      filters.performedBy = query.performedBy;
    }

    // ============================================================================
    // STEP 5: Fetch vault activities
    // ============================================================================
    const activities = await VaultTransactionModel.find(filters)
      .sort({ timestamp: -1 })
      .limit(1000); // Limit results

    // ============================================================================
    // STEP 6: Calculate summary statistics
    // ============================================================================
    const summary = {
      totalTransactions: activities.length,
      totalAmount: activities.reduce((sum, t) => sum + t.amount, 0),
      byType: {} as Record<string, number>,
      byUser: {} as Record<string, number>,
    };

    activities.forEach(activity => {
      // Count by type
      summary.byType[activity.type] = (summary.byType[activity.type] || 0) + 1;

      // Count by user
      summary.byUser[activity.performedBy] =
        (summary.byUser[activity.performedBy] || 0) + 1;
    });

    // ============================================================================
    // STEP 7: Return success response
    // ============================================================================
    return NextResponse.json({
      success: true,
      activities,
      summary,
      filters: query,
    });
  } catch (error) {
    console.error('Error fetching vault activity reports:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
