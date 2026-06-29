/**
 * Variation Mismatch Investigation Script
 *
 * Scans all CollectionReport documents and checks whether stored totalVariation
 * matches a recalculation from stored collection data.
 *
 * Phase 1: Uses stored sasMeters data (no live Meters queries) to check
 *          computation consistency at report-creation time.
 * Phase 2: For mismatches, runs live Meters queries to see if live data
 *          explains the difference.
 *
 * @module scripts/investigate-variation-mismatches
 */

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

const PROD_URI =
  'mongodb://sunny1:87ydaiuhdsia2e@147.182.210.65:32017/sas-prod?authSource=admin';

// ============================================================================
// Models (strict:false + _id:String for string ID compatibility)
// ============================================================================

const CollectionReportModel = mongoose.model(
  'VarReport',
  new mongoose.Schema({ _id: String }, { strict: false, collection: 'collectionreports' })
);

const CollectionsModel = mongoose.model(
  'VarCol',
  new mongoose.Schema({ _id: String }, { strict: false, collection: 'collections' })
);

const MachineModel = mongoose.model(
  'VarMachine',
  new mongoose.Schema({ _id: String }, { strict: false, collection: 'machines' })
);

const GamingLocationsModel = mongoose.model(
  'VarLoc',
  new mongoose.Schema({ _id: String }, { strict: false, collection: 'gaminglocations' })
);

const LicenceeModel = mongoose.model(
  'VarLic',
  new mongoose.Schema({ _id: String }, { strict: false, collection: 'licencees' })
);

// ============================================================================
// Helpers
// ============================================================================

function fmtDate(d: unknown): string {
  if (!d) return '—';
  return new Date(d as string | number | Date).toISOString().slice(0, 19).replace('T', ' ');
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('Connecting to production DB…');
  const conn = await mongoose.connect(PROD_URI);
  const db = conn.connection.db;
  console.log('Connected.\n');

  // ========================================================================
  // PHASE 1: Fetch all reports with totalVariation
  // ========================================================================
  console.log('Phase 1: Fetching reports with totalVariation…');
  const reports = await CollectionReportModel.find(
    { totalVariation: { $exists: true } },
    { locationReportId: 1, totalVariation: 1, locationId: 1, gamingLocation: 1, location: 1, createdAt: 1 }
  ).lean().exec() as Array<Record<string, unknown>>;
  console.log(`  Found ${reports.length} reports.\n`);

  // Build lookup: locationReportId → report
  const reportMap = new Map<string, Record<string, unknown>>();

  // ========================================================================
  // PHASE 2: Fetch ALL collections for those reports (single query, batched)
  // ========================================================================
  console.log('Phase 2: Fetching all collections…');
  const allCollections: Array<Record<string, unknown>> = [];
  const reportIds = reports.map(r => (r.locationReportId as string) ?? String(r._id));
  for (let i = 0; i < reportIds.length; i += 2000) {
    const batch = reportIds.slice(i, i + 2000);
    const docs = await CollectionsModel.find(
      { locationReportId: { $in: batch } },
      { locationReportId: 1, machineId: 1, meterId: 1, movement: 1, sasMeters: 1 }
    ).lean().exec() as Array<Record<string, unknown>>;
    allCollections.push(...docs);
  }
  console.log(`  Found ${allCollections.length} collections.\n`);

  // Group by report
  const collectionsByReport = new Map<string, Array<Record<string, unknown>>>();
  for (const col of allCollections) {
    const rid = col.locationReportId as string;
    if (!collectionsByReport.has(rid)) collectionsByReport.set(rid, []);
    collectionsByReport.get(rid)!.push(col);
  }

  // ========================================================================
  // PHASE 3: Fetch ALL machine relayIds
  // ========================================================================
  console.log('Phase 3: Fetching machine relayIds…');
  const allMachineIds = [...new Set(allCollections.map(c => c.machineId as string).filter(Boolean))];
  console.log(`  Unique machines: ${allMachineIds.length}`);

  const machineDocs: Array<Record<string, unknown>> = [];
  for (let i = 0; i < allMachineIds.length; i += 2000) {
    const batch = allMachineIds.slice(i, i + 2000);
    const docs = await MachineModel.find(
      { _id: { $in: batch } },
      { _id: 1, relayId: 1, serialNumber: 1, machineName: 1 }
    ).lean().exec() as Array<Record<string, unknown>>;
    machineDocs.push(...docs);
  }

  const smibMap = new Map<string, boolean>();
  const machineNameMap = new Map<string, string>();
  for (const m of machineDocs) {
    smibMap.set(String(m._id), Boolean((m.relayId as string)?.trim()));
    machineNameMap.set(
      String(m._id),
      (m.serialNumber as string) || (m.machineName as string) || String(m._id)
    );
  }

  const smibCount = [...smibMap.values()].filter(Boolean).length;
  console.log(`  SMIB machines: ${smibCount}/${machineDocs.length}\n`);

  // ========================================================================
  // PHASE 4: Resolve includeJackpot per location
  // ========================================================================
  console.log('Phase 4: Resolving includeJackpot per location…');
  const uniqueLocationIds = [...new Set(
    reports.map(r => String(r.locationId ?? r.gamingLocation ?? r.location ?? '')).filter(Boolean)
  )];
  const includeJackpotMap = new Map<string, boolean>();

  for (const lid of uniqueLocationIds) {
    const loc = await GamingLocationsModel.findOne({ _id: lid }, { 'rel.licencee': 1 }).lean() as Record<string, unknown> | null;
    const licId = (loc?.rel as Record<string, unknown> | undefined)?.licencee as string | undefined;
    if (licId) {
      const lic = await LicenceeModel.findOne({ _id: licId }, { includeJackpot: 1 }).lean() as Record<string, unknown> | null;
      includeJackpotMap.set(lid, Boolean(lic?.includeJackpot));
    } else {
      includeJackpotMap.set(lid, false);
    }
  }
  console.log(`  ${uniqueLocationIds.length} locations resolved.\n`);

  // ========================================================================
  // PHASE 5: Compute per-report variation using STORED data
  // ========================================================================
  console.log('Phase 5: Computing variations from stored data…');

  interface MachineDetail {
    machineId: string;
    machineName: string;
    meterGross: number;
    sasGross: number;
    jackpot: number;
    adjustedSasGross: number;
    variation: number;
    hasSmib: boolean;
    hasSupplemental: boolean;
    sasStartTime?: string;
    sasEndTime?: string;
  }

  interface ReportResult {
    locationReportId: string;
    storedTV: number | undefined | null;
    storedBasedTV: number;
    match: boolean;
    absoluteDiff: number;
    smibCount: number;
    collectionCount: number;
    details: MachineDetail[];
  }

  const reportResults: ReportResult[] = [];
  let processed = 0;

  for (const report of reports) {
    processed++;
    const locationReportId = (report.locationReportId as string) ?? String(report._id);
    const collections = collectionsByReport.get(locationReportId) ?? [];
    const lid = String(report.locationId ?? report.gamingLocation ?? report.location ?? '');
    const includeJackpot = includeJackpotMap.get(lid) ?? false;

    const details: MachineDetail[] = [];
    let storedBasedTV = 0;

    for (const col of collections) {
      const hasSmib = smibMap.get(String(col.machineId)) ?? false;
      const movement = col.movement as Record<string, unknown> | undefined;
      const sasMeters = col.sasMeters as Record<string, unknown> | undefined;

      const meterGross = (movement?.gross as number) ?? 0;

      // Use stored sasMeters for the quick check
      const sasGross = (sasMeters?.gross as number) ?? 0;
      const jackpot = (sasMeters?.jackpot as number) ?? 0;
      const hasSupplemental = !!col.meterId;

      // For offline SMIB machines with supplemental: effectiveSasGross = meterGross
      // Variation = 0 for those
      let effectiveSasGross: number;
      if (hasSupplemental && !sasMeters?.sasStartTime) {
        // Offline machine — no live SAS window, collector's values are truth
        effectiveSasGross = meterGross;
      } else {
        effectiveSasGross = sasGross;
      }

      const adjustedSasGross = includeJackpot
        ? effectiveSasGross - jackpot
        : effectiveSasGross;

      const variation = hasSmib ? meterGross - adjustedSasGross : 0;
      storedBasedTV += variation;

      details.push({
        machineId: String(col.machineId),
        machineName: machineNameMap.get(String(col.machineId)) ?? String(col.machineId),
        meterGross,
        sasGross,
        jackpot,
        adjustedSasGross,
        variation,
        hasSmib,
        hasSupplemental,
        sasStartTime: sasMeters?.sasStartTime as string | undefined,
        sasEndTime: sasMeters?.sasEndTime as string | undefined,
      });
    }

    const storedTV = report.totalVariation as number | undefined | null;
    const storedVal = storedTV ?? 0;
    const match = Math.abs(storedVal - storedBasedTV) < 0.01;
    const smibCount = details.filter(d => d.hasSmib).length;

    reportResults.push({
      locationReportId,
      storedTV,
      storedBasedTV,
      match,
      absoluteDiff: Math.abs(storedVal - storedBasedTV),
      smibCount,
      collectionCount: details.length,
      details,
    });

    if (processed % 500 === 0 || processed === reports.length) {
      const mismatchCount = reportResults.filter(r => !r.match).length;
      console.log(`  Processed ${processed}/${reports.length} reports, ${mismatchCount} mismatches so far…`);
    }
  }

  const mismatches = reportResults.filter(r => !r.match);

  console.log('\n' + '='.repeat(140));
  console.log('VARIATION MISMATCH REPORT (STORED-BASED CHECK)');
  console.log('='.repeat(140));
  console.log(`Total reports checked: ${reportResults.length}`);
  console.log(`Matches:              ${reportResults.length - mismatches.length}`);
  console.log(`Mismatches:           ${mismatches.length}`);
  console.log('='.repeat(140));

  if (mismatches.length === 0) {
    console.log('\n✅ All stored totalVariation values match stored collection data.\n');
    console.log('(Live Meters data may still show variations when supplemental meters were added after report creation.)');

    // Even with no mismatches from stored data, let's do a quick live check on a sample
    console.log('\nProceeding to Phase 6: Live data check on a sample…');
  }

  // ========================================================================
  // PHASE 6: Live Meters check for ALL mismatches + a sample of matches
  // ========================================================================
  console.log('\nPhase 6: Live Meters query check…');

  // Include all mismatches + up to 100 random matches for confidence
  const sampleMatches = reportResults
    .filter(r => r.match)
    .sort(() => Math.random() - 0.5)
    .slice(0, 100);

  const reportsToCheckLive = [
    ...mismatches.map(m => ({ ...m, reason: 'mismatch' as const })),
    ...sampleMatches.map(m => ({ ...m, reason: 'sample' as const })),
  ];

  console.log(`  Checking ${reportsToCheckLive.length} reports with live Meters (${mismatches.length} mismatches + ${sampleMatches.length} sample matches)…\n`);

  const metersCollection = db.collection('meters');
  let liveChecked = 0;

  interface LiveCheckResult {
    locationReportId: string;
    storedTV: number | undefined | null;
    storedBasedTV: number;
    liveBasedTV: number;
    storedMatch: boolean;
    liveMatch: boolean;
    reason: 'mismatch' | 'sample';
    liveVsStoredDiff: number;
    smibCount: number;
    collectionCount: number;
    createdAt?: string;
    details: Array<MachineDetail & { liveSasGross: number; hasLiveData: boolean }>;
  }

  const liveResults: LiveCheckResult[] = [];

  for (const item of reportsToCheckLive) {
    liveChecked++;
    const locationReportId = item.locationReportId;

    // Build per-collection meter queries
    const collections = collectionsByReport.get(locationReportId) ?? [];
    const meterQueries = collections
      .filter(col => {
        const sm = col.sasMeters as Record<string, unknown> | undefined;
        return sm?.sasStartTime && sm?.sasEndTime;
      })
      .map(col => {
        const sm = col.sasMeters as Record<string, unknown>;
        return {
          machineId: col.machineId as string,
          startTime: new Date(sm.sasStartTime as string),
          endTime: new Date(sm.sasEndTime as string),
        };
      });

    // Query Meters for this report's SAS windows
    const meterDataMap = new Map<string, { drop: number; cancelled: number; jackpot: number }>();

    if (meterQueries.length > 0) {
      const pipeline = [
        {
          $match: {
            $or: meterQueries.map(q => ({
              machine: q.machineId,
              readAt: { $gte: q.startTime, $lte: q.endTime },
              $or: [
                { meterSource: { $ne: 'COLLECTION_REPORT' } },
                { meterSource: 'COLLECTION_REPORT', isSupplemental: true, readAt: q.endTime },
              ],
            })),
          },
        },
        {
          $group: {
            _id: { machine: '$machine' },
            totalDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
            totalCancelled: { $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] } },
            totalJackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
          },
        },
      ];

      const cursor = metersCollection.aggregate(pipeline, { batchSize: 1000, allowDiskUse: true });

      for await (const doc of cursor) {
        const machineKey = String((doc as Record<string, unknown>)._id as Record<string, unknown>['machine']);
        meterDataMap.set(machineKey, {
          drop: (doc as Record<string, unknown>).totalDrop as number || 0,
          cancelled: (doc as Record<string, unknown>).totalCancelled as number || 0,
          jackpot: (doc as Record<string, unknown>).totalJackpot as number || 0,
        });
      }
    }

    // Recompute with live data
    const report = reports.find(
      r => (r.locationReportId as string) === locationReportId || String(r._id) === locationReportId
    );
    const lid = String(report?.locationId ?? report?.gamingLocation ?? report?.location ?? '');
    const includeJackpot = includeJackpotMap.get(lid) ?? false;

    let liveBasedTV = 0;
    const liveDetails: LiveCheckResult['details'] = [];

    for (const col of collections) {
      const hasSmib = smibMap.get(String(col.machineId)) ?? false;
      const movement = col.movement as Record<string, unknown> | undefined;
      const sasMeters = col.sasMeters as Record<string, unknown> | undefined;

      const meterGross = (movement?.gross as number) ?? 0;
      const hasSupplemental = !!col.meterId;

      let sasGross = 0;
      let sasJackpot = (sasMeters?.jackpot as number) ?? 0;
      let hasLiveData = false;

      if (sasMeters?.sasStartTime && sasMeters?.sasEndTime) {
        const liveData = meterDataMap.get(String(col.machineId));
        if (liveData) {
          sasGross = liveData.drop - liveData.cancelled;
          sasJackpot = liveData.jackpot;
          hasLiveData = true;
        }
      }

      const effectiveSasGross = !hasLiveData && hasSupplemental ? meterGross : sasGross;
      const adjustedSasGross = includeJackpot
        ? effectiveSasGross - sasJackpot
        : effectiveSasGross;
      const variation = hasSmib ? meterGross - adjustedSasGross : 0;
      liveBasedTV += variation;

      liveDetails.push({
        machineId: String(col.machineId),
        machineName: machineNameMap.get(String(col.machineId)) ?? String(col.machineId),
        meterGross,
        sasGross,
        jackpot: sasJackpot,
        adjustedSasGross,
        variation,
        hasSmib,
        hasSupplemental,
        sasStartTime: sasMeters?.sasStartTime as string | undefined,
        sasEndTime: sasMeters?.sasEndTime as string | undefined,
        liveSasGross: sasGross,
        hasLiveData,
      });
    }

    const storedTV = item.storedTV;
    const storedVal = storedTV ?? 0;
    const liveMatch = Math.abs(storedVal - liveBasedTV) < 0.01;

    liveResults.push({
      locationReportId,
      storedTV,
      storedBasedTV: item.storedBasedTV,
      liveBasedTV,
      storedMatch: item.match,
      liveMatch,
      reason: item.reason,
      liveVsStoredDiff: Math.abs(liveBasedTV - item.storedBasedTV),
      smibCount: item.smibCount,
      collectionCount: item.collectionCount,
      createdAt: report?.createdAt as string | undefined,
      details: liveDetails,
    });

    if (liveChecked % 50 === 0 || liveChecked === reportsToCheckLive.length) {
      console.log(`  Live check ${liveChecked}/${reportsToCheckLive.length}…`);
    }
  }

  // ========================================================================
  // PHASE 7: Final report — compact table output + Markdown export
  // ========================================================================
  const confirmedMismatches = liveResults.filter(r => !r.liveMatch);

  console.log('\n══════════════════════════════════════════════════');
  console.log('FINAL VARIATION MISMATCH REPORT');
  console.log('══════════════════════════════════════════════════');
  console.log(`Total reports:         ${reportResults.length}`);
  console.log(`Live-checked:          ${liveResults.length}`);
  console.log(`  From mismatches:     ${mismatches.length}`);
  console.log(`    Confirmed:         ${confirmedMismatches.filter(r => r.reason === 'mismatch').length}`);
  console.log(`    Resolved:          ${mismatches.length - confirmedMismatches.filter(r => r.reason === 'mismatch').length}`);
  console.log(`  Sample rechecks:     ${sampleMatches.length}`);
  console.log(`    Still matching:    ${liveResults.filter(r => r.reason === 'sample' && r.liveMatch).length}`);
  console.log(`    New mismatches:    ${liveResults.filter(r => r.reason === 'sample' && !r.liveMatch).length}`);
  console.log(`\nTotal confirmed mismatches: ${confirmedMismatches.length}`);
  console.log('══════════════════════════════════════════════════\n');

  // Build markdown report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const mdLines: string[] = [];

  mdLines.push(`# Variation Mismatch Report — ${timestamp}`);
  mdLines.push('');
  mdLines.push('## Summary');
  mdLines.push('');
  mdLines.push(`| Metric | Value |`);
  mdLines.push(`|---|---|`);
  mdLines.push(`| Total reports checked | ${reportResults.length} |`);
  mdLines.push(`| Live-checked | ${liveResults.length} |`);
  mdLines.push(`| From mismatches | ${mismatches.length} |`);
  mdLines.push(`| Confirmed mismatches | ${confirmedMismatches.length} |`);
  mdLines.push(`| Resolved (false positive) | ${mismatches.length - confirmedMismatches.filter(r => r.reason === 'mismatch').length} |`);
  mdLines.push(`| Sample rechecks | ${sampleMatches.length} |`);
  mdLines.push(`| Still matching | ${liveResults.filter(r => r.reason === 'sample' && r.liveMatch).length} |`);
  mdLines.push(`| New mismatches found | ${liveResults.filter(r => r.reason === 'sample' && !r.liveMatch).length} |`);
  mdLines.push('');

  if (confirmedMismatches.length > 0) {
    confirmedMismatches.sort((a, b) => Math.abs((b.storedTV ?? 0) - b.liveBasedTV) - Math.abs((a.storedTV ?? 0) - a.liveBasedTV));

    const tableData = confirmedMismatches.map(m => {
      const report = reports.find(
        r => (r.locationReportId as string) === m.locationReportId || String(r._id) === m.locationReportId
      );
      const diff = Math.abs((m.storedTV ?? 0) - m.liveBasedTV);
      const displayDiff = diff > 1000000
        ? `$${(diff / 1000000).toFixed(1)}M`
        : diff > 1000
          ? `$${(diff / 1000).toFixed(1)}K`
          : `$${diff.toFixed(2)}`;
      const nonZeroMachines = m.details.filter(d => Math.abs(d.variation) > 0.01).length;
      const liveDataMachines = m.details.filter(d => d.hasLiveData).length;
      return {
        'Report ID': m.locationReportId.slice(-8),
        Created: fmtDate(report?.createdAt).slice(0, 10),
        'Stored TV': (m.storedTV ?? 0).toFixed(2),
        'Live TV': m.liveBasedTV.toFixed(2),
        Diff: displayDiff,
        'SMIB/Total': `${m.smibCount}/${m.collectionCount}`,
        'Bad/WithLive': `${nonZeroMachines}/${liveDataMachines}`,
        Reason: m.reason,
      };
    });

    console.table(tableData);

    // Top 5 worst offenders — quick summary
    console.log('\n── Top 5 worst offenders ──');
    for (const m of confirmedMismatches.slice(0, 5)) {
      const report = reports.find(
        r => (r.locationReportId as string) === m.locationReportId || String(r._id) === m.locationReportId
      );
      const diff = Math.abs((m.storedTV ?? 0) - m.liveBasedTV);
      const nonZeroMachines = m.details.filter(d => Math.abs(d.variation) > 0.01).length;
      console.log(
        `${m.locationReportId.slice(-8)}  ` +
        `created=${fmtDate(report?.createdAt).slice(0, 10)}  ` +
        `stored=${(m.storedTV ?? 0).toFixed(2)}  ` +
        `live=${m.liveBasedTV.toFixed(2)}  ` +
        `diff=${diff.toFixed(2)}  ` +
        `smib=${m.smibCount}  ` +
        `badMachines=${nonZeroMachines}`
      );
    }

    // Markdown table
    mdLines.push('## Confirmed Mismatches');
    mdLines.push('');
    mdLines.push('| Report ID | Created | Stored TV | Live TV | Diff | SMIB/Total | Bad/WithLive | Reason |');
    mdLines.push('|---|---|---|---|---|---|---|---|');
    for (const m of confirmedMismatches) {
      const report = reports.find(
        r => (r.locationReportId as string) === m.locationReportId || String(r._id) === m.locationReportId
      );
      const diff = Math.abs((m.storedTV ?? 0) - m.liveBasedTV);
      const displayDiff = diff > 1000000
        ? `$${(diff / 1000000).toFixed(1)}M`
        : diff > 1000
          ? `$${(diff / 1000).toFixed(1)}K`
          : `$${diff.toFixed(2)}`;
      const nonZeroMachines = m.details.filter(d => Math.abs(d.variation) > 0.01).length;
      const liveDataMachines = m.details.filter(d => d.hasLiveData).length;
      mdLines.push(
        `| ${m.locationReportId.slice(-8)} ` +
        `| ${fmtDate(report?.createdAt).slice(0, 10)} ` +
        `| ${(m.storedTV ?? 0).toFixed(2)} ` +
        `| ${m.liveBasedTV.toFixed(2)} ` +
        `| ${displayDiff} ` +
        `| ${m.smibCount}/${m.collectionCount} ` +
        `| ${nonZeroMachines}/${liveDataMachines} ` +
        `| ${m.reason} |`
      );
    }
    mdLines.push('');

    // Top 5 detailed
    mdLines.push('## Top 5 Worst Offenders');
    mdLines.push('');
    for (const m of confirmedMismatches.slice(0, 5)) {
      const report = reports.find(
        r => (r.locationReportId as string) === m.locationReportId || String(r._id) === m.locationReportId
      );
      const diff = Math.abs((m.storedTV ?? 0) - m.liveBasedTV);
      const nonZeroMachines = m.details.filter(d => Math.abs(d.variation) > 0.01).length;
      mdLines.push(`### ${m.locationReportId.slice(-8)}`);
      mdLines.push('');
      mdLines.push(`- **Created:** ${fmtDate(report?.createdAt).slice(0, 10)}`);
      mdLines.push(`- **Stored TV:** ${(m.storedTV ?? 0).toFixed(2)}`);
      mdLines.push(`- **Live TV:** ${m.liveBasedTV.toFixed(2)}`);
      mdLines.push(`- **Diff:** ${diff.toFixed(2)}`);
      mdLines.push(`- **SMIB Count:** ${m.smibCount}`);
      mdLines.push(`- **Bad Machines:** ${nonZeroMachines}/${m.collectionCount}`);
      mdLines.push('');

      // Per-machine details for this report
      const badDetails = m.details.filter(d => Math.abs(d.variation) > 0.01);
      if (badDetails.length > 0) {
        mdLines.push('| Machine | Meter Gross | SAS Gross | Jackpot | Adj SAS Gross | Variation | SMIB | Suppl |');
        mdLines.push('|---|---|---|---|---|---|---|---|');
        for (const d of badDetails) {
          mdLines.push(
            `| ${d.machineName} ` +
            `| ${d.meterGross.toFixed(2)} ` +
            `| ${d.sasGross.toFixed(2)} ` +
            `| ${d.jackpot.toFixed(2)} ` +
            `| ${d.adjustedSasGross.toFixed(2)} ` +
            `| ${d.variation.toFixed(2)} ` +
            `| ${d.hasSmib ? 'Yes' : 'No'} ` +
            `| ${d.hasSupplemental ? 'Yes' : 'No'} |`
          );
        }
        mdLines.push('');
      }
    }
  } else {
    mdLines.push('✅ No mismatches found — all reports match their stored data.');
    mdLines.push('');
  }

  mdLines.push('---');
  mdLines.push(`*Generated at ${new Date().toISOString()}*`);

  // Write markdown file
  const reportsDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
  const mdPath = path.join(reportsDir, `variation-mismatch-report-${timestamp}.md`);
  fs.writeFileSync(mdPath, mdLines.join('\n'), 'utf-8');
  console.log(`\n📄 Markdown report written to: ${mdPath}`);

  console.log('\n══════════════════════════════════════════════════');
  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
