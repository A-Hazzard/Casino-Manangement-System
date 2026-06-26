import 'dotenv/config';
import mongoose from 'mongoose';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);

  const locs = await mongoose.connection.collection('gaminglocations').find({
    _id: { $in: ['6a3931ae8bfe4987b9535b6b', '69d7c6547efab6fc04a01a97', '6a19cef1bd0660bab5097e3c', '69d7c6697efab6fc04a01b61'] }
  }).project({ _id: 1, name: 1, noSMIBLocation: 1 }).toArray();

  for (const l of locs) console.log(JSON.stringify(l));

  await mongoose.disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
