/**
 * Countries API Route
 *
 * This route handles CRUD operations for countries.
 * It supports:
 * - Fetching all countries (excluding soft-deleted)
 * - Creating new countries
 * - Updating existing countries
 * - Soft deleting countries
 *
 * @module app/api/countries/route
 */

import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Countries } from '@/app/api/lib/models/countries';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET handler - Fetch all countries (excluding soft-deleted)
 */
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

/**
 * POST handler - Create a new country
 */
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
      userRoles.includes('admin') || userRoles.includes('developer');

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

/**
 * PUT handler - Update an existing country
 */
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
      userRoles.includes('admin') || userRoles.includes('developer');

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
    // STEP 3: Update country
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
      return NextResponse.json(
        { error: 'Country not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      country: updatedCountry,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to update country';
    console.error('[Countries API] Update error:', errorMessage);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler - Soft delete a country
 */
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
