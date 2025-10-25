import { NextResponse } from 'next/server';
import {
  migrateFirmwareSchema,
  checkMigrationNeeded,
} from '@/lib/utils/firmwareMigration';

/**
 * POST /api/firmwares/migrate
 * Runs migration for existing firmware records
 */
export async function POST() {
  try {
    // Check if migration is needed
    const needsMigration = await checkMigrationNeeded();

    if (!needsMigration) {
      return NextResponse.json(
        {
          message: 'No migration needed - all firmware records are up to date',
        },
        { status: 200 }
      );
    }

    // Run the migration
    await migrateFirmwareSchema();

    return NextResponse.json(
      { message: 'Firmware migration completed successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error during firmware migration:', error);
    return NextResponse.json(
      { error: 'Failed to migrate firmware records' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/firmwares/migrate
 * Check if migration is needed
 */
export async function GET() {
  try {
    const needsMigration = await checkMigrationNeeded();

    return NextResponse.json(
      {
        needsMigration,
        message: needsMigration
          ? 'Migration is needed for existing firmware records'
          : 'No migration needed',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error checking migration status:', error);
    return NextResponse.json(
      { error: 'Failed to check migration status' },
      { status: 500 }
    );
  }
}
