/**
 * Licencees API Route — Full CRUD for licencee management.
 *
 * All methods require authentication via withApiAuth. Results are filtered to
 * the caller's assigned licencees unless the caller has unrestricted access
 * (developer/admin/owner).
 *
 * GET /api/licencees — Fetch the caller's accessible licencees with pagination.
 *
 * Query parameters (GET):
 * @param licencee {string} Optional. Filter by licencee ID or name; pass 'all' or omit to
 *   return all accessible licencees.
 * @param page     {number} Optional. Page number. Defaults to 1.
 * @param limit    {number} Optional. Records per page; capped at 100. Defaults to 50.
 *
 * POST /api/licencees — Create a new licencee.
 *
 * Body fields (POST):
 * @param name    {string} Required. Display name for the licencee.
 * @param country {string} Required. Country code or name for the licencee.
 * Additional fields are forwarded to the createLicencee helper.
 *
 * PUT /api/licencees — Update an existing licencee.
 *
 * Body fields (PUT):
 * @param _id {string} Required. The licencee document ID to update.
 * Additional fields are forwarded to the updateLicencee helper.
 *
 * DELETE /api/licencees — Delete a licencee.
 *
 * Body fields (DELETE):
 * @param _id {string} Required. The licencee document ID to delete.
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
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return withApiAuth(request, async () => {
    const { searchParams } = new URL(request.url);
    const licenceeFilter = searchParams.get('licencee');

    const userLicenceeAccess = await getUserAccessibleLicenceesFromToken();
    const licencees = await getAllLicencees();
    let formattedLicencees = (await formatLicenceesForResponse(
      licencees
    )) as unknown as Array<
      { _id: string; name: string } & Record<string, unknown>
    >;

    if (userLicenceeAccess !== 'all') {
      const allowedIds = new Set(
        userLicenceeAccess.map(value => value.toString())
      );
      formattedLicencees = formattedLicencees.filter(licencee => {
        const licenceeId = licencee._id;
        return licenceeId && allowedIds.has(String(licenceeId));
      });
    }

    if (licenceeFilter && licenceeFilter !== 'all') {
      formattedLicencees = formattedLicencees.filter(licencee => {
        const licenceeId = licencee._id;
        const licenceeName = licencee.name;
        return licenceeId === licenceeFilter || licenceeName === licenceeFilter;
      });
    }

    const page = parseInt(searchParams.get('page') || '1');
    const requestedLimit = parseInt(searchParams.get('limit') || '50');
    const limit = Math.min(requestedLimit, 100);
    const skip = (page - 1) * limit;

    const totalCount = formattedLicencees.length;
    const paginatedLicencees = formattedLicencees.slice(skip, skip + limit);

    return NextResponse.json({
      licencees: paginatedLicencees,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  });
}

export async function POST(request: NextRequest) {
  return withApiAuth(request, async () => {
    const body = await request.json();
    const { name, country } = body;

    if (!name || !country) {
      return NextResponse.json(
        { success: false, message: 'Name and country are required' },
        { status: 400 }
      );
    }

    const licencee = await createLicenceeHelper(body, request);
    return NextResponse.json({ success: true, licencee }, { status: 201 });
  });
}

export async function PUT(request: NextRequest) {
  return withApiAuth(request, async () => {
    const body = await request.json();
    const { _id } = body;

    if (!_id) {
      return NextResponse.json(
        { success: false, message: 'ID is required' },
        { status: 400 }
      );
    }

    const updatedLicencee = await updateLicenceeHelper(body, request);
    return NextResponse.json({ success: true, licencee: updatedLicencee });
  });
}

export async function DELETE(request: NextRequest) {
  return withApiAuth(request, async () => {
    const body = await request.json();
    const { _id } = body;

    if (!_id) {
      return NextResponse.json(
        { success: false, message: 'Licencee ID is required' },
        { status: 400 }
      );
    }

    await deleteLicenceeHelper(_id, request);
    return NextResponse.json({ success: true });
  });
}
