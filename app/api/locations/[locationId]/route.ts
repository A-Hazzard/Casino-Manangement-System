import { NextResponse, NextRequest } from 'next/server';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { connectDB } from '../../lib/middleware/db';
import { TransformedCabinet } from '@/lib/types/mongo';
import { TimePeriod } from '../../lib/types';
import mongoose from 'mongoose';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import { checkUserLocationAccess } from '../../lib/helpers/licenseeFilter';

// Helper function to safely convert an ID to ObjectId if possible
function safeObjectId(id: string): string | mongoose.Types.ObjectId {
  if (!id) return id;
  try {
    if (mongoose.Types.ObjectId.isValid(id)) {
      return new mongoose.Types.ObjectId(id);
    }
  } catch (err) {
    console.error(`Failed to convert ID to ObjectId: ${id}`, err);
  }
  return id;
}

export async function GET(request: NextRequest) {
  const perfStart = Date.now();
  
  try {
    // Extract locationId from the URL
    const url = request.nextUrl;
    const locationId = url.pathname.split('/')[3];

    // Check if this is a request for basic location details (no query params)
    const hasQueryParams = url.searchParams.toString().length > 0;

    if (!hasQueryParams) {
      // Return basic location details for edit modal
      await connectDB();
      
      // Check if user has access to this location
      const hasAccess = await checkUserLocationAccess(locationId);
      if (!hasAccess) {
        return NextResponse.json(
          { success: false, message: 'Unauthorized: You do not have access to this location' },
          { status: 403 }
        );
      }

      const location = await GamingLocations.findById(locationId);

      if (!location) {
        return NextResponse.json(
          { success: false, message: 'Location not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        location: location,
      });
    }

    // Connect to the database
    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { error: 'Failed to connect to database' },
        { status: 500 }
      );
    }

    // Get query parameters
    const licencee = url.searchParams.get('licencee');
    const searchTerm = url.searchParams.get('search');
    const timePeriod = url.searchParams.get('timePeriod') as TimePeriod;
    const customStartDate = url.searchParams.get('startDate');
    const customEndDate = url.searchParams.get('endDate');

    // Only proceed if timePeriod is provided - no fallback
    if (!timePeriod) {
      return NextResponse.json(
        { error: 'timePeriod parameter is required' },
        { status: 400 }
      );
    }

    // We'll calculate the gaming day range after we get the location's gameDayOffset
    let timePeriodForGamingDay: string;
    let customStartDateForGamingDay: Date | undefined;
    let customEndDateForGamingDay: Date | undefined;

    if (timePeriod === 'Custom' && customStartDate && customEndDate) {
      timePeriodForGamingDay = 'Custom';
      // Parse dates - gaming day offset will be applied by getGamingDayRangeForPeriod
      customStartDateForGamingDay = new Date(customStartDate + 'T00:00:00.000Z');
      customEndDateForGamingDay = new Date(customEndDate + 'T00:00:00.000Z');
    } else {
      timePeriodForGamingDay = timePeriod;
    }

    // Check if user has access to this location
    const hasAccess = await checkUserLocationAccess(locationId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not have access to this location' },
        { status: 403 }
      );
    }

    // Convert locationId to ObjectId for proper matching
    const locationIdObj = safeObjectId(locationId);

    // First verify the location exists
    const locationCheck = await GamingLocations.findOne({
      _id: { $in: [locationId, locationIdObj] },
    });

    if (!locationCheck) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    // CRITICAL SECURITY CHECK: Verify the location belongs to the selected licensee (if provided)
    if (licencee && locationCheck.rel?.licencee !== licencee) {
      console.error(
        `Access denied: Location ${locationId} does not belong to licensee ${licencee}`
      );
      return NextResponse.json(
        { error: 'Access denied: Location not found for selected licensee' },
        { status: 403 }
      );
    }

    // Calculate gaming day range for this location
    // Always use gaming day offset logic (including for custom dates)
    const gameDayOffset = locationCheck.gameDayOffset ?? 8; // Default to 8 AM Trinidad time
    const gamingDayRange = getGamingDayRangeForPeriod(
      timePeriodForGamingDay,
      gameDayOffset,
      customStartDateForGamingDay,
      customEndDateForGamingDay
    );

    // Build aggregation pipeline based on your MongoDB compass query
    const aggregationPipeline: Record<string, unknown>[] = [
      // Match the specific location (similar to your $match: { name: "Big Shot" })
      {
        $match: { _id: { $in: [locationId, locationIdObj] } },
      },
      // Lookup machines for this location
      {
        $lookup: {
          from: 'machines',
          localField: '_id',
          foreignField: 'gamingLocation',
          as: 'machines',
        },
      },
      // Unwind machines to get individual machine documents
      {
        $unwind: {
          path: '$machines',
          preserveNullAndEmptyArrays: false, // Only return locations that have machines
        },
      },
    ];

    // Add search filter if provided (search by serial number, relay ID, smib board, custom.name, or machine _id)
    if (searchTerm) {
      aggregationPipeline.push({
        $match: {
          $or: [
            { 'machines.serialNumber': { $regex: searchTerm, $options: 'i' } },
            { 'machines.relayId': { $regex: searchTerm, $options: 'i' } },
            { 'machines.smibBoard': { $regex: searchTerm, $options: 'i' } },
            { 'machines.custom.name': { $regex: searchTerm, $options: 'i' } },
            { 'machines._id': searchTerm }, // Exact match for machine _id
          ],
        },
      });
    }

    // Add meter data lookup using gaming day range
    // IMPORTANT: Meters are CUMULATIVE, so we calculate last - first, NOT sum
    aggregationPipeline.push({
      $lookup: {
        from: 'meters',
        let: { machineId: '$machines._id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$machine', '$$machineId'] },
              // Use the calculated gaming day range for this location
              readAt: {
                $gte: gamingDayRange.rangeStart,
                $lte: gamingDayRange.rangeEnd,
              },
            },
          },
          {
            $group: {
              _id: null,
              // Use sum of deltas to match locations list API and MongoDB Compass results
              moneyIn: { $sum: '$movement.drop' },
              moneyOut: { $sum: '$movement.totalCancelledCredits' },
              jackpot: { $sum: '$movement.jackpot' },
              gamesPlayed: { $sum: '$movement.gamesPlayed' },
              gamesWon: { $sum: '$movement.gamesWon' },
            },
          },
          {
            $addFields: {
              gross: { $subtract: ['$moneyIn', '$moneyOut'] },
            },
          },
        ],
        as: 'metersData',
      },
    });

    // Project the final structure (similar to your $project)
    aggregationPipeline.push({
      $project: {
        _id: '$machines._id',
        locationId: '$_id',
        locationName: '$name',
        assetNumber: {
          $ifNull: [
            { $cond: [{ $eq: [{ $trim: { input: '$machines.serialNumber' } }, ''] }, null, '$machines.serialNumber'] },
            '$machines.custom.name'
          ]
        },
        serialNumber: {
          $ifNull: [
            { $cond: [{ $eq: [{ $trim: { input: '$machines.serialNumber' } }, ''] }, null, '$machines.serialNumber'] },
            '$machines.custom.name'
          ]
        },
        relayId: '$machines.relayId',
        smibBoard: '$machines.smibBoard',
        smbId: {
          $ifNull: [
            '$machines.smibBoard',
            { $ifNull: ['$machines.relayId', ''] },
          ],
        },
        lastActivity: '$machines.lastActivity',
        lastOnline: '$machines.lastActivity',
        game: '$machines.game',
        installedGame: '$machines.game',
        manufacturer: {
          $ifNull: [
            '$machines.manufacturer',
            '$machines.manuf',
            'Unknown Manufacturer',
          ],
        },
        cabinetType: '$machines.cabinetType',
        assetStatus: '$machines.assetStatus',
        status: '$machines.assetStatus',
        gameType: '$machines.gameType',
        isCronosMachine: '$machines.isCronosMachine',
        // Use aggregated meter data with proper fallbacks (exactly like your query)
        moneyIn: { $ifNull: [{ $arrayElemAt: ['$metersData.moneyIn', 0] }, 0] },
        moneyOut: {
          $ifNull: [{ $arrayElemAt: ['$metersData.moneyOut', 0] }, 0],
        },
        jackpot: { $ifNull: [{ $arrayElemAt: ['$metersData.jackpot', 0] }, 0] },
        gross: { $ifNull: [{ $arrayElemAt: ['$metersData.gross', 0] }, 0] },
        gamesPlayed: {
          $ifNull: [{ $arrayElemAt: ['$metersData.gamesPlayed', 0] }, 0],
        },
        gamesWon: {
          $ifNull: [{ $arrayElemAt: ['$metersData.gamesWon', 0] }, 0],
        },
        cancelledCredits: {
          $ifNull: [{ $arrayElemAt: ['$metersData.moneyOut', 0] }, 0],
        },
        sasMeters: '$machines.sasMeters',
        // Calculate online status (3 minutes threshold)
        online: {
          $cond: [
            {
              $and: [
                { $ne: ['$machines.lastActivity', null] },
                {
                  $gte: [
                    '$machines.lastActivity',
                    { $subtract: [new Date(), 3 * 60 * 1000] },
                  ],
                },
              ],
            },
            true,
            false,
          ],
        },
      },
    });

    // Execute the aggregation
    const cabinetsWithMeters = await db
      .collection('gaminglocations')
      .aggregate(aggregationPipeline, {
        allowDiskUse: true,
        maxTimeMS: 60000,
      })
      .toArray();

    // Transform the results to ensure proper data types
    const transformedCabinets: TransformedCabinet[] = cabinetsWithMeters.map(
      (cabinet: Record<string, unknown>) => ({
        _id: cabinet._id?.toString() || '',
        locationId: cabinet.locationId?.toString() || '',
        locationName: (cabinet.locationName as string) || '',
        assetNumber: (cabinet.assetNumber as string) || '',
        serialNumber: (cabinet.serialNumber as string) || '',
        relayId: (cabinet.relayId as string) || '',
        smibBoard: (cabinet.smibBoard as string) || '',
        smbId: (cabinet.smbId as string) || '',
        lastActivity: (cabinet.lastActivity as Date) || null,
        lastOnline: (cabinet.lastOnline as Date) || null,
        game: (cabinet.game as string) || '',
        installedGame: (cabinet.installedGame as string) || '',
        cabinetType: (cabinet.cabinetType as string) || '',
        assetStatus: (cabinet.assetStatus as string) || '',
        status: (cabinet.status as string) || '',
        gameType: (cabinet.gameType as string) || '',
        isCronosMachine: cabinet.isCronosMachine || false,
        // Ensure all numeric fields are properly typed
        moneyIn: Number(cabinet.moneyIn) || 0,
        moneyOut: Number(cabinet.moneyOut) || 0,
        jackpot: Number(cabinet.jackpot) || 0,
        gross: Number(cabinet.gross) || 0,
        gamesPlayed: Number(cabinet.gamesPlayed) || 0,
        gamesWon: Number(cabinet.gamesWon) || 0,
        cancelledCredits: Number(cabinet.cancelledCredits) || 0,
        sasMeters: (cabinet.sasMeters as Record<string, unknown>) || null,
        online: Boolean(cabinet.online),
        // Add any missing fields that might be expected
        metersData: null, // This was in the original structure
      })
    );

    const totalTime = Date.now() - perfStart;
    console.log(`⚡ /api/locations/${locationId} - ${totalTime}ms | ${transformedCabinets.length} machines | ${timePeriod}`);

    return NextResponse.json(transformedCabinets);
  } catch (error) {
    console.error('Error processing location cabinets request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch location cabinets data' },
      { status: 500 }
    );
  }
}
