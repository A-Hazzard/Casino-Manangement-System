/**
 * Collectors API Route
 *
 * This route handles fetching paginated collectors.
 * It supports:
 * - Licensee-based filtering
 * - Pagination
 *
 * @module app/api/collectors/route
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { getCollectorsPaginated } from '@/lib/helpers/collectionReport';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching collectors
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse query parameters (licensee, page, limit)
 * 3. Fetch paginated collectors
 * 4. Return collectors list
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(req.url);
    const licencee = searchParams.get('licencee') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10); // Default limit to 10

    // ============================================================================
    // STEP 3: Fetch paginated collectors
    // ============================================================================
    const collectors = await getCollectorsPaginated(page, limit, licencee);

    // ============================================================================
    // STEP 4: Return collectors list
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Collectors API] Completed in ${duration}ms`);
    }

    return NextResponse.json(collectors);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch collectors';
    console.error(`[Collectors API] Error after ${duration}ms:`, errorMessage);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
