import { NextRequest } from 'next/server';
import { connectDB } from '@/app/api/lib/middleware/db';
import {
  getAllLicensees,
  formatLicenseesForResponse,
  createLicensee as createLicenseeHelper,
  updateLicensee as updateLicenseeHelper,
  deleteLicensee as deleteLicenseeHelper,
} from '@/app/api/lib/helpers/licensees';
import {
  getAccessContext,
  constrainLicenceeQuery,
} from '@/app/api/lib/utils/accessControl';
import { apiLogger } from '@/app/api/lib/utils/logger';

export async function GET(request: NextRequest) {
  const context = apiLogger.createContext(request, '/api/licensees');
  apiLogger.startLogging();

  try {
      await connectDB();
      const { searchParams } = new URL(request.url);
      const licenseeFilter = searchParams.get('licensee');

      const accessContext = await getAccessContext();

      if (!accessContext) {
        return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
          status: 401,
        });
      }

      const licensees = await getAllLicensees();
      let formattedLicensees = await formatLicenseesForResponse(licensees);

      if (!accessContext.isAdmin) {
        if (!accessContext.accessibleLicenseeIds.length) {
          formattedLicensees = [];
        } else {
          formattedLicensees = formattedLicensees.filter(licensee => {
            const licenseeId = (licensee as Record<string, unknown>)._id as string;
            return accessContext.accessibleLicenseeIds.includes(licenseeId);
          });
        }
      }

      const licenceeConstraint = constrainLicenceeQuery<Record<string, unknown>>(
        accessContext,
        licenseeFilter
      );

      if (!licenceeConstraint && licenseeFilter && licenseeFilter !== 'all') {
        return new Response(
          JSON.stringify({ success: false, message: 'Forbidden licensee scope' }),
          { status: 403 }
        );
      }

      if (licenceeConstraint && licenceeConstraint['rel.licencee']) {
        const constraintValue = licenceeConstraint['rel.licencee'];

        if (typeof constraintValue === 'string') {
          formattedLicensees = formattedLicensees.filter(licensee => {
            const licenseeId = (licensee as Record<string, unknown>)._id as string;
            const licenseeName = (licensee as Record<string, unknown>)
              .name as string;
            return licenseeId === constraintValue || licenseeName === constraintValue;
          });
        } else if (constraintValue && typeof constraintValue === 'object') {
          const permittedIds = (constraintValue as { $in: string[] }).$in || [];
          formattedLicensees = formattedLicensees.filter(licensee =>
            permittedIds.includes((licensee as Record<string, unknown>)._id as string)
          );
        }
      }

    apiLogger.logSuccess(
      context,
      `Successfully fetched ${formattedLicensees.length} licensees`
    );
    return new Response(JSON.stringify({ licensees: formattedLicensees }), {
      status: 200,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    apiLogger.logError(context, 'Failed to fetch licensees', errorMessage);
    return new Response(
      JSON.stringify({ success: false, message: 'Failed to fetch licensees' }),
      { status: 500 }
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
