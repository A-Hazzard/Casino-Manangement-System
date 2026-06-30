/**
 * Diagnostic: compare stored totalVariation with live recomputation for a report.
 *
 * Run: bun run scripts/diagnose-total-variation.ts [reportId]
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { CollectionReport } from '../app/api/lib/models/collectionReport';
import { computeTotalVariation } from '../app/api/lib/helpers/collectionReport/calculations';

const MONGODB_URI = process.env.MONGODB_URI as string;
const REPORT_ID = process.argv[2] || '8366fdc3-0260-4963-ab9d-cb723fb86aac';

async function main() {
  await mongoose.connect(MONGODB_URI);

  const report = await CollectionReport.findOne({
    $or: [{ _id: REPORT_ID }, { locationReportId: REPORT_ID }],
  }).lean<{
    locationReportId?: string;
    location?: string;
    includeJackpot?: boolean;
    totalVariation?: number;
  } | null>();

  let licenceeIncludeJackpot = false;
  if (report?.location) {
    const { GamingLocations } = await import(
      '../app/api/lib/models/gaminglocations'
    );
    const location = await GamingLocations.findOne(
      { _id: report.location },
      { 'rel.licencee': 1 }
    ).lean<{ rel?: { licencee?: string } } | null>();
    if (location?.rel?.licencee) {
      const { Licencee } = await import('../app/api/lib/models/licencee');
      const licencee = await Licencee.findOne(
        { _id: location.rel.licencee },
        { includeJackpot: 1 }
      ).lean<{ includeJackpot?: boolean } | null>();
      licenceeIncludeJackpot = Boolean(licencee?.includeJackpot);
    }
  }

  if (!report) {
    console.log(`Report ${REPORT_ID} not found`);
    await mongoose.disconnect();
    return;
  }

  const locationReportId = report.locationReportId || REPORT_ID;
  const computed = await computeTotalVariation(
    locationReportId,
    report.location,
    undefined
  );

  console.log('Report:', locationReportId);
  console.log('Report includeJackpot:', report.includeJackpot ?? 'undefined');
  console.log('Licencee includeJackpot:', licenceeIncludeJackpot);
  console.log('Stored totalVariation:', report.totalVariation ?? 'undefined');
  console.log('Computed totalVariation:', computed);
  console.log(
    'Match:',
    Math.abs((report.totalVariation ?? 0) - computed) < 0.001 ? 'YES' : 'NO'
  );

  await mongoose.disconnect();
}

main().catch(e => {
  console.error(e);
  mongoose.disconnect();
  process.exit(1);
});
