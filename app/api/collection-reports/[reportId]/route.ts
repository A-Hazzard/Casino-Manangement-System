/**
 * Collection Report Individual Item API Route
 *
 * This route handles operations on a specific collection report.
 * It supports:
 * - GET: Retrieves a single collection report by ID
 * - PATCH: Updates a collection report (validation and editing)
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { CollectionReport } from '@/app/api/lib/models/collectionReport';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    await connectDB();
    const { reportId } = await params;
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
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    await connectDB();
    const { reportId } = await params;
    const body = await request.json();

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
}
