import { NextRequest } from 'next/server';
import { connectDB } from '@/app/api/lib/middleware/db';
import {
  getAllLicensees,
  formatLicenseesForResponse,
  createLicensee as createLicenseeHelper,
  updateLicensee as updateLicenseeHelper,
  deleteLicensee as deleteLicenseeHelper,
} from '@/app/api/lib/helpers/licensees';
import { getUserAccessibleLicenseesFromToken } from '@/app/api/lib/helpers/licenseeFilter';
import { apiLogger } from '@/app/api/lib/utils/logger';

export async function GET(request: NextRequest) {
  const context = apiLogger.createContext(request, '/api/licensees');
  apiLogger.startLogging();

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const licenseeFilter = searchParams.get('licensee');

    // Determine user's accessible licensees
    const userLicenseeAccess = await getUserAccessibleLicenseesFromToken();

    // Get all licensees from database
    const licensees = await getAllLicensees();
    let formattedLicensees = await formatLicenseesForResponse(licensees);

    // Enforce access control for non-admin users
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

    console.log('[API /api/licensees] Total licensees in DB:', formattedLicensees.length);
    console.log('[API /api/licensees] Licensee IDs:', formattedLicensees.map(l => (l as Record<string, unknown>)._id));

    // Filter by specific licensee if provided
    if (licenseeFilter && licenseeFilter !== 'all') {
      formattedLicensees = formattedLicensees.filter(licensee => {
        const licenseeId = (licensee as Record<string, unknown>)._id as string;
        const licenseeName = (licensee as Record<string, unknown>).name as string;
        return licenseeId === licenseeFilter || licenseeName === licenseeFilter;
      });
    }

    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const requestedLimit = parseInt(searchParams.get('limit') || '50');
    const limit = Math.min(requestedLimit, 100); // Cap at 100 for performance
    const skip = (page - 1) * limit;

    // Get total count before pagination
    const totalCount = formattedLicensees.length;

    // Apply pagination
    const paginatedLicensees = formattedLicensees.slice(skip, skip + limit);

    apiLogger.logSuccess(
      context,
      `Successfully fetched ${totalCount} licensees (returning ${paginatedLicensees.length} on page ${page})`
    );
    
    console.log('[API /api/licensees] Returning licensees:', paginatedLicensees);
    
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
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('[API /api/licensees] Error:', error);
    apiLogger.logError(context, 'Failed to fetch licensees', errorMessage);
    return new Response(
      JSON.stringify({ success: false, message: 'Failed to fetch licensees', error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST(request: NextRequest) {
  await connectDB();
  const body = await request.json();
  const { name, description, country, startDate, expiryDate } = body;

  if (!name || !country) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Name and country are required',
      }),
      { status: 400 }
    );
  }

  try {
    const licensee = await createLicenseeHelper(
      { name, description, country, startDate, expiryDate },
      request
    );

    return new Response(JSON.stringify({ success: true, licensee }), {
      status: 201,
    });
  } catch (err: unknown) {
    const error = err as Error & { message?: string };
    console.error('Error creating licensee:', error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  await connectDB();
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

  if (!_id) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'ID is required',
      }),
      { status: 400 }
    );
  }

  try {
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

    return new Response(
      JSON.stringify({ success: true, licensee: updatedLicensee }),
      { status: 200 }
    );
  } catch (err: unknown) {
    const error = err as Error & { message?: string };
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  await connectDB();
  const body = await request.json();
  const { _id } = body;

  if (!_id) {
    return new Response(
      JSON.stringify({ success: false, message: 'Licensee ID is required' }),
      { status: 400 }
    );
  }

  try {
    await deleteLicenseeHelper(_id, request);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: unknown) {
    const error = err as Error & { message?: string };
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500 }
    );
  }
}
