import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;
  const reportId = 'cb52018d-2698-4b8a-aed2-76a297dbe5b5';

  const cols = await db.collection('collections').find(
    { locationReportId: reportId },
    { projection: { machineId: 1 } }
  ).toArray();
  const machineIds = [...new Set(cols.map((c: any) => String(c.machineId)))];

  const machines = await db.collection('machines').find(
    { _id: { $in: machineIds } },
    { projection: { _id: 1, serialNumber: 1, relayId: 1, 'meta.dataSync.source': 1 } }
  ).toArray();

  for (const m of machines) {
    const relay = m.relayId ? String(m.relayId).trim() : '(empty)';
    const source = m.meta?.dataSync?.source ? String(m.meta?.dataSync?.source) : '(none)';
    const isWow = source === 'wow' ? '*** WOW ***' : '';
    console.log((m.serialNumber || '?').padEnd(22), 'relayId=' + relay.padEnd(12), 'dataSync.source=' + source.padEnd(12), isWow);
  }

  await mongoose.disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
