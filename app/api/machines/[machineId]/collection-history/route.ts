import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../lib/middleware/db';
import { Machine } from '@/app/api/lib/models/machines';
import { v4 as uuidv4 } from 'uuid';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ machineId: string }> }
) {
  try {
    const { machineId } = await params;
    const body = await request.json();
    const { operation, entry, entryId } = body;

    console.warn('Collection history API called:', {
      machineId,
      operation,
      entry: entry
        ? {
            _id: entry._id,
            metersIn: entry.metersIn,
            metersOut: entry.metersOut,
            locationReportId: entry.locationReportId,
          }
        : null,
      entryId,
    });

    if (!machineId) {
      return NextResponse.json(
        { success: false, error: 'Machine ID is required' },
        { status: 400 }
      );
    }

    if (!operation || !['add', 'update', 'delete'].includes(operation)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid operation. Must be 'add', 'update', or 'delete'",
        },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the machine
    const machine = await Machine.findById(machineId);
    if (!machine) {
      return NextResponse.json(
        { success: false, error: 'Machine not found' },
        { status: 404 }
      );
    }

    // Initialize collectionMetersHistory if it doesn't exist
    if (!machine.collectionMetersHistory) {
      machine.collectionMetersHistory = [];
    }

    let updated = false;

    switch (operation) {
      case 'add':
        if (!entry) {
          return NextResponse.json(
            {
              success: false,
              error: "Entry data is required for 'add' operation",
            },
            { status: 400 }
          );
        }

        // Create new collection history entry
        const newEntry = {
          _id: entry._id || uuidv4(),
          metersIn: entry.metersIn,
          metersOut: entry.metersOut,
          prevMetersIn: entry.prevMetersIn,
          prevMetersOut: entry.prevMetersOut,
          timestamp: new Date(entry.timestamp),
          locationReportId: entry.locationReportId,
        };

        machine.collectionMetersHistory.push(newEntry);
        updated = true;
        break;

      case 'update':
        if (!entry || !entryId) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Entry data and entryId are required for 'update' operation",
            },
            { status: 400 }
          );
        }

        // Find and update the existing entry
        const entryIndex = machine.collectionMetersHistory.findIndex(
          (item: { _id: string | { toString(): string } }) =>
            String(item._id) === String(entryId)
        );

        if (entryIndex === -1) {
          return NextResponse.json(
            { success: false, error: 'Collection history entry not found' },
            { status: 404 }
          );
        }

        machine.collectionMetersHistory[entryIndex] = {
          _id: entryId,
          metersIn: entry.metersIn,
          metersOut: entry.metersOut,
          prevMetersIn: entry.prevMetersIn,
          prevMetersOut: entry.prevMetersOut,
          timestamp: new Date(entry.timestamp),
          locationReportId: entry.locationReportId,
        };
        updated = true;
        break;

      case 'delete':
        if (!entryId && !entry.locationReportId) {
          return NextResponse.json(
            {
              success: false,
              error:
                "EntryId or locationReportId is required for 'delete' operation",
            },
            { status: 400 }
          );
        }

        // Remove the entry by entryId or locationReportId
        let deleteIndex = -1;
        if (entryId) {
          // Delete by entry ID
          deleteIndex = machine.collectionMetersHistory.findIndex(
            (item: { _id: string | { toString(): string } }) =>
              String(item._id) === String(entryId)
          );
        } else if (entry.locationReportId) {
          // Delete by locationReportId
          deleteIndex = machine.collectionMetersHistory.findIndex(
            (item: { locationReportId: string }) =>
              String(item.locationReportId) === String(entry.locationReportId)
          );
        }

        if (deleteIndex === -1) {
          return NextResponse.json(
            { success: false, error: 'Collection history entry not found' },
            { status: 404 }
          );
        }

        machine.collectionMetersHistory.splice(deleteIndex, 1);
        updated = true;
        break;
    }

    if (updated) {
      // Save the updated machine
      await machine.save();
      console.warn('Machine collection history updated successfully:', {
        machineId,
        operation,
        newHistoryCount: machine.collectionMetersHistory.length,
        latestEntry:
          machine.collectionMetersHistory[
            machine.collectionMetersHistory.length - 1
          ],
      });
    }

    return NextResponse.json({
      success: true,
      message: `Collection history ${operation} operation completed successfully`,
      data: {
        operation,
        entryId: operation === 'add' ? entry?._id : entryId,
        collectionHistoryCount: machine.collectionMetersHistory.length,
      },
    });
  } catch (error) {
    console.error('Error updating machine collection history:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
