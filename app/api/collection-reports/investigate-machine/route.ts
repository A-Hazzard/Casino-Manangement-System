import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../lib/middleware/db';
import { Collections } from '../../lib/models/collections';
import { Machine } from '../../lib/models/machines';

// Type for machine document with collectionMetersHistory
type MachineWithHistory = {
  _id: string;
  serialNumber?: string;
  origSerialNumber?: string;
  custom?: { name?: string };
  collectionMetersHistory: Array<{
    _id: string;
    metersIn: number;
    metersOut: number;
    prevMetersIn?: number;
    prevMetersOut?: number;
    prevIn?: number;
    prevOut?: number;
    timestamp: Date;
    locationReportId?: string;
  }>;
};

// Type for history analysis entry
type HistoryAnalysisEntry = {
  entryIndex: number;
  entryId: string;
  metersIn: number;
  metersOut: number;
  prevMetersIn?: number;
  prevMetersOut?: number;
  prevIn?: number;
  prevOut?: number;
  timestamp: Date;
  locationReportId?: string;
  issues: string[];
};

// Type for machine investigation result
type MachineInvestigationResult =
  | {
      machineId: string;
      machineSerialNumber?: string;
      totalCollections: number;
      totalHistoryEntries: number;
      historyAnalysis: HistoryAnalysisEntry[];
      issues: HistoryAnalysisEntry[];
      summary: {
        totalIssues: number;
        fieldNameIssues: number;
        prevMetersIssues: number;
      };
    }
  | {
      machineId: string;
      error: string;
    };
import { CollectionReport } from '../../lib/models/collectionReport';
import { getUserIdFromServer, getUserById } from '../../lib/helpers/users';

/**
 * POST /api/collection-reports/investigate-machine
 * Deep diagnostic endpoint for investigating machine data lineage and issues
 *
 * Author: Aaron Hazzard - Senior Software Engineer
 * Last Updated: January 17th, 2025
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    console.warn('🔍 Starting machine investigation...');

    const body = await request.json().catch(() => ({}));
    const { machineId, reportId } = body;

    // Check authentication (skip in development)
    if (process.env.NODE_ENV === 'development') {
      console.warn('🔍 Skipping authentication in development mode');
    } else {
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
        !user.roles?.includes('evolution admin')
      ) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
    }

    if (reportId) {
      // Investigate all machines in a report
      return await investigateReportMachines(reportId);
    } else if (machineId) {
      // Investigate specific machine
      return await investigateSpecificMachine(machineId);
    } else {
      return NextResponse.json(
        { error: 'Either machineId or reportId is required' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error investigating machine:', error);
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

/**
 * Investigate a specific machine's data lineage
 */
async function investigateSpecificMachine(machineId: string) {
  console.warn(`🔍 Investigating machine: ${machineId}`);

  // Get machine document
  const machine = (await Machine.findById(
    machineId
  ).lean()) as MachineWithHistory | null;
  if (!machine) {
    return NextResponse.json({ error: 'Machine not found' }, { status: 404 });
  }

  // Get all collections for this machine, sorted by timestamp
  const collections = await Collections.find({
    machineId: machineId,
    $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
  })
    .sort({ timestamp: 1 })
    .lean();

  console.warn(
    `📊 Found ${collections.length} collections for machine ${machineId}`
  );

  // Analyze collectionMetersHistory
  const history = machine.collectionMetersHistory || [];
  const historyAnalysis: HistoryAnalysisEntry[] = [];
  const issues: HistoryAnalysisEntry[] = [];

  for (let i = 0; i < history.length; i++) {
    const entry = history[i];
    const analysis: HistoryAnalysisEntry = {
      entryIndex: i,
      entryId: entry._id,
      metersIn: entry.metersIn,
      metersOut: entry.metersOut,
      prevMetersIn: entry.prevMetersIn,
      prevMetersOut: entry.prevMetersOut,
      prevIn: entry.prevIn, // Check if this field exists
      prevOut: entry.prevOut, // Check if this field exists
      timestamp: entry.timestamp,
      locationReportId: entry.locationReportId,
      issues: [],
    };

    // Check for field name inconsistencies
    if (entry.prevIn !== undefined || entry.prevOut !== undefined) {
      analysis.issues.push(
        "Uses 'prevIn/prevOut' instead of 'prevMetersIn/prevMetersOut'"
      );
    }

    // Check for zero/undefined prevMeters values
    if (i > 0) {
      const prevEntry = history[i - 1];
      const expectedPrevIn = prevEntry?.metersIn || 0;
      const expectedPrevOut = prevEntry?.metersOut || 0;

      if (
        (entry.prevMetersIn === 0 ||
          entry.prevMetersIn === undefined ||
          entry.prevMetersIn === null) &&
        (entry.prevMetersOut === 0 ||
          entry.prevMetersOut === undefined ||
          entry.prevMetersOut === null)
      ) {
        analysis.issues.push(
          `prevMetersIn/Out are 0/undefined but should be ${expectedPrevIn}/${expectedPrevOut}`
        );
      } else if (
        entry.prevMetersIn !== expectedPrevIn ||
        entry.prevMetersOut !== expectedPrevOut
      ) {
        analysis.issues.push(
          `prevMetersIn/Out mismatch: expected ${expectedPrevIn}/${expectedPrevOut}, got ${entry.prevMetersIn}/${entry.prevMetersOut}`
        );
      }
    }

    if (analysis.issues.length > 0) {
      issues.push(analysis);
    }

    historyAnalysis.push(analysis);
  }

  // Match collections with history entries
  const collectionMatches = [];
  for (const collection of collections) {
    const matchingHistoryEntry = history.find(
      entry =>
        entry.metersIn === collection.metersIn &&
        entry.metersOut === collection.metersOut &&
        Math.abs(
          new Date(entry.timestamp).getTime() -
            new Date(collection.timestamp).getTime()
        ) < 60000 // Within 1 minute
    );

    collectionMatches.push({
      collectionId: collection._id,
      collectionTimestamp: collection.timestamp,
      collectionMetersIn: collection.metersIn,
      collectionMetersOut: collection.metersOut,
      collectionPrevIn: collection.prevIn,
      collectionPrevOut: collection.prevOut,
      matchingHistoryEntry: matchingHistoryEntry
        ? {
            entryId: matchingHistoryEntry._id,
            prevMetersIn: matchingHistoryEntry.prevMetersIn,
            prevMetersOut: matchingHistoryEntry.prevMetersOut,
            prevIn: matchingHistoryEntry.prevIn,
            prevOut: matchingHistoryEntry.prevOut,
          }
        : null,
      issues: [],
    });
  }

  return NextResponse.json({
    success: true,
    machineId: machineId,
    machineSerialNumber:
      machine.serialNumber || machine.origSerialNumber || machine.custom?.name,
    totalCollections: collections.length,
    totalHistoryEntries: history.length,
    historyAnalysis: historyAnalysis,
    collectionMatches: collectionMatches,
    issues: issues,
    summary: {
      totalIssues: issues.length,
      fieldNameIssues: issues.filter((i: HistoryAnalysisEntry) =>
        i.issues.some((issue: string) => issue.includes('prevIn/prevOut'))
      ).length,
      prevMetersIssues: issues.filter((i: HistoryAnalysisEntry) =>
        i.issues.some((issue: string) => issue.includes('prevMeters'))
      ).length,
    },
  });
}

/**
 * Investigate all machines in a report
 */
async function investigateReportMachines(reportId: string) {
  console.warn(`🔍 Investigating all machines in report: ${reportId}`);

  // Find collection report
  const collectionReport = await CollectionReport.findOne({
    locationReportId: reportId,
  });

  if (!collectionReport) {
    return NextResponse.json(
      { error: 'Collection report not found' },
      { status: 404 }
    );
  }

  // Find all collections for this report
  const collections = await Collections.find({
    locationReportId: reportId,
  }).lean();

  if (collections.length === 0) {
    return NextResponse.json({
      success: true,
      reportId: reportId,
      totalCollections: 0,
      machineInvestigations: [],
      summary: {
        totalMachines: 0,
        totalIssues: 0,
      },
    });
  }

  // Group collections by machineId
  const collectionsByMachine = new Map();
  for (const collection of collections) {
    const machineId = collection.machineId;
    if (!collectionsByMachine.has(machineId)) {
      collectionsByMachine.set(machineId, []);
    }
    collectionsByMachine.get(machineId).push(collection);
  }

  console.warn(
    `📊 Found collections for ${collectionsByMachine.size} machines`
  );

  // Investigate each machine
  const machineInvestigations = [];
  let totalIssues = 0;

  for (const [machineId, machineCollections] of collectionsByMachine) {
    try {
      const investigation = await investigateSpecificMachineInternal(
        machineId,
        machineCollections
      );
      machineInvestigations.push(investigation);
      totalIssues += investigation.summary.totalIssues;
    } catch (error) {
      console.error(`Error investigating machine ${machineId}:`, error);
      machineInvestigations.push({
        machineId: machineId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return NextResponse.json({
    success: true,
    reportId: reportId,
    reportName: collectionReport.location,
    reportTimestamp: collectionReport.timestamp,
    totalCollections: collections.length,
    machineInvestigations: machineInvestigations,
    summary: {
      totalMachines: collectionsByMachine.size,
      totalIssues: totalIssues,
      machinesWithIssues: machineInvestigations.filter(
        (m: MachineInvestigationResult) =>
          'summary' in m && m.summary.totalIssues > 0
      ).length,
    },
  });
}

/**
 * Internal function to investigate a specific machine (used by both endpoints)
 */
async function investigateSpecificMachineInternal(
  machineId: string,
  collections: Array<{
    _id: string;
    metersIn: number;
    metersOut: number;
    timestamp: Date;
    machineId: string;
  }>
) {
  // Get machine document
  const machine = (await Machine.findById(
    machineId
  ).lean()) as MachineWithHistory | null;
  if (!machine) {
    throw new Error('Machine not found');
  }

  // Analyze collectionMetersHistory
  const history = machine.collectionMetersHistory || [];
  const historyAnalysis: HistoryAnalysisEntry[] = [];
  const issues: HistoryAnalysisEntry[] = [];

  for (let i = 0; i < history.length; i++) {
    const entry = history[i];
    const analysis = {
      entryIndex: i,
      entryId: entry._id,
      metersIn: entry.metersIn,
      metersOut: entry.metersOut,
      prevMetersIn: entry.prevMetersIn,
      prevMetersOut: entry.prevMetersOut,
      prevIn: entry.prevIn,
      prevOut: entry.prevOut,
      timestamp: entry.timestamp,
      locationReportId: entry.locationReportId,
      issues: [] as string[],
    };

    // Check for field name inconsistencies
    if (entry.prevIn !== undefined || entry.prevOut !== undefined) {
      analysis.issues.push(
        "Uses 'prevIn/prevOut' instead of 'prevMetersIn/prevMetersOut'"
      );
    }

    // Check for zero/undefined prevMeters values
    if (i > 0) {
      const prevEntry = history[i - 1];
      const expectedPrevIn = prevEntry?.metersIn || 0;
      const expectedPrevOut = prevEntry?.metersOut || 0;

      if (
        (entry.prevMetersIn === 0 ||
          entry.prevMetersIn === undefined ||
          entry.prevMetersIn === null) &&
        (entry.prevMetersOut === 0 ||
          entry.prevMetersOut === undefined ||
          entry.prevMetersOut === null)
      ) {
        analysis.issues.push(
          `prevMetersIn/Out are 0/undefined but should be ${expectedPrevIn}/${expectedPrevOut}`
        );
      } else if (
        entry.prevMetersIn !== expectedPrevIn ||
        entry.prevMetersOut !== expectedPrevOut
      ) {
        analysis.issues.push(
          `prevMetersIn/Out mismatch: expected ${expectedPrevIn}/${expectedPrevOut}, got ${entry.prevMetersIn}/${entry.prevMetersOut}`
        );
      }
    }

    if (analysis.issues.length > 0) {
      issues.push(analysis);
    }

    historyAnalysis.push(analysis);
  }

  return {
    machineId: machineId,
    machineSerialNumber:
      machine.serialNumber || machine.origSerialNumber || machine.custom?.name,
    totalCollections: collections.length,
    totalHistoryEntries: history.length,
    historyAnalysis: historyAnalysis,
    issues: issues,
    summary: {
      totalIssues: issues.length,
      fieldNameIssues: issues.filter((i: HistoryAnalysisEntry) =>
        i.issues.some((issue: string) => issue.includes('prevIn/prevOut'))
      ).length,
      prevMetersIssues: issues.filter((i: HistoryAnalysisEntry) =>
        i.issues.some((issue: string) => issue.includes('prevMeters'))
      ).length,
    },
  };
}
