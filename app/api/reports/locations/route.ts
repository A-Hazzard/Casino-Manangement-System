import {
  getUserAccessibleLicenseesFromToken,
  getUserLocationFilter,
} from '@/app/api/lib/helpers/licenseeFilter';
import { connectDB } from '@/app/api/lib/middleware/db';
import { TimePeriod } from '@/app/api/lib/types';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import { getLicenseeCurrency } from '@/lib/helpers/rates';
import { getGamingDayRangesForLocations } from '@/lib/utils/gamingDayRange';
import type { CurrencyCode } from '@/shared/types/currency';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromServer } from '../../lib/helpers/users';

// Force recompilation to pick up rates.ts changes
// Removed auto-index creation to avoid conflicts and extra latency

export async function GET(req: NextRequest) {
  // 🔍 PERFORMANCE: Start overall timer
  const perfStart = Date.now();
  const perfTimers: Record<string, number> = {};

  try {
    const { searchParams } = new URL(req.url);
    const timePeriod = (searchParams.get('timePeriod') as TimePeriod) || '7d';
    // Support both 'licensee' and 'licencee' spelling for backwards compatibility
    const licencee =
      searchParams.get('licensee') || searchParams.get('licencee') || undefined;
    const currencyParam = searchParams.get('currency') as CurrencyCode | null;
    let displayCurrency: CurrencyCode = currencyParam || 'USD';
    const searchTerm = searchParams.get('search')?.trim() || '';

    const showAllLocations = searchParams.get('showAllLocations') === 'true';

    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const requestedLimit = parseInt(searchParams.get('limit') || '50');

    // When showAllLocations is true, return all locations for client-side pagination
    // Otherwise, use server-side pagination with limit (default 50 items per batch)
    const limit = showAllLocations ? 10000 : Math.min(requestedLimit, 50); // Cap at 50 for performance
    const skip = showAllLocations ? 0 : (page - 1) * limit;

    // Parse custom dates for Custom time period
    let customStartDate: Date | undefined, customEndDate: Date | undefined;
    if (timePeriod === 'Custom') {
      const customStart = searchParams.get('startDate');
      const customEnd = searchParams.get('endDate');
      if (!customStart || !customEnd) {
        return NextResponse.json(
          { error: 'Missing startDate or endDate' },
          { status: 400 }
        );
      }
      customStartDate = new Date(customStart);
      customEndDate = new Date(customEnd);
    }

    // 🔍 PERFORMANCE: Database connection
    const dbConnectStart = Date.now();
    const db = await connectDB();
    perfTimers.dbConnect = Date.now() - dbConnectStart;

    if (!db) {
      return NextResponse.json(
        { error: 'DB connection failed' },
        { status: 500 }
      );
    }

    // 🔍 PERFORMANCE: User authentication
    const authStart = Date.now();
    const userPayload = await getUserFromServer();
    perfTimers.auth = Date.now() - authStart;
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoles = (userPayload?.roles as string[]) || [];
    const userLocationPermissions =
      (
        userPayload?.resourcePermissions as {
          'gaming-locations'?: { resources?: string[] };
        }
      )?.['gaming-locations']?.resources || [];

    // Get user's accessible licensees from token
    const userAccessibleLicensees = await getUserAccessibleLicenseesFromToken();

    // Determine an effective licensee for currency fallback
    let resolvedLicensee =
      licencee && licencee !== 'all' ? licencee : undefined;
    if (!resolvedLicensee && userAccessibleLicensees !== 'all') {
      if (userAccessibleLicensees.length === 1) {
        resolvedLicensee = userAccessibleLicensees[0];
      }
    }

    // Default to the licensee's native currency when none is provided
    if (!currencyParam && resolvedLicensee) {
      displayCurrency = getLicenseeCurrency(resolvedLicensee);
    }

    // Get allowed location IDs using the standard filter helper (handles intersection logic)
    const allowedLocationIds = await getUserLocationFilter(
      userAccessibleLicensees,
      licencee || undefined,
      userLocationPermissions,
      userRoles
    );

    // Build location filter
    const locationMatchStage: Record<string, unknown> = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    };

    // Apply user-based filtering using the standard helper
    if (allowedLocationIds !== 'all') {
      if (allowedLocationIds.length === 0) {
        // No accessible locations
        return NextResponse.json({
          data: [],
          pagination: {
            page,
            limit,
            totalCount: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
          currency: displayCurrency,
          converted: false,
        });
      }
      locationMatchStage['_id'] = { $in: allowedLocationIds };
    } else if (licencee && licencee !== 'all') {
      // Admin with all access but specific licensee filter requested
      locationMatchStage['rel.licencee'] = licencee;
    }

    // Add search filter for location name or _id
    if (searchTerm) {
      locationMatchStage['$and'] = [
        {
          $or: [
            { name: { $regex: searchTerm, $options: 'i' } },
            { _id: searchTerm }, // Exact match for _id
          ],
        },
      ];
    }

    // 🔍 PERFORMANCE: Fetch locations
    const locationsStart = Date.now();
    const locations = await db
      .collection('gaminglocations')
      .find(locationMatchStage, {
        projection: {
          _id: 1,
          name: 1,
          gameDayOffset: 1,
          isLocalServer: 1,
          rel: 1,
          country: 1,
        },
      })
      .toArray();
    perfTimers.fetchLocations = Date.now() - locationsStart;

    // 🔍 PERFORMANCE: Calculate gaming day ranges
    const gamingDayStart = Date.now();
    const gamingDayRanges = getGamingDayRangesForLocations(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      locations.map((loc: any) => ({
        _id: loc._id.toString(),
        gameDayOffset: loc.gameDayOffset ?? 8, // Default to 8 AM Trinidad time (Rule 1)
      })),
      timePeriod,
      customStartDate,
      customEndDate
    );
    perfTimers.gamingDayRanges = Date.now() - gamingDayStart;

    // 🔍 PERFORMANCE: Process locations - OPTIMIZED WITH PARALLEL BATCHING
    const processingStart = Date.now();
    const locationResults = [];

    // Note: Single aggregation approach was attempted but caused timeouts for 7d/30d
    // due to fetching 1.5M+ meter records at once. Parallel batching is faster.
    const useSingleAggregation = false; // Disabled for now

    console.log(
      `[LOCATIONS API] Processing ${locations.length} locations in parallel batches`
    );

    if (useSingleAggregation) {
      // 🚀 SUPER OPTIMIZED: Single aggregation for ALL locations (much faster for 30d/7d)
      // Get global date range (earliest start, latest end)
      let globalStart = new Date();
      let globalEnd = new Date(0);
      gamingDayRanges.forEach(range => {
        if (range.rangeStart < globalStart) globalStart = range.rangeStart;
        if (range.rangeEnd > globalEnd) globalEnd = range.rangeEnd;
      });

      // Get all location IDs
      const allLocationIds = locations.map(loc => loc._id.toString());

      // Single aggregation for all machines across all locations
      const allMachinesData = await db
        .collection('machines')
        .find({
          gamingLocation: { $in: allLocationIds },
          $or: [
            { deletedAt: null },
            { deletedAt: { $lt: new Date('2020-01-01') } },
          ],
        })
        .toArray();

      // Create machine-to-location map
      const machineToLocation = new Map();
      const locationToMachines = new Map();
      allMachinesData.forEach(machine => {
        const machineId = machine._id.toString();
        const locationId = machine.gamingLocation;
        machineToLocation.set(machineId, locationId);
        if (!locationToMachines.has(locationId)) {
          locationToMachines.set(locationId, []);
        }
        locationToMachines.get(locationId).push(machine);
      });

      // Get ALL machine IDs and create a machine-to-location map for grouping
      const allMachineIds = allMachinesData.map(m => m._id.toString());

      // Fetch meters WITHOUT $lookup (much faster!)
      const allMeters = await db
        .collection('meters')
        .aggregate([
          {
            $match: {
              machine: { $in: allMachineIds },
              readAt: {
                $gte: globalStart,
                $lte: globalEnd,
              },
            },
          },
          {
            $project: {
              machine: 1,
              drop: '$movement.drop',
              totalCancelledCredits: '$movement.totalCancelledCredits',
            },
          },
        ])
        .toArray();

      // Group meters by location using the machine-to-location map (in-memory, very fast!)
      const locationMetricsMap = new Map();
      allMeters.forEach(meter => {
        const machineId = meter.machine;
        const locationId = machineToLocation.get(machineId);
        if (!locationId) return;

        if (!locationMetricsMap.has(locationId)) {
          locationMetricsMap.set(locationId, {
            moneyIn: 0,
            moneyOut: 0,
            meterCount: 0,
          });
        }
        const locMetrics = locationMetricsMap.get(locationId);
        locMetrics.moneyIn += meter.drop || 0;
        locMetrics.moneyOut += meter.totalCancelledCredits || 0;
        locMetrics.meterCount += 1;
      });

      // Convert map to array format for consistency
      const metricsAggregation = Array.from(locationMetricsMap.entries()).map(
        ([locationId, metrics]) => ({
          _id: locationId,
          ...metrics,
        })
      );

      // Create metrics map
      const metricsMap = new Map();
      metricsAggregation.forEach(metrics => {
        metricsMap.set(metrics._id, metrics);
      });

      // Build location results
      for (const location of locations) {
        const locationId = location._id.toString();
        const machines = locationToMachines.get(locationId) || [];
        const metrics = metricsMap.get(locationId) || {
          moneyIn: 0,
          moneyOut: 0,
          meterCount: 0,
        };

        const locationMetrics = {
          moneyIn: metrics.moneyIn || 0,
          moneyOut: metrics.moneyOut || 0,
          meterCount: metrics.meterCount || 0,
        };

        const gross = locationMetrics.moneyIn - locationMetrics.moneyOut;

        // Calculate machine status metrics
        const totalMachines = machines.length;
        const onlineMachines = machines.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (m: any) =>
            m.lastActivity &&
            new Date(m.lastActivity) >
              new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sasMachines = machines.filter((m: any) => m.isSasMachine).length;
        const nonSasMachines = totalMachines - sasMachines;

        // Skip locations with no data if showAllLocations is false
        if (
          !showAllLocations &&
          totalMachines === 0 &&
          locationMetrics.moneyIn === 0 &&
          locationMetrics.moneyOut === 0
        ) {
          continue;
        }

        locationResults.push({
          _id: locationId,
          location: locationId,
          locationName: location.name,
          isLocalServer: location.isLocalServer || false,
          moneyIn: locationMetrics.moneyIn,
          moneyOut: locationMetrics.moneyOut,
          gross: gross,
          totalMachines: totalMachines,
          onlineMachines: onlineMachines,
          sasMachines: sasMachines,
          nonSasMachines: nonSasMachines,
          hasSasMachines: sasMachines > 0,
          hasNonSasMachines: nonSasMachines > 0,
          rel: location.rel,
          country: location.country,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          machines: machines.map((m: any) => ({
            _id: m._id.toString(),
            assetNumber: m.assetNumber,
            serialNumber: m.serialNumber,
            isSasMachine: m.isSasMachine,
            lastActivity: m.lastActivity,
          })),
        });
      }
    } else {
      // 🚀 OPTIMIZED: Adaptive batch size based on time period
      // Longer periods (7d/30d) need LARGER batches to reduce overhead
      const BATCH_SIZE = timePeriod === '7d' || timePeriod === '30d' ? 50 : 20;

      console.log(
        `[LOCATIONS API] Using batch size: ${BATCH_SIZE} for ${timePeriod}`
      );

      for (let i = 0; i < locations.length; i += BATCH_SIZE) {
        const batch = locations.slice(i, i + BATCH_SIZE);

        // Process batch in parallel
        const batchResults = await Promise.all(
          batch.map(async location => {
            const locationId = location._id.toString();
            const gamingDayRange = gamingDayRanges.get(locationId);

            if (!gamingDayRange) {
              console.warn(
                `⚠️ [LOCATIONS API] No gaming day range for location ${locationId}`
              );
              return null;
            }

            try {
              // 🚀 SUPER OPTIMIZED: Fetch machines ONCE, then aggregate meters
              // Get machines with only essential fields (reduces data transfer)
              const machines = await db
                .collection('machines')
                .find(
                  {
                    gamingLocation: locationId,
                    $or: [
                      { deletedAt: null },
                      { deletedAt: { $lt: new Date('2020-01-01') } },
                    ],
                  },
                  {
                    projection: {
                      _id: 1,
                      assetNumber: 1,
                      serialNumber: 1,
                      isSasMachine: 1,
                      lastActivity: 1,
                    },
                  }
                )
                .toArray();

              let metrics;
              if (machines.length === 0) {
                metrics = [{ moneyIn: 0, moneyOut: 0, meterCount: 0 }];
              } else {
                // Aggregate meters with optimized projection (only fetch what we need)
                const machineIds = machines.map(m => m._id.toString());
                metrics = await db
                  .collection('meters')
                  .aggregate([
                    {
                      $match: {
                        machine: { $in: machineIds },
                        readAt: {
                          $gte: gamingDayRange.rangeStart,
                          $lte: gamingDayRange.rangeEnd,
                        },
                      },
                    },
                    {
                      $project: {
                        drop: '$movement.drop',
                        totalCancelledCredits:
                          '$movement.totalCancelledCredits',
                      },
                    },
                    {
                      $group: {
                        _id: null,
                        moneyIn: { $sum: '$drop' },
                        moneyOut: { $sum: '$totalCancelledCredits' },
                        meterCount: { $sum: 1 },
                      },
                    },
                  ])
                  .toArray();
              }

              const locationMetrics = metrics[0] || {
                moneyIn: 0,
                moneyOut: 0,
                meterCount: 0,
              };
              const gross = locationMetrics.moneyIn - locationMetrics.moneyOut;

              // Calculate machine status metrics
              const totalMachines = machines.length;
              const onlineMachines = machines.filter(m => {
                if (!m.lastActivity) return false;
                const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
                return m.lastActivity > threeMinutesAgo;
              }).length;

              const sasMachines = machines.filter(
                m => m.isSasMachine === true
              ).length;
              const nonSasMachines = totalMachines - sasMachines;

              // Apply showAllLocations filter
              // If showAllLocations is false, skip locations with no data
              if (
                !showAllLocations &&
                totalMachines === 0 &&
                locationMetrics.moneyIn === 0 &&
                locationMetrics.moneyOut === 0
              ) {
                return null;
              }

              return {
                _id: locationId,
                location: locationId,
                locationName: location.name,
                isLocalServer: location.isLocalServer || false,
                moneyIn: locationMetrics.moneyIn,
                moneyOut: locationMetrics.moneyOut,
                gross: gross,
                totalMachines: totalMachines,
                onlineMachines: onlineMachines,
                sasMachines: sasMachines,
                nonSasMachines: nonSasMachines,
                hasSasMachines: sasMachines > 0,
                hasNonSasMachines: nonSasMachines > 0,
                rel: location.rel, // Include rel for licensee information
                country: location.country, // Include country for currency mapping
                machines: machines.map(m => ({
                  _id: m._id.toString(),
                  assetNumber: m.assetNumber,
                  serialNumber: m.serialNumber,
                  isSasMachine: m.isSasMachine,
                  lastActivity: m.lastActivity,
                })),
              };
            } catch (error) {
              console.error(
                `❌ Error processing location ${locationId}:`,
                error
              );
              return null;
            }
          })
        );

        // Filter out null results and add to main results
        const validResults = batchResults.filter(r => r !== null);
        locationResults.push(...validResults);
      }
    }

    perfTimers.processing = Date.now() - processingStart;

    // 🔍 PERFORMANCE: Sort and paginate
    const sortStart = Date.now();
    locationResults.sort((a, b) => b.gross - a.gross);
    const totalCount = locationResults.length;
    const paginatedResults = locationResults.slice(skip, skip + limit);
    const totalPages = Math.ceil(totalCount / limit);
    perfTimers.sortAndPaginate = Date.now() - sortStart;

    const paginatedData = paginatedResults;

    // 🔍 PERFORMANCE: Currency conversion
    const conversionStart = Date.now();

    // Apply currency conversion using the proper helper
    // Data comes in native currency (TTD for TTG, GYD for Cabana, etc.)
    // Need to convert to display currency
    let convertedData = paginatedData;

    // Currency conversion ONLY for Admin/Developer viewing "All Licensees"
    const isAdminOrDev =
      userRoles.includes('admin') || userRoles.includes('developer');

    if (isAdminOrDev && shouldApplyCurrencyConversion(licencee)) {
      try {
        // Import conversion helpers
        const { convertCurrency, getLicenseeCurrency } = await import(
          '@/lib/helpers/rates'
        );

        // Get licensee details for currency mapping
        const licenseesData = await db
          .collection('licencees')
          .find(
            {
              $or: [
                { deletedAt: null },
                { deletedAt: { $lt: new Date('2020-01-01') } },
              ],
            },
            { projection: { _id: 1, name: 1 } }
          )
          .toArray();

        // Create a map of licensee ID to name
        const licenseeIdToName = new Map<string, string>();
        licenseesData.forEach(lic => {
          licenseeIdToName.set(lic._id.toString(), lic.name);
        });

        // Convert each location's financial data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        convertedData = paginatedData.map((location: any) => {
          const locationLicenseeId = location.rel?.licencee as
            | string
            | undefined;

          if (!locationLicenseeId) {
            return location;
          }

          const licenseeName =
            licenseeIdToName.get(locationLicenseeId.toString()) || '';

          if (!licenseeName || licenseeName === 'Unknown') {
            return location;
          }

          const sourceCurrency = getLicenseeCurrency(licenseeName);

          if (sourceCurrency === displayCurrency) {
            return location;
          }

          // Convert financial fields
          const convertedLocation = { ...location };

          if (typeof location.moneyIn === 'number') {
            convertedLocation.moneyIn = convertCurrency(
              location.moneyIn,
              sourceCurrency,
              displayCurrency
            );
          }

          if (typeof location.moneyOut === 'number') {
            convertedLocation.moneyOut = convertCurrency(
              location.moneyOut,
              sourceCurrency,
              displayCurrency
            );
          }

          if (typeof location.gross === 'number') {
            convertedLocation.gross = convertCurrency(
              location.gross,
              sourceCurrency,
              displayCurrency
            );
          }

          return convertedLocation;
        });
      } catch (conversionError) {
        console.error(`❌ Currency conversion failed:`, conversionError);
        convertedData = paginatedData;
      }
    }

    perfTimers.currencyConversion = Date.now() - conversionStart;

    // 🔍 PERFORMANCE: Calculate total time
    const totalTime = Date.now() - perfStart;
    perfTimers.total = totalTime;

    // 📊 PERFORMANCE SUMMARY - Concise logging
    console.log(
      '⚡ /api/reports/locations - ' +
        `${totalTime}ms | ` +
        `${locations.length} locations | ` +
        `${(perfTimers.processing / locations.length).toFixed(1)}ms/loc | ` +
        `${(locations.length / (totalTime / 1000)).toFixed(0)}/sec | ` +
        `Processing: ${((perfTimers.processing / totalTime) * 100).toFixed(0)}% | ` +
        `Currency: ${((perfTimers.currencyConversion / totalTime) * 100).toFixed(0)}%`
    );

    const response = {
      data: convertedData,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      currency: displayCurrency,
      converted: shouldApplyCurrencyConversion(licencee),
      performance: {
        totalTime,
        breakdown: perfTimers,
        locationsProcessed: locations.length,
        avgTimePerLocation: parseFloat(
          (perfTimers.processing / locations.length).toFixed(2)
        ),
      },
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    console.error('Error in reports locations route:', err);

    // Handle specific MongoDB connection errors
    if (err instanceof Error) {
      const errorMessage = err.message.toLowerCase();

      // MongoDB connection timeout
      if (
        errorMessage.includes('mongonetworktimeouterror') ||
        (errorMessage.includes('connection') &&
          errorMessage.includes('timed out'))
      ) {
        return NextResponse.json(
          {
            error: 'Database connection timeout',
            message:
              'The database is currently experiencing high load. Please try again in a few moments.',
            type: 'CONNECTION_TIMEOUT',
            retryable: true,
          },
          { status: 503 }
        );
      }

      // MongoDB server selection error
      if (
        errorMessage.includes('mongoserverselectionerror') ||
        errorMessage.includes('server selection')
      ) {
        return NextResponse.json(
          {
            error: 'Database server unavailable',
            message:
              'Unable to connect to the database server. Please try again later.',
            type: 'SERVER_UNAVAILABLE',
            retryable: true,
          },
          { status: 503 }
        );
      }

      // Generic MongoDB connection error
      if (
        errorMessage.includes('mongodb') ||
        errorMessage.includes('connection')
      ) {
        return NextResponse.json(
          {
            error: 'Database connection failed',
            message:
              'Unable to establish connection to the database. Please try again.',
            type: 'CONNECTION_ERROR',
            retryable: true,
          },
          { status: 503 }
        );
      }
    }

    // Generic server error
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing your request.',
        type: 'INTERNAL_ERROR',
        retryable: false,
      },
      { status: 500 }
    );
  }
}
