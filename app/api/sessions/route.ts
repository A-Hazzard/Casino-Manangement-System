/**
 * Sessions API Route
 *
 * GET /api/sessions
 * Returns paginated machine session records with machine, location, licencee, and member details.
 * Supports search, date filtering, licencee filtering, sorting, and pagination.
 *
 * Flow:
 * 1. Parse query params
 * 2. Build match query (search + date filter)
 * 3. Build base pipeline with lookups and optional licencee filter
 * 4. Count total results
 * 5. Build full pipeline with member lookup, sort, pagination, and projection
 * 6. Return paginated results
 */
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import {
  buildSessionBasePipeline,
  buildSessionFullPipeline,
  buildSessionMatchQuery,
} from '@/app/api/lib/helpers/sessions';
import { MachineSession } from '@/app/api/lib/models/machineSessions';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/sessions
 * Fetches paginated session records with optional search, date, and licencee filters.
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async () => {
    const startTime = Date.now();
    try {
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');
      const search = searchParams.get('search') || '';
      const sortBy = searchParams.get('sortBy') || 'startTime';
      const sortOrder = searchParams.get('sortOrder') || 'desc';
      const licencee = searchParams.get('licencee') || '';
      const dateFilter = searchParams.get('dateFilter') || 'all';
      const startDateParam = searchParams.get('startDate');
      const endDateParam = searchParams.get('endDate');

      // Step 1: Build match query from search and date params
      const matchQuery = buildSessionMatchQuery({ search, dateFilter, startDateParam, endDateParam });

      // Step 2: Build base pipeline with lookups
      const basePipeline = buildSessionBasePipeline(matchQuery, licencee);

      // Step 3: Count total matching documents
      const countResult = await MachineSession.aggregate([...basePipeline, { $count: 'total' }]);
      const totalSessions = countResult[0]?.total || 0;

      // Step 4: Build full pipeline with member lookup, sort, pagination, projection
      const fullPipeline = buildSessionFullPipeline(basePipeline, { sortBy, sortOrder, page, limit, search });
      const sessions = await MachineSession.aggregate(fullPipeline);

      const duration = Date.now() - startTime;
      if (duration > 2000) console.warn(`[Sessions API] Completed in ${duration}ms`);

      return NextResponse.json({
        success: true,
        data: {
          sessions,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalSessions / limit),
            totalSessions,
            hasNextPage: page * limit < totalSessions,
            hasPrevPage: page > 1,
          },
        },
      });
    } catch (error) {
      console.error(`[Sessions API] Error:`, error);
      return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
  });
}
