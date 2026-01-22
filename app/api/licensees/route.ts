/**
 * Licensees API Route
 *
 * This route handles licensee management operations including fetching, creating, updating, and deleting licensees.
 * It supports:
 * - Role-based access control (filtering by accessible licensees)
 * - Licensee filtering by ID or name
 * - Pagination
 * - Licensee creation with validation
 * - Licensee updates
 * - Licensee deletion
 *
 * @module app/api/licensees/route
 */

import { getUserAccessibleLicenseesFromToken } from '@/app/api/lib/helpers/licenseeFilter';
import {
  createLicensee as createLicenseeHelper,
  deleteLicensee as deleteLicenseeHelper,
  formatLicenseesForResponse,
  getAllLicensees,
  updateLicensee as updateLicenseeHelper,
} from '@/app/api/lib/helpers/licensees';
import { connectDB } from '@/app/api/lib/middleware/db';
import { apiLogger } from '@/app/api/lib/utils/logger';
import { NextRequest } from 'next/server';

/**
 * Main GET handler for fetching licensees
 *
 * Flow:
 * 1. Initialize API logging
 * 2. Connect to database
 * 3. Parse query parameters
 * 4. Get user's accessible licensees
 * 5. Fetch all licensees from database
 * 6. Apply access control filtering
 * 7. Apply licensee filter if provided
 * 8. Apply pagination
 * 9. Return paginated licensee list
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const context = apiLogger.createContext(request, '/api/licensees');
  apiLogger.startLogging();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const licenseeFilter = searchParams.get('licensee');

    // ============================================================================
    // STEP 3: Get user's accessible licensees
    // ============================================================================
    const userLicenseeAccess = await getUserAccessibleLicenseesFromToken();

    // ============================================================================
    // STEP 4: Fetch all licensees from database
    // ============================================================================
    const licensees = await getAllLicensees();
    let formattedLicensees = await formatLicenseesForResponse(licensees);

    // ============================================================================
    // STEP 5: Apply access control filtering
    // ============================================================================
    if (userLicenseeAccess !== 'all') {
      const allowedIds = new Set(
        userLicenseeAccess.map(value => value.toString())
      );
      formattedLicensees = formattedLicensees.filter(licensee => {
        const licenseeId = (licensee as Record<string, unknown>)._id;
        if (!licenseeId) {
          return false;
        }
        return allowedIds.has(String(licenseeId));
      });
    }

    // ============================================================================
    // STEP 6: Apply licensee filter if provided
    // ============================================================================
    if (licenseeFilter && licenseeFilter !== 'all') {
      formattedLicensees = formattedLicensees.filter(licensee => {
        const licenseeId = (licensee as Record<string, unknown>)._id as string;
        const licenseeName = (licensee as Record<string, unknown>).name as string;
        return licenseeId === licenseeFilter || licenseeName === licenseeFilter;
      });
    }

    // ============================================================================
    // STEP 7: Apply pagination
    // ============================================================================
    const page = parseInt(searchParams.get('page') || '1');
    const requestedLimit = parseInt(searchParams.get('limit') || '50');
    const limit = Math.min(requestedLimit, 100); // Cap at 100 for performance
    const skip = (page - 1) * limit;

    const totalCount = formattedLicensees.length;
    const paginatedLicensees = formattedLicensees.slice(skip, skip + limit);

    // ============================================================================
    // STEP 8: Return paginated licensee list
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Licensees API] GET completed in ${duration}ms`);
    }

    apiLogger.logSuccess(
      context,
      `Successfully fetched ${totalCount} licensees (returning ${paginatedLicensees.length} on page ${page})`
    );

    return new Response(
      JSON.stringify({
        licensees: paginatedLicensees,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Licensees API] GET error after ${duration}ms:`, error);
    apiLogger.logError(context, 'Failed to fetch licensees', errorMessage);
    return new Response(
      JSON.stringify({ success: false, message: 'Failed to fetch licensees', error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Main POST handler for creating a new licensee
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse request body
 * 3. Validate required fields (name, country)
 * 4. Create licensee via helper function
 * 5. Return created licensee data
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const context = apiLogger.createContext(request, '/api/licensees');
  apiLogger.startLogging();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse request body
    // ============================================================================
    const body = await request.json();
    const { name, description, country, startDate, expiryDate } = body;

    // ============================================================================
    // STEP 3: Validate required fields
    // ============================================================================
    if (!name || !country) {
      apiLogger.logError(context, 'Licensee creation failed', 'Name and country are required');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Name and country are required',
        }),
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: Create licensee via helper function
    // ============================================================================
    const licensee = await createLicenseeHelper(
      { name, description, country, startDate, expiryDate },
      request
    );

    // ============================================================================
    // STEP 5: Return created licensee data
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Licensees API] POST completed in ${duration}ms`);
    }

    apiLogger.logSuccess(context, `Successfully created licensee ${name}`);
    return new Response(JSON.stringify({ success: true, licensee }), {
      status: 201,
    });
  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    const error = err as Error & { message?: string };
    console.error(`[Licensees API] POST error after ${duration}ms:`, error);
    apiLogger.logError(context, 'Licensee creation failed', error.message || 'Unknown error');
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500 }
    );
  }
}

/**
 * Main PUT handler for updating a licensee
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse request body
 * 3. Validate licensee ID
 * 4. Update licensee via helper function
 * 5. Return updated licensee data
 */
export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  const context = apiLogger.createContext(request, '/api/licensees');
  apiLogger.startLogging();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse request body
    // ============================================================================
    const body = await request.json();
    const {
      _id,
      name,
      description,
      country,
      startDate,
      expiryDate,
      isPaid,
      prevStartDate,
      prevExpiryDate,
    } = body;

    // ============================================================================
    // STEP 3: Validate licensee ID
    // ============================================================================
    if (!_id) {
      apiLogger.logError(context, 'Licensee update failed', 'ID is required');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'ID is required',
        }),
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: Update licensee via helper function
    // ============================================================================
    const updatedLicensee = await updateLicenseeHelper(
      {
        _id,
        name,
        description,
        country,
        startDate,
        expiryDate,
        isPaid,
        prevStartDate,
        prevExpiryDate,
      },
      request
    );

    // ============================================================================
    // STEP 5: Return updated licensee data
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Licensees API] PUT completed in ${duration}ms`);
    }

    apiLogger.logSuccess(context, `Successfully updated licensee ${_id}`);
    return new Response(
      JSON.stringify({ success: true, licensee: updatedLicensee }),
      { status: 200 }
    );
  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    const error = err as Error & { message?: string };
    console.error(`[Licensees API] PUT error after ${duration}ms:`, error);
    apiLogger.logError(context, 'Licensee update failed', error.message || 'Unknown error');
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500 }
    );
  }
}

/**
 * Main DELETE handler for deleting a licensee
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse request body
 * 3. Validate licensee ID
 * 4. Delete licensee via helper function
 * 5. Return success response
 */
export async function DELETE(request: NextRequest) {
  const startTime = Date.now();
  const context = apiLogger.createContext(request, '/api/licensees');
  apiLogger.startLogging();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse request body
    // ============================================================================
    const body = await request.json();
    const { _id } = body;

    // ============================================================================
    // STEP 3: Validate licensee ID
    // ============================================================================
    if (!_id) {
      apiLogger.logError(context, 'Licensee deletion failed', 'Licensee ID is required');
      return new Response(
        JSON.stringify({ success: false, message: 'Licensee ID is required' }),
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: Delete licensee via helper function
    // ============================================================================
    await deleteLicenseeHelper(_id, request);

    // ============================================================================
    // STEP 5: Return success response
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Licensees API] DELETE completed in ${duration}ms`);
    }

    apiLogger.logSuccess(context, `Successfully deleted licensee ${_id}`);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    const error = err as Error & { message?: string };
    console.error(`[Licensees API] DELETE error after ${duration}ms:`, error);
    apiLogger.logError(context, 'Licensee deletion failed', error.message || 'Unknown error');
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500 }
    );
  }
}

