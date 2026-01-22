
import { connectDB } from '@/app/api/lib/middleware/db';
import { Machine } from '@/app/api/lib/models/machines';
import { NextResponse } from 'next/server';

export async function GET() {
  await connectDB();
  const machine = await Machine.findOne({ "collectionMetersHistory.0": { $exists: true } });
  if (!machine) return NextResponse.json({ error: 'No data' });
  
  const history = machine.collectionMetersHistory[0];
  return NextResponse.json({ 
    sample: history,
    timestampType: typeof history.timestamp,
    serverTime: new Date().toISOString()
  });
}
