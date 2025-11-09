import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../lib/middleware/db";
import { CollectionReport } from "@/app/api/lib/models/collectionReport";
import { getUserFromServer } from "../lib/helpers/users";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationReportId = searchParams.get("locationReportId");
    const isEditing = searchParams.get("isEditing");
    const limit = searchParams.get("limit");
    const sortBy = searchParams.get("sortBy") || "updatedAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    await connectDB();

    // Get user data from JWT
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userRoles = (userPayload?.roles as string[]) || [];
    const userLicensees = (userPayload?.rel as { licencee?: string[] })?.licencee || [];
    const userLocationPermissions = 
      (userPayload?.resourcePermissions as { 'gaming-locations'?: { resources?: string[] } })?.['gaming-locations']?.resources || [];
    
    console.log('[COLLECTION REPORTS] User roles:', userRoles);
    console.log('[COLLECTION REPORTS] User licensees:', userLicensees);
    console.log('[COLLECTION REPORTS] User location permissions:', userLocationPermissions);
    
    // Check if user is admin or manager
    const isAdmin = userRoles.includes('admin') || userRoles.includes('evolution admin');
    const isManager = userRoles.includes('manager');
    
    // Build the query
    const query: Record<string, unknown> = {};
    if (locationReportId) {
      query.locationReportId = locationReportId;
    }
    if (isEditing === "true") {
      query.isEditing = true;
    }
    
    // Apply location filtering based on role
    if (isAdmin && userLocationPermissions.length === 0) {
      // Admin with no location restrictions - no filter
      console.log('[COLLECTION REPORTS] Admin with no restrictions - no location filter');
    } else if (isAdmin && userLocationPermissions.length > 0) {
      // Admin with location restrictions - filter by those locations
      query.locationId = { $in: userLocationPermissions };
      console.log('[COLLECTION REPORTS] Admin with location restrictions:', userLocationPermissions);
    } else if (isManager) {
      // Manager - get ALL locations for their assigned licensees
      console.log('[COLLECTION REPORTS] Manager - fetching all locations for licensees:', userLicensees);
      
      if (userLicensees.length === 0) {
        console.log('[COLLECTION REPORTS] Manager has no licensees - returning empty');
        return NextResponse.json([]);
      }
      
      const db = await connectDB();
      if (!db) {
        return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
      }
      
      const managerLocations = await db.collection('gaminglocations').find({
        'rel.licencee': { $in: userLicensees },
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2020-01-01') } },
        ],
      }, { projection: { _id: 1 } }).toArray();
      
      const managerLocationIds = managerLocations.map(loc => String(loc._id));
      console.log('[COLLECTION REPORTS] Manager location IDs:', managerLocationIds);
      
      if (managerLocationIds.length === 0) {
        console.log('[COLLECTION REPORTS] No locations found for manager licensees - returning empty');
        return NextResponse.json([]);
      }
      
      query.locationId = { $in: managerLocationIds };
    } else {
      // Collector/Technician - use ONLY their assigned location permissions
      if (userLocationPermissions.length === 0) {
        console.log('[COLLECTION REPORTS] Non-manager with no location permissions - returning empty');
        return NextResponse.json([]);
      }
      
      query.locationId = { $in: userLocationPermissions };
      console.log('[COLLECTION REPORTS] Collector/Technician - filtering by assigned locations:', userLocationPermissions);
    }

    let queryBuilder = CollectionReport.find(query);

    // Apply sorting
    const sortOptions: Record<string, 1 | -1> = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;
    queryBuilder = queryBuilder.sort(sortOptions);

    // Apply limit if specified
    if (limit) {
      queryBuilder = queryBuilder.limit(parseInt(limit, 10));
    }

    const collectionReports = await queryBuilder.exec();

    return NextResponse.json(collectionReports);
  } catch (error) {
    console.error("Error fetching collection reports:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
