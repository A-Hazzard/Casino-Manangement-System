/**
 * Collection Report Individual Item API Route
 *
 * This route handles operations on a specific collection report.
 * It supports:
 * - GET: Retrieves a single collection report by ID
 * - PATCH: Updates a collection report (validation and editing)
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { CollectionReport } from '@/app/api/lib/models/collectionReport';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest
) {
  return withApiAuth(request, async () => {
    const { pathname } = request.nextUrl;
    const reportId = pathname.split('/').pop();

    try {
      const report = await CollectionReport.findOne({ _id: reportId });

      if (!report) {
        return NextResponse.json(
          { error: 'Collection report not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(report);
    } catch (error) {
      console.error('Error fetching collection report:', error);
      return NextResponse.json(
        { error: 'Failed to fetch collection report' },
        { status: 500 }
      );
    }
  });
}

export async function PATCH(
  request: NextRequest
) {
  return withApiAuth(request, async ({ isAdminOrDev }) => {
    if (!isAdminOrDev) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    try {
      const { pathname } = request.nextUrl;
      const reportId = pathname.split('/').pop();
      const body = await request.json();
      
      // CRITICAL: Do not update the collector field during edit
      delete body.collector;
      delete body.collectorName;

      const updatedReport = await CollectionReport.findOneAndUpdate(
        { _id: reportId },
        { $set: body },
        { new: true }
      );

      if (!updatedReport) {
        return NextResponse.json(
          { error: 'Collection report not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(updatedReport);
    } catch (error) {
      console.error('Error updating collection report:', error);
      return NextResponse.json(
        { error: 'Failed to update collection report' },
        { status: 500 }
      );
    }
  });
}
