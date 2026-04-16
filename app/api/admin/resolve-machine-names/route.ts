/**
 * Resolve Machine Names in Activity Logs
 *
 * Scans activity logs where resourceName is a raw ObjectID string (24-char hex),
 * queries the Machine model to resolve the human-readable name (serialNumber / custom.name),
 * and updates the log in place.
 *
 * GET ?limit=100  — process up to `limit` logs per call, returns progress counts.
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { ActivityLog } from '@/app/api/lib/models/activityLog';
import { Machine } from '@/app/api/lib/models/machines';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;

export async function GET(request: NextRequest) {
  return withApiAuth(request, async ({ userRoles }) => {
    const normalizedRoles = userRoles.map(r => String(r).toLowerCase());
    if (!normalizedRoles.includes('developer')) {
      return NextResponse.json({ success: false, message: 'Developer access required' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);

    // Count total logs with ObjectID-format resourceName
    const total = await ActivityLog.countDocuments({
      resourceName: { $regex: /^[a-fA-F0-9]{24}$/ },
      deletedAt: null,
    });

    if (total === 0) {
      return NextResponse.json({ success: true, updated: 0, total: 0, remaining: 0 });
    }

    // Fetch a batch of logs to process
    const logsToResolve = await ActivityLog.find(
      { resourceName: { $regex: /^[a-fA-F0-9]{24}$/ }, deletedAt: null },
      { _id: 1, resourceName: 1 }
    ).limit(limit).lean();

    // Collect unique ObjectIDs
    const objectIds = [...new Set(logsToResolve.map(l => String(l.resourceName)).filter(n => OBJECT_ID_REGEX.test(n)))];

    // Batch-query machines
    const machines = await Machine.find(
      { _id: { $in: objectIds } },
      { _id: 1, serialNumber: 1, 'custom.name': 1 }
    ).lean();

    const machineNameMap = new Map<string, string>();
    for (const machine of machines) {
      const id = String(machine._id);
      const serial = (machine.serialNumber as string | undefined)?.trim() || '';
      const customName = ((machine.custom as { name?: string } | undefined)?.name || '').trim();
      const displayName = serial || customName || id;
      machineNameMap.set(id, displayName);
    }

    // Update logs whose machine was resolved
    let updated = 0;
    const bulkOps: Array<{ updateOne: { filter: { _id: string }; update: { $set: { resourceName: string } } } }> = [];

    for (const log of logsToResolve) {
      const rawName = String(log.resourceName);
      if (!OBJECT_ID_REGEX.test(rawName)) continue;
      const resolved = machineNameMap.get(rawName);
      if (resolved && resolved !== rawName) {
        bulkOps.push({
          updateOne: {
            filter: { _id: String(log._id) },
            update: { $set: { resourceName: resolved } },
          },
        });
        updated++;
      }
    }

    if (bulkOps.length > 0) {
      await ActivityLog.bulkWrite(bulkOps as Parameters<typeof ActivityLog.bulkWrite>[0]);
    }

    // Re-count remaining after update
    const remaining = await ActivityLog.countDocuments({
      resourceName: { $regex: /^[a-fA-F0-9]{24}$/ },
      deletedAt: null,
    });

    return NextResponse.json({ success: true, updated, total, remaining });
  });
}
