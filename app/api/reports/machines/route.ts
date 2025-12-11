/**
 * Machines Report API Route
 *
 * This route handles fetching machine reports with various filtering options.
 * It supports:
 * - Multiple report types (overview, stats, all, offline)
 * - Time period filtering (today, week, month, custom dates)
 * - Licensee filtering
 * - Location filtering
 * - Online/offline status filtering
 * - Search functionality
 * - Currency conversion (Admin/Developer only for "All Licensees")
 * - Pagination
 *
 * @module app/api/reports/machines/route
 */

import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Countries } from '@/app/api/lib/models/countries';
import { Licencee } from '@/app/api/lib/models/licencee';
import { Machine } from '@/app/api/lib/models/machines';
import { TimePeriod } from '@/app/api/lib/types';
import { getDatesForTimePeriod } from '@/app/api/lib/utils/dates';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import { convertFromUSD } from '@/lib/helpers/rates';
import type { CurrencyCode } from '@/shared/types/currency';
import { Db, Document } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching machines report
 *
 * Flow:
 * 1. Parse query parameters (type, timePeriod, licensee, location, search, etc.)
 * 2. Validate timePeriod parameter
 * 3. Parse custom dates if provided
 * 4. Connect to database
 * 5. Authenticate user and check admin/dev role
 * 6. Build machine and location match filters
 * 7. Route to appropriate handler based on type
 * 8. Return machine report data
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'overview', 'stats', 'all', 'offline'
    const timePeriod = searchParams.get('timePeriod') as TimePeriod;

    // ============================================================================
    // STEP 2: Validate timePeriod parameter
    // ============================================================================
    if (!timePeriod) {
      return NextResponse.json(
        { error: 'timePeriod parameter is required' },
        { status: 400 }
      );
    }

    const licencee = searchParams.get('licencee') || undefined;
    const onlineStatus = searchParams.get('onlineStatus') || 'all';
    const searchTerm = searchParams.get('search');
    const locationId = searchParams.get('locationId');
    const displayCurrency =
      (searchParams.get('currency') as CurrencyCode) || 'USD';

    // Pagination parameters for overview
    const page = parseInt(searchParams.get('page') || '1');
    const requestedLimit = parseInt(searchParams.get('limit') || '10');
    const limit = Math.min(requestedLimit, 50);
    const skip = (page - 1) * limit;

    // ============================================================================
    // STEP 3: Parse custom dates if provided
    // ============================================================================
    let startDate: Date | undefined, endDate: Date | undefined;

    if (timePeriod === 'Custom') {
      const customStart = searchParams.get('startDate');
      const customEnd = searchParams.get('endDate');
      if (!customStart || !customEnd) {
        return NextResponse.json(
          { error: 'Missing startDate or endDate' },
          { status: 400 }
        );
      }

      // Parse custom dates and apply timezone handling
      // Create dates in Trinidad timezone (UTC-4)
      const customStartDate = new Date(customStart + 'T00:00:00-04:00');
      const customEndDate = new Date(customEnd + 'T23:59:59-04:00');

      // Convert to UTC for database queries
      startDate = new Date(customStartDate.getTime());
      endDate = new Date(customEndDate.getTime());
    } else {
      const { startDate: s, endDate: e } = getDatesForTimePeriod(timePeriod);
      startDate = s;
      endDate = e;
    }

    // ============================================================================
    // STEP 4: Connect to database
    // ============================================================================
    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { error: 'DB connection failed' },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 5: Authenticate user and check admin/dev role
    // ============================================================================
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoles = (userPayload?.roles as string[]) || [];
    const isAdminOrDev =
      userRoles.includes('admin') || userRoles.includes('developer');

    // ============================================================================
    // STEP 5.5: Get user location permissions for filtering
    // ============================================================================
    // Use only new field
    let userAccessibleLicensees: string[] = [];
    if (
      Array.isArray(
        (userPayload as { assignedLicensees?: string[] })?.assignedLicensees
      )
    ) {
      userAccessibleLicensees = (userPayload as { assignedLicensees: string[] })
        .assignedLicensees;
    }
    // Use only new field
    let userLocationPermissions: string[] = [];
    if (
      Array.isArray(
        (userPayload as { assignedLocations?: string[] })?.assignedLocations
      )
    ) {
      userLocationPermissions = (userPayload as { assignedLocations: string[] })
        .assignedLocations;
    }

    // Get user's accessible locations
    const { getUserLocationFilter } = await import(
      '@/app/api/lib/helpers/licenseeFilter'
    );
    const allowedLocationIds = await getUserLocationFilter(
      isAdminOrDev ? 'all' : userAccessibleLicensees,
      licencee || undefined,
      userLocationPermissions,
      userRoles
    );

    // If user has no access, return empty result
    if (allowedLocationIds !== 'all' && allowedLocationIds.length === 0) {
      return NextResponse.json({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });
    }

    // ============================================================================
    // STEP 6: Build machine and location match filters
    // ============================================================================
    const machineMatchStage: Record<string, unknown> = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2025-01-01') } },
      ],
    };

    // Apply user location filter if not admin/dev
    if (allowedLocationIds !== 'all') {
      machineMatchStage.gamingLocation = { $in: allowedLocationIds };
    }

    // Add online status filter
    if (onlineStatus !== 'all') {
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
      if (onlineStatus === 'online') {
        machineMatchStage.lastActivity = {
          $gte: threeMinutesAgo,
        };
      } else if (onlineStatus === 'offline') {
        machineMatchStage.$or = [
          { lastActivity: { $lt: threeMinutesAgo } },
          { lastActivity: { $exists: false } },
        ];
      }
    } else {
      // For "all" status, include machines with or without lastActivity
      // This ensures we get all machines regardless of lastActivity field
    }

    // Add search filter if specified
    if (searchTerm && searchTerm.trim()) {
      machineMatchStage.$or = [
        { serialNumber: { $regex: searchTerm, $options: 'i' } },
        { origSerialNumber: { $regex: searchTerm, $options: 'i' } },
        { game: { $regex: searchTerm, $options: 'i' } },
        { manuf: { $regex: searchTerm, $options: 'i' } },
        { manufacturer: { $regex: searchTerm, $options: 'i' } },
        { 'custom.name': { $regex: searchTerm, $options: 'i' } }, // Primary: lowercase as per schema
        { 'custom.name': { $regex: searchTerm, $options: 'i' } }, // Fallback: uppercase for legacy data
      ];
    }

    // Add location filter if specified (overrides user permissions if admin/dev)
    if (locationId && locationId !== 'all') {
      // Check if user has access to this specific location
      if (
        allowedLocationIds !== 'all' &&
        !allowedLocationIds.includes(locationId)
      ) {
        return NextResponse.json(
          { error: 'Unauthorized: You do not have access to this location' },
          { status: 403 }
        );
      }
      machineMatchStage.gamingLocation = locationId;
    }

    // Build location filter for licensee
    const locationMatchStage: Record<string, unknown> = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2025-01-01') } },
      ],
    };

    // Apply user location filter to location match stage if not admin/dev
    if (allowedLocationIds !== 'all') {
      locationMatchStage._id = { $in: allowedLocationIds };
    }

    // Add licencee filter if specified
    if (licencee && licencee !== 'all') {
      locationMatchStage['rel.licencee'] = licencee;
    }

    // ============================================================================
    // STEP 7: Route to appropriate handler based on type
    // ============================================================================
    switch (type) {
      case 'stats':
        return await getMachineStats(
          db,
          machineMatchStage,
          locationMatchStage,
          startDate,
          endDate,
          licencee,
          displayCurrency,
          isAdminOrDev
        );
      case 'overview':
        return await getOverviewMachines(
          db,
          machineMatchStage,
          locationMatchStage,
          page,
          limit,
          skip,
          startDate,
          endDate
        );
      case 'all':
        return await getAllMachines(
          db,
          searchParams,
          startDate,
          endDate,
          locationMatchStage
        );
      case 'offline':
        return await getOfflineMachines(
          db,
          searchParams,
          page,
          limit,
          skip,
          startDate,
          endDate,
          locationMatchStage
        );
      default:
        return await getOverviewMachines(
          db,
          machineMatchStage,
          locationMatchStage,
          page,
          limit,
          skip,
          startDate,
          endDate
        );
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Reports Machines API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Stats endpoint - returns total counts and financial totals
const getMachineStats = async (
  db: Db, // MongoDB database connection
  machineMatchStage: Record<string, unknown>,
  locationMatchStage: Record<string, unknown>,
  startDate: Date | undefined,
  endDate: Date | undefined,
  licencee: string | undefined,
  displayCurrency: CurrencyCode,
  isAdminOrDev: boolean
) => {
  const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

  // Use aggregation to join machines with gaminglocations for licensee filtering
  const aggregationPipeline: Document[] = [
    { $match: { deletedAt: { $in: [null, new Date(-1)] } } },
    {
      $lookup: {
        from: 'gaminglocations',
        localField: 'gamingLocation',
        foreignField: '_id',
        as: 'locationDetails',
      },
    },
    { $unwind: { path: '$locationDetails', preserveNullAndEmptyArrays: true } },
  ];

  // Add location filter if licensee is specified
  if (
    locationMatchStage &&
    typeof locationMatchStage === 'object' &&
    'rel.licencee' in locationMatchStage
  ) {
    (aggregationPipeline as unknown[]).push({
      $match: {
        'locationDetails.rel.licencee': (
          locationMatchStage as Record<string, unknown>
        )['rel.licencee'],
      },
    });
  }

  // Get total machines count (only machines with lastActivity field)
  const totalCountResult = await db
    .collection('machines')
    .aggregate([
      ...aggregationPipeline,
      { $match: { lastActivity: { $exists: true } } },
      { $count: 'total' },
    ] as Document[])
    .toArray();
  const totalCount = totalCountResult[0]?.total || 0;

  // Get online machines count (machines with lastActivity >= 3 minutes ago)
  const onlineCountResult = await db
    .collection('machines')
    .aggregate([
      ...aggregationPipeline,
      { $match: { lastActivity: { $exists: true, $gte: threeMinutesAgo } } },
      { $count: 'total' },
    ] as Document[])
    .toArray();
  const onlineCount = onlineCountResult[0]?.total || 0;

  // Calculate financial totals from meters collection within the date filter
  const financialTotals = await db
    .collection('machines')
    .aggregate([
      { $match: machineMatchStage },
      {
        $lookup: {
          from: 'gaminglocations',
          localField: 'gamingLocation',
          foreignField: '_id',
          as: 'locationDetails',
        },
      },
      {
        $unwind: { path: '$locationDetails', preserveNullAndEmptyArrays: true },
      },
      // Add location filter if licensee is specified
      ...(locationMatchStage &&
      typeof locationMatchStage === 'object' &&
      'rel.licencee' in locationMatchStage
        ? [
            {
              $match: {
                'locationDetails.rel.licencee':
                  locationMatchStage['rel.licencee'],
              },
            },
          ]
        : []),
      // Add meters lookup with proper aggregation
      {
        $lookup: {
          from: 'meters',
          let: { machineId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$machine', '$$machineId'] },
                    // Only include meters within the date range if dates are provided
                    ...(startDate && endDate
                      ? [
                          { $gte: ['$readAt', startDate] },
                          { $lte: ['$readAt', endDate] },
                        ]
                      : []),
                  ],
                },
              },
            },
            // Sum up the movement data
            {
              $group: {
                _id: null,
                drop: { $sum: { $ifNull: ['$movement.drop', 0] } },
                moneyOut: {
                  $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
                },
                coinIn: { $sum: { $ifNull: ['$movement.coinIn', 0] } },
                coinOut: { $sum: { $ifNull: ['$movement.coinOut', 0] } },
              },
            },
          ],
          as: 'meterData',
        },
      },
      {
        $unwind: {
          path: '$meterData',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: null,
          totalGross: {
            $sum: {
              $subtract: [
                { $ifNull: ['$meterData.drop', 0] },
                { $ifNull: ['$meterData.moneyOut', 0] },
              ],
            },
          },
          totalDrop: { $sum: { $ifNull: ['$meterData.drop', 0] } },
          totalCancelledCredits: {
            $sum: { $ifNull: ['$meterData.moneyOut', 0] },
          },
        },
      },
    ])
    .toArray();

  const totals = financialTotals[0] || {
    totalGross: 0,
    totalDrop: 0,
    totalCancelledCredits: 0,
  };

  // Apply currency conversion if needed (same pattern as /api/machines/aggregation)
  // Currency conversion ONLY for Admin/Developer viewing "All Licensees"
  let convertedTotals = totals;

  if (isAdminOrDev && shouldApplyCurrencyConversion(licencee)) {
    // Need to re-aggregate with currency conversion per machine
    // Get licensee and country mappings for currency determination
    const { getCountryCurrency } = await import('@/lib/helpers/rates');
    const { convertToUSD } = await import('@/lib/helpers/rates');

    const licensees = await Licencee.find({}).lean();
    const licenseeIdToName = new Map<string, string>();
    const licenseeIdToCurrency = new Map<string, string>();
    licensees.forEach(licensee => {
      if (licensee._id && licensee.name) {
        const licenseeId = String(licensee._id);
        licenseeIdToName.set(licenseeId, licensee.name);
        licenseeIdToCurrency.set(licenseeId, licensee.currency || 'USD');
      }
    });

    const countriesData = await Countries.find({}).lean();
    const countryIdToName = new Map<string, string>();
    countriesData.forEach(country => {
      if (country._id && country.name) {
        countryIdToName.set(String(country._id), country.name);
      }
    });

    // Re-fetch machines with location and currency info
    const machinesWithCurrency = await Machine.aggregate([
      { $match: machineMatchStage },
      {
        $lookup: {
          from: 'gaminglocations',
          localField: 'gamingLocation',
          foreignField: '_id',
          as: 'locationDetails',
        },
      },
      {
        $unwind: { path: '$locationDetails', preserveNullAndEmptyArrays: true },
      },
      ...(locationMatchStage &&
      typeof locationMatchStage === 'object' &&
      'rel.licencee' in locationMatchStage
        ? [
            {
              $match: {
                'locationDetails.rel.licencee':
                  locationMatchStage['rel.licencee'],
              },
            },
          ]
        : []),
      {
        $lookup: {
          from: 'meters',
          let: { machineId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$machine', '$$machineId'] },
                    ...(startDate && endDate
                      ? [
                          { $gte: ['$readAt', startDate] },
                          { $lte: ['$readAt', endDate] },
                        ]
                      : []),
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                drop: { $sum: { $ifNull: ['$movement.drop', 0] } },
                moneyOut: {
                  $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
                },
                coinIn: { $sum: { $ifNull: ['$movement.coinIn', 0] } },
                coinOut: { $sum: { $ifNull: ['$movement.coinOut', 0] } },
              },
            },
          ],
          as: 'meterData',
        },
      },
      {
        $unwind: {
          path: '$meterData',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          drop: { $ifNull: ['$meterData.drop', 0] },
          moneyOut: { $ifNull: ['$meterData.moneyOut', 0] },
          gross: {
            $subtract: [
              { $ifNull: ['$meterData.drop', 0] },
              { $ifNull: ['$meterData.moneyOut', 0] },
            ],
          },
          licenceeId: '$locationDetails.rel.licencee',
          countryId: '$locationDetails.country',
        },
      },
    ]);

    // Convert each machine's values to USD, then sum, then convert to display currency
    let totalDropUSD = 0;
    let totalMoneyOutUSD = 0;
    let totalGrossUSD = 0;

    machinesWithCurrency.forEach(machine => {
      const machineLicenseeId = machine.licenceeId?.toString();
      const countryId = machine.countryId?.toString();

      // Determine native currency
      let nativeCurrency = 'USD';
      if (machineLicenseeId && licenseeIdToCurrency.has(machineLicenseeId)) {
        nativeCurrency = licenseeIdToCurrency.get(machineLicenseeId) || 'USD';
      } else if (countryId) {
        const countryName = countryIdToName.get(countryId);
        nativeCurrency = countryName ? getCountryCurrency(countryName) : 'USD';
      }

      // Convert to USD first
      totalDropUSD += convertToUSD(machine.drop || 0, nativeCurrency);
      totalMoneyOutUSD += convertToUSD(machine.moneyOut || 0, nativeCurrency);
      totalGrossUSD += convertToUSD(machine.gross || 0, nativeCurrency);
    });

    // Convert from USD to display currency
    convertedTotals = {
      totalDrop: convertFromUSD(totalDropUSD, displayCurrency),
      totalGross: convertFromUSD(totalGrossUSD, displayCurrency),
      totalCancelledCredits: convertFromUSD(totalMoneyOutUSD, displayCurrency),
    };
  }

  return NextResponse.json({
    onlineCount,
    offlineCount: totalCount - onlineCount,
    totalCount,
    totalGross: convertedTotals.totalGross || 0,
    totalDrop: convertedTotals.totalDrop || 0,
    totalCancelledCredits: convertedTotals.totalCancelledCredits || 0,
    currency: displayCurrency,
    converted: isAdminOrDev && shouldApplyCurrencyConversion(licencee),
  });
};

// Overview endpoint - paginated machines for overview tab
const getOverviewMachines = async (
  db: Db, // MongoDB database connection
  machineMatchStage: Record<string, unknown>,
  locationMatchStage: Record<string, unknown>,
  page: number,
  limit: number,
  skip: number,
  startDate: Date | undefined,
  endDate: Date | undefined
) => {
  // console.log("🚀 Getting overview machines with pagination...");

  // Step 1: Get machines with proper meters aggregation using the working pattern
  const aggregationPipeline = [
    { $match: machineMatchStage },
    {
      $lookup: {
        from: 'gaminglocations',
        localField: 'gamingLocation',
        foreignField: '_id',
        as: 'locationDetails',
      },
    },
    { $unwind: { path: '$locationDetails', preserveNullAndEmptyArrays: true } },
  ];

  // Add location filter if licensee is specified
  if (locationMatchStage && locationMatchStage['rel.licencee']) {
    (aggregationPipeline as unknown[]).push({
      $match: {
        'locationDetails.rel.licencee': locationMatchStage['rel.licencee'],
      },
    });
  }

  // Add meters lookup with proper aggregation (following the working pattern)
  (aggregationPipeline as unknown[]).push(
    {
      $lookup: {
        from: 'meters',
        let: { machineId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$machine', '$$machineId'] },
                  // Only include meters within the date range if dates are provided
                  ...(startDate && endDate
                    ? [
                        { $gte: ['$readAt', startDate] },
                        { $lte: ['$readAt', endDate] },
                      ]
                    : []),
                ],
              },
            },
          },
          // Sum up the movement data
          {
            $group: {
              _id: null,
              drop: { $sum: { $ifNull: ['$movement.drop', 0] } },
              moneyOut: {
                $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
              },
              coinIn: { $sum: { $ifNull: ['$movement.coinIn', 0] } },
              coinOut: { $sum: { $ifNull: ['$movement.coinOut', 0] } },
              gamesPlayed: { $sum: { $ifNull: ['$movement.gamesPlayed', 0] } },
              jackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
            },
          },
        ],
        as: 'meterData',
      },
    },
    {
      $unwind: {
        path: '$meterData',
        preserveNullAndEmptyArrays: true,
      },
    }
  );

  // Add projection with calculated fields
  (aggregationPipeline as unknown[]).push(
    {
      $project: {
        _id: 1,
        serialNumber: 1,
        origSerialNumber: 1,
        'custom.name': 1,
        gamingLocation: 1,
        game: 1,
        manuf: 1,
        manufacturer: 1,
        lastActivity: 1,
        isSasMachine: 1,
        gameConfig: 1,
        locationName: '$locationDetails.name',
        // Financial metrics from meters aggregation
        drop: { $ifNull: ['$meterData.drop', 0] },
        moneyOut: { $ifNull: ['$meterData.moneyOut', 0] },
        coinIn: { $ifNull: ['$meterData.coinIn', 0] },
        coinOut: { $ifNull: ['$meterData.coinOut', 0] },
        gamesPlayed: { $ifNull: ['$meterData.gamesPlayed', 0] },
        jackpot: { $ifNull: ['$meterData.jackpot', 0] },
        // Calculate netWin (Handle - Automatic Payouts) and gross (Money In - Money Out)
        netWin: {
          $subtract: [
            { $ifNull: ['$meterData.coinIn', 0] },
            { $ifNull: ['$meterData.coinOut', 0] },
          ],
        },
        gross: {
          $subtract: [
            { $ifNull: ['$meterData.drop', 0] },
            { $ifNull: ['$meterData.moneyOut', 0] },
          ],
        },
        // Calculate actual hold percentage: (gross / handle) * 100 where gross = drop - totalCancelledCredits, handle = coinIn
        holdPct: {
          $cond: [
            { $gt: [{ $ifNull: ['$meterData.coinIn', 0] }, 0] },
            {
              $multiply: [
                {
                  $divide: [
                    {
                      $subtract: [
                        { $ifNull: ['$meterData.drop', 0] },
                        { $ifNull: ['$meterData.totalCancelledCredits', 0] },
                      ],
                    },
                    { $ifNull: ['$meterData.coinIn', 0] },
                  ],
                },
                100,
              ],
            },
            0,
          ],
        },
      },
    },
    // Sort by netWin descending (highest first) as default
    { $sort: { netWin: -1 } },
    { $skip: skip },
    { $limit: limit }
  );

  const machines = await db
    .collection('machines')
    .aggregate(aggregationPipeline as Document[])
    .toArray();

  // console.log(`🔍 Found ${machines.length} machines for overview`);

  // Transform machines data using the new structure
  const transformedMachines = machines.map(
    (machine: Record<string, unknown>) => {
      return {
        machineId: (machine._id as string).toString(),
        machineName:
          (machine.custom as Record<string, unknown>)?.name ||
          (machine.Custom as Record<string, unknown>)?.name ||
          machine.serialNumber ||
          'Unknown Machine',
        serialNumber:
          (machine.serialNumber as string) ||
          (machine.origSerialNumber as string) ||
          '',
        customName:
          ((machine.custom as Record<string, unknown>)?.name as string) ||
          ((machine.Custom as Record<string, unknown>)?.name as string) ||
          '',
        locationId: machine.gamingLocation?.toString() || '',
        locationName: machine.locationName || 'Unknown Location',
        gameTitle: machine.game || '(game name not provided)',
        manufacturer:
          machine.manufacturer || machine.manuf || 'Unknown Manufacturer',
        isOnline: !!(
          machine.lastActivity &&
          new Date(machine.lastActivity as string) >=
            new Date(Date.now() - 3 * 60 * 1000)
        ),
        lastActivity: machine.lastActivity,
        isSasEnabled: machine.isSasMachine || false,
        // Use the aggregated financial data
        drop: machine.drop || 0,
        totalCancelledCredits: machine.moneyOut || 0,
        netWin: machine.netWin || 0,
        gross: machine.gross || 0,
        theoreticalHold: (machine.gameConfig as Record<string, unknown>)
          ?.theoreticalRtp
          ? (1 -
              Number(
                (machine.gameConfig as Record<string, unknown>).theoreticalRtp
              )) *
            100
          : 0,
        gamesPlayed: machine.gamesPlayed || 0,
        jackpot: machine.jackpot || 0,
        // Calculate derived fields properly
        coinIn: machine.coinIn || 0, // Handle (betting activity)
        coinOut: machine.coinOut || 0, // Automatic payouts
        avgBet:
          ((machine.gamesPlayed as number) || 0) > 0
            ? ((machine.coinIn as number) || 0) /
              ((machine.gamesPlayed as number) || 1)
            : 0,
        // Use calculated hold percentage from aggregation
        actualHold: machine.holdPct || 0,
      };
    }
  );

  // Step 4: Get total count for pagination using aggregation with licensee filtering
  const countPipeline: Document[] = [
    { $match: machineMatchStage },
    {
      $lookup: {
        from: 'gaminglocations',
        localField: 'gamingLocation',
        foreignField: '_id',
        as: 'locationDetails',
      },
    },
    { $unwind: { path: '$locationDetails', preserveNullAndEmptyArrays: true } },
  ];

  // Add location filter if licensee is specified
  if (locationMatchStage && locationMatchStage['rel.licencee']) {
    countPipeline.push({
      $match: {
        'locationDetails.rel.licencee': locationMatchStage['rel.licencee'],
      },
    });
  }

  (countPipeline as unknown[]).push({ $count: 'total' });

  const totalCountResult = await db
    .collection('machines')
    .aggregate(countPipeline as Document[])
    .toArray();

  const totalCount = totalCountResult[0]?.total || 0;
  const totalPages = Math.ceil(totalCount / limit);

  return NextResponse.json({
    data: transformedMachines,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
};

// All machines endpoint - for Performance Analysis tab
const getAllMachines = async (
  db: Db, // MongoDB database connection
  searchParams: URLSearchParams,
  startDate: Date | undefined,
  endDate: Date | undefined,
  locationMatchStage: Record<string, unknown>
) => {
  try {
    const searchTerm = searchParams.get('search');

    // Build machine filter
    const machineMatchStage: Record<string, unknown> = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2025-01-01') } },
      ],
    };

    // Note: We don't filter by lastActivity date here to include all machines
    // Date filtering will be applied to financial data in the aggregation

    // Add search filter if specified
    if (searchTerm && searchTerm.trim()) {
      machineMatchStage.$or = [
        { serialNumber: { $regex: searchTerm, $options: 'i' } },
        { game: { $regex: searchTerm, $options: 'i' } },
        { manuf: { $regex: searchTerm, $options: 'i' } },
        { 'custom.name': { $regex: searchTerm, $options: 'i' } },
      ];
    }

    // Use aggregation to join machines with gaminglocations for licensee filtering
    const aggregationPipeline = [
      { $match: machineMatchStage },
      {
        $lookup: {
          from: 'gaminglocations',
          localField: 'gamingLocation',
          foreignField: '_id',
          as: 'locationDetails',
        },
      },
      {
        $unwind: { path: '$locationDetails', preserveNullAndEmptyArrays: true },
      },
    ];

    // Add location filter if licensee is specified
    if (locationMatchStage['rel.licencee']) {
      (aggregationPipeline as unknown[]).push({
        $match: {
          'locationDetails.rel.licencee': locationMatchStage['rel.licencee'],
        },
      });
    }

    // Add meters lookup with proper aggregation
    (aggregationPipeline as unknown[]).push(
      {
        $lookup: {
          from: 'meters',
          let: { machineId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$machine', '$$machineId'] },
                    // Only include meters within the date range if dates are provided
                    ...(startDate && endDate
                      ? [
                          { $gte: ['$readAt', startDate] },
                          { $lte: ['$readAt', endDate] },
                        ]
                      : []),
                  ],
                },
              },
            },
            // Sum up the movement data
            {
              $group: {
                _id: null,
                drop: { $sum: { $ifNull: ['$movement.drop', 0] } },
                moneyOut: {
                  $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
                },
                coinIn: { $sum: { $ifNull: ['$movement.coinIn', 0] } },
                coinOut: { $sum: { $ifNull: ['$movement.coinOut', 0] } },
                gamesPlayed: {
                  $sum: { $ifNull: ['$movement.gamesPlayed', 0] },
                },
                jackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
              },
            },
          ],
          as: 'meterData',
        },
      },
      {
        $unwind: {
          path: '$meterData',
          preserveNullAndEmptyArrays: true,
        },
      }
    );

    // Add projection
    (aggregationPipeline as unknown[]).push({
      $project: {
        _id: 1,
        serialNumber: 1,
        origSerialNumber: 1,
        'custom.name': 1,
        gamingLocation: 1,
        game: 1,
        manuf: 1,
        manufacturer: 1,
        lastActivity: 1,
        isSasMachine: 1,
        gameConfig: 1,
        locationName: '$locationDetails.name',
        // Financial metrics from meters aggregation
        drop: { $ifNull: ['$meterData.drop', 0] },
        moneyOut: { $ifNull: ['$meterData.moneyOut', 0] },
        gamesPlayed: { $ifNull: ['$meterData.gamesPlayed', 0] },
        jackpot: { $ifNull: ['$meterData.jackpot', 0] },
        // Calculate netWin (Handle - Automatic Payouts) and gross (Money In - Money Out)
        netWin: {
          $subtract: [
            { $ifNull: ['$meterData.coinIn', 0] },
            { $ifNull: ['$meterData.coinOut', 0] },
          ],
        },
        gross: {
          $subtract: [
            { $ifNull: ['$meterData.drop', 0] },
            { $ifNull: ['$meterData.moneyOut', 0] },
          ],
        },
        // Calculate actual hold percentage: (gross / handle) * 100 where gross = drop - totalCancelledCredits, handle = coinIn
        holdPct: {
          $cond: [
            { $gt: [{ $ifNull: ['$meterData.coinIn', 0] }, 0] },
            {
              $multiply: [
                {
                  $divide: [
                    {
                      $subtract: [
                        { $ifNull: ['$meterData.drop', 0] },
                        { $ifNull: ['$meterData.totalCancelledCredits', 0] },
                      ],
                    },
                    { $ifNull: ['$meterData.coinIn', 0] },
                  ],
                },
                100,
              ],
            },
            0,
          ],
        },
      },
    });

    // Get all machines for analysis
    const machines = await db
      .collection('machines')
      .aggregate(aggregationPipeline as Document[])
      .toArray();

    // console.log(`🔍 Found ${machines.length} machines for analysis`);

    // Transform machines data using the new structure
    const transformedMachines = machines.map(
      (machine: Record<string, unknown>) => {
        return {
          machineId: (machine._id as string).toString(),
          serialNumber:
            (machine.serialNumber as string) ||
            (machine.origSerialNumber as string) ||
            '',
          customName:
            ((machine.custom as Record<string, unknown>)?.name as string) ||
            ((machine.Custom as Record<string, unknown>)?.name as string) ||
            '',
          machineName:
            (machine.custom as Record<string, unknown>)?.name ||
            machine.serialNumber ||
            'Unknown Machine',
          locationId: machine.gamingLocation?.toString() || '',
          locationName: machine.locationName || 'Unknown Location',
          gameTitle: machine.game || '(game name not provided)',
          manufacturer:
            machine.manufacturer || machine.manuf || 'Unknown Manufacturer',
          isOnline: !!(
            machine.lastActivity &&
            new Date(machine.lastActivity as string) >=
              new Date(Date.now() - 3 * 60 * 1000)
          ),
          lastActivity: machine.lastActivity,
          isSasEnabled: machine.isSasMachine || false,
          // Use the aggregated financial data
          drop: machine.drop || 0,
          totalCancelledCredits: machine.moneyOut || 0,
          netWin: machine.netWin || 0,
          gross: machine.gross || 0,
          theoreticalHold: (machine.gameConfig as Record<string, unknown>)
            ?.theoreticalRtp
            ? (1 -
                Number(
                  (machine.gameConfig as Record<string, unknown>).theoreticalRtp
                )) *
              100
            : 0,
          gamesPlayed: machine.gamesPlayed || 0,
          jackpot: machine.jackpot || 0,
          // Calculate derived fields properly
          coinIn: machine.coinIn || 0, // Handle (betting activity)
          coinOut: machine.coinOut || 0, // Automatic payouts
          avgBet:
            ((machine.gamesPlayed as number) || 0) > 0
              ? ((machine.coinIn as number) || 0) /
                ((machine.gamesPlayed as number) || 1)
              : 0,
          // Use calculated hold percentage from aggregation
          actualHold: machine.holdPct || 0,
        };
      }
    );

    return NextResponse.json({
      data: transformedMachines,
      pagination: {
        totalCount: transformedMachines.length,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    });
  } catch (error) {
    console.error('Error in getAllMachines:', error);
    return NextResponse.json(
      { error: 'Failed to fetch all machines' },
      { status: 500 }
    );
  }
};

// Offline machines endpoint - for Offline Machines tab
const getOfflineMachines = async (
  db: Db, // MongoDB database connection
  searchParams: URLSearchParams,
  page: number,
  limit: number,
  skip: number,
  startDate: Date | undefined,
  endDate: Date | undefined,
  locationMatchStage: Record<string, unknown>
) => {
  try {
    const searchTerm = searchParams.get('search');
    const locationId = searchParams.get('locationId');

    // Build machine filter for offline machines
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
    const machineMatchStage: Record<string, unknown> = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2025-01-01') } },
      ],
      lastActivity: { $exists: true, $lt: threeMinutesAgo },
    };

    // Add location filter if specified
    if (locationId && locationId !== 'all') {
      machineMatchStage.gamingLocation = locationId;
    }

    // Add search filter if specified
    if (searchTerm && searchTerm.trim()) {
      machineMatchStage.$or = [
        { serialNumber: { $regex: searchTerm, $options: 'i' } },
        { game: { $regex: searchTerm, $options: 'i' } },
        { manuf: { $regex: searchTerm, $options: 'i' } },
        { 'custom.name': { $regex: searchTerm, $options: 'i' } },
      ];
    }

    // Use aggregation to join machines with gaminglocations for licensee filtering
    const aggregationPipeline = [
      { $match: machineMatchStage },
      {
        $lookup: {
          from: 'gaminglocations',
          localField: 'gamingLocation',
          foreignField: '_id',
          as: 'locationDetails',
        },
      },
      {
        $unwind: { path: '$locationDetails', preserveNullAndEmptyArrays: true },
      },
    ];

    // Add location filter if licensee is specified
    if (
      locationMatchStage &&
      typeof locationMatchStage === 'object' &&
      'rel.licencee' in locationMatchStage
    ) {
      (aggregationPipeline as unknown[]).push({
        $match: {
          'locationDetails.rel.licencee': (
            locationMatchStage as Record<string, unknown>
          )['rel.licencee'],
        },
      });
    }

    // Add meters lookup with proper aggregation - For offline machines, aggregate all meter data within date range
    (aggregationPipeline as unknown[]).push(
      {
        $lookup: {
          from: 'meters',
          let: { machineId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$machine', '$$machineId'] },
                    // Only include meters within the date range if dates are provided
                    ...(startDate && endDate
                      ? [
                          { $gte: ['$readAt', startDate] },
                          { $lte: ['$readAt', endDate] },
                        ]
                      : []),
                  ],
                },
              },
            },
            // Sum up all movement data within the date range
            {
              $group: {
                _id: null,
                drop: { $sum: { $ifNull: ['$movement.drop', 0] } },
                moneyOut: {
                  $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
                },
                coinIn: { $sum: { $ifNull: ['$movement.coinIn', 0] } },
                coinOut: { $sum: { $ifNull: ['$movement.coinOut', 0] } },
                gamesPlayed: {
                  $sum: { $ifNull: ['$movement.gamesPlayed', 0] },
                },
                jackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
              },
            },
          ],
          as: 'meterData',
        },
      },
      {
        $unwind: {
          path: '$meterData',
          preserveNullAndEmptyArrays: true,
        },
      }
    );

    // Add projection
    (aggregationPipeline as unknown[]).push(
      {
        $project: {
          _id: 1,
          serialNumber: 1,
          origSerialNumber: 1,
          'custom.name': 1,
          'Custom.name': 1,
          gamingLocation: 1,
          game: 1,
          manuf: 1,
          manufacturer: 1,
          lastActivity: 1,
          isSasMachine: 1,
          gameConfig: 1,
          locationName: '$locationDetails.name',
          // Financial metrics from meters aggregation
          drop: { $ifNull: ['$meterData.drop', 0] },
          moneyOut: { $ifNull: ['$meterData.moneyOut', 0] },
          gamesPlayed: { $ifNull: ['$meterData.gamesPlayed', 0] },
          jackpot: { $ifNull: ['$meterData.jackpot', 0] },
          // Calculate netWin (Handle - Automatic Payouts) and gross (Money In - Money Out)
          netWin: {
            $subtract: [
              { $ifNull: ['$meterData.coinIn', 0] },
              { $ifNull: ['$meterData.coinOut', 0] },
            ],
          },
          gross: {
            $subtract: [
              { $ifNull: ['$meterData.drop', 0] },
              { $ifNull: ['$meterData.moneyOut', 0] },
            ],
          },
          // Calculate actual hold percentage: (win / handle) * 100 where win = coinIn - coinOut, handle = coinIn
          holdPct: {
            $cond: [
              { $gt: [{ $ifNull: ['$meterData.coinIn', 0] }, 0] },
              {
                $multiply: [
                  {
                    $divide: [
                      {
                        $subtract: [
                          { $ifNull: ['$meterData.coinIn', 0] },
                          { $ifNull: ['$meterData.coinOut', 0] },
                        ],
                      },
                      { $ifNull: ['$meterData.coinIn', 0] },
                    ],
                  },
                  100,
                ],
              },
              0,
            ],
          },
        },
      },
      // Sort by netWin descending (highest first)
      { $sort: { netWin: -1 } }
    );

    // Get total count for pagination (before skip/limit)
    const countPipeline = [...aggregationPipeline];
    countPipeline.push({ $count: 'total' });
    const countResult = await db
      .collection('machines')
      .aggregate(countPipeline as Document[])
      .toArray();
    const totalCount = countResult[0]?.total || 0;

    // Add pagination to main pipeline
    (aggregationPipeline as unknown[]).push({ $skip: skip }, { $limit: limit });

    // Get offline machines
    const machines = await db
      .collection('machines')
      .aggregate(aggregationPipeline as Document[])
      .toArray();

    // console.log(`🔍 Found ${machines.length} offline machines`);

    // Transform machines data using the new structure
    const transformedMachines = machines.map(
      (machine: Record<string, unknown>) => {
        return {
          machineId: (machine._id as string).toString(),
          serialNumber:
            (machine.serialNumber as string) ||
            (machine.origSerialNumber as string) ||
            '',
          customName:
            ((machine.custom as Record<string, unknown>)?.name as string) ||
            ((machine.Custom as Record<string, unknown>)?.name as string) ||
            '',
          machineName:
            (machine.custom as Record<string, unknown>)?.name ||
            machine.serialNumber ||
            'Unknown Machine',
          locationId: machine.gamingLocation?.toString() || '',
          locationName: machine.locationName || 'Unknown Location',
          gameTitle: machine.game || '(game name not provided)',
          manufacturer:
            machine.manufacturer || machine.manuf || 'Unknown Manufacturer',
          isOnline: false, // All machines in this query are offline
          lastActivity: machine.lastActivity,
          isSasEnabled: machine.isSasMachine || false,
          // Use the aggregated financial data
          drop: machine.drop || 0,
          totalCancelledCredits: machine.moneyOut || 0,
          netWin: machine.netWin || 0,
          gross: machine.gross || 0,
          theoreticalHold: (machine.gameConfig as Record<string, unknown>)
            ?.theoreticalRtp
            ? (1 -
                Number(
                  (machine.gameConfig as Record<string, unknown>).theoreticalRtp
                )) *
              100
            : 0,
          gamesPlayed: machine.gamesPlayed || 0,
          jackpot: machine.jackpot || 0,
          // Calculate derived fields properly
          coinIn: machine.coinIn || 0, // Handle (betting activity)
          coinOut: machine.coinOut || 0, // Automatic payouts
          avgBet:
            ((machine.gamesPlayed as number) || 0) > 0
              ? ((machine.coinIn as number) || 0) /
                ((machine.gamesPlayed as number) || 1)
              : 0,
          // Use calculated hold percentage from aggregation
          actualHold: machine.holdPct || 0,
        };
      }
    );

    // console.log("🔍 Offline machines completed:", transformedMachines.length);

    return NextResponse.json({
      data: transformedMachines,
      pagination: {
        totalCount: transformedMachines.length,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    });
  } catch (error) {
    console.error('Error in getOfflineMachines:', error);
    return NextResponse.json(
      { error: 'Failed to fetch offline machines' },
      { status: 500 }
    );
  }
};
