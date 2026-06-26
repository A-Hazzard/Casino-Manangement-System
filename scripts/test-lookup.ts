import 'dotenv/config';
import mongoose from 'mongoose';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const schema = new mongoose.Schema({}, { strict: false });
  const CR = mongoose.model('CollectionReport', schema);

  let r = await CR.findOne({ locationReportId: 'f3d47650-6726-4da0-8704-7b595da0f97d' }).lean<any>();
  console.log('By locationReportId:', r ? '_id=' + r._id + ' locRepId=' + r.locationReportId : 'NOT FOUND');

  r = await CR.findOne({ _id: 'f3d47650-6726-4da0-8704-7b595da0f97d' }).lean<any>();
  console.log('By _id:', r ? '_id=' + r._id + ' locRepId=' + r.locationReportId : 'NOT FOUND');

  // Try with ObjectId
  const { ObjectId } = mongoose.Types;
  r = await CR.findOne({ _id: new ObjectId('f3d47650-6726-4da0-8704-7b595da0f97d') }).lean<any>();
  console.log('By ObjectId:', r ? '_id=' + r._id + ' locRepId=' + r.locationReportId : 'NOT FOUND');

  await mongoose.disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
