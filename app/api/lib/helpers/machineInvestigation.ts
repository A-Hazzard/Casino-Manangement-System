/**
 * Machine Investigation Helpers
 *
 * This module provides functions for deep diagnostic analysis of machine data lineage:
 * - Analyzing collectionMetersHistory for issues (field naming, prevMeters accuracy)
 * - Matching collections with history entries
 * - Investigating individual machines or all machines in a report
 *
 * @module app/api/lib/helpers/machineInvestigation
 */

import type { MachineWithHistory } from '../types';
import { Collections } from '../models/collections';
import { Machine } from '../models/machines';
import { CollectionReport } from '../models/collectionReport';

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

type CollectionDocument = {
  _id: string;
  metersIn: number;
  metersOut: number;
  prevIn: number;
  prevOut: number;
  timestamp: Date;
  machineId?: string;
  locationReportId?: string;
};

export type MachineInvestigationResult = {
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
};

/**
 * Investigate a specific machine's data lineage and history issues
 *
 * Flow:
 * 1. Get machine document and its collectionMetersHistory
 * 2. Get all collections for the machine
 * 3. Analyze history entries for issues (field naming, prevMeters accuracy)
 * 4. Match collections with history entries
 * 5. Return detailed analysis and summary
 *
 * @param machineId - Machine ID to investigate
 * @returns Object containing detailed analysis and issues
 */
export async function investigateSpecificMachine(machineId: string): Promise<{
  success: boolean;
  machineId: string;
  machineSerialNumber?: string;
  totalCollections: number;
  totalHistoryEntries: number;
  historyAnalysis: HistoryAnalysisEntry[];
  collectionMatches: Array<{
    collectionId: string;
    collectionTimestamp: Date;
    collectionMetersIn: number;
    collectionMetersOut: number;
    collectionPrevIn: number;
    collectionPrevOut: number;
    matchingHistoryEntry: {
      entryId: string;
      prevMetersIn?: number;
      prevMetersOut?: number;
      prevIn?: number;
      prevOut?: number;
    } | null;
    issues: string[];
  }>;
  issues: HistoryAnalysisEntry[];
  summary: {
    totalIssues: number;
    fieldNameIssues: number;
    prevMetersIssues: number;
  };
}> {
  console.warn(`🔍 Investigating machine: ${machineId}`);

  // Get machine document
  // CRITICAL: Use findOne with _id instead of findById (repo rule)
  const machine = (await Machine.findOne({ _id: machineId }).lean()) as
    | MachineWithHistory
    | null;
  if (!machine) {
    throw new Error('Machine not found');
  }

  // Get all collections for this machine, sorted by timestamp
  const collections = (await Collections.find({
    machineId: machineId,
    $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
  })
    .sort({ timestamp: 1 })
    .lean()) as CollectionDocument[];

  console.warn(
    `📊 Found ${collections.length} collections for machine ${machineId}`
  );

  // Analyze collectionMetersHistory
  const { historyAnalysis, issues } = analyzeCollectionHistory(
    machine.collectionMetersHistory || []
  );

  // Match collections with history entries
  const collectionMatches = matchCollectionsWithHistory(
    collections,
    machine.collectionMetersHistory || []
  );

  return {
    success: true,
    machineId: machineId,
    machineSerialNumber:
      machine.serialNumber ||
      machine.origSerialNumber ||
      machine.custom?.name,
    totalCollections: collections.length,
    totalHistoryEntries: (machine.collectionMetersHistory || []).length,
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
  };
}

/**
 * Investigate all machines in a report
 *
 * Flow:
 * 1. Find collection report and its collections
 * 2. Group collections by machineId
 * 3. Investigate each machine
 * 4. Return aggregated analysis and summary
 *
 * @param reportId - Collection report ID to investigate
 * @returns Object containing investigations for all machines in the report
 */
export async function investigateReportMachines(reportId: string): Promise<{
  success: boolean;
  reportId: string;
  reportName?: string;
  reportTimestamp?: Date;
  totalCollections: number;
  machineInvestigations: Array<
    MachineInvestigationResult | { machineId: string; error: string }
  >;
  summary: {
    totalMachines: number;
    totalIssues: number;
    machinesWithIssues: number;
  };
}> {
  console.warn(`🔍 Investigating all machines in report: ${reportId}`);

  // Find collection report
  const collectionReport = await CollectionReport.findOne({
    locationReportId: reportId,
  });

  if (!collectionReport) {
    throw new Error('Collection report not found');
  }

  // Find all collections for this report
  const collections = (await Collections.find({
    locationReportId: reportId,
  }).lean()) as CollectionDocument[];

  if (collections.length === 0) {
    return {
      success: true,
      reportId: reportId,
      totalCollections: 0,
      machineInvestigations: [],
      summary: {
        totalMachines: 0,
        totalIssues: 0,
        machinesWithIssues: 0,
      },
    };
  }

  // Group collections by machineId
  const collectionsByMachine = new Map<string, CollectionDocument[]>();
  for (const collection of collections) {
    const machineId = collection.machineId;
    if (!machineId) continue;

    if (!collectionsByMachine.has(machineId)) {
      collectionsByMachine.set(machineId, []);
    }
    collectionsByMachine.get(machineId)?.push(collection);
  }

  console.warn(
    `📊 Found collections for ${collectionsByMachine.size} machines`
  );

  // Investigate each machine
  const machineInvestigations: Array<
    MachineInvestigationResult | { machineId: string; error: string }
  > = [];
  let totalIssues = 0;

  for (const [machineId, machineCollections] of collectionsByMachine) {
    try {
      const investigation = await investigateMachineInternal(
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

  return {
    success: true,
    reportId: reportId,
    reportName: (collectionReport as { location?: string }).location,
    reportTimestamp: (collectionReport as { timestamp?: Date }).timestamp,
    totalCollections: collections.length,
    machineInvestigations: machineInvestigations,
    summary: {
      totalMachines: collectionsByMachine.size,
      totalIssues: totalIssues,
      machinesWithIssues: machineInvestigations.filter(
        (m): m is MachineInvestigationResult =>
          'summary' in m && m.summary.totalIssues > 0
      ).length,
    },
  };
}

/**
 * Internal function to investigate a specific machine (used by both endpoints)
 *
 * @param machineId - Machine ID to investigate
 * @param collections - Array of collection documents for the machine
 * @returns Machine investigation result
 */
async function investigateMachineInternal(
  machineId: string,
  collections: CollectionDocument[]
): Promise<MachineInvestigationResult> {
  // Get machine document
  // CRITICAL: Use findOne with _id instead of findById (repo rule)
  const machine = (await Machine.findOne({ _id: machineId }).lean()) as
    | MachineWithHistory
    | null;
  if (!machine) {
    throw new Error('Machine not found');
  }

  // Analyze collectionMetersHistory
  const { historyAnalysis, issues } = analyzeCollectionHistory(
    machine.collectionMetersHistory || []
  );

  return {
    machineId: machineId,
    machineSerialNumber:
      machine.serialNumber ||
      machine.origSerialNumber ||
      machine.custom?.name,
    totalCollections: collections.length,
    totalHistoryEntries: (machine.collectionMetersHistory || []).length,
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

/**
 * Analyze collectionMetersHistory for issues
 *
 * Checks for:
 * - Field naming inconsistencies (prevIn/prevOut vs prevMetersIn/prevMetersOut)
 * - Zero/undefined prevMeters values where they should have values
 * - Mismatched prevMeters values compared to previous entry
 *
 * @param history - Array of history entries to analyze
 * @returns Object containing full analysis and entries with issues
 */
function analyzeCollectionHistory(
  history: MachineWithHistory['collectionMetersHistory']
): {
  historyAnalysis: HistoryAnalysisEntry[];
  issues: HistoryAnalysisEntry[];
} {
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
      prevIn: entry.prevIn,
      prevOut: entry.prevOut,
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

  return { historyAnalysis, issues };
}

/**
 * Match collections with collectionMetersHistory entries
 *
 * Matches based on:
 * - Same metersIn and metersOut values
 * - Timestamps within 1 minute of each other
 *
 * @param collections - Array of collection documents
 * @param history - Array of history entries
 * @returns Array of collection matches with matching history entry info
 */
function matchCollectionsWithHistory(
  collections: CollectionDocument[],
  history: MachineWithHistory['collectionMetersHistory']
): Array<{
  collectionId: string;
  collectionTimestamp: Date;
  collectionMetersIn: number;
  collectionMetersOut: number;
  collectionPrevIn: number;
  collectionPrevOut: number;
  matchingHistoryEntry: {
    entryId: string;
    prevMetersIn?: number;
    prevMetersOut?: number;
    prevIn?: number;
    prevOut?: number;
  } | null;
  issues: string[];
}> {
  return collections.map(collection => {
    const matchingHistoryEntry = history.find(
      entry =>
        entry.metersIn === collection.metersIn &&
        entry.metersOut === collection.metersOut &&
        Math.abs(
          new Date(entry.timestamp).getTime() -
            new Date(collection.timestamp).getTime()
        ) < 60000 // Within 1 minute
    );

    return {
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
    };
  });
}




