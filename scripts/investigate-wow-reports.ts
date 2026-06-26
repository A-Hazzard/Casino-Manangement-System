/**
 * Investigates variation mismatches across all WOW collection reports.
 *
 * For every collection report at a no-SMIB location (all-WOW), this script:
 *   1. Reads the stored totalVariation.
 *   2. Recomputes it using the same logic the detail page uses
 *      (aggregateMeterDataForWindows + computeMachineVariation).
 *   3. Lists all reports where stored !== computed, with per-machine breakdowns.
 *   4. Analyzes why each machine's variation exists (zero-width SAS window, no meter data,
 *      jackpot discrepancy, genuine meter vs SAS difference).
 *
 * Run: bun run scripts/investigate-wow-reports.ts [reportId]
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { CollectionReport } from '../app/api/lib/models/collectionReport';
import { Collections } from '../app/api/lib/models/collections';
import { GamingLocations } from '../app/api/lib/models/gaminglocations';
import { Machine } from '../app/api/lib/models/machines';
import { Licencee } from '../app/api/lib/models/licencee';
import { isWowMachine } from '../shared/utils/wowMachine';
import {
  aggregateMeterDataForWindows,
  computeMachineVariation,
} from '../app/api/lib/helpers/collectionReport/variation';
import type { MeterWindowQuery, MachineVariationFlags } from '../app/api/lib/helpers/collectionReport/variation';

const MONGODB_URI = process.env.MONGODB_URI as string;
const SINGLE_REPORT_ID = process.argv[2];

const n = (v?: number | null) => (v == null ? 'null' : v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

async function getLicenceeIncludeJackpot(locationId?: string) {
  if (!locationId) return false;
  const loc = await GamingLocations.findOne({ _id: locationId }, { 'rel.licencee': 1 }).lean<any>();
  if (!loc?.rel?.licencee) return false;
  const lic = await Licencee.findOne({ _id: loc.rel.licencee }, { includeJackpot: 1 }).lean<any>();
  return Boolean(lic?.includeJackpot);
}

async function getNoSMIBLocation(locationId?: string) {
  if (!locationId) return false;
  const loc = await GamingLocations.findOne({ _id: locationId }, { noSMIBLocation: 1 }).lean<any>();
  return loc?.noSMIBLocation === true;
}

type MachineBreakdown = {
  machineId: string;
  serialNumber: string;
  isWow: boolean;
  hasRelay: boolean;
  machineGross: number;
  sasGross: number | null;
  sasStartTime: string;
  sasEndTime: string;
  windowWidthMs: number;
  meterCount: number;
  jackpot: number;
  includeJackpot: boolean;
  adjustedSasGross: number;
  variation: number;
  reason: string;
};

type ReportAnalysis = {
  reportId: string;
  date: string;
  storedTotal: number;
  computedTotal: number;
  includeJackpot: boolean;
  match: boolean;
  machineCount: number;
  machinesWithVariation: number;
  breakdown: MachineBreakdown[];
};

async function analyzeReport(report: any): Promise<ReportAnalysis | null> {
  const reportId = report.locationReportId || report._id;
  const collections = await Collections.find({ locationReportId: reportId }).lean<any[]>();
  if (!collections.length) return null;

  const includeJackpot = await getLicenceeIncludeJackpot(report.location);
  const isNoSMIBLocation = await getNoSMIBLocation(report.location);

  // Build per-machine metadata
  const machineIds = [...new Set(collections.map(c => String(c.machineId)).filter(Boolean))];
  const machineDocs = await Machine.find(
    { _id: { $in: machineIds } },
    { relayId: 1, 'meta.dataSync.source': 1, serialNumber: 1, custom: 1, game: 1, machineName: 1 }
  ).lean<any[]>();
  const machineMap = new Map(machineDocs.map(m => [String(m._id), m]));

  // Build meter queries for machines with SAS windows
  const meterQueries: MeterWindowQuery[] = collections
    .filter(c => c.machineId && c.sasMeters?.sasStartTime && c.sasMeters?.sasEndTime)
    .map(c => ({
      machineId: String(c.machineId),
      startTime: new Date(c.sasMeters.sasStartTime),
      endTime: new Date(c.sasMeters.sasEndTime),
    }));

  const meterDataMap = meterQueries.length > 0
    ? await aggregateMeterDataForWindows(meterQueries)
    : new Map();

  // Compute per-machine variation
  let computedTotal = 0;
  const breakdown: MachineBreakdown[] = [];

  for (const c of collections) {
    const machineId = String(c.machineId);
    const machine = machineMap.get(machineId);
    const isWow = isWowMachine(machine ?? null);
    const hasRelay = Boolean(machine?.relayId?.trim());
    const flags: MachineVariationFlags = { includeJackpot, hasRelay, isWow, isNoSMIBLocation };

    const start = c.sasMeters?.sasStartTime;
    const end = c.sasMeters?.sasEndTime;
    const sums = meterDataMap.get(machineId);

    const result = computeMachineVariation(
      {
        metersIn: c.metersIn,
        metersOut: c.metersOut,
        prevIn: c.prevIn,
        prevOut: c.prevOut,
        movementGross: c.movement?.gross,
        sasStartTime: start,
        sasEndTime: end,
      },
      sums,
      flags,
    );

    if (result.variation !== null && Math.abs(result.variation) >= 0.01) {
      computedTotal += result.variation;
    }

    // Determine root cause of variation
    let reason = 'none';
    if (result.variation !== null && Math.abs(result.variation) >= 0.01) {
      if (!start || !end) {
        reason = 'missing SAS window';
      } else if (!sums || sums.count === 0) {
        const ms = new Date(end).getTime() - new Date(start).getTime();
        if (ms === 0) {
          reason = 'zero-width SAS window (stale machine, no meter data in window)';
        } else {
          reason = `no meter data in ${ms}ms window`;
        }
      } else if (includeJackpot && sums.jackpot > 0) {
        reason = `jackpot discrepancy (jackpot=${n(sums.jackpot)})`;
      } else {
        reason = `genuine meter vs SAS difference: machineGross=${n(result.meterGross)} sasGross=${n(result.sasGross || 0)}`;
      }
    }

    breakdown.push({
      machineId,
      serialNumber: machine?.serialNumber || machine?.custom?.name || machine?.machineName || machineId,
      isWow,
      hasRelay,
      machineGross: result.meterGross,
      sasGross: result.sasGross,
      sasStartTime: start ? new Date(start).toISOString() : 'null',
      sasEndTime: end ? new Date(end).toISOString() : 'null',
      windowWidthMs: start && end ? new Date(end).getTime() - new Date(start).getTime() : 0,
      meterCount: sums?.count ?? 0,
      jackpot: sums?.jackpot ?? 0,
      includeJackpot,
      adjustedSasGross: result.sasGross ?? 0,
      variation: result.variation ?? 0,
      reason,
    });
  }

  const storedTotal = report.totalVariation ?? 0;
  return {
    reportId,
    date: report.timestamp ? new Date(report.timestamp).toISOString().slice(0, 10) : 'unknown',
    storedTotal,
    computedTotal,
    includeJackpot,
    match: Math.abs(storedTotal - computedTotal) < 0.01,
    machineCount: collections.length,
    machinesWithVariation: breakdown.filter(m => Math.abs(m.variation) >= 0.01).length,
    breakdown,
  };
}

async function main() {
  await mongoose.connect(MONGODB_URI);

  if (SINGLE_REPORT_ID) {
    // Single report deep-dive
    const report = await CollectionReport.findOne({
      locationReportId: SINGLE_REPORT_ID,
    }).lean<any>();
    const report2 = !report
      ? await CollectionReport.findOne({ _id: SINGLE_REPORT_ID }).lean<any>()
      : null;
    const doc = report || report2;
    if (!doc) {
      console.log(`Report ${SINGLE_REPORT_ID} not found`);
      await mongoose.disconnect();
      return;
    }
    const analysis = await analyzeReport(doc);
    if (!analysis) {
      console.log('Report has no collections');
      await mongoose.disconnect();
      return;
    }

    console.log(`Report: ${analysis.reportId} (${analysis.date})`);
    console.log(`Machines: ${analysis.machineCount}`);
    console.log(`includeJackpot: ${analysis.includeJackpot}`);
    console.log(`Stored totalVariation: ${n(analysis.storedTotal)}`);
    console.log(`Computed totalVariation: ${n(analysis.computedTotal)}`);
    console.log(`Match: ${analysis.match ? 'YES' : 'NO'}`);
    console.log(`Machines with variation: ${analysis.machinesWithVariation}`);
    console.log('');

    if (analysis.breakdown.length > 0) {
      console.log('Per-machine breakdown (sorted by variation magnitude):');
      const sorted = [...analysis.breakdown].sort((a, b) => Math.abs(b.variation) - Math.abs(a.variation));
      console.log('');
      console.log('  Machine'.padEnd(45), 'Gross'.padEnd(12), 'SAS Gross'.padEnd(12), 'Variation'.padEnd(12), 'Window'.padEnd(14), 'Meters'.padEnd(6), 'Jackpot'.padEnd(10), 'Reason');
      console.log('  ' + '-'.repeat(140));

      for (const m of sorted) {
        const name = m.serialNumber.length > 30 ? m.serialNumber.slice(0, 27) + '...' : m.serialNumber;
        const windowLabel = m.windowWidthMs === 0 ? 'zero' : `${(m.windowWidthMs / 60000).toFixed(0)}min`;
        const sasLabel = m.sasGross !== null ? n(m.sasGross) : 'no-data';
        console.log(
          `  ${name.padEnd(45)} ${n(m.machineGross).padEnd(12)} ${sasLabel.padEnd(12)} ${n(m.variation).padEnd(12)} ${windowLabel.padEnd(14)} ${String(m.meterCount).padEnd(6)} ${n(m.jackpot).padEnd(10)} ${m.reason}`
        );
      }
    }
  } else {
    // Scan all WOW reports
    const locs = await GamingLocations.find({ noSMIBLocation: true }).lean<any[]>();
    const locIds = locs.map(l => String(l._id));

    const reports = await CollectionReport.find({ location: { '$in': locIds } })
      .sort({ timestamp: -1 })
      .limit(200)
      .lean<any[]>();

    console.log(`Scanning ${reports.length} reports across ${locIds.length} WOW locations\n`);

    // Categorize
    const mismatches: ReportAnalysis[] = [];
    const withVariation: ReportAnalysis[] = [];
    let zeroVarMatch = 0;
    let zeroVarMismatch = 0;

    for (const report of reports) {
      const analysis = await analyzeReport(report);
      if (!analysis) continue;

      if (!analysis.match) mismatches.push(analysis);
      if (analysis.machinesWithVariation > 0) withVariation.push(analysis);
      if (analysis.storedTotal === 0 && analysis.machinesWithVariation > 0) {
        if (analysis.match) zeroVarMatch++;
        else zeroVarMismatch++;
      }
    }

    // Summary
    console.log('='.repeat(100));
    console.log('SUMMARY');
    console.log('='.repeat(100));
    console.log(`Reports with collections: ${mismatches.length + (reports.length - mismatches.filter(m => m === undefined).length)}`);
    console.log(`Reports with stored/computed mismatch: ${mismatches.length}`);
    console.log(`Reports with actual variations (computed): ${withVariation.length}`);
    console.log(`Reports stored=0 but computed has variation (and stored matches): ${zeroVarMatch}`);
    console.log(`Reports stored=0 but computed has variation (and stored DOES NOT match): ${zeroVarMismatch}`);
    console.log('');

    if (mismatches.length > 0) {
      console.log('='.repeat(100));
      console.log('REPORTS WITH STORED !== COMPUTED');
      console.log('='.repeat(100));
      for (const a of mismatches) {
        console.log(`\n${a.reportId} (${a.date})`);
        console.log(`  Machines: ${a.machineCount} | includeJackpot: ${a.includeJackpot}`);
        console.log(`  Stored: ${n(a.storedTotal)} | Computed: ${n(a.computedTotal)} | Diff: ${n(a.computedTotal - a.storedTotal)}`);
        if (a.machinesWithVariation > 0) {
          const topReasons: Record<string, number> = {};
          for (const m of a.breakdown) {
            if (Math.abs(m.variation) >= 0.01) {
              topReasons[m.reason] = (topReasons[m.reason] || 0) + 1;
            }
          }
          console.log(`  Machines with variation: ${a.machinesWithVariation}`);
          console.log(`  Variation reasons:`);
          for (const [reason, count] of Object.entries(topReasons).sort((a, b) => b[1] - a[1])) {
            console.log(`    - ${reason}: ${count} machine(s)`);
          }
        }
      }
    }

    if (withVariation.length > 0) {
      console.log('\n' + '='.repeat(100));
      console.log('AGGREGATED VARIATION REASONS (all reports with computed variation)');
      console.log('='.repeat(100));
      const reasonCounts: Record<string, number> = {};
      let totalMachinesWithVar = 0;
      for (const a of withVariation) {
        for (const m of a.breakdown) {
          if (Math.abs(m.variation) >= 0.01) {
            totalMachinesWithVar++;
            reasonCounts[m.reason] = (reasonCounts[m.reason] || 0) + 1;
          }
        }
      }
      console.log(`Total machines with variation across all reports: ${totalMachinesWithVar}`);
      console.log('');
      for (const [reason, count] of Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${String(count).padStart(4)}x  ${reason}`);
      }
    }

    console.log('\n✓ Done');
  }

  await mongoose.disconnect();
}

main().catch(e => {
  console.error(e);
  mongoose.disconnect();
  process.exit(1);
});
