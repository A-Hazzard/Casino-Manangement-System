/**
 * Rename Licencee Migration API Route
 *
 * One-off data migration that renames legacy licencee field variants across all
 * MongoDB collections using $rename. Safe to re-run — documents that already use
 * the target field name are not modified.
 *
 * @module app/api/admin/migrations/rename-licencee/route
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

/**
 * GET /api/admin/migrations/rename-licencee
 *
 * Iterates every collection in the connected database and applies $rename
 * operations to normalise licencee field names (e.g. `licencee`,
 * `rel.licencee`, `assignedLicencees`, `licenceeId`, `rel.licenceeId`).
 * Returns a list of collections and field renames where at least one document
 * was modified. No request body or query parameters are required.
 */
export async function GET() {
  try {
    await connectDB();

    // To avoid dynamic imports matching everything that might fail in Webpack,
    // we just use the native mongoose connection to get all collections and update them
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: 'DB connection not ready' }, { status: 500 });
    }

    const collections = await db.collections();
    const results: Array<{ collection: string; desc: string; modifiedCount: number }> = [];

    for (const collection of collections) {
      const collectionName = collection.collectionName;

      // Group all rename operations we might need
      const renames: Array<{ filter: Record<string, unknown>, rename: Record<string, string>, desc: string }> = [
        { filter: { licencee: { $exists: true } }, rename: { licencee: 'licencee' }, desc: 'licencee -> licencee' },
        { filter: { 'rel.licencee': { $exists: true } }, rename: { 'rel.licencee': 'rel.licencee' }, desc: 'rel.licencee -> rel.licencee' },
        { filter: { assignedLicencees: { $exists: true } }, rename: { assignedLicencees: 'assignedLicencees' }, desc: 'assignedLicencees -> assignedLicencees' },
        { filter: { licenceeId: { $exists: true } }, rename: { licenceeId: 'licenceeId' }, desc: 'licenceeId -> licenceeId' },
        { filter: { 'rel.licenceeId': { $exists: true } }, rename: { 'rel.licenceeId': 'rel.licenceeId' }, desc: 'rel.licenceeId -> rel.licenceeId' },
      ];

      for (const { filter, rename, desc } of renames) {
        const result = await collection.updateMany(filter, { $rename: rename });
        if (result && result.modifiedCount > 0) {
          results.push({
            collection: collectionName,
            desc,
            modifiedCount: result.modifiedCount
          });
        }
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
