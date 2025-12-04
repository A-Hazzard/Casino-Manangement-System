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

/**
 * Main POST handler for forcing database reconnection
 *
 * Flow:
 * 1. Disconnect existing database connection
 * 2. Reconnect with new connection string
 * 3. Return success response
 */
export async function POST() {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Disconnect existing database connection
    // ============================================================================
    console.log('🔄 [ADMIN] Force database reconnection requested');
    await disconnectDB();
    console.log('✅ [ADMIN] Old connection closed');

    // ============================================================================
    // STEP 2: Reconnect with new connection string
    // ============================================================================
    await connectDB();
    console.log('✅ [ADMIN] New connection established');

    // ============================================================================
    // STEP 3: Return success response
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Admin Reconnect DB API] Completed in ${duration}ms`);
    }

    return NextResponse.json({
      success: true,
      message: 'Database reconnected successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[Admin Reconnect DB API] Error after ${duration}ms:`,
      errorMessage
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
 * GET handler for checking connection status
 *
 * Flow:
 * 1. Return connection status information
 */
export async function GET() {
  return NextResponse.json({
    message: 'Use POST to reconnect database',
    currentUri: process.env.MONGODB_URI ? 'Set' : 'Not set',
  });
}
