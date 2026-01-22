
import { connectDB } from '@/app/api/lib/middleware/db';
import { MachineEvent } from '@/app/api/lib/models/machineEvents';
import { NextResponse } from 'next/server';

export async function GET() {
  await connectDB();
  const eventTypes = await MachineEvent.distinct('eventType');
  const logLevels = await MachineEvent.distinct('eventLogLevel');
  return NextResponse.json({ eventTypes, logLevels });
}
