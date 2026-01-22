/**
 * End of Day API Route
 *
 * This route handles end of day report operations.
 * It supports:
 * - Getting end of day report data
 * - Generating and exporting end of day reports
 *
 * @module app/api/vault/end-of-day/route
 */

import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { canManageTransactions } from '@/app/api/lib/helpers/vault/authorization';
import {
  exportReportToCSV,
  generateEndOfDayReport,
} from '@/app/api/lib/helpers/vault/endOfDay';
import { connectDB } from '@/app/api/lib/middleware/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get('locationId');
    const dateStr = searchParams.get('date');
    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }
    const user = await getUserFromServer();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!locationId || !dateStr) {
      return NextResponse.json(
        { error: 'locationId and date are required' },
        { status: 400 }
      );
    }
    const userPayload = user as {
      _id: string;
      assignedLocations?: string[];
      roles?: string[];
    };
    const canManage = await canManageTransactions(userPayload, locationId);
    if (!canManage) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      );
    }
    const date = new Date(dateStr);
    const report = await generateEndOfDayReport(locationId, date);
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[End of Day API] Completed in ${duration}ms`);
    }
    return NextResponse.json({ success: true, data: report });
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[End of Day API] Failed after ${duration}ms:`, err);
    const errorMessage = err instanceof Error ? err.message : 'Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = (await req.json()) as {
      locationId: string;
      date: string;
      format?: 'CSV' | 'PDF' | 'Excel';
    };
    if (!body.locationId || !body.date) {
      return NextResponse.json(
        { error: 'locationId and date are required' },
        { status: 400 }
      );
    }
    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }
    const user = await getUserFromServer();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userPayload = user as {
      _id: string;
      assignedLocations?: string[];
      roles?: string[];
    };
    const canManage = await canManageTransactions(userPayload, body.locationId);
    if (!canManage) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      );
    }
    const date = new Date(body.date);
    const report = await generateEndOfDayReport(
      body.locationId,
      date
    );
    const format = body.format || 'CSV';
    if (format === 'CSV') {
      const csv = exportReportToCSV(report);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="end-of-day-${body.locationId}-${body.date}.csv"`,
        },
      });
    }
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[End of Day Export API] Completed in ${duration}ms`);
    }
    return NextResponse.json({ success: true, data: report });
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[End of Day Export API] Failed after ${duration}ms:`, err);
    const errorMessage = err instanceof Error ? err.message : 'Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
