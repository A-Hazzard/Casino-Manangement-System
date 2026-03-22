/**
 * End of Day API Route
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { canManageTransactions } from '@/app/api/lib/helpers/vault/authorization';
import {
  exportReportToCSV,
  generateEndOfDayReport,
} from '@/app/api/lib/helpers/vault/endOfDay';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return withApiAuth(request, async ({ user }) => {
    try {
      const { searchParams } = new URL(request.url);
      const locId = searchParams.get('locationId'),
        dateStr = searchParams.get('date');
      if (!locId || !dateStr)
        return NextResponse.json(
          { error: 'locationId and date required' },
          { status: 400 }
        );

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
      )
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

      const report = await generateEndOfDayReport(locId, new Date(dateStr));
      return NextResponse.json({ success: true, data: report });
    } catch (e: unknown) {
      console.error('[EndOfDay GET] Error:', e);
      const message = e instanceof Error ? e.message : 'Unknown error';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}

export async function POST(request: NextRequest) {
  return withApiAuth(request, async ({ user }) => {
    try {
      const {
        locationId,
        date: dateStr,
        format = 'CSV',
      } = await request.json();
      if (!locationId || !dateStr)
        return NextResponse.json(
          { error: 'locationId and date required' },
          { status: 400 }
        );

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
      )
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

      const report = await generateEndOfDayReport(
        locationId,
        new Date(dateStr)
      );
      if (format === 'CSV') {
        return new NextResponse(exportReportToCSV(report), {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="eod-${locationId}-${dateStr}.csv"`,
          },
        });
      }
      return NextResponse.json({ success: true, data: report });
    } catch (e: unknown) {
      console.error('[EndOfDay POST] Error:', e);
      const message = e instanceof Error ? e.message : 'Unknown error';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
