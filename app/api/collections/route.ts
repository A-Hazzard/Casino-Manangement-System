import { getUserLocationFilter } from '@/app/api/lib/helpers/licenseeFilter';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Collections } from '@/app/api/lib/models/collections';
import { Machine } from '@/app/api/lib/models/machines';
import { calculateChanges, logActivity } from '@/lib/helpers/activityLogger';
import {
  calculateSasMetrics,
  createCollectionWithCalculations,
  getSasTimePeriod,
} from '@/lib/helpers/collectionCreation';
import type {
  CollectionDocument,
  CreateCollectionPayload,
} from '@/lib/types/collections';
import { generateMongoId } from '@/lib/utils/id';
import { getClientIP } from '@/lib/utils/ipAddress';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromServer } from '../lib/helpers/users';

export async function GET(req: NextRequest) {
  await connectDB();
  try {
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

    // SECURITY: Get user's accessible locations to prevent data leakage
    const user = await getUserFromServer();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoles = (user.roles as string[]) || [];
    const userAccessibleLicensees =
      ((user.rel as Record<string, unknown>)?.licencee as string[]) || [];
    const userLocationPermissions =
      ((user.resourcePermissions as Record<string, Record<string, unknown>>)?.[
        'gaming-locations'
      ]?.resources as string[]) || [];
    const isAdmin =
      userRoles.includes('admin') || userRoles.includes('developer');

    // Support both licensee spellings
    const licensee =
      searchParams.get('licensee') || searchParams.get('licencee');

    // Get allowed locations for this user
    const allowedLocationIds = await getUserLocationFilter(
      isAdmin ? 'all' : userAccessibleLicensees,
      licensee || undefined,
      userLocationPermissions,
      userRoles
    );

    console.warn('[COLLECTIONS API] User:', user.username);
    console.warn('[COLLECTIONS API] Allowed locations:', allowedLocationIds);

    const filter: Record<string, unknown> = {};
    if (locationReportId) filter.locationReportId = locationReportId;

    // CRITICAL: Filter by location parameter AND user's accessible locations
    if (location) {
      // Check if user has access to this specific location
      if (allowedLocationIds === 'all') {
        filter.location = location;
      } else if (allowedLocationIds.includes(location)) {
        filter.location = location;
      } else {
        // User requested a location they don't have access to
        console.warn(
          '[COLLECTIONS API] User does not have access to location:',
          location
        );
        return NextResponse.json([]); // Return empty array
      }
    } else {
      // No specific location requested - filter by all accessible locations
      if (allowedLocationIds !== 'all') {
        if (allowedLocationIds.length === 0) {
          console.warn('[COLLECTIONS API] User has no accessible locations');
          return NextResponse.json([]);
        }
        filter.location = { $in: allowedLocationIds };
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

        console.warn(
          '[COLLECTIONS API] User accessible location names:',
          locationNames
        );

        if (locationNames.length > 0) {
          filter.location = { $in: locationNames }; // ✅ Filter by location names
        } else {
          // User has no accessible locations
          filter.location = 'IMPOSSIBLE_LOCATION_NAME'; // Force empty result
        }
      }
      // If allowedLocationIds === 'all', don't add location filter (admin/developer sees all)

      console.warn('[COLLECTIONS API] Incomplete collections filter:', filter);
    }

    // Support querying for collections before a specific timestamp (for historical prevIn/prevOut)
    if (beforeTimestamp) {
      filter.timestamp = { $lt: new Date(beforeTimestamp) };
    }

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

    const collections = (await query.lean()) as CollectionDocument[];

    console.warn('Collections API GET result:', {
      filter,
      beforeTimestamp: beforeTimestamp || 'none',
      sortBy: sortBy || 'none',
      sortOrder: sortOrder || 'none',
      limit: limit || 'none',
      collectionsCount: collections.length,
      collections: collections.map(c => ({
        _id: c._id,
        machineId: c.machineId,
        timestamp: c.timestamp,
        metersIn: c.metersIn,
        metersOut: c.metersOut,
        locationReportId: c.locationReportId,
      })),
    });

    return NextResponse.json(collections);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch collections' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  await connectDB();
  try {
    const payload: CreateCollectionPayload = await req.json();

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
      console.warn(
        '🔧 Collection created without locationReportId - will be set when report is created'
      );
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

    // Get machine details for additional fields
    const machine = await Machine.findById(payload.machineId).lean();
    if (!machine) {
      return NextResponse.json({ error: 'Machine not found' }, { status: 404 });
    }

    // Safely access machine properties with type assertion
    const machineData = machine as Record<string, unknown>;

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

    // Create the collection
    const created = await Collections.create(collectionData);

    // CRITICAL: Do NOT create collection history entries when adding machines to the list
    // Collection history entries should only be created when the user presses "Create Report"
    // This prevents duplicate history entries and ensures proper timing
    console.warn(
      '✅ Collection created without history entry - history will be created when report is finalized'
    );

    // Log activity
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        const createChanges = [
          { field: 'machineId', oldValue: null, newValue: payload.machineId },
          { field: 'location', oldValue: null, newValue: payload.location },
          { field: 'collector', oldValue: null, newValue: payload.collector },
          { field: 'metersIn', oldValue: null, newValue: payload.metersIn },
          { field: 'metersOut', oldValue: null, newValue: payload.metersOut },
          { field: 'notes', oldValue: null, newValue: payload.notes || '' },
          {
            field: 'isCompleted',
            oldValue: null,
            newValue: payload.isCompleted ?? false,
          },
        ];

        await logActivity(
          {
            id: currentUser._id as string,
            email: currentUser.emailAddress as string,
            role: (currentUser.roles as string[])?.[0] || 'user',
          },
          'CREATE',
          'collection',
          { id: created._id.toString(), name: `Machine ${payload.machineId}` },
          createChanges,
          `Created collection for machine ${payload.machineId} at location ${payload.location} (${payload.metersIn} in, ${payload.metersOut} out)`,
          getClientIP(req) || undefined
        );
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
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
    console.error('Error creating collection:', error);
    return NextResponse.json(
      {
        error: 'Failed to create collection',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  await connectDB();
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const updateData = await req.json();

    // Get original collection data for change tracking
    const originalCollection = await Collections.findById(id);
    if (!originalCollection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

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

    if (metersChanged) {
      console.warn(
        '🔄 Meters changed, recalculating prevIn/prevOut and movement for collection:',
        id
      );

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
        console.warn('✅ Found previous collection, set prevIn/prevOut:', {
          prevIn: updateData.prevIn,
          prevOut: updateData.prevOut,
          previousCollectionId: previousCollection._id,
        });
      } else {
        // No previous collection, this is first collection
        updateData.prevIn = 0;
        updateData.prevOut = 0;
        console.warn(
          '✅ No previous collection found, set prevIn/prevOut to 0'
        );
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
          console.warn('  RAM Clear with ramClearMeters:', {
            movementIn,
            movementOut,
          });
        } else {
          // RAM clear without ramClearMeters: use current values directly
          movementIn = currentMetersIn;
          movementOut = currentMetersOut;
          console.warn('  RAM Clear without ramClearMeters:', {
            movementIn,
            movementOut,
          });
        }
      } else {
        // Standard: current - previous
        movementIn = currentMetersIn - updateData.prevIn;
        movementOut = currentMetersOut - updateData.prevOut;
        console.warn('  Standard movement:', { movementIn, movementOut });
      }

      const movementGross = movementIn - movementOut;

      updateData.movement = {
        metersIn: Number(movementIn.toFixed(2)),
        metersOut: Number(movementOut.toFixed(2)),
        gross: Number(movementGross.toFixed(2)),
      };

      console.warn('✅ Recalculated movement:', updateData.movement);
    }

    // CRITICAL FIX: When timestamp changes, recalculate SAS times and metrics
    // This ensures "Update All Dates" button properly updates SAS windows
    if (timestampChanged || metersChanged) {
      console.warn(
        '🔄 Timestamp or meters changed, recalculating SAS times and metrics for collection:',
        id
      );

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

        console.warn('✅ Recalculated SAS times and metrics:', {
          sasStartTime: sasMetrics.sasStartTime,
          sasEndTime: sasMetrics.sasEndTime,
          drop: sasMetrics.drop,
          gross: sasMetrics.gross,
        });
      } catch (sasError) {
        console.error('❌ Error recalculating SAS metrics:', sasError);
        // Continue with update even if SAS calculation fails
        // This prevents the entire update from failing
      }
    }

    const updated = await Collections.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    // Log activity
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        const changes = calculateChanges(
          originalCollection.toObject(),
          updateData
        );

        await logActivity(
          {
            id: currentUser._id as string,
            email: currentUser.emailAddress as string,
            role: (currentUser.roles as string[])?.[0] || 'user',
          },
          'UPDATE',
          'collection',
          { id, name: `Machine ${originalCollection.machineId}` },
          changes,
          `Updated collection for machine ${originalCollection.machineId} at location ${originalCollection.location}`,
          getClientIP(req) || undefined
        );
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    return NextResponse.json(
      { error: 'Failed to update collection', details: (e as Error)?.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  await connectDB();
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    // Get collection data before deletion for logging
    const collectionToDelete = await Collections.findById(id);
    if (!collectionToDelete) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await Collections.findByIdAndDelete(id);

    // Revert machine's collectionMeters and remove collection history entry
    if (collectionToDelete.machineId) {
      try {
        console.warn(
          '🔄 Reverting machine collectionMeters and removing history after collection deletion:',
          {
            machineId: collectionToDelete.machineId,
            prevIn: collectionToDelete.prevIn,
            prevOut: collectionToDelete.prevOut,
            currentMetersIn: collectionToDelete.metersIn,
            currentMetersOut: collectionToDelete.metersOut,
            locationReportId: collectionToDelete.locationReportId,
          }
        );

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

        await Machine.findByIdAndUpdate(
          collectionToDelete.machineId,
          updateOperation
        );

        console.warn(
          '✅ Machine collectionMeters reverted' +
            (collectionToDelete.locationReportId
              ? ` and history entry removed for locationReportId: ${collectionToDelete.locationReportId}`
              : ' (no locationReportId, no history entry to remove)')
        );
      } catch (machineUpdateError) {
        console.error(
          'Failed to revert machine collectionMeters or remove history:',
          machineUpdateError
        );
        // Don't fail the deletion if machine update fails, but log the error
      }
    }

    // Log activity
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        const deleteChanges = [
          {
            field: 'machineId',
            oldValue: collectionToDelete.machineId,
            newValue: null,
          },
          {
            field: 'location',
            oldValue: collectionToDelete.location,
            newValue: null,
          },
          {
            field: 'collector',
            oldValue: collectionToDelete.collector,
            newValue: null,
          },
          {
            field: 'metersIn',
            oldValue: collectionToDelete.metersIn,
            newValue: null,
          },
          {
            field: 'metersOut',
            oldValue: collectionToDelete.metersOut,
            newValue: null,
          },
          {
            field: 'notes',
            oldValue: collectionToDelete.notes,
            newValue: null,
          },
        ];

        await logActivity(
          {
            id: currentUser._id as string,
            email: currentUser.emailAddress as string,
            role: (currentUser.roles as string[])?.[0] || 'user',
          },
          'DELETE',
          'collection',
          { id, name: `Machine ${collectionToDelete.machineId}` },
          deleteChanges,
          `Deleted collection for machine ${collectionToDelete.machineId} at location ${collectionToDelete.location}`,
          getClientIP(req) || undefined
        );
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: 'Failed to delete collection', details: (e as Error)?.message },
      { status: 500 }
    );
  }
}
