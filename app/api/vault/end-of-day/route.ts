/**
 * End of Day API Route
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { canManageTransactions } from '@/app/api/lib/helpers/vault/authorization';
import {
  exportReportToCSV,
  generateEndOfDayReport,
} from '@/app/api/lib/helpers/vault/endOfDay';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for end-of-day reports
 *
 * @param {string} locationId - ID of the location (REQUIRED)
 * @param {string} date - ISO date string for the report (REQUIRED)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/vault/end-of-day';
  const logUser = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user }) => {
    try {
      const { searchParams } = new URL(request.url);
      const locId = searchParams.get('locationId'),
        dateStr = searchParams.get('date');
      if (!locId || !dateStr) {
        logRouteError(
          functionName,
          'GET',
          '/api/vault/end-of-day',
          'locationId and date required',
          logUser
        );
        return NextResponse.json(
          { error: 'locationId and date required' },
          { status: 400 }
        );
      }

      if (
        !(await canManageTransactions(
          user as unknown as {
            _id: string;
            assignedLicencees?: string[];
            assignedLocations?: string[];
            multiplier?: number;
          },
          locId
        ))
      ) {
        logRouteError(
          functionName,
          'GET',
          '/api/vault/end-of-day',
          'Forbidden',
          logUser
        );
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const report = await generateEndOfDayReport(locId, new Date(dateStr));
      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/vault/end-of-day',
        1,
        logUser,
        duration
      );
      return NextResponse.json({ success: true, data: report });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Failed to generate end-of-day report';
      logRouteError(
        functionName,
        'GET',
        '/api/vault/end-of-day',
        errorMessage,
        logUser
      );
      console.error(
        '[EndOfDay GET] Error:',
        e instanceof Error ? e.message : 'Unknown error'
      );
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/vault/end-of-day
 *
 * @body {string} locationId - ID of the location (REQUIRED)
 * @body {string} date - ISO date string for the report (REQUIRED)
 * @body {string} format - Distribution format (e.g., 'CSV')
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/vault/end-of-day';
  const logUser = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user }) => {
    try {
      const {
        locationId,
        date: dateStr,
        format = 'CSV',
      } = await request.json();
      if (!locationId || !dateStr) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/end-of-day',
          'locationId and date required',
          logUser
        );
        return NextResponse.json(
          { error: 'locationId and date required' },
          { status: 400 }
        );
      }

      if (
        !(await canManageTransactions(
          user as unknown as {
            _id: string;
            assignedLicencees?: string[];
            assignedLocations?: string[];
            multiplier?: number;
          },
          locationId
        ))
      ) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/end-of-day',
          'Forbidden',
          logUser
        );
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const report = await generateEndOfDayReport(
        locationId,
        new Date(dateStr)
      );
      if (format === 'CSV') {
        const duration = Date.now() - startTime;
        logRouteFetch(
          functionName,
          'POST',
          '/api/vault/end-of-day',
          1,
          logUser,
          duration
        );
        return new NextResponse(exportReportToCSV(report), {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="eod-${locationId}-${dateStr}.csv"`,
          },
        });
      }
      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'POST',
        '/api/vault/end-of-day',
        1,
        logUser,
        duration
      );
      return NextResponse.json({ success: true, data: report });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Failed to export end-of-day report';
      logRouteError(
        functionName,
        'POST',
        '/api/vault/end-of-day',
        errorMessage,
        logUser
      );
      console.error(
        '[EndOfDay POST] Error:',
        e instanceof Error ? e.message : 'Unknown error'
      );
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
