/**
 * Create Indexes Admin API Route
 *
 * This route handles creating database indexes for improved query performance.
 *
 * @module app/api/admin/create-indexes/route
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { CollectionReport } from '@/app/api/lib/models/collectionReport';
import { Collections } from '@/app/api/lib/models/collections';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { MachineEvent } from '@/app/api/lib/models/machineEvents';
import { Machine } from '@/app/api/lib/models/machines';
import { MachineSession } from '@/app/api/lib/models/machineSessions';
import { Member } from '@/app/api/lib/models/members';
import { Meters } from '@/app/api/lib/models/meters';
import UserModel from '@/app/api/lib/models/user';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/admin/create-indexes
 *
 * Creates MongoDB indexes across all major collections to improve query
 * performance. Safe to re-run — MongoDB skips indexes that already exist.
 * Restricted to admin and developer roles. Returns a per-collection status
 * report listing successes and any errors encountered.
 */
export async function POST(request: NextRequest) {
  return withApiAuth(request, async ({ isAdminOrDev }) => {
    if (!isAdminOrDev) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const results: string[] = [];

    // Individual collection index creation with localized error handling
    const collections = [
      { model: Machine, name: 'Machine', indexes: [{ serialNumber: 1 }, { gamingLocation: 1 }, { assetStatus: 1 }, { cabinetType: 1 }, { relayId: 1 }, { deletedAt: 1 }] },
      { model: GamingLocations, name: 'GamingLocations', indexes: [{ name: 1 }, { address: 1 }, { deletedAt: 1 }] },
      { model: MachineEvent, name: 'MachineEvent', indexes: [{ machine: 1, date: -1 }, { machineId: 1, date: -1 }, { relay: 1, date: -1 }, { cabinetId: 1, date: -1 }, { date: -1 }, { eventType: 1 }, { description: 'text' }, { gameName: 1 }] },
      { model: Meters, name: 'Meters', indexes: [{ machineId: 1 }, { date: 1 }, { locationId: 1 }] },
      { model: Collections, name: 'Collections', indexes: [{ machineId: 1 }, { locationId: 1 }, { date: 1 }] },
      { model: CollectionReport, name: 'CollectionReport', indexes: [{ locationId: 1 }, { date: 1 }, { reportId: 1 }] },
      { model: Member, name: 'Members', indexes: [{ memberId: 1 }, { 'profile.email': 1 }, { phoneNumber: 1 }, { deletedAt: 1 }] },
      { model: MachineSession, name: 'Sessions', indexes: [{ memberId: 1 }, { machineId: 1 }, { startTime: 1 }, { endTime: 1 }] },
      { model: UserModel, name: 'Users', indexes: [{ emailAddress: 1 }, { roles: 1 }, { isEnabled: 1 }] },
    ];

    for (const col of collections) {
      try {
        for (const index of col.indexes) {
          await (col.model as unknown as { collection: { createIndex: (index: object) => Promise<string> } }).collection.createIndex(index);
        }
        results.push(`${col.name} indexes created successfully`);
      } catch (error) {
        results.push(`${col.name} indexes error: ${error}`);
      }
    }

    return NextResponse.json({ success: true, message: 'Indexes created successfully', results });
  });
}

/**
 * GET /api/admin/create-indexes
 *
 * Returns a hint message directing callers to use POST. No side effects.
 * Lists the collection names that are eligible for index creation.
 */
export async function GET(request: NextRequest) {
    return withApiAuth(request, async () => {
        return NextResponse.json({
            message: 'Use POST to create indexes',
            collections: ['members', 'machinesessions', 'machineevents'],
        });
    });
}
