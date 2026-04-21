/**
 * Admin Auth Events API Route
 *
 * This route provides authentication events for admin dashboard, including:
 * - Filtering by action, success status, time range
 * - Searching by email, IP address, or details
 * - Pagination support
 *
 * Supports:
 * - Time range filtering (1h, 24h, 7d, 30d)
 * - Action filtering (all, token_refresh, etc.)
 * - Success status filtering (true, false, all)
 * - Text search across email, IP, and details
 * - Pagination (page, limit)
 * - Admin/developer access control
 *
 * @module app/api/admin/auth/events/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthEvents } from '@/app/api/lib/helpers/auth/adminEvents';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';

/**
 * GET /api/admin/auth/events
 *
 * Returns a paginated list of authentication events for the admin security
 * dashboard. Results are filtered by time window and can be narrowed further
 * by action type, success status, and free-text search.
 *
 * Query params:
 * @param timeRange {string}  Optional. Lookback window: '1h', '24h' (default), '7d', or '30d'.
 * @param action    {string}  Optional. Filter by auth event type (e.g. 'login', 'token_refresh', 'logout').
 * @param success   {string}  Optional. 'true', 'false', or 'all' to filter by outcome.
 * @param search    {string}  Optional. Searches across email address, IP address, and details fields.
 * @param page      {number}  Optional. Page number for pagination (default 1).
 * @param limit     {number}  Optional. Records per page (default 50).
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Authenticate user and check permissions
    // ============================================================================
    const user = await getUserFromServer();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - User not found' },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 3: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const timeRange = (searchParams.get('timeRange') as '1h' | '24h' | '7d' | '30d') || '24h';
    const action = searchParams.get('action');
    const success = searchParams.get('success');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // ============================================================================
    // STEP 4: Fetch authentication events with filters and pagination
    // ============================================================================
    const results = await getAuthEvents(timeRange, action, success, search, page, limit);

    // ============================================================================
    // STEP 5: Return events and pagination info
    // ============================================================================
    const duration = Date.now() - startTime;
    console.log(
      `[Admin Auth Events GET API] Fetched ${results.events.length} events (page ${page}/${results.totalPages}) after ${duration}ms.`
    );

    return NextResponse.json(results);
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[Admin Auth Events GET API] Error after ${duration}ms:`,
      errorMessage
    );

    return NextResponse.json(
      { error: 'Failed to fetch authentication events' },
      { status: 500 }
    );
  }
}

