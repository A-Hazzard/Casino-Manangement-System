/**
 * Cabinet API Route
 *
 * This route handles cabinet operations by redirecting to location-specific endpoints.
 * It supports:
 * - GET: Redirects to location-specific cabinet endpoint
 * - PUT: Redirects to location-specific cabinet endpoint
 * - PATCH: Redirects to location-specific cabinet endpoint
 * - DELETE: Redirects to location-specific cabinet endpoint
 *
 * All operations find the cabinet's location and redirect to the appropriate endpoint.
 *
 * @module app/api/cabinets/[cabinetId]/route
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { Machine } from '@/app/api/lib/models/machines';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for cabinet - redirects to location-specific endpoint
 *
 * Flow:
 * 1. Parse cabinetId from route parameters
 * 2. Connect to database
 * 3. Find cabinet (machine) by ID
 * 4. Get cabinet's location ID
 * 5. Redirect to location-specific cabinet endpoint
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cabinetId: string }> }
) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse cabinetId from route parameters
    // ============================================================================
    const { cabinetId } = await params;

    // ============================================================================
    // STEP 2: Connect to database and check permissions
    // ============================================================================
    await connectDB();

    // Import getUserFromServer for role check
    const { getUserFromServer } = await import('@/app/api/lib/helpers/users');
    const user = await getUserFromServer();

    if (user) {
      const userRoles =
        (user.roles as string[])?.map(r => r.toLowerCase()) || [];
      const isCollectorOnly =
        userRoles.includes('collector') &&
        !userRoles.includes('developer') &&
        !userRoles.includes('admin') &&
        !userRoles.includes('manager') &&
        !userRoles.includes('location admin') &&
        !userRoles.includes('technician');

      if (isCollectorOnly) {
        return NextResponse.json(
          {
            success: false,
            error: 'Collectors do not have access to cabinets',
          },
          { status: 403 }
        );
      }
    }

    // ============================================================================
    // STEP 3: Find cabinet (machine) by ID
    // ============================================================================
    // Find the cabinet to get its location
    // CRITICAL: Use findOne with _id instead of findById (repo rule)
    const cabinet = await Machine.findOne({ _id: cabinetId });
    if (!cabinet) {
      return NextResponse.json(
        { success: false, message: 'Cabinet not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 4: Get cabinet's location ID
    // ============================================================================
    // Redirect to the location-specific endpoint
    const locationId = cabinet.gamingLocation;
    if (!locationId) {
      return NextResponse.json(
        { success: false, message: 'Cabinet has no associated location' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 5: Redirect to location-specific cabinet endpoint
    // ============================================================================
    // Forward the request to the location-specific endpoint
    const url = new URL(request.url);
    const newUrl = new URL(
      `/api/locations/${locationId}/cabinets/${cabinetId}`,
      url.origin
    );
    newUrl.search = url.search; // Preserve query parameters

    return NextResponse.redirect(newUrl);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(`[Cabinet API GET] Error after ${duration}ms:`, errorMessage);
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PUT handler for cabinet - redirects to location-specific endpoint
 *
 * Flow:
 * 1. Parse cabinetId from route parameters
 * 2. Connect to database
 * 3. Find cabinet and get location ID
 * 4. Redirect to location-specific cabinet endpoint
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ cabinetId: string }> }
) {
  const startTime = Date.now();

  try {
    const { cabinetId } = await params;
    await connectDB();

    // CRITICAL: Use findOne with _id instead of findById (repo rule)
    const cabinet = await Machine.findOne({ _id: cabinetId });
    if (!cabinet) {
      return NextResponse.json(
        { success: false, message: 'Cabinet not found' },
        { status: 404 }
      );
    }

    const locationId = cabinet.gamingLocation;
    if (!locationId) {
      return NextResponse.json(
        { success: false, message: 'Cabinet has no associated location' },
        { status: 400 }
      );
    }

    const url = new URL(request.url);
    const newUrl = new URL(
      `/api/locations/${locationId}/cabinets/${cabinetId}`,
      url.origin
    );

    return NextResponse.redirect(newUrl);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(`[Cabinet API PUT] Error after ${duration}ms:`, errorMessage);
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PATCH handler for cabinet - redirects to location-specific endpoint
 *
 * Flow:
 * 1. Parse cabinetId from route parameters
 * 2. Connect to database
 * 3. Find cabinet and get location ID
 * 4. Redirect to location-specific cabinet endpoint
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cabinetId: string }> }
) {
  const startTime = Date.now();

  try {
    const { cabinetId } = await params;
    await connectDB();

    // CRITICAL: Use findOne with _id instead of findById (repo rule)
    const cabinet = await Machine.findOne({ _id: cabinetId });
    if (!cabinet) {
      return NextResponse.json(
        { success: false, message: 'Cabinet not found' },
        { status: 404 }
      );
    }

    const locationId = cabinet.gamingLocation;
    if (!locationId) {
      return NextResponse.json(
        { success: false, message: 'Cabinet has no associated location' },
        { status: 400 }
      );
    }

    const url = new URL(request.url);
    const newUrl = new URL(
      `/api/locations/${locationId}/cabinets/${cabinetId}`,
      url.origin
    );

    return NextResponse.redirect(newUrl);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Cabinet API PATCH] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler for cabinet - redirects to location-specific endpoint
 *
 * Flow:
 * 1. Parse cabinetId from route parameters
 * 2. Connect to database
 * 3. Find cabinet and get location ID
 * 4. Redirect to location-specific cabinet endpoint
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ cabinetId: string }> }
) {
  const startTime = Date.now();

  try {
    const { cabinetId } = await params;
    await connectDB();

    // CRITICAL: Use findOne with _id instead of findById (repo rule)
    const cabinet = await Machine.findOne({ _id: cabinetId });
    if (!cabinet) {
      return NextResponse.json(
        { success: false, message: 'Cabinet not found' },
        { status: 404 }
      );
    }

    const locationId = cabinet.gamingLocation;
    if (!locationId) {
      return NextResponse.json(
        { success: false, message: 'Cabinet has no associated location' },
        { status: 400 }
      );
    }

    const url = new URL(request.url);
    const newUrl = new URL(
      `/api/locations/${locationId}/cabinets/${cabinetId}`,
      url.origin
    );

    return NextResponse.redirect(newUrl);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Cabinet API DELETE] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
