/**
 * Database Reconnection Admin API Route
 *
 * This route handles database reconnection for admin operations.
 * It supports:
 * - Force database disconnection
 * - Database reconnection with new connection string
 * - Connection status checking
 * - Useful when .env file changes without server restart
 *
 * @module app/api/admin/reconnect-db/route
 */

import { connectDB, disconnectDB } from '@/app/api/lib/middleware/db';
import { NextResponse } from 'next/server';
import {
  logRouteCreate,
  logRouteError,
  logRouteFetch,
} from '@/app/api/lib/utils/routeLogger';

/**
 * POST /api/admin/reconnect-db
 *
 * Forces a full MongoDB disconnect and reconnect cycle. Useful after rotating
 * the MONGODB_URI environment variable without restarting the server. No
 * request body is required. No authentication guard — restrict at the
 * infrastructure/network level.
 */
export async function POST() {
  const startTime = Date.now();
  const functionName = 'POST /api/admin/reconnect-db';

  try {
    // ============================================================================
    // STEP 1: Disconnect existing database connection
    // ============================================================================
    await disconnectDB();

    // ============================================================================
    // STEP 2: Reconnect with new connection string
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 3: Return success response
    // ============================================================================
    const duration = Date.now() - startTime;
    logRouteCreate(
      functionName,
      'POST',
      '/api/admin/reconnect-db',
      1,
      null,
      duration
    );

    return NextResponse.json({
      success: true,
      message: 'Database reconnected successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logRouteError(
      functionName,
      'POST',
      '/api/admin/reconnect-db',
      errorMessage,
      null
    );
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/reconnect-db
 *
 * Returns a hint message directing callers to use POST, along with whether
 * MONGODB_URI is currently set. No side effects.
 */
export async function GET() {
  const functionName = 'GET /api/admin/reconnect-db';
  logRouteFetch(functionName, 'GET', '/api/admin/reconnect-db', 0, null);
  return NextResponse.json({
    message: 'Use POST to reconnect database',
    currentUri: process.env.MONGODB_URI ? 'Set' : 'Not set',
  });
}
