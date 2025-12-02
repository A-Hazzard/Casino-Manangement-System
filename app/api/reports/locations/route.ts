/**
 * Locations Report API Route
 *
 * This route handles fetching location reports with financial metrics and filtering.
 * It supports:
 * - Time period filtering (today, week, month, custom dates)
 * - Licensee-based filtering
 * - Location search
 * - Currency conversion (Admin/Developer only for "All Licensees")
 * - Role-based access control
 * - Gaming day offset calculations
 * - Pagination
 * - Performance tracking
 *
 * @module app/api/reports/locations/route
 */

import {
  getUserAccessibleLicenseesFromToken,
  getUserLocationFilter,
} from '@/app/api/lib/helpers/licenseeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Licencee } from '@/app/api/lib/models/licencee';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import { TimePeriod } from '@/app/api/lib/types';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import {
  getLicenseeCurrency,
  getCountryCurrency,
  convertToUSD,
  convertFromUSD,
} from '@/lib/helpers/rates';
import { getGamingDayRangesForLocations } from '@/lib/utils/gamingDayRange';
import type { CurrencyCode } from '@/shared/types/currency';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching locations report
 *
 * Flow:
 * 1. Parse query parameters (timePeriod, licensee, currency, search, pagination)
 * 2. Connect to database
 * 3. Authenticate user and get permissions
 * 4. Determine display currency
 * 5. Get allowed location IDs using filter helper
 * 6. Build location match filter
 * 7. Fetch locations from database
 * 8. Calculate gaming day ranges for locations
 * 9. Aggregate financial metrics per location
 * 10. Apply currency conversion if needed
 * 11. Apply pagination
 * 12. Return paginated location report
 */
export async function GET(req: NextRequest) {
  const perfStart = Date.now();
  const perfTimers: Record<string, number> = {};

  try {
    // ============================================================================
    // STEP 1: Parse query parameters
    // ============================================================================
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

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    const dbConnectStart = Date.now();
    await connectDB();
    perfTimers.dbConnect = Date.now() - dbConnectStart;

    // ============================================================================
    // STEP 3: Authenticate user and get permissions
    // ============================================================================
    const authStart = Date.now();
    // DEV MODE: Allow bypassing auth for testing
    const isDevMode = process.env.NODE_ENV === 'development';
    const testUserId = searchParams.get('testUserId');

    let userPayload;
    let userRoles: string[] = [];
    let userLocationPermissions: string[] = [];
    let userAccessibleLicensees: string[] | 'all' = [];

    if (isDevMode && testUserId) {
      perfTimers.auth = Date.now() - authStart;
      // Dev mode: Get user directly from DB for testing
      console.warn(
        '[Reports/Locations] 🔧 DEV MODE: Using testUserId:',
        testUserId
      );
      const UserModel = (await import('../../lib/models/user')).default;
      const testUserResult = await UserModel.findOne({
        _id: testUserId,
      }).lean();
      if (testUserResult && !Array.isArray(testUserResult)) {
        const testUser = testUserResult as {
          roles?: string[];
          assignedLocations?: string[];
          assignedLicensees?: string[];
        };
        userRoles = (testUser.roles || []) as string[];
        userLocationPermissions = Array.isArray(testUser.assignedLocations)
          ? testUser.assignedLocations.map((id: string) => String(id))
          : [];
        userAccessibleLicensees = Array.isArray(testUser.assignedLicensees)
          ? testUser.assignedLicensees.map((id: string) => String(id))
          : [];
        console.log('[Reports/Locations] DEV MODE - User from DB:', {
          roles: userRoles,
          assignedLocations: userLocationPermissions,
          assignedLicensees: userAccessibleLicensees,
        });
      } else {
        return NextResponse.json(
          { error: 'Test user not found' },
          { status: 404 }
        );
      }
    } else {
      // Normal mode: Get user from JWT
      userPayload = await getUserFromServer();
      perfTimers.auth = Date.now() - authStart;
      if (!userPayload) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      if (userPayload) {
        userRoles = (userPayload.roles as string[]) || [];
        // Extract assignedLocations from new field only
        const assignedLocations = (
          userPayload as { assignedLocations?: string[] }
        )?.assignedLocations;
        if (Array.isArray(assignedLocations) && assignedLocations.length > 0) {
          userLocationPermissions = assignedLocations;
        }
      }

      userAccessibleLicensees = await getUserAccessibleLicenseesFromToken();
    }

    // Check if user is admin or developer for currency conversion
    const isAdminOrDev =
      userRoles.includes('admin') || userRoles.includes('developer');

    // ============================================================================
    // STEP 4: Determine display currency
    // ============================================================================
    let resolvedLicensee =
      licencee && licencee !== 'all' ? licencee : undefined;
    if (!resolvedLicensee && userAccessibleLicensees !== 'all') {
      if (userAccessibleLicensees.length === 1) {
        resolvedLicensee = userAccessibleLicensees[0];
      }
    }

    // Default to the licensee's native currency when none is provided
    if (!currencyParam && resolvedLicensee) {
      // Get licensee name from ID to properly resolve currency
      try {
        const licenseeDoc = await Licencee.findOne(
          { _id: resolvedLicensee },
          { name: 1 }
        ).lean();
        if (licenseeDoc && !Array.isArray(licenseeDoc) && licenseeDoc.name) {
          displayCurrency = getLicenseeCurrency(licenseeDoc.name);
          console.log(
            `🔍 [Reports/Locations] Auto-detected currency: ${displayCurrency} for licensee: ${licenseeDoc.name} (${resolvedLicensee})`
          );
        } else {
          console.warn(
            `🔍 [Reports/Locations] Licensee not found: ${resolvedLicensee}, using default USD`
          );
        }
      } catch (error) {
        console.warn(
          '[Reports/Locations] Failed to get licensee name for currency, using default USD:',
          error
        );
      }
    }

    // ============================================================================
    // STEP 5: Get allowed location IDs using filter helper
    // ============================================================================
    const allowedLocationIds = await getUserLocationFilter(
      userAccessibleLicensees,
      licencee || undefined,
      userLocationPermissions,
      userRoles
    );

    // Debug logging for all users (especially collectors)
    console.log(
      '🔍 [Reports/Locations] ========================================'
    );
    console.log('🔍 [Reports/Locations] User roles:', userRoles);
    console.log(
      '🔍 [Reports/Locations] User assignedLocations count:',
      userLocationPermissions.length
    );
    console.log(
      '🔍 [Reports/Locations] User assignedLocations:',
      userLocationPermissions
    );
    console.log(
      '🔍 [Reports/Locations] User accessibleLicensees:',
      userAccessibleLicensees
    );
    console.log('🔍 [Reports/Locations] Licencee param:', licencee);
    console.log(
      '🔍 [Reports/Locations] Allowed location IDs:',
      allowedLocationIds === 'all'
        ? 'all (no filtering)'
        : `${Array.isArray(allowedLocationIds) ? allowedLocationIds.length : 0} locations`
    );
    if (Array.isArray(allowedLocationIds) && allowedLocationIds.length > 0) {
      console.log(
        '🔍 [Reports/Locations] Allowed location IDs list (first 10):',
        allowedLocationIds.slice(0, 10)
      );
    } else if (
      Array.isArray(allowedLocationIds) &&
      allowedLocationIds.length === 0
    ) {
      console.warn(
        '⚠️⚠️⚠️ [Reports/Locations] EMPTY ALLOWED LOCATION IDs - USER WILL SEE NO DATA ⚠️⚠️⚠️'
      );
    }
    console.log(
      '🔍 [Reports/Locations] ========================================'
    );

    // ============================================================================
    // STEP 6: Build location match filter
    // ============================================================================
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
      // Resolve licensee name to ID if needed (getUserLocationFilter should handle this, but double-check)
      let licenseeId = licencee;
      try {
        const licenseeDoc = await Licencee.findOne({
          $or: [
            { _id: licencee },
            { name: { $regex: new RegExp(`^${licencee}$`, 'i') } },
          ],
        })
          .select('_id')
          .lean();
        if (licenseeDoc && !Array.isArray(licenseeDoc) && licenseeDoc._id) {
          licenseeId = String(licenseeDoc._id);
        }
      } catch (error) {
        console.warn(
          '[reports/locations] Failed to resolve licensee, using as-is:',
          licencee,
          error
        );
      }
      // rel.licencee is stored as a String
      locationMatchStage['rel.licencee'] = licenseeId;
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

    // ============================================================================
    // STEP 7: Fetch locations from database
    // ============================================================================
    const locationsStart = Date.now();
    const locations = await GamingLocations.find(locationMatchStage, {
      _id: 1,
      name: 1,
      gameDayOffset: 1,
      isLocalServer: 1,
      rel: 1,
      country: 1,
    }).lean();
    perfTimers.fetchLocations = Date.now() - locationsStart;

    // ============================================================================
    // STEP 8: Calculate gaming day ranges for locations
    // ============================================================================
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

    // ============================================================================
    // STEP 9: Aggregate financial metrics per location
    // ============================================================================
    const processingStart = Date.now();
    const locationResults = [];

    // 🚀 OPTIMIZED: Use single aggregation for 7d/30d periods (much faster)
    // For shorter periods (Today/Yesterday/Custom), use batch processing
    const useSingleAggregation =
      timePeriod === '7d' ||
      timePeriod === '30d' ||
      timePeriod === 'last7days' ||
      timePeriod === 'last30days';

    console.log(
      `[LOCATIONS API] Processing ${locations.length} locations using ${useSingleAggregation ? 'single aggregation' : 'parallel batches'} for ${timePeriod}`
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
      const allLocationIds = locations.map((loc: { _id: unknown }) =>
        String(loc._id)
      );

      // Single aggregation for all machines across all locations
      const allMachinesData = await Machine.find({
        gamingLocation: { $in: allLocationIds },
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2020-01-01') } },
        ],
      }).lean();

      // Create machine-to-location map
      const machineToLocation = new Map();
      const locationToMachines = new Map();
      allMachinesData.forEach(
        (machine: { _id: unknown; gamingLocation?: string }) => {
          const machineId = String(machine._id);
          const locationId = machine.gamingLocation;
          machineToLocation.set(machineId, locationId);
          if (!locationToMachines.has(locationId)) {
            locationToMachines.set(locationId, []);
          }
          locationToMachines.get(locationId).push(machine);
        }
      );

      // Get ALL machine IDs and create a machine-to-location map for grouping
      const allMachineIds = allMachinesData.map((m: { _id: unknown }) =>
        String(m._id)
      );

      // Fetch meters WITHOUT $lookup (much faster!)
      // Group by machine first, then we'll filter by gaming day ranges per location
      const allMeters = await Meters.aggregate([
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
            readAt: 1,
            drop: '$movement.drop',
            totalCancelledCredits: '$movement.totalCancelledCredits',
          },
        },
      ]);

      // Group meters by location using the machine-to-location map (in-memory, very fast!)
      // Filter by gaming day ranges per location to respect each location's gaming day offset
      const locationMetricsMap = new Map();
      allMeters.forEach(meter => {
        const machineId = meter.machine;
        const locationId = machineToLocation.get(machineId);
        if (!locationId) return;

        // Get gaming day range for this location
        const gamingDayRange = gamingDayRanges.get(locationId);
        if (!gamingDayRange) return;

        // Filter by gaming day range for this location
        const readAt = new Date(meter.readAt);
        if (
          readAt < gamingDayRange.rangeStart ||
          readAt > gamingDayRange.rangeEnd
        ) {
          return; // Skip meters outside this location's gaming day range
        }

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
        const locationId = String((location as { _id: unknown })._id);
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
      // 🚀 OPTIMIZED: Use smaller batch size for shorter periods
      // (Today/Yesterday/Custom/All Time) - these are already fast with smaller batches
      const BATCH_SIZE = 20;

      console.log(
        `[LOCATIONS API] Using batch size: ${BATCH_SIZE} for ${timePeriod}`
      );

      for (let i = 0; i < locations.length; i += BATCH_SIZE) {
        const batch = locations.slice(i, i + BATCH_SIZE);

        // Process batch in parallel
        const batchResults = await Promise.all(
          batch.map(async (location: { _id: unknown }) => {
            const locationId = String(location._id);
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
              const machines = await Machine.find(
                {
                  gamingLocation: locationId,
                  $or: [
                    { deletedAt: null },
                    { deletedAt: { $lt: new Date('2020-01-01') } },
                  ],
                },
                {
                  _id: 1,
                  assetNumber: 1,
                  serialNumber: 1,
                  isSasMachine: 1,
                  lastActivity: 1,
                }
              ).lean();

              let metrics;
              if (machines.length === 0) {
                metrics = [{ moneyIn: 0, moneyOut: 0, meterCount: 0 }];
              } else {
                // Aggregate meters with optimized projection (only fetch what we need)
                const machineIds = machines.map((m: { _id: unknown }) =>
                  String(m._id)
                );
                metrics = await Meters.aggregate([
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
                      totalCancelledCredits: '$movement.totalCancelledCredits',
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
                ]);
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
                locationName: (location as { name?: string }).name || '',
                isLocalServer:
                  (location as { isLocalServer?: boolean }).isLocalServer ||
                  false,
                moneyIn: locationMetrics.moneyIn,
                moneyOut: locationMetrics.moneyOut,
                gross: gross,
                totalMachines: totalMachines,
                onlineMachines: onlineMachines,
                sasMachines: sasMachines,
                nonSasMachines: nonSasMachines,
                hasSasMachines: sasMachines > 0,
                hasNonSasMachines: nonSasMachines > 0,
                rel: (location as { rel?: { licencee?: string } }).rel, // Include rel for licensee information
                country: (location as { country?: string }).country, // Include country for currency mapping
                machines: machines.map(
                  (m: {
                    _id: unknown;
                    assetNumber?: string;
                    serialNumber?: string;
                    isSasMachine?: boolean;
                    lastActivity?: Date;
                  }) => ({
                    _id: String(m._id),
                    assetNumber: m.assetNumber,
                    serialNumber: m.serialNumber,
                    isSasMachine: m.isSasMachine,
                    lastActivity: m.lastActivity,
                  })
                ),
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

    // ============================================================================
    // STEP 10: Apply currency conversion if needed
    // ============================================================================
    const conversionStart = Date.now();

    // Apply currency conversion using the proper helper
    // Data comes in native currency (TTD for TTG, GYD for Cabana, etc.)
    // Need to convert to display currency
    let convertedData = paginatedData;

    // Currency conversion ONLY for Admin/Developer when viewing "All Licensees"
    // Managers and other users ALWAYS see native currency (TTD for TTG, GYD for Cabana, etc.)
    const shouldConvert =
      isAdminOrDev && shouldApplyCurrencyConversion(licencee);

    if (shouldConvert) {
      try {
        const db = await connectDB();
        if (!db) {
          console.error('❌ DB connection failed during currency conversion');
          convertedData = paginatedData;
        } else {
          // Get licensee details for currency mapping
          const licenseesData = await Licencee.find({
            $or: [
              { deletedAt: null },
              { deletedAt: { $lt: new Date('2020-01-01') } },
            ],
          })
            .select('_id name')
            .lean();

          // Create a map of licensee ID to name
          const licenseeIdToName = new Map<string, string>();
          licenseesData.forEach((lic: { _id: unknown; name?: string }) => {
            if (!Array.isArray(lic) && lic._id && lic.name) {
              licenseeIdToName.set(String(lic._id), lic.name);
            }
          });

          // Get country details for currency mapping (for unassigned locations)
          const countriesData = await db.collection('countries').find({}).toArray();
          const countryIdToName = new Map<string, string>();
          countriesData.forEach(country => {
            countryIdToName.set(country._id.toString(), country.name);
          });

          // Convert each location's financial data
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          convertedData = paginatedData.map((location: any) => {
            const locationLicenseeId = location.rel?.licencee as
              | string
              | undefined;

            let nativeCurrency: CurrencyCode = 'USD';

            if (!locationLicenseeId) {
              // Unassigned locations - determine currency from country
              const countryId = location.country as string | undefined;
              const countryName = countryId
                ? countryIdToName.get(countryId.toString())
                : undefined;
              nativeCurrency = countryName
                ? getCountryCurrency(countryName)
                : 'USD';
            } else {
              // Get licensee's native currency
              const licenseeName =
                licenseeIdToName.get(locationLicenseeId.toString()) || 'Unknown';
              if (!licenseeName || licenseeName === 'Unknown') {
                // Fallback to country-based currency if licensee not found
                const countryId = location.country as string | undefined;
                const countryName = countryId
                  ? countryIdToName.get(countryId.toString())
                  : undefined;
                nativeCurrency = countryName
                  ? getCountryCurrency(countryName)
                  : 'USD';
              } else {
                nativeCurrency = getLicenseeCurrency(licenseeName);
              }
            }

            // If native currency matches display currency, no conversion needed
            if (nativeCurrency === displayCurrency) {
              return location;
            }

            // Convert financial fields: Native Currency → USD → Display Currency
            const convertedLocation = { ...location };

            if (typeof location.moneyIn === 'number') {
              const usdValue = convertToUSD(location.moneyIn, nativeCurrency);
              convertedLocation.moneyIn = convertFromUSD(usdValue, displayCurrency);
            }

            if (typeof location.moneyOut === 'number') {
              const usdValue = convertToUSD(location.moneyOut, nativeCurrency);
              convertedLocation.moneyOut = convertFromUSD(
                usdValue,
                displayCurrency
              );
            }

            if (typeof location.gross === 'number') {
              const usdValue = convertToUSD(location.gross, nativeCurrency);
              convertedLocation.gross = convertFromUSD(usdValue, displayCurrency);
            }

            return convertedLocation;
          });
        }
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
      converted: shouldConvert,
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
    if (err instanceof Error) {
      console.error('[Reports/Locations] Error stack:', err.stack);
    }
    console.error('[Reports/Locations] Full error:', err);

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
