/**
 * Cabinet Raw Meters API Route
 *
 * Developer-only endpoint that returns all Meter documents for a machine,
 * including archived ones (bypasses soft-delete pre-hook).
 *
 * @module app/api/cabinets/[cabinetId]/meters/route
 *
 * Features:
 * - Returns all meters for a machine sorted by readAt desc (then _id desc)
 * - Optional startDate/endDate date range filtering
 * - Free-text `search` seek: resolves the page holding the first match so the
 *   UI can hop straight to it (mirrors the activity-log cursor seek)
 * - Bypasses soft-delete to include archived meters
 * - Restricted to developer role only
 * - Export mode (?export=true&format=csv|json) returns all matching documents as CSV or JSON
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { resolveMeterMatch, type MatchMode } from '@/app/api/lib/helpers/metersSearch';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Meters } from '@/app/api/lib/models/meters';
import { NextRequest, NextResponse } from 'next/server';

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const PREFERRED_COL_ORDER = [
  '_id',
  'meterSource',
  'isRamClear',
  'isSupplemental',
  'drop',
  'totalCancelledCredits',
  'coinIn',
  'coinOut',
  'jackpot',
  'currentCredits',
  'gamesPlayed',
  'gamesWon',
  'totalWonCredits',
  'totalHandPaidCancelledCredits',
  'locationSession',
  'createdAt',
  'updatedAt',
  'deletedAt',
];

function exportCsv(
  allMeters: Record<string, unknown>[],
  searchParams: URLSearchParams,
  cabinetId: string
): NextResponse {
  const columnsParam = searchParams.get('columns');
  const columns = columnsParam ? columnsParam.split(',') : PREFERRED_COL_ORDER;

  const csvRows: string[] = [];
  csvRows.push(columns.map(c => escapeCsv(c)).join(','));

  for (const meter of allMeters) {
    const row = columns.map(col => {
      if (col.startsWith('movement.')) {
        const sub = col.slice('movement.'.length);
        return escapeCsv((meter.movement as Record<string, unknown> | undefined)?.[sub]);
      }
      return escapeCsv(meter[col]);
    });
    csvRows.push(row.join(','));
  }

  const csvContent = '\uFEFF' + csvRows.join('\r\n');

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="meters-${cabinetId}-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}

/**
 * GET /api/cabinets/[cabinetId]/meters
 *
 * Flow:
 * 1. Authenticate — developer role required
 * 2. Parse params (date range, apiPage, search)
 * 3. Connect to DB
 * 4. Resolve search seek — when `search` is set, find the Nth match's global
 *    index (+ total match count) and override apiPage to the batch holding it
 * 5. Query meters + total via raw collection (bypasses soft-delete pre-hook)
 * 6. Return sorted results with pagination + match metadata
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ cabinetId: string }> }
) {
  return withApiAuth(req, async ({ userRoles }) => {
    const startTime = Date.now();

    // ============================================================================
    // STEP 1: Enforce developer-only access
    // ============================================================================
    const isDeveloper = userRoles?.includes('developer');
    if (!isDeveloper) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // ============================================================================
    // STEP 2: Parse params
    // ============================================================================
    const { cabinetId } = await params;
    if (!cabinetId) {
      return NextResponse.json({ success: false, error: 'cabinetId required' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const search = (searchParams.get('search') || '').trim();
    const searchColumn = (searchParams.get('searchColumn') || '').trim();
    const matchOrdinal = Math.max(0, parseInt(searchParams.get('matchOrdinal') || '0'));
    const matchModeParam = searchParams.get('matchMode');
    const matchMode: MatchMode = matchModeParam === 'exact' ? 'exact' : 'contains';
    const requestedApiPage = Math.max(1, parseInt(searchParams.get('apiPage') || '1'));

    const isExport = searchParams.get('export') === 'true';
    const exportFormat = (searchParams.get('format') || 'csv') as 'csv' | 'json';

    const dateField = searchParams.get('dateField') || 'readAt';
    const dateFilter: Record<string, unknown> = {};
    if (startDateParam || endDateParam) {
      dateFilter[dateField] = {};
      if (startDateParam) (dateFilter[dateField] as Record<string, unknown>).$gte = new Date(startDateParam);
      if (endDateParam) (dateFilter[dateField] as Record<string, unknown>).$lte = new Date(endDateParam);
    }

    const baseFilter = { machine: cabinetId, ...dateFilter };

    // ============================================================================
    // STEP 3: Connect — raw collection bypasses soft-delete pre-hook
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 4: Export mode — fetch ALL matching docs, return CSV or JSON
    // ============================================================================
    if (isExport) {
      const allMeters = await Meters.collection
        .find(baseFilter)
        .sort({ readAt: -1, _id: -1 })
        .toArray();

      return exportFormat === 'json'
        ? NextResponse.json({ success: true, total: allMeters.length, data: allMeters })
        : exportCsv(allMeters, searchParams, cabinetId);
    }

    const BATCH_SIZE = 100;

    // ============================================================================
    // STEP 5: Resolve search seek — locate the Nth match, seek to its batch
    // ============================================================================
    let apiPage = requestedApiPage;
    let matchIndex = -1;
    let matchCount = 0;

    if (search) {
      const result = await resolveMeterMatch(
        baseFilter,
        search,
        searchColumn,
        matchOrdinal,
        matchMode
      );
      matchIndex = result.matchIndex;
      matchCount = result.matchCount;
      if (result.matched) {
        apiPage = Math.floor(result.matchIndex / BATCH_SIZE) + 1;
      }
    }

    // ============================================================================
    // STEP 6: Query the resolved batch + total
    //
    // All Time (no date filter): skip the expensive countDocuments scan.
    // Fetch BATCH_SIZE+1 rows and derive hasMore from the extra row.
    // Returns total: null so the UI shows rolling pagination instead of a fixed
    // "of N" total computed from a full-collection count.
    // ============================================================================
    const skip = (apiPage - 1) * BATCH_SIZE;
    const isAllTime = !startDateParam && !endDateParam;

    let data: Record<string, unknown>[];
    let total: number | null;
    let hasMore: boolean;

    if (isAllTime) {
      const rawMeters = await Meters.collection
        .find(baseFilter)
        .sort({ readAt: -1, _id: -1 })
        .skip(skip)
        .limit(BATCH_SIZE + 1)
        .toArray();

      hasMore = rawMeters.length > BATCH_SIZE;
      data = hasMore ? rawMeters.slice(0, BATCH_SIZE) : rawMeters;
      total = null;
    } else {
      const [rawMeters, totalCount] = await Promise.all([
        Meters.collection
          .find(baseFilter)
          .sort({ readAt: -1, _id: -1 })
          .skip(skip)
          .limit(BATCH_SIZE)
          .toArray(),
        Meters.collection.countDocuments(baseFilter),
      ]);
      data = rawMeters;
      total = totalCount;
      hasMore = skip + rawMeters.length < totalCount;
    }

    if (Date.now() - startTime > 1000) {
      console.warn(`[GET /api/cabinets/${cabinetId}/meters] Slow response: ${Date.now() - startTime}ms`);
    }

    // ============================================================================
    // STEP 7: Return
    // ============================================================================
    return NextResponse.json({
      success: true,
      data,
      total,
      apiPage,
      hasMore,
      matchIndex,
      matchCount,
    });
  });
}
