/**
 * Countries API Route — CRUD operations for the countries reference list.
 *
 * GET /api/countries — Fetch all active (non-soft-deleted) countries sorted
 * alphabetically. No authentication required.
 *
 * POST /api/countries — Create a new country entry. Admin/developer/owner only.
 *
 * Body fields (POST):
 * @param name       {string} Required. Full country name (e.g. 'Trinidad and Tobago').
 * @param alpha2     {string} Required. ISO 3166-1 alpha-2 code (e.g. 'TT'); stored
 *   uppercased and used as the document _id.
 * @param alpha3     {string} Required. ISO 3166-1 alpha-3 code (e.g. 'TTO'); stored uppercased.
 * @param isoNumeric {string} Required. ISO 3166-1 numeric code (e.g. '780').
 *
 * PUT /api/countries — Update an existing country. Admin/developer/owner only.
 *
 * Body fields (PUT):
 * @param _id        {string} Required. The country document ID (alpha-2 code).
 * @param name       {string} Optional. Updated country name.
 * @param alpha2     {string} Optional. Updated alpha-2 code; stored uppercased.
 * @param alpha3     {string} Optional. Updated alpha-3 code; stored uppercased.
 * @param isoNumeric {string} Optional. Updated numeric code.
 *
 * DELETE /api/countries — Soft-delete a country (sets deletedAt). Admin/developer only.
 *
 * Query parameters (DELETE):
 * @param id {string} Required. The country document ID to soft-delete.
 *
 * @module app/api/countries/route
 */

import { calculateChanges, logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Countries } from '@/app/api/lib/models/countries';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Fetch all countries sorted alphabetically (excluding soft-deleted)
    // ============================================================================
    const countries = await Countries.find({
      $or: [
        { deletedAt: null },
        { deletedAt: { $exists: false } },
      ],
    })
      .sort({ name: 1 })
      .lean();

    // ============================================================================
    // STEP 3: Return countries list
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 500) {
      console.warn(`[Countries API] Completed in ${duration}ms`);
    }

    return NextResponse.json({
      success: true,
      countries: countries,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch countries';
    console.error(`[Countries API] Error after ${duration}ms:`, errorMessage);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // ============================================================================
    // STEP 1: Authenticate user
    // ============================================================================
    const user = await getUserFromServer();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoles = (user.roles as string[]) || [];
    const isAdminOrDev =
      userRoles.includes('admin') || userRoles.includes('developer') || userRoles.includes('owner');

    if (!isAdminOrDev) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ============================================================================
    // STEP 2: Parse request body
    // ============================================================================
    await connectDB();
    const body = await req.json();
    const { name, alpha2, alpha3, isoNumeric } = body;

    if (!name || !alpha2 || !alpha3 || !isoNumeric) {
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

    if (user && (user as { emailAddress?: string }).emailAddress) {
      logActivity({
        action: 'CREATE',
        details: `Created country "${name}"`,
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
        userId: (user as { _id: string })._id,
        username: (user as { emailAddress: string }).emailAddress,
        metadata: {
          resource: 'country',
          resourceId: alpha2.toUpperCase(),
          resourceName: name,
        },
      }).catch(err => console.error('Failed to log country create:', err));
    }

    return NextResponse.json({
      success: true,
      country: newCountry,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to create country';
    console.error('[Countries API] Create error:', errorMessage);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    // ============================================================================
    // STEP 1: Authenticate user
    // ============================================================================
    const user = await getUserFromServer();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoles = (user.roles as string[]) || [];
    const isAdminOrDev =
      userRoles.includes('admin') || userRoles.includes('developer') || userRoles.includes('owner');

    if (!isAdminOrDev) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ============================================================================
    // STEP 2: Parse request body
    // ============================================================================
    await connectDB();
    const body = await req.json();
    const { _id, name, alpha2, alpha3, isoNumeric } = body;

    if (!_id) {
      return NextResponse.json(
        { error: 'Country ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Pre-fetch existing country for before-state
    // ============================================================================
    const existingCountry = await Countries.findOne({ _id }).lean();
    if (!existingCountry) {
      return NextResponse.json(
        { error: 'Country not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 4: Update country
    // ============================================================================
    console.log(`[Countries PUT] Request — id: ${_id}, fields: ${[name && 'name', alpha2 && 'alpha2', alpha3 && 'alpha3', isoNumeric && 'isoNumeric'].filter(Boolean).join(', ')}`);
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
      return NextResponse.json(
        { error: 'Country not found' },
        { status: 404 }
      );
    }

    console.log(`[Countries PUT] Updated country "${updatedCountry.name}" (${_id})`);
    logActivity({
      action: 'update',
      details: `Country "${updatedCountry.name}" updated`,
      userId: String(user._id),
      username: String(user.emailAddress || user.username || user._id),
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
    }).catch(err => console.error('[Countries PUT] Activity log failed:', err));

    return NextResponse.json({
      success: true,
      country: updatedCountry,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to update country';
    console.error('[Countries PUT] Update error:', errorMessage);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // ============================================================================
    // STEP 1: Authenticate user
    // ============================================================================
    const user = await getUserFromServer();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoles = (user.roles as string[]) || [];
    const isAdminOrDev =
      userRoles.includes('admin') || userRoles.includes('developer');

    if (!isAdminOrDev) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ============================================================================
    // STEP 2: Parse request body
    // ============================================================================
    await connectDB();
    const { searchParams } = new URL(req.url);
    const countryId = searchParams.get('id');

    if (!countryId) {
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
      return NextResponse.json(
        { error: 'Country not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Country deleted successfully',
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to delete country';
    console.error('[Countries API] Delete error:', errorMessage);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
