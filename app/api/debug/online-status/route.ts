
import { connectDB } from '@/app/api/lib/middleware/db';
import { Machine } from '@/app/api/lib/models/machines';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();

    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const query = {
      $and: [
        {
          $or: [
            { deletedAt: null },
            { deletedAt: { $lt: new Date('2025-01-01') } },
          ],
        },
      ],
      lastActivity: { $gte: threeMinutesAgo }
    };

    const onlineMachines = await Machine.find(query).limit(5).lean();

    // Check a machine that SHOULD fail
    const offlineQuery = {
        lastActivity: { $lt: threeMinutesAgo, $gte: fiveMinutesAgo }
    };
    const transitionMachines = await Machine.find(offlineQuery).limit(5).lean();

    return NextResponse.json({
      serverTime: new Date().toISOString(),
      threeMinutesAgo: threeMinutesAgo.toISOString(),
      onlineMachinesCount: onlineMachines.length,
      onlineSample: onlineMachines.map(m => ({
        id: m._id,
        serial: m.serialNumber,
        lastActivity: m.lastActivity,
        isValid: new Date(m.lastActivity as Date) >= threeMinutesAgo
      })),
      transitionMachinesCount: transitionMachines.length,
      transitionSample: transitionMachines.map(m => ({
          id: m._id,
          serial: m.serialNumber,
          lastActivity: m.lastActivity,
          isValidForOnline: new Date(m.lastActivity as Date) >= threeMinutesAgo
      }))
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message });
  }
}
