import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../lib/middleware/db';
import { Collections } from '../../lib/models/collections';
import { CollectionReport } from '../../lib/models/collectionReport';
import { Machine } from '../../lib/models/machines';
import { getUserIdFromServer, getUserById } from '../../lib/helpers/users';
import { HistoryEntry } from '@/lib/types/fixReport';

/**
 * Investigation API for Collection Report Issues
 *
 * This endpoint investigates the most recent collection report and identifies
 * all issues with SAS times, history, and prevIn/prevOut values.
 *
 * Author: Aaron Hazzard - Senior Software Engineer
 * Last Updated: January 17th, 2025
 */
export async function GET(_request: NextRequest) {
  try {
    await connectDB();
    console.warn('🔍 Starting collection report investigation...');

    // Check authentication
    if (process.env.NODE_ENV !== 'development') {
      const userId = await getUserIdFromServer();
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const user = await getUserById(userId);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (
        !user.roles?.includes('admin') &&
        !user.roles?.includes('developer')
      ) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
    }

    // Get the most recent collection report
    const mostRecentReport = await CollectionReport.findOne({})
      .sort({ timestamp: -1 })
      .lean();

    if (!mostRecentReport) {
      return NextResponse.json(
        { error: 'No collection reports found' },
        { status: 404 }
      );
    }

    console.warn(
      `📊 Investigating Report: ${mostRecentReport.locationReportId}`
    );
    console.warn(`   Location: ${mostRecentReport.locationName}`);
    console.warn(`   Date: ${mostRecentReport.timestamp}`);
    console.warn(`   Collector: ${mostRecentReport.collectorName}`);

    // Get all collections for this report
    const reportCollections = await Collections.find({
      locationReportId: mostRecentReport.locationReportId,
    })
      .sort({ timestamp: 1 })
      .lean();

    console.warn(
      `📋 Found ${reportCollections.length} collections in this report`
    );

    const issues = [];
    const machinesWithIssues = new Set();

    // Investigate each collection
    for (const collection of reportCollections) {
      console.warn(`\n🔍 Investigating Collection: ${collection._id}`);
      console.warn(`   Machine: ${collection.machineId}`);
      console.warn(
        `   Meters In: ${collection.metersIn}, Out: ${collection.metersOut}`
      );
      console.warn(
        `   Prev In: ${collection.prevIn}, Prev Out: ${collection.prevOut}`
      );

      const collectionIssues = [];

      // 1. Check SAS Times Issues
      if (collection.sasMeters) {
        const sasStart = new Date(collection.sasMeters.sasStartTime);
        const sasEnd = new Date(collection.sasMeters.sasEndTime);

        if (sasStart >= sasEnd) {
          collectionIssues.push({
            type: 'SAS_TIMES_INVERTED',
            description: 'SAS start time is after or equal to end time',
            details: {
              sasStartTime: collection.sasMeters.sasStartTime,
              sasEndTime: collection.sasMeters.sasEndTime,
            },
          });
        }

        // Check for missing SAS times
        if (
          !collection.sasMeters.sasStartTime ||
          !collection.sasMeters.sasEndTime
        ) {
          collectionIssues.push({
            type: 'SAS_TIMES_MISSING',
            description: 'SAS start or end time is missing',
            details: {
              sasStartTime: collection.sasMeters.sasStartTime,
              sasEndTime: collection.sasMeters.sasEndTime,
            },
          });
        }
      } else {
        collectionIssues.push({
          type: 'SAS_METERS_MISSING',
          description: 'SAS meters data is completely missing',
          details: {},
        });
      }

      // 2. Check Movement Calculation Issues
      if (collection.movement) {
        let expectedMetersInMovement, expectedMetersOutMovement;

        if (collection.ramClear) {
          if (
            collection.ramClearMetersIn !== undefined &&
            collection.ramClearMetersOut !== undefined
          ) {
            expectedMetersInMovement =
              collection.ramClearMetersIn -
              collection.prevIn +
              (collection.metersIn - 0);
            expectedMetersOutMovement =
              collection.ramClearMetersOut -
              collection.prevOut +
              (collection.metersOut - 0);
          } else {
            expectedMetersInMovement = collection.metersIn;
            expectedMetersOutMovement = collection.metersOut;
          }
        } else {
          expectedMetersInMovement = collection.metersIn - collection.prevIn;
          expectedMetersOutMovement = collection.metersOut - collection.prevOut;
        }

        const expectedGross =
          expectedMetersInMovement - expectedMetersOutMovement;

        if (
          Math.abs(collection.movement.metersIn - expectedMetersInMovement) >
            0.01 ||
          Math.abs(collection.movement.metersOut - expectedMetersOutMovement) >
            0.01 ||
          Math.abs(collection.movement.gross - expectedGross) > 0.01
        ) {
          collectionIssues.push({
            type: 'MOVEMENT_CALCULATION_WRONG',
            description: 'Movement calculation does not match expected values',
            details: {
              actual: {
                metersIn: collection.movement.metersIn,
                metersOut: collection.movement.metersOut,
                gross: collection.movement.gross,
              },
              expected: {
                metersIn: expectedMetersInMovement,
                metersOut: expectedMetersOutMovement,
                gross: expectedGross,
              },
            },
          });
        }
      }

      // 3. Check PrevIn/PrevOut Issues
      if (
        collection.prevIn === 0 ||
        collection.prevIn === undefined ||
        collection.prevIn === null ||
        collection.prevOut === 0 ||
        collection.prevOut === undefined ||
        collection.prevOut === null
      ) {
        collectionIssues.push({
          type: 'PREV_METERS_ZERO_OR_UNDEFINED',
          description: 'Previous meter values are 0 or undefined',
          details: {
            prevIn: collection.prevIn,
            prevOut: collection.prevOut,
          },
        });
      }

      // 4. Check Machine History Issues
      const machine = await Machine.findById(collection.machineId).lean();
      if (
        machine &&
        (machine as Record<string, unknown>).collectionMetersHistory
      ) {
        const historyEntry = (
          (machine as Record<string, unknown>)
            .collectionMetersHistory as HistoryEntry[]
        ).find(
          (entry: HistoryEntry) =>
            entry.metersIn === collection.metersIn &&
            entry.metersOut === collection.metersOut &&
            entry.locationReportId === collection.locationReportId
        );

        if (!historyEntry) {
          collectionIssues.push({
            type: 'HISTORY_ENTRY_MISSING',
            description: 'No corresponding history entry found in machine',
            details: {
              machineId: collection.machineId,
              metersIn: collection.metersIn,
              metersOut: collection.metersOut,
              locationReportId: collection.locationReportId,
            },
          });
        } else {
          // Check if history entry has correct prevIn/prevOut
          if (
            historyEntry.prevMetersIn !== collection.prevIn ||
            historyEntry.prevMetersOut !== collection.prevOut
          ) {
            collectionIssues.push({
              type: 'HISTORY_PREV_METERS_MISMATCH',
              description:
                'History entry prevIn/prevOut does not match collection',
              details: {
                collection: {
                  prevIn: collection.prevIn,
                  prevOut: collection.prevOut,
                },
                history: {
                  prevIn: historyEntry.prevMetersIn,
                  prevOut: historyEntry.prevMetersOut,
                },
              },
            });
          }
        }
      }

      if (collectionIssues.length > 0) {
        issues.push({
          collectionId: collection._id,
          machineId: collection.machineId,
          issues: collectionIssues,
        });
        machinesWithIssues.add(collection.machineId);
      }
    }

    // Summary
    const summary = {
      reportId: mostRecentReport.locationReportId,
      reportDetails: {
        locationName: mostRecentReport.locationName,
        timestamp: mostRecentReport.timestamp,
        collectorName: mostRecentReport.collectorName,
      },
      totalCollections: reportCollections.length,
      collectionsWithIssues: issues.length,
      machinesWithIssues: machinesWithIssues.size,
      issues: issues,
    };

    console.warn(`\n📊 INVESTIGATION SUMMARY:`);
    console.warn(`   Report ID: ${summary.reportId}`);
    console.warn(`   Total Collections: ${summary.totalCollections}`);
    console.warn(
      `   Collections with Issues: ${summary.collectionsWithIssues}`
    );
    console.warn(`   Machines with Issues: ${summary.machinesWithIssues}`);

    return NextResponse.json({
      success: true,
      summary: summary,
    });
  } catch (error) {
    console.error('❌ Investigation failed:', error);
    return NextResponse.json(
      {
        error: 'Investigation failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
