/**
 * Collections API Route
 *
 * This route handles CRUD operations for machine collections.
 * It supports:
 * - Fetching collections with filtering, searching, and pagination
 * - Creating new collections with SAS metrics calculation
 * - Updating collections with recalculation of metrics
 * - Deleting collections with machine meter reversion
 * - Role-based access control
 * - Location-based filtering
 * - Activity logging
 *
 * @module app/api/collections/route
 */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import {
  calculateSasMetrics,
  createCollectionWithCalculations,
  getSasTimePeriod,
} from '@/app/api/lib/helpers/collectionReport/creation';
import { getUserLocationFilter } from '@/app/api/lib/helpers/licenseeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Collections } from '@/app/api/lib/models/collections';
import { Machine } from '@/app/api/lib/models/machines';
import type {
  CollectionDocument,
  CreateCollectionPayload,
} from '@/lib/types/collection';
import { generateMongoId } from '@/lib/utils/id';
import { getClientIP } from '@/lib/utils/ipAddress';
import { NextRequest, NextResponse } from 'next/server';

// Ensure this route is handled by Node.js runtime (not Edge)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Main GET handler for fetching collections
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse query parameters
 * 3. Get user's accessible licensees and permissions
 * 4. Determine allowed location IDs
 * 5. Build filter query
 * 6. Apply sorting and pagination
 * 7. Execute query
 * 8. Return collections
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(req.url);
    const locationReportId = searchParams.get('locationReportId');
    const location =
      searchParams.get('location') || searchParams.get('locationId'); // Accept both location and locationId
    const collector = searchParams.get('collector');
    const isCompleted = searchParams.get('isCompleted');
    const incompleteOnly = searchParams.get('incompleteOnly');
    const machineId = searchParams.get('machineId');
    const beforeTimestamp = searchParams.get('beforeTimestamp');
    const limit = searchParams.get('limit');
    const sortBy = searchParams.get('sortBy');
    const sortOrder = searchParams.get('sortOrder');

    // ============================================================================
    // STEP 3: Get user's accessible licensees and permissions
    // ============================================================================
    // SECURITY: Get user's accessible locations to prevent data leakage
    const user = await getUserFromServer();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoles = (user.roles as string[]) || [];
    // Use only new field
    let userAccessibleLicensees: string[] = [];
    if (
      Array.isArray(
        (user as { assignedLicensees?: string[] })?.assignedLicensees
      )
    ) {
      userAccessibleLicensees = (user as { assignedLicensees: string[] })
        .assignedLicensees;
    }
    // Use only new field
    let userLocationPermissions: string[] = [];
    if (
      Array.isArray(
        (user as { assignedLocations?: string[] })?.assignedLocations
      )
    ) {
      userLocationPermissions = (user as { assignedLocations: string[] })
        .assignedLocations;
    }
    const isAdmin =
      userRoles.includes('admin') || userRoles.includes('developer');

    // Support both licensee spellings
    const licensee =
      searchParams.get('licensee') || searchParams.get('licencee');

    // ============================================================================
    // STEP 4: Determine allowed location IDs
    // ============================================================================
    // Get allowed locations for this user
    const allowedLocationIds = await getUserLocationFilter(
      isAdmin ? 'all' : userAccessibleLicensees,
      licensee || undefined,
      userLocationPermissions,
      userRoles
    );

    // ============================================================================
    // STEP 4.5: Resolve allowed location IDs to Names
    // ============================================================================
    // The Collections model stores location NAMES, not IDs.
    // We must convert the allowed IDs to names for the query to work.
    let allowedLocationNames: string[] | 'all' = 'all';

    if (allowedLocationIds !== 'all') {
      if (allowedLocationIds.length === 0) {
        return NextResponse.json([]);
      }

      // Get location names from location IDs
      const GamingLocations = (await import('@/app/api/lib/models/gaminglocations'))
        .GamingLocations;
      const locations = (await GamingLocations.find({
        _id: { $in: allowedLocationIds },
      })
        .select('name')
        .lean()) as unknown as Array<{ name: string; _id: string }>;

      allowedLocationNames = locations.map(loc => loc.name);
      
      // If we found no matching locations for the IDs, user effectively has no access
      if (allowedLocationNames.length === 0) {
        return NextResponse.json([]);
      }
    }

    // ============================================================================
    // STEP 5: Build filter query
    // ============================================================================
    const filter: Record<string, unknown> = {};
    if (locationReportId) filter.locationReportId = locationReportId;

    // CRITICAL: Filter by location parameter AND user's accessible locations
    if (location) {
      // Check if user has access to this specific location
      if (allowedLocationNames === 'all') {
        filter.location = location;
      } else if (allowedLocationNames.includes(location)) {
        filter.location = location;
      } else {
        // User requested a location they don't have access to
        return NextResponse.json([]); // Return empty array
      }
    } else {
      // No specific location requested - filter by all accessible locations
      if (allowedLocationNames !== 'all') {
        filter.location = { $in: allowedLocationNames };
      }
    }

    if (collector) filter.collector = collector;
    if (isCompleted !== null && isCompleted !== undefined)
      filter.isCompleted = isCompleted === 'true';
    if (machineId) filter.machineId = machineId;

    // If incompleteOnly is true, only return incomplete collections with empty locationReportId
    // SECURITY: Incomplete collections are location-specific based on user's assigned locations
    if (incompleteOnly === 'true') {
      filter.isCompleted = false;
      filter.locationReportId = '';

      // CRITICAL: Filter by location NAME (not collector)
      // Collection.location field stores the gaming location NAME, not ID
      // We need to get the names of user's accessible locations
      if (allowedLocationIds !== 'all') {
        // Get location names from location IDs
        const GamingLocations = (await import('../lib/models/gaminglocations'))
          .GamingLocations;
        const locations = (await GamingLocations.find({
          _id: { $in: allowedLocationIds },
        })
          .select('name')
          .lean()) as unknown as Array<{ name: string; _id: string }>;

        const locationNames = locations.map(loc => loc.name);

        if (locationNames.length > 0) {
          filter.location = { $in: locationNames }; // ✅ Filter by location names
        } else {
          // User has no accessible locations
          filter.location = 'IMPOSSIBLE_LOCATION_NAME'; // Force empty result
        }
      }
      // If allowedLocationIds === 'all', don't add location filter (admin/developer sees all)
    }

    // Support querying for collections before a specific timestamp (for historical prevIn/prevOut)
    if (beforeTimestamp) {
      filter.timestamp = { $lt: new Date(beforeTimestamp) };
    }

    // ============================================================================
    // STEP 6: Apply sorting and pagination
    // ============================================================================
    // Always include soft-deleted documents in queries (as per user preference)
    let query = Collections.find(filter);

    // Apply sorting if specified
    if (sortBy) {
      const sortDirection = sortOrder === 'desc' ? -1 : 1;
      query = query.sort({ [sortBy]: sortDirection });
    }

    // Apply limit if specified
    if (limit) {
      query = query.limit(parseInt(limit, 10));
    }

    // ============================================================================
    // STEP 7: Execute query
    // ============================================================================
    const collections = (await query.lean()) as CollectionDocument[];

    // ============================================================================
    // STEP 8: Return collections
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Collections GET API] Completed in ${duration}ms`);
    }
    return NextResponse.json(collections);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch collections';
    console.error(
      `[Collections API GET] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * Main POST handler for creating a new collection
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse and validate request body
 * 3. Validate required fields
 * 4. Get machine details
 * 5. Extract SAS times from payload
 * 6. Calculate SAS metrics and movement
 * 7. Create collection document
 * 8. Save collection to database
 * 9. Log activity
 * 10. Return created collection
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse and validate request body
    // ============================================================================
    const payload: CreateCollectionPayload = await req.json();

    // ============================================================================
    // STEP 3: Validate required fields
    // ============================================================================
    // Validate required fields
    if (!payload.machineId || !payload.location || !payload.collector) {
      return NextResponse.json(
        { error: 'Missing required fields: machineId, location, collector' },
        { status: 400 }
      );
    }

    // CRITICAL: Do NOT generate locationReportId when adding machines to the list
    // locationReportId should only be set when the collection report is actually created
    // This prevents orphaned collections and ensures proper timing
    let finalLocationReportId = payload.locationReportId;
    if (!finalLocationReportId || finalLocationReportId.trim() === '') {
      // Keep it empty - will be set when report is created
      finalLocationReportId = '';
    }

    if (
      typeof payload.metersIn !== 'number' ||
      typeof payload.metersOut !== 'number'
    ) {
      return NextResponse.json(
        { error: 'metersIn and metersOut must be valid numbers' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: Get machine details
    // ============================================================================
    // Get machine details for additional fields
    // CRITICAL: Use findOne with _id instead of findById (repo rule)
    const machine = await Machine.findOne({ _id: payload.machineId }).lean();
    if (!machine) {
      return NextResponse.json({ error: 'Machine not found' }, { status: 404 });
    }

    // Safely access machine properties with type assertion
    const machineData = machine as Record<string, unknown>;

    // ============================================================================
    // STEP 5: Extract SAS times from payload
    // ============================================================================
    // Extract SAS times from payload for backend calculation
    const payloadWithSasMeters = payload as CreateCollectionPayload & {
      sasMeters?: { sasStartTime?: string; sasEndTime?: string };
    };
    const sasStartTime = payloadWithSasMeters.sasMeters?.sasStartTime
      ? new Date(payloadWithSasMeters.sasMeters.sasStartTime)
      : payload.sasStartTime;
    // Prefer explicit sasEndTime; fallback to payload.timestamp to enforce deterministic windows
    const sasEndTime = payloadWithSasMeters.sasMeters?.sasEndTime
      ? new Date(payloadWithSasMeters.sasMeters.sasEndTime)
      : payload.sasEndTime ||
        (payload.timestamp ? new Date(payload.timestamp) : undefined);

    // ============================================================================
    // STEP 6: Calculate SAS metrics and movement
    // ============================================================================
    // Calculate SAS metrics, movement, and update machine
    const {
      sasMeters,
      movement,
      previousMeters,
      locationReportId: calculatedLocationReportId,
    } = await createCollectionWithCalculations({
      ...payload,
      sasStartTime,
      sasEndTime,
    });

    // Use the calculated locationReportId if one was generated during the calculation
    if (
      calculatedLocationReportId &&
      calculatedLocationReportId !== finalLocationReportId
    ) {
      finalLocationReportId = calculatedLocationReportId;
    }

    // ============================================================================
    // STEP 7: Create collection document
    // ============================================================================

    // Create collection document with all calculated fields
    const collectionData = {
      _id: await generateMongoId(),
      isCompleted: payload.isCompleted ?? false,
      metersIn: payload.metersIn,
      metersOut: payload.metersOut,
      // CRITICAL: Use client-provided prevIn/prevOut if available, otherwise use calculated values
      // This ensures accuracy when client has the correct previous meter values
      prevIn:
        payload.prevIn !== undefined ? payload.prevIn : previousMeters.metersIn,
      prevOut:
        payload.prevOut !== undefined
          ? payload.prevOut
          : previousMeters.metersOut,
      softMetersIn: payload.metersIn,
      softMetersOut: payload.metersOut,
      notes: payload.notes || '',
      timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
      collectionTime: payload.collectionTime
        ? new Date(payload.collectionTime)
        : payload.timestamp
          ? new Date(payload.timestamp)
          : new Date(),
      location: payload.location,
      collector: payload.collector,
      locationReportId: finalLocationReportId,
      sasMeters: {
        machine:
          (machineData.serialNumber as string) ||
          (machineData.customName as string) ||
          payload.machineId,
        drop: sasMeters.drop,
        totalCancelledCredits: sasMeters.totalCancelledCredits,
        gross: sasMeters.gross,
        gamesPlayed: sasMeters.gamesPlayed,
        jackpot: sasMeters.jackpot,
        sasStartTime: sasMeters.sasStartTime,
        sasEndTime: sasMeters.sasEndTime,
      },
      movement: {
        metersIn: movement.metersIn,
        metersOut: movement.metersOut,
        gross: movement.gross,
      },
      machineCustomName:
        payload.machineCustomName ||
        (machineData.customName as string) ||
        (machineData.serialNumber as string) ||
        'Unknown Machine',
      machineId: payload.machineId,
      machineName:
        payload.machineName ||
        (machineData.customName as string) ||
        (machineData.serialNumber as string) ||
        'Unknown Machine',
      game:
        (machineData.game as string) ||
        (machineData.installedGame as string) ||
        '',
      ramClear: payload.ramClear || false,
      ramClearMetersIn: payload.ramClearMetersIn,
      ramClearMetersOut: payload.ramClearMetersOut,
      serialNumber:
        payload.serialNumber || (machineData.serialNumber as string) || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // ============================================================================
    // STEP 8: Save collection to database
    // ============================================================================
    // Create the collection
    const created = await Collections.create(collectionData);

    // CRITICAL: Do NOT create collection history entries when adding machines to the list
    // Collection history entries should only be created when the user presses "Create Report"
    // This prevents duplicate history entries and ensures proper timing

    // ============================================================================
    // STEP 9: Log activity
    // ============================================================================
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        await logActivity({
          action: 'CREATE',
          details: `Created collection for machine ${payload.machineId} at location ${payload.location} (${payload.metersIn} in, ${payload.metersOut} out)`,
          ipAddress: getClientIP(req) || undefined,
          metadata: {
            resource: 'collection',
            resourceId: created._id.toString(),
            resourceName: `Machine ${payload.machineId}`,
            userId: currentUser._id as string,
            username: currentUser.emailAddress as string,
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }

    // ============================================================================
    // STEP 10: Return created collection
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Collections POST API] Completed in ${duration}ms`);
    }
    return NextResponse.json({
      success: true,
      data: created,
      calculations: {
        sasMeters,
        movement,
        previousMeters,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to create collection';
    console.error(
      `[Collections API POST] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Main PATCH handler for updating a collection
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse query parameters and request body
 * 3. Validate collection ID
 * 4. Get original collection data
 * 5. Check if meters or timestamp changed
 * 6. Recalculate prevIn/prevOut and movement if meters changed
 * 7. Recalculate SAS metrics if timestamp or meters changed
 * 8. Update collection document
 * 9. Log activity
 * 10. Return updated collection
 */
export async function PATCH(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse query parameters and request body
    // ============================================================================
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const updateData = await req.json();

    // ============================================================================
    // STEP 3: Validate collection ID
    // ============================================================================
    // ============================================================================
    // STEP 4: Get original collection data
    // ============================================================================
    // Get original collection data for change tracking
    // CRITICAL: Use findOne with _id instead of findById (repo rule)
    const originalCollection = await Collections.findOne({ _id: id });
    if (!originalCollection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 5: Check if meters or timestamp changed
    // ============================================================================

    // CRITICAL FIX: When editing a collection, we must recalculate prevIn/prevOut and movement
    // If metersIn or metersOut changed, we need to recalculate everything
    const metersChanged =
      (updateData.metersIn !== undefined &&
        updateData.metersIn !== originalCollection.metersIn) ||
      (updateData.metersOut !== undefined &&
        updateData.metersOut !== originalCollection.metersOut) ||
      (updateData.ramClear !== undefined &&
        updateData.ramClear !== originalCollection.ramClear) ||
      updateData.ramClearMetersIn !== undefined ||
      updateData.ramClearMetersOut !== undefined;

    // CRITICAL FIX: When timestamp changes, we must recalculate SAS times and metrics
    // This fixes the "Update All Dates" button issue where SAS times weren't being recalculated
    const timestampChanged =
      updateData.timestamp !== undefined &&
      new Date(updateData.timestamp).getTime() !==
        new Date(originalCollection.timestamp).getTime();

    // ============================================================================
    // STEP 6: Recalculate prevIn/prevOut and movement if meters changed
    // ============================================================================
    if (metersChanged) {
      // Meters changed, recalculating prevIn/prevOut and movement

      // Find actual previous collection (NOT from machine.collectionMeters)
      const previousCollection = await Collections.findOne({
        machineId: originalCollection.machineId,
        timestamp: {
          $lt:
            originalCollection.timestamp || originalCollection.collectionTime,
        },
        isCompleted: true,
        locationReportId: { $exists: true, $ne: '' },
        $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
        _id: { $ne: id }, // Don't find this same collection
      })
        .sort({ timestamp: -1 })
        .lean();

      // Set prevIn/prevOut from actual previous collection
      if (previousCollection) {
        updateData.prevIn = previousCollection.metersIn || 0;
        updateData.prevOut = previousCollection.metersOut || 0;
      } else {
        // No previous collection, this is first collection
        updateData.prevIn = 0;
        updateData.prevOut = 0;
      }

      // Recalculate movement using the correct prevIn/prevOut
      const currentMetersIn =
        updateData.metersIn ?? originalCollection.metersIn;
      const currentMetersOut =
        updateData.metersOut ?? originalCollection.metersOut;
      const ramClear = updateData.ramClear ?? originalCollection.ramClear;
      const ramClearMetersIn =
        updateData.ramClearMetersIn ?? originalCollection.ramClearMetersIn;
      const ramClearMetersOut =
        updateData.ramClearMetersOut ?? originalCollection.ramClearMetersOut;

      let movementIn: number;
      let movementOut: number;

      if (ramClear) {
        if (ramClearMetersIn !== undefined && ramClearMetersOut !== undefined) {
          // RAM clear with ramClearMeters: (ramClearMetersIn - prevIn) + (currentMetersIn - 0)
          movementIn = ramClearMetersIn - updateData.prevIn + currentMetersIn;
          movementOut =
            ramClearMetersOut - updateData.prevOut + currentMetersOut;
        } else {
          // RAM clear without ramClearMeters: use current values directly
          movementIn = currentMetersIn;
          movementOut = currentMetersOut;
        }
      } else {
        // Standard: current - previous
        movementIn = currentMetersIn - updateData.prevIn;
        movementOut = currentMetersOut - updateData.prevOut;
      }

      const movementGross = movementIn - movementOut;

      updateData.movement = {
        metersIn: Number(movementIn.toFixed(2)),
        metersOut: Number(movementOut.toFixed(2)),
        gross: Number(movementGross.toFixed(2)),
      };
    }

    // ============================================================================
    // STEP 7: Recalculate SAS metrics if timestamp or meters changed
    // ============================================================================
    // CRITICAL FIX: When timestamp changes, recalculate SAS times and metrics
    if (timestampChanged || metersChanged) {
      try {
        // Use the new timestamp if provided, otherwise use original
        const collectionTimestamp = updateData.timestamp
          ? new Date(updateData.timestamp)
          : originalCollection.timestamp;

        // Get correct SAS time period based on previous collections
        const { sasStartTime, sasEndTime } = await getSasTimePeriod(
          originalCollection.machineId as string,
          undefined,
          collectionTimestamp
        );

        // Recalculate SAS metrics with the correct time window
        const sasMetrics = await calculateSasMetrics(
          originalCollection.machineId as string,
          sasStartTime,
          sasEndTime
        );

        // Update sasMeters in the update data
        updateData.sasMeters = {
          ...originalCollection.sasMeters,
          drop: sasMetrics.drop,
          totalCancelledCredits: sasMetrics.totalCancelledCredits,
          gross: sasMetrics.gross,
          gamesPlayed: sasMetrics.gamesPlayed,
          jackpot: sasMetrics.jackpot,
          sasStartTime: sasMetrics.sasStartTime,
          sasEndTime: sasMetrics.sasEndTime,
          machine:
            originalCollection.sasMeters?.machine ||
            originalCollection.machineId,
        };
      } catch (sasError) {
        console.error(
          '[Collections API] Error recalculating SAS metrics:',
          sasError
        );
        // Continue with update even if SAS calculation fails
        // This prevents the entire update from failing
      }
    }

    // ============================================================================
    // STEP 8: Update collection document
    // ============================================================================
    // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
    const updated = await Collections.findOneAndUpdate(
      { _id: id },
      { $set: updateData },
      { new: true }
    );

    // ============================================================================
    // STEP 9: Log activity
    // ============================================================================
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        await logActivity({
          action: 'UPDATE',
          details: `Updated collection for machine ${originalCollection.machineId} at location ${originalCollection.location}`,
          ipAddress: getClientIP(req) || undefined,
          metadata: {
            resource: 'collection',
            resourceId: id,
            resourceName: `Machine ${originalCollection.machineId}`,
            userId: (currentUser._id ||
              currentUser.id ||
              currentUser.sub) as string,
            username: currentUser.emailAddress as string,
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }

    // ============================================================================
    // STEP 10: Return updated collection
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Collections PATCH API] Completed in ${duration}ms`);
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to update collection';
    console.error(
      `[Collections API PATCH] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Main DELETE handler for deleting a collection
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse query parameters
 * 3. Validate collection ID
 * 4. Get collection data before deletion
 * 5. Delete collection document
 * 6. Revert machine collectionMeters and remove history entry
 * 7. Log activity
 * 8. Return success response
 */
export async function DELETE(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    // ============================================================================
    // STEP 3: Validate collection ID
    // ============================================================================
    // ============================================================================
    // STEP 4: Get collection data before deletion
    // ============================================================================
    // Get collection data before deletion for logging
    // CRITICAL: Use findOne with _id instead of findById (repo rule)
    const collectionToDelete = await Collections.findOne({ _id: id });
    if (!collectionToDelete) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // ============================================================================
    // STEP 5: Delete collection document
    // ============================================================================
    // CRITICAL: Use findOneAndDelete with _id instead of findByIdAndDelete (repo rule)
    await Collections.findOneAndDelete({ _id: id });

    // ============================================================================
    // STEP 6: Revert machine collectionMeters and remove history entry
    // ============================================================================

    // Revert machine's collectionMeters and remove collection history entry
    if (collectionToDelete.machineId) {
      try {
        // CRITICAL: ALWAYS revert meters AND remove any history entries
        // Even if locationReportId is empty, there might be orphaned history entries
        const updateOperation: {
          $set: Record<string, unknown>;
          $pull?: Record<string, unknown>;
        } = {
          $set: {
            'collectionMeters.metersIn': collectionToDelete.prevIn || 0,
            'collectionMeters.metersOut': collectionToDelete.prevOut || 0,
            updatedAt: new Date(),
          },
        };

        // If collection has a locationReportId, remove its history entry
        if (collectionToDelete.locationReportId) {
          updateOperation.$pull = {
            collectionMetersHistory: {
              locationReportId: collectionToDelete.locationReportId,
            },
          };
        }

        // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
        await Machine.findOneAndUpdate(
          { _id: collectionToDelete.machineId },
          updateOperation
        );
      } catch (machineUpdateError) {
        console.error(
          'Failed to revert machine collectionMeters or remove history:',
          machineUpdateError
        );
        // Don't fail the deletion if machine update fails, but log the error
      }
    }

    // ============================================================================
    // STEP 7: Log activity
    // ============================================================================
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        await logActivity({
          action: 'DELETE',
          details: `Deleted collection for machine ${collectionToDelete.machineId} at location ${collectionToDelete.location}`,
          ipAddress: getClientIP(req) || undefined,
          metadata: {
            resource: 'collection',
            resourceId: id,
            resourceName: `Machine ${collectionToDelete.machineId}`,
            userId: (currentUser._id ||
              currentUser.id ||
              currentUser.sub) as string,
            username: currentUser.emailAddress as string,
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }

    // ============================================================================
    // STEP 8: Return success response
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Collections DELETE API] Completed in ${duration}ms`);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to delete collection';
    console.error(
      `[Collections API DELETE] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

