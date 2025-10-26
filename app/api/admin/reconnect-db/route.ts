import { NextRequest, NextResponse } from 'next/server';
import { connectDB, disconnectDB } from '../../lib/middleware/db';

/**
 * POST /api/admin/reconnect-db
 * Force database reconnection
 * Useful when .env file changes without server restart
 */
export async function POST(_request: NextRequest) {
  try {
    console.log('🔄 [ADMIN] Force database reconnection requested');

    // Disconnect existing connection
    await disconnectDB();
    console.log('✅ [ADMIN] Old connection closed');

    // Reconnect with new connection string
    await connectDB();
    console.log('✅ [ADMIN] New connection established');

    return NextResponse.json({
      success: true,
      message: 'Database reconnected successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ [ADMIN] Error reconnecting to database:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/reconnect-db
 * Get connection status
 */
export async function GET(_request: NextRequest) {
  return NextResponse.json({
    message: 'Use POST to reconnect database',
    currentUri: process.env.MONGO_URI ? 'Set' : 'Not set',
  });
}

