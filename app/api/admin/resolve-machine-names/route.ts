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
import type { ActivityLogDocument, GamingMachine } from '@/shared/types';
import { NextRequest, NextResponse } from 'next/server';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;

/**
 * GET /api/admin/resolve-machine-names
 *
 * Back-fill maintenance operation that finds activity log entries whose
 * `resourceName` is a raw 24-character ObjectID hex string, resolves each ID to
 * the machine's human-readable name (serialNumber or custom.name), and updates
 * the log documents in place. Call repeatedly until `remaining` reaches zero.
 * Restricted to developer role.
 *
 * Query params:
 * @param {number} [limit] - Optional. Maximum logs to process per call (default 100, max 500).
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async ({ userRoles }) => {
    const startTime = Date.now();
    const functionName = 'GET /api/admin/resolve-machine-names';
    const user = extractUserFromRequest(request);

    const normalizedRoles = userRoles.map(r => String(r).toLowerCase());
    if (!normalizedRoles.includes('developer')) {
      logRouteError(
        functionName,
        'GET',
        '/api/admin/resolve-machine-names',
        'Developer access required',
        user
      );
      return NextResponse.json(
        { success: false, message: 'Developer access required' },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);

    const total = await ActivityLog.countDocuments({
      resourceName: { $regex: /^[a-fA-F0-9]{24}$/ },
      deletedAt: null,
    });

    if (total === 0) {
      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/admin/resolve-machine-names',
        0,
        user,
        duration
      );
      return NextResponse.json({
        success: true,
        updated: 0,
        total: 0,
        remaining: 0,
      });
    }

    const logsToResolve = await ActivityLog.find(
      { resourceName: { $regex: /^[a-fA-F0-9]{24}$/ }, deletedAt: null },
      { _id: 1, resourceName: 1 }
    )
      .limit(limit)
      .lean<ActivityLogDocument[]>();

    const objectIds = [
      ...new Set(
        logsToResolve
          .map(l => String(l.resourceName))
          .filter(n => OBJECT_ID_REGEX.test(n))
      ),
    ];

    const machines = await Machine.find(
      { _id: { $in: objectIds } },
      { _id: 1, serialNumber: 1, 'custom.name': 1 }
    ).lean<GamingMachine[]>();

    const machineNameMap = new Map<string, string>();
    for (const machine of machines) {
      const id = String(machine._id);
      const serial = machine.serialNumber?.trim() || '';
      const customName = (machine.custom?.name || '').trim();
      const displayName = serial || customName || id;
      machineNameMap.set(id, displayName);
    }

    let updated = 0;
    const bulkOps: Array<{
      updateOne: {
        filter: { _id: string };
        update: { $set: { resourceName: string } };
      };
    }> = [];

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
      await ActivityLog.bulkWrite(
        bulkOps as Parameters<typeof ActivityLog.bulkWrite>[0]
      );
    }

    const remaining = await ActivityLog.countDocuments({
      resourceName: { $regex: /^[a-fA-F0-9]{24}$/ },
      deletedAt: null,
    });

    const duration = Date.now() - startTime;
    logRouteFetch(
      functionName,
      'GET',
      '/api/admin/resolve-machine-names',
      updated,
      user,
      duration
    );
    return NextResponse.json({ success: true, updated, total, remaining });
  });
}
