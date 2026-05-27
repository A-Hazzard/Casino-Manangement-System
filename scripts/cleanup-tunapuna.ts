/**
 * Database Cleanup Script - "Tunapuna Migration" (TypeScript)
 *
 * PURPOSE: Purges all data from the database EXCEPT for the specified Gaming Location.
 * TARGET ID: 6994e923114811f8b39d893d
 *
 * RUN COMMAND: bun run scripts/cleanup-tunapuna.ts
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI =
  'mongodb://sunny1:87ydaiuhdsia2e@147.182.133.136:27017/sas-aaron?authSource=admin';
const TARGET_LOCATION_ID = '6994e923114811f8b39d893d';

async function runCleanup() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('\n🚀 --- STARTING DATABASE CLEANUP ---');
    console.log(`📡 Connecting to: ${MONGODB_URI.split('@')[1]}`);
    await client.connect();
    const db = client.db();

    console.log(`📍 Target Location: ${TARGET_LOCATION_ID}\n`);

    // Project rules say use 'unknown' instead of 'any' for unknown shapes
    type TypedDocument = { _id: string } & Record<string, unknown>;

    // 1. Gaming Locations Cleanup
    // Keep only the target location
    const locResult = await db
      .collection<TypedDocument>('gaminglocations')
      .deleteMany({
        _id: { $ne: TARGET_LOCATION_ID },
      });
    console.log(
      `✅ Deleted ${locResult.deletedCount} other locations from 'gaminglocations'.`
    );

    // 2. Machines Cleanup
    const machResult = await db
      .collection<
        { gamingLocation: string } & Record<string, unknown>
      >('machines')
      .deleteMany({
        gamingLocation: { $ne: TARGET_LOCATION_ID },
      });
    console.log(
      `✅ Deleted ${machResult.deletedCount} machines not belonging to target from 'machines'.`
    );

    // 3. Meters Cleanup
    const meterResult = await db
      .collection<{ location: string } & Record<string, unknown>>('meters')
      .deleteMany({
        location: { $ne: TARGET_LOCATION_ID },
      });
    console.log(
      `✅ Deleted ${meterResult.deletedCount} meter records not belonging to target from 'meters'.`
    );

    // 4. Users Cleanup
    // Delete users who are NOT assigned to this location
    const userResult = await db
      .collection<
        { assignedLocations: string[] } & Record<string, unknown>
      >('users')
      .deleteMany({
        assignedLocations: { $ne: TARGET_LOCATION_ID },
      });
    console.log(
      `✅ Deleted ${userResult.deletedCount} users not assigned to target from 'users'.`
    );

    // 5. Supporting Collections (Purge everything not associated)
    type CleanupConfig = {
      name: string;
      field: string;
      isActivity?: boolean;
    };

    const collectionsToCleanup: CleanupConfig[] = [
      { name: 'CollectionReport', field: 'location' },
      { name: 'machinesessions', field: 'location' },
      { name: 'ReportedMachine', field: 'locationId' },
      { name: 'SoftCount', field: 'locationId' },
      { name: 'vaultTransactions', field: 'locationId' },
      { name: 'activityLogs', field: 'resourceId', isActivity: true },
      { name: 'floatRequests', field: 'locationId' },
      { name: 'cashierShifts', field: 'locationId' },
      { name: 'vaultNotifications', field: 'locationId' },
      { name: 'MovementRequest', field: 'locationId' },
    ];

    for (const coll of collectionsToCleanup) {
      try {
        let filter: Record<string, unknown> = {};

        if (coll.isActivity) {
          filter = {
            resource: 'location',
            resourceId: { $ne: TARGET_LOCATION_ID },
          };
        } else {
          filter[coll.field] = { $ne: TARGET_LOCATION_ID };
        }

        const result = await db
          .collection<Record<string, unknown>>(coll.name)
          .deleteMany(filter);
        console.log(
          `✅ Deleted ${result.deletedCount} records from '${coll.name}'.`
        );
      } catch (e) {
        console.warn(
          `⚠️ Could not clean ${coll.name}: ${e instanceof Error ? e.message : 'Unknown error'}`
        );
      }
    }

    console.log('\n✨ --- CLEANUP COMPLETE ---');
  } catch (err) {
    console.error(
      '\n❌ CRITICAL ERROR DURING CLEANUP:',
      err instanceof Error ? err.message : 'Unknown error'
    );
  } finally {
    await client.close();
  }
}

runCleanup();
