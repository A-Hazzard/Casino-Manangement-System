import 'dotenv/config';
import mongoose from 'mongoose';
import { GamingLocations } from '../app/api/lib/models/gaminglocations';
import { CollectionReport } from '../app/api/lib/models/collectionReport';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const locs = await GamingLocations.find({ noSMIBLocation: true }).lean<any[]>();
  const ids = locs.map(l => String(l._id));
  const reports = await CollectionReport.find({ location: { '$in': ids } })
    .sort({ timestamp: -1 })
    .limit(30)
    .lean<any[]>();
  for (const r of reports) {
    console.log(
      (r.locationReportId || r._id).toString().padEnd(40),
      new Date(r.timestamp).toISOString().slice(0, 10),
      'var=' + (r.totalVariation ?? 0)
    );
  }
  await mongoose.disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
