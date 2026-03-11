/**
 * Licencees API Route
 *
 * This route handles licencee management operations including fetching, creating, updating, and deleting licencees.
 * It supports:
 * - Role-based access control (filtering by accessible licencees)
 * - Licencee filtering by ID or name
 * - Pagination
 * - Licencee creation with validation
 * - Licencee updates
 * - Licencee deletion
 *
 * @module app/api/licencees/route
 */

import { getUserAccessibleLicenceesFromToken } from '@/app/api/lib/helpers/licenceeFilter';
import {
  createLicencee as createLicenceeHelper,
  deleteLicencee as deleteLicenceeHelper,
  formatLicenceesForResponse,
  getAllLicencees,
  updateLicencee as updateLicenceeHelper,
} from '@/app/api/lib/helpers/licencees';
import { connectDB } from '@/app/api/lib/middleware/db';
import { apiLogger } from '../lib/services/loggerService';
import { NextRequest } from 'next/server';

/**
 * Main GET handler for fetching licencees
 *
 * Flow:
 * 1. Initialize API logging
 * 2. Connect to database
 * 3. Parse query parameters
 * 4. Get user's accessible licencees
 * 5. Fetch all licencees from database
 * 6. Apply access control filtering
 * 7. Apply licencee filter if provided
 * 8. Apply pagination
 * 9. Return paginated licencee list
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const context = apiLogger.createContext(request, '/api/licencees');
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
    const licenceeFilter = (searchParams.get('licencee'));

    // ============================================================================
    // STEP 3: Get user's accessible licencees
    // ============================================================================
    const userLicenceeAccess = await getUserAccessibleLicenceesFromToken();

    // ============================================================================
    // STEP 4: Fetch all licencees from database
    // ============================================================================
    const licencees = await getAllLicencees();
    let formattedLicencees = await formatLicenceesForResponse(licencees);

    // ============================================================================
    // STEP 5: Apply access control filtering
    // ============================================================================
    if (userLicenceeAccess !== 'all') {
      const allowedIds = new Set(
        userLicenceeAccess.map(value => value.toString())
      );
      formattedLicencees = formattedLicencees.filter(licencee => {
        const licenceeId = (licencee as Record<string, unknown>)._id;
        if (!licenceeId) {
          return false;
        }
        return allowedIds.has(String(licenceeId));
      });
    }

    // ============================================================================
    // STEP 6: Apply licencee filter if provided
    // ============================================================================
    if (licenceeFilter && licenceeFilter !== 'all') {
      formattedLicencees = formattedLicencees.filter(licencee => {
        const licenceeId = (licencee as Record<string, unknown>)._id as string;
        const licenceeName = (licencee as Record<string, unknown>).name as string;
        return licenceeId === licenceeFilter || licenceeName === licenceeFilter;
      });
    }

    // ============================================================================
    // STEP 7: Apply pagination
    // ============================================================================
    const page = parseInt(searchParams.get('page') || '1');
    const requestedLimit = parseInt(searchParams.get('limit') || '50');
    const limit = Math.min(requestedLimit, 100); // Cap at 100 for performance
    const skip = (page - 1) * limit;

    const totalCount = formattedLicencees.length;
    const paginatedLicencees = formattedLicencees.slice(skip, skip + limit);

    // ============================================================================
    // STEP 8: Return paginated licencee list
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Licencees API] GET completed in ${duration}ms`);
    }

    apiLogger.logSuccess(
      context,
      `Successfully fetched ${totalCount} licencees (returning ${paginatedLicencees.length} on page ${page})`
    );

    return new Response(
      JSON.stringify({
        licencees: paginatedLicencees,
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
    console.error(`[Licencees API] GET error after ${duration}ms:`, error);
    apiLogger.logError(context, 'Failed to fetch licencees', errorMessage);
    return new Response(
      JSON.stringify({ success: false, message: 'Failed to fetch licencees', error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Main POST handler for creating a new licencee
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse request body
 * 3. Validate required fields (name, country)
 * 4. Create licencee via helper function
 * 5. Return created licencee data
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const context = apiLogger.createContext(request, '/api/licencees');
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
      apiLogger.logError(context, 'Licencee creation failed', 'Name and country are required');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Name and country are required',
        }),
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: Create licencee via helper function
    // ============================================================================
    const licencee = await createLicenceeHelper(
      { name, description, country, startDate, expiryDate },
      request
    );

    // ============================================================================
    // STEP 5: Return created licencee data
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Licencees API] POST completed in ${duration}ms`);
    }

    apiLogger.logSuccess(context, `Successfully created licencee ${name}`);
    return new Response(JSON.stringify({ success: true, licencee }), {
      status: 201,
    });
  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    const error = err as Error & { message?: string };
    console.error(`[Licencees API] POST error after ${duration}ms:`, error);
    apiLogger.logError(context, 'Licencee creation failed', error.message || 'Unknown error');
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500 }
    );
  }
}

/**
 * Main PUT handler for updating a licencee
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse request body
 * 3. Validate licencee ID
 * 4. Update licencee via helper function
 * 5. Return updated licencee data
 */
export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  const context = apiLogger.createContext(request, '/api/licencees');
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
    // STEP 3: Validate licencee ID
    // ============================================================================
    if (!_id) {
      apiLogger.logError(context, 'Licencee update failed', 'ID is required');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'ID is required',
        }),
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: Update licencee via helper function
    // ============================================================================
    const updatedLicencee = await updateLicenceeHelper(
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
    // STEP 5: Return updated licencee data
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Licencees API] PUT completed in ${duration}ms`);
    }

    apiLogger.logSuccess(context, `Successfully updated licencee ${_id}`);
    return new Response(
      JSON.stringify({ success: true, licencee: updatedLicencee }),
      { status: 200 }
    );
  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    const error = err as Error & { message?: string };
    console.error(`[Licencees API] PUT error after ${duration}ms:`, error);
    apiLogger.logError(context, 'Licencee update failed', error.message || 'Unknown error');
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500 }
    );
  }
}

/**
 * Main DELETE handler for deleting a licencee
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse request body
 * 3. Validate licencee ID
 * 4. Delete licencee via helper function
 * 5. Return success response
 */
export async function DELETE(request: NextRequest) {
  const startTime = Date.now();
  const context = apiLogger.createContext(request, '/api/licencees');
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
    // STEP 3: Validate licencee ID
    // ============================================================================
    if (!_id) {
      apiLogger.logError(context, 'Licencee deletion failed', 'Licencee ID is required');
      return new Response(
        JSON.stringify({ success: false, message: 'Licencee ID is required' }),
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: Delete licencee via helper function
    // ============================================================================
    await deleteLicenceeHelper(_id, request);

    // ============================================================================
    // STEP 5: Return success response
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Licencees API] DELETE completed in ${duration}ms`);
    }

    apiLogger.logSuccess(context, `Successfully deleted licencee ${_id}`);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    const error = err as Error & { message?: string };
    console.error(`[Licencees API] DELETE error after ${duration}ms:`, error);
    apiLogger.logError(context, 'Licencee deletion failed', error.message || 'Unknown error');
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500 }
    );
  }
}

