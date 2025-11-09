import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, generateAccessToken } from '@/lib/utils/auth';

/**
 * POST /api/auth/refresh-token
 * Refreshes the user's authentication token if they have been active
 * This endpoint is called by the activity monitor to keep sessions alive
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'No authentication token found' },
        { status: 401 }
      );
    }

    // Verify the current token
    const payload = await verifyAccessToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Generate a new token with the same payload (keeping the same session)
    const newToken = await generateAccessToken({
      _id: payload._id,
      emailAddress: payload.emailAddress,
      username: payload.username,
      isEnabled: payload.isEnabled,
      roles: payload.roles,
      rel: payload.rel,
      sessionId: payload.sessionId,
      dbContext: payload.dbContext,
    });

    // Set the new token in cookies
    const response = NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
    });

    response.cookies.set('token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 120 * 60, // 2 hours (same as token expiration)
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    );
  }
}
