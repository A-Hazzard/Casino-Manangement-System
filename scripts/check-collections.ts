import 'dotenv/config';
import mongoose from 'mongoose';
import { Collections } from '../app/api/lib/models/collections';
import { CollectionReport } from '../app/api/lib/models/collectionReport';
import { GamingLocations } from '../app/api/lib/models/gaminglocations';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const locs = await GamingLocations.find({ noSMIBLocation: true }).lean<any[]>();
  const ids = locs.map(l => String(l._id));
  const reports = await CollectionReport.find({
    location: { '$in': ids },
    totalVariation: { $ne: 0 },
  })
    .sort({ timestamp: -1 })
    .limit(5)
    .lean<any[]>();
  console.log(`Reports with non-zero variation: ${reports.length}`);
  for (const r of reports) {
    const locRepId = r.locationReportId || r._id;
    const count = await Collections.countDocuments({ locationReportId: locRepId });
    console.log(
      `  ${locRepId} date=${new Date(r.timestamp).toISOString().slice(0,10)} loc=${r.location} var=${r.totalVariation} collections=${count}`
    );
  }

  // Also check recent reports with WOW location but stored var=0
  const zeroVarReports = await CollectionReport.find({
    location: { '$in': ids },
    totalVariation: { $eq: 0 },
  })
    .sort({ timestamp: -1 })
    .limit(5)
    .lean<any[]>();
  console.log(`\nRecent zero-var reports:`);
  for (const r of zeroVarReports) {
    const locRepId = r.locationReportId || r._id;
    const count = await Collections.countDocuments({ locationReportId: locRepId });
    const wowCols = await Collections.find({ locationReportId: locRepId })
      .limit(3)
      .lean<any[]>();
    const hasSas = wowCols.some(c => c.sasMeters?.sasStartTime && c.sasMeters?.sasEndTime);
    console.log(
      `  ${locRepId} date=${new Date(r.timestamp).toISOString().slice(0,10)} var=${r.totalVariation} collections=${count} hasSasWindow=${hasSas} wowColsSample=${wowCols.length}`
    );
  }
  await mongoose.disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
