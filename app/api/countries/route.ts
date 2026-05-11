/**
 * Countries API Route — CRUD operations for the countries reference list.
 *
 * GET /api/countries — Fetch all active (non-soft-deleted) countries sorted
 * alphabetically. No authentication required.
 *
 * POST /api/countries — Create a new country entry. Admin/developer/owner only.
 *
 * Body fields (POST):
 * @param {string} name - Required. Full country name (e.g. 'Trinidad and Tobago').
 * @param {string} alpha2 - Required. ISO 3166-1 alpha-2 code (e.g. 'TT'); stored
 *   uppercased and used as the document _id.
 * @param {string} alpha3 - Required. ISO 3166-1 alpha-3 code (e.g. 'TTO'); stored uppercased.
 * @param {string} isoNumeric - Required. ISO 3166-1 numeric code (e.g. '780').
 *
 * PUT /api/countries — Update an existing country. Admin/developer/owner only.
 *
 * Body fields (PUT):
 * @param {string} _id - Required. The country document ID (alpha-2 code).
 * @param {string} [name] - Optional. Updated country name.
 * @param {string} [alpha2] - Optional. Updated alpha-2 code; stored uppercased.
 * @param {string} [alpha3] - Optional. Updated alpha-3 code; stored uppercased.
 * @param {string} [isoNumeric] - Optional. Updated numeric code.
 *
 * DELETE /api/countries — Soft-delete a country (sets deletedAt). Admin/developer only.
 *
 * Query parameters (DELETE):
 * @param {string} id - Required. The country document ID to soft-delete.
 *
 * @module app/api/countries/route
 */

import {
  calculateChanges,
  logActivity,
} from '@/app/api/lib/helpers/activityLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Countries } from '@/app/api/lib/models/countries';
import type { CountryDocument } from '@/shared/types';
import {
  logRouteFetch,
  logRouteCreate,
  logRouteUpdate,
  logRouteDelete,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/countries';
  const user = extractUserFromRequest(req);

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Fetch all countries sorted alphabetically (excluding soft-deleted)
    // ============================================================================
    const countries = await Countries.find({
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    })
      .sort({ name: 1 })
      .lean<CountryDocument[]>();

    // ============================================================================
    // STEP 3: Return countries list
    // ============================================================================
    const duration = Date.now() - startTime;
    logRouteFetch(
      functionName,
      'GET',
      '/api/countries',
      countries.length,
      user,
      duration
    );

    return NextResponse.json({
      success: true,
      countries: countries,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch countries';
    logRouteError(functionName, 'GET', '/api/countries', errorMessage, user);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/countries';
  const user = extractUserFromRequest(req);

  try {
    // ============================================================================
    // STEP 1: Authenticate user
    // ============================================================================
    const authUser = await getUserFromServer();
    if (!authUser) {
      logRouteError(
        functionName,
        'POST',
        '/api/countries',
        'Unauthorized',
        user
      );
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoles = (authUser.roles as string[]) || [];
    const isAdminOrDev =
      userRoles.includes('admin') ||
      userRoles.includes('developer') ||
      userRoles.includes('owner');

    if (!isAdminOrDev) {
      logRouteError(
        functionName,
        'POST',
        '/api/countries',
        'Forbidden - insufficient permissions',
        user
      );
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ============================================================================
    // STEP 2: Parse request body
    // ============================================================================
    await connectDB();
    const body = await req.json();
    const { name, alpha2, alpha3, isoNumeric } = body;

    if (!name || !alpha2 || !alpha3 || !isoNumeric) {
      logRouteError(
        functionName,
        'POST',
        '/api/countries',
        'Missing required fields',
        user
      );
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Check for duplicates
    // ============================================================================
    const existing = await Countries.findOne({
      $or: [{ alpha2 }, { alpha3 }, { name }],
    });

    if (existing) {
      logRouteError(
        functionName,
        'POST',
        '/api/countries',
        `Duplicate country: ${name}`,
        user
      );
      return NextResponse.json(
        { error: 'Country with this code or name already exists' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: Create new country
    // ============================================================================
    const newCountry = await Countries.create({
      _id: alpha2.toUpperCase(),
      name,
      alpha2: alpha2.toUpperCase(),
      alpha3: alpha3.toUpperCase(),
      isoNumeric,
    });

    const duration = Date.now() - startTime;
    logRouteCreate(functionName, 'POST', '/api/countries', 1, user, duration);

    if (authUser && (authUser as { emailAddress?: string }).emailAddress) {
      logActivity({
        action: 'CREATE',
        details: `Created country "${name}"`,
        ipAddress:
          req.headers.get('x-forwarded-for') ||
          req.headers.get('x-real-ip') ||
          undefined,
        userAgent: req.headers.get('user-agent') || undefined,
        userId: (authUser as { _id: string })._id,
        username: (authUser as { emailAddress: string }).emailAddress,
        metadata: {
          resource: 'country',
          resourceId: alpha2.toUpperCase(),
          resourceName: name,
        },
      }).catch(err =>
        console.error('[POST /api/countries] Activity log failed:', err)
      );
    }

    return NextResponse.json({
      success: true,
      country: newCountry,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to create country';
    logRouteError(functionName, 'POST', '/api/countries', errorMessage, user);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const startTime = Date.now();
  const functionName = 'PUT /api/countries';
  const user = extractUserFromRequest(req);

  try {
    // ============================================================================
    // STEP 1: Authenticate user
    // ============================================================================
    const authUser = await getUserFromServer();
    if (!authUser) {
      logRouteError(
        functionName,
        'PUT',
        '/api/countries',
        'Unauthorized',
        user
      );
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoles = (authUser.roles as string[]) || [];
    const isAdminOrDev =
      userRoles.includes('admin') ||
      userRoles.includes('developer') ||
      userRoles.includes('owner');

    if (!isAdminOrDev) {
      logRouteError(
        functionName,
        'PUT',
        '/api/countries',
        'Forbidden - insufficient permissions',
        user
      );
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ============================================================================
    // STEP 2: Parse request body
    // ============================================================================
    await connectDB();
    const body = await req.json();
    const { _id, name, alpha2, alpha3, isoNumeric } = body;

    if (!_id) {
      logRouteError(
        functionName,
        'PUT',
        '/api/countries',
        'Country ID is required',
        user
      );
      return NextResponse.json(
        { error: 'Country ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Pre-fetch existing country for before-state
    // ============================================================================
    const existingCountry = await Countries.findOne({
      _id,
    }).lean<CountryDocument | null>();
    if (!existingCountry) {
      logRouteError(
        functionName,
        'PUT',
        '/api/countries',
        `Country not found: ${_id}`,
        user
      );
      return NextResponse.json({ error: 'Country not found' }, { status: 404 });
    }

    // ============================================================================
    // STEP 4: Update country
    // ============================================================================
    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (alpha2) updateData.alpha2 = alpha2.toUpperCase();
    if (alpha3) updateData.alpha3 = alpha3.toUpperCase();
    if (isoNumeric) updateData.isoNumeric = isoNumeric;

    const updatedCountry = await Countries.findOneAndUpdate(
      { _id },
      { $set: updateData },
      { new: true }
    );

    if (!updatedCountry) {
      logRouteError(
        functionName,
        'PUT',
        '/api/countries',
        `Country not found during update: ${_id}`,
        user
      );
      return NextResponse.json({ error: 'Country not found' }, { status: 404 });
    }

    const duration = Date.now() - startTime;
    logRouteUpdate(functionName, 'PUT', '/api/countries', 1, user, duration);

    logActivity({
      action: 'update',
      details: `Country "${updatedCountry.name}" updated`,
      userId: String(authUser._id),
      username: String(
        authUser.emailAddress || authUser.username || authUser._id
      ),
      metadata: {
        resource: 'country',
        resourceId: String(_id),
        resourceName: String(updatedCountry.name),
        changes: calculateChanges(
          existingCountry as Record<string, unknown>,
          updateData
        ),
        previousData: existingCountry,
        newData: updatedCountry.toObject(),
      },
    }).catch(err =>
      console.error('[PUT /api/countries] Activity log failed:', err)
    );

    return NextResponse.json({
      success: true,
      country: updatedCountry,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to update country';
    logRouteError(functionName, 'PUT', '/api/countries', errorMessage, user);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const startTime = Date.now();
  const functionName = 'DELETE /api/countries';
  const user = extractUserFromRequest(req);

  try {
    // ============================================================================
    // STEP 1: Authenticate user
    // ============================================================================
    const authUser = await getUserFromServer();
    if (!authUser) {
      logRouteError(
        functionName,
        'DELETE',
        '/api/countries',
        'Unauthorized',
        user
      );
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoles = (authUser.roles as string[]) || [];
    const isAdminOrDev =
      userRoles.includes('admin') || userRoles.includes('developer');

    if (!isAdminOrDev) {
      logRouteError(
        functionName,
        'DELETE',
        '/api/countries',
        'Forbidden - insufficient permissions',
        user
      );
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ============================================================================
    // STEP 2: Parse request body
    // ============================================================================
    await connectDB();
    const { searchParams } = new URL(req.url);
    const countryId = searchParams.get('id');

    if (!countryId) {
      logRouteError(
        functionName,
        'DELETE',
        '/api/countries',
        'Country ID is required',
        user
      );
      return NextResponse.json(
        { error: 'Country ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Soft delete country
    // ============================================================================
    const deletedCountry = await Countries.findOneAndUpdate(
      { _id: countryId },
      { $set: { deletedAt: new Date() } },
      { new: true }
    );

    if (!deletedCountry) {
      logRouteError(
        functionName,
        'DELETE',
        '/api/countries',
        `Country not found: ${countryId}`,
        user
      );
      return NextResponse.json({ error: 'Country not found' }, { status: 404 });
    }

    const duration = Date.now() - startTime;
    logRouteDelete(functionName, 'DELETE', '/api/countries', 1, user, duration);

    return NextResponse.json({
      success: true,
      message: 'Country deleted successfully',
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to delete country';
    logRouteError(functionName, 'DELETE', '/api/countries', errorMessage, user);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
