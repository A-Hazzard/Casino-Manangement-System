/**
 * Firmwares Migrate API Route
 *
 * This route handles firmware schema migration operations.
 * It supports:
 * - GET: Checking if migration is needed
 * - POST: Running the migration for existing firmware records
 * - Useful for updating firmware records to match new schema requirements
 *
 * @module app/api/firmwares/migrate/route
 * @features Schema Migration, Data Migration, Firmware Management
 */

import {
  migrateFirmwareSchema,
  checkMigrationNeeded,
} from '@/lib/utils/firmwareMigration';
import { NextResponse } from 'next/server';

/**
 * Main POST handler for running firmware migration
 *
 * Flow:
 * 1. Check if migration is needed
 * 2. Run migration if needed
 * 3. Return migration result
 */
export async function POST() {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Check if migration is needed
    // ============================================================================
    const needsMigration = await checkMigrationNeeded();

    if (!needsMigration) {
      const duration = Date.now() - startTime;
      if (duration > 1000) {
        console.warn(`[Firmwares Migrate POST API] Completed in ${duration}ms`);
      }
      return NextResponse.json(
        {
          message: 'No migration needed - all firmware records are up to date',
        },
        { status: 200 }
      );
    }

    // ============================================================================
    // STEP 2: Run migration if needed
    // ============================================================================
    await migrateFirmwareSchema();

    // ============================================================================
    // STEP 3: Return migration result
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Firmwares Migrate POST API] Completed in ${duration}ms`);
    }

    return NextResponse.json(
      { message: 'Firmware migration completed successfully' },
      { status: 200 }
    );
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Firmwares Migrate POST API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { error: 'Failed to migrate firmware records' },
      { status: 500 }
    );
  }
}

/**
 * Main GET handler for checking migration status
 *
 * Flow:
 * 1. Check if migration is needed
 * 2. Return migration status
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Check if migration is needed
    // ============================================================================
    const needsMigration = await checkMigrationNeeded();

    // ============================================================================
    // STEP 2: Return migration status
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Firmwares Migrate GET API] Completed in ${duration}ms`);
    }

    return NextResponse.json(
      {
        needsMigration,
        message: needsMigration
          ? 'Migration is needed for existing firmware records'
          : 'No migration needed',
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Firmwares Migrate GET API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { error: 'Failed to check migration status' },
      { status: 500 }
    );
  }
}
