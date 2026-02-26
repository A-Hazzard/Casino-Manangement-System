import { connectDB } from '@/app/api/lib/middleware/db';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

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
    const results: any[] = [];

    for (const collection of collections) {
      const collectionName = collection.collectionName;

      // Group all rename operations we might need
      const renames: Array<{ filter: Record<string, any>, rename: Record<string, string>, desc: string }> = [
        { filter: { licencee: { $exists: true } }, rename: { licencee: 'licensee' }, desc: 'licencee -> licensee' },
        { filter: { 'rel.licencee': { $exists: true } }, rename: { 'rel.licencee': 'rel.licensee' }, desc: 'rel.licencee -> rel.licensee' },
        { filter: { assignedLicencees: { $exists: true } }, rename: { assignedLicencees: 'assignedLicensees' }, desc: 'assignedLicencees -> assignedLicensees' },
        { filter: { licenceeId: { $exists: true } }, rename: { licenceeId: 'licenseeId' }, desc: 'licenceeId -> licenseeId' },
        { filter: { 'rel.licenceeId': { $exists: true } }, rename: { 'rel.licenceeId': 'rel.licenseeId' }, desc: 'rel.licenceeId -> rel.licenseeId' },
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
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
