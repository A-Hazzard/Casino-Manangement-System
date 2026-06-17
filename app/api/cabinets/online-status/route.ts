/**
 * Machine Online Status — Batch Lookup
 *
 * Accepts a comma-separated list of machine IDs via ?ids=... and returns a map
 * of machineId → boolean (true = online within last 3 minutes).
 * Only machines that have a relayId (SMIB) can be online; others are omitted.
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { Machine } from '@/app/api/lib/models/machines';
import type { MachineDocument } from '@/shared/types/models';
import { NextRequest, NextResponse } from 'next/server';

const THREE_MINUTES_MS = 3 * 60 * 1000;

export async function GET(req: NextRequest) {
  // ============================================================================
  // STEP 1: Parse Query Params
  // ============================================================================
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get('ids');

  if (!idsParam) {
    return NextResponse.json({});
  }

  const machineIds = idsParam
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);

  if (machineIds.length === 0) {
    return NextResponse.json({});
  }

  // ============================================================================
  // STEP 2: Connect to DB
  // ============================================================================
  const db = await connectDB();
  if (!db) {
    return NextResponse.json({}, { status: 500 });
  }

  const threeMinutesAgo = new Date(Date.now() - THREE_MINUTES_MS);

  // ============================================================================
  // STEP 3: Fetch Machines
  // ============================================================================
  const machines = await Machine.find(
    {
      _id: { $in: machineIds },
      relayId: { $exists: true, $nin: [null, ''] },
    },
    { _id: 1, relayId: 1, lastActivity: 1 }
  ).lean<MachineDocument[]>();

  // ============================================================================
  // STEP 4: Build Status Map
  // ============================================================================
  const statusMap: Record<string, boolean> = {};

  for (const machine of machines) {
    const machineId = String(machine._id);
    const lastActivity = machine.lastActivity
      ? new Date(machine.lastActivity as string | Date)
      : null;
    statusMap[machineId] =
      lastActivity !== null && lastActivity >= threeMinutesAgo;
  }

  return NextResponse.json(statusMap);
}
