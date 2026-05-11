/**
 * Migration: Convert single multiplier to dual multipliers
 * For existing reviewer users, replicate single multiplier value to both new fields
 *
 * Usage: npx ts-node scripts/migrate-multiplier-to-dual.ts
 */

import UserModel from '../app/api/lib/models/user';
import { connectDB } from '../app/api/lib/middleware/db';

async function migrateMultipliers() {
  try {
    await connectDB();
    console.log('[Migration] Connected to MongoDB');

    // Find all users with reviewer role and existing multiplier.
    // Use .lean() so Mongoose returns plain JS objects — exposes all MongoDB fields
    // including `multiplier` even though it's no longer in the schema.
    const reviewersWithMultiplier = await UserModel.find({
      roles: 'reviewer',
      multiplier: { $exists: true, $ne: null },
    }).lean<{ _id: string; roles: string[]; multiplier?: number | null }[]>();

    console.log(
      `[Migration] Found ${reviewersWithMultiplier.length} reviewer users to migrate`
    );

    if (reviewersWithMultiplier.length === 0) {
      console.log('[Migration] No users to migrate. Migration complete.');
      process.exit(0);
    }

    let successCount = 0;
    let errorCount = 0;

    for (const user of reviewersWithMultiplier) {
      const oldMultiplier = user.multiplier || 0;

      try {
        await UserModel.updateOne(
          { _id: user._id },
          {
            $set: {
              moneyInMultiplier: oldMultiplier,
              moneyOutAndJackpotMultiplier: oldMultiplier,
            },
            $unset: { multiplier: '' },
          }
        );

        console.log(
          `✓ Migrated user ${user._id}: multiplier ${oldMultiplier} → both new fields`
        );
        successCount++;
      } catch (error) {
        console.error(
          `✗ Failed to migrate user ${user._id}:`,
          error instanceof Error ? error.message : String(error)
        );
        errorCount++;
      }
    }

    console.log(`\n[Migration] Complete:`);
    console.log(`  - Successful: ${successCount}`);
    console.log(`  - Failed: ${errorCount}`);
    console.log(`  - Total: ${successCount + errorCount}`);

    if (errorCount === 0) {
      console.log('\n✅ Migration completed successfully');
    } else {
      console.log('\n⚠️ Migration completed with errors');
    }

    process.exit(errorCount > 0 ? 1 : 0);
  } catch (error) {
    console.error(
      '❌ Migration failed:',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

migrateMultipliers();
