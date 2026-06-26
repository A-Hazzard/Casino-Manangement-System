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
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import {
  logRouteFetch,
  logRouteCreate,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main POST handler for running firmware migration
 *
 * Flow:
 * 1. Check if migration is needed
 * 2. Run migration if needed
 * 3. Return migration result
 */
export async function POST(request: NextRequest) {
  return withApiAuth(request, async ({ isAdminOrDev }) => {
    const startTime = Date.now();
    const functionName = 'POST /api/firmwares/migrate';
    const user = extractUserFromRequest(request);

    if (!isAdminOrDev) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
      // ============================================================================
      // STEP 1: Check if migration is needed
      // ============================================================================
      const needsMigration = await checkMigrationNeeded();

      if (!needsMigration) {
        const duration = Date.now() - startTime;
        logRouteFetch(
          functionName,
          'POST',
          '/api/firmwares/migrate',
          0,
          user,
          duration
        );
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
      logRouteCreate(
        functionName,
        'POST',
        '/api/firmwares/migrate',
        1,
        user,
        duration
      );
      if (Date.now() - startTime > 1000)
        console.warn(`[${functionName}] slow: ${Date.now() - startTime}ms`);

      return NextResponse.json(
        { message: 'Firmware migration completed successfully' },
        { status: 200 }
      );
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Internal server error';
      logRouteError(
        functionName,
        'POST',
        '/api/firmwares/migrate',
        errorMessage,
        user
      );
      return NextResponse.json(
        { error: 'Failed to migrate firmware records' },
        { status: 500 }
      );
    }
  });
}

/**
 * Main GET handler for checking migration status
 *
 * Flow:
 * 1. Check if migration is needed
 * 2. Return migration status
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async ({ isAdminOrDev }) => {
    const startTime = Date.now();
    const functionName = 'GET /api/firmwares/migrate';
    const user = extractUserFromRequest(request);

    if (!isAdminOrDev) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
      // ============================================================================
      // STEP 1: Check if migration is needed
      // ============================================================================
      const needsMigration = await checkMigrationNeeded();

      // ============================================================================
      // STEP 2: Return migration status
      // ============================================================================
      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/firmwares/migrate',
        1,
        user,
        duration
      );
      if (Date.now() - startTime > 1000)
        console.warn(`[${functionName}] slow: ${Date.now() - startTime}ms`);

      return NextResponse.json(
        {
          needsMigration,
          message: needsMigration
            ? 'Migration is needed for existing firmware records'
            : 'No migration needed',
        },
        { status: 200 }
      );
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Internal server error';
      logRouteError(
        functionName,
        'GET',
        '/api/firmwares/migrate',
        errorMessage,
        user
      );
      return NextResponse.json(
        { error: 'Failed to check migration status' },
        { status: 500 }
      );
    }
  });
}
