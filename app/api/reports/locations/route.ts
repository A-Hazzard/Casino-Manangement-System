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
import { Countries } from '@/app/api/lib/models/countries';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Licencee } from '@/app/api/lib/models/licencee';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import { TimePeriod } from '@/app/api/lib/types';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import {
  convertFromUSD,
  convertToUSD,
  getCountryCurrency,
  getLicenseeCurrency,
} from '@/lib/helpers/rates';
import { getGamingDayRangesForLocations } from '@/lib/utils/gamingDayRange';
import type { CurrencyCode } from '@/shared/types/currency';
import type {
  AggregatedLocation,
  GamingMachine,
} from '@/shared/types/entities';
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

    // Parse filters parameter (e.g., "MembershipOnly", "SMIBLocationsOnly", etc.)
    const filtersParam = searchParams.get('filters');
    const filters = filtersParam ? filtersParam.split(',') : [];

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
        }
      } catch {
        // Failed to get licensee name for currency - use default USD
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

    // ============================================================================
    // STEP 6: Build location match filter (with backend filtering for SMIB/Local Server/Membership)
    // ============================================================================
    const locationMatchStage: Record<string, unknown> = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2025-01-01') } },
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
      } catch {
        // Failed to resolve licensee - use as-is
      }
      // rel.licencee is stored as a String
      locationMatchStage['rel.licencee'] = licenseeId;
    }

    // Apply machine type filters (SMIB, No SMIB, Local Server, Membership) at database level
    // Note: Database-level filter uses OR logic for initial filtering (performance optimization)
    // Final accurate filtering is done post-aggregation based on calculated fields
    if (filters.length > 0) {
      const filterConditions: Record<string, unknown>[] = [];

      filters.forEach(filter => {
        switch (filter.trim()) {
          case 'LocalServersOnly':
            filterConditions.push({ isLocalServer: true });
            break;
          case 'SMIBLocationsOnly':
            // Locations with SMIB machines - filter by noSMIBLocation flag
            // Note: Final check based on sasMachines count will be done after aggregation
            filterConditions.push({ noSMIBLocation: { $ne: true } });
            break;
          case 'NoSMIBLocation':
            filterConditions.push({ noSMIBLocation: true });
            break;
          case 'MembershipOnly':
            // Check both membershipEnabled and enableMembership fields for compatibility
            filterConditions.push({
              $or: [{ membershipEnabled: true }, { enableMembership: true }],
            });
            break;
        }
      });

      // Apply filter logic - location must match the selected filters
      // Use AND logic when multiple filters are selected (location must match ALL selected filters)
      // Use direct condition when only one filter is selected
      if (filterConditions.length > 0) {
        // Build $and array to combine deletedAt check with filter conditions
        const andConditions: Array<Record<string, unknown>> = [
          {
            $or: [
              { deletedAt: null },
              { deletedAt: { $lt: new Date('2025-01-01') } },
            ],
          },
        ];

        // If only one filter is selected, use it directly; otherwise use AND logic
        if (filterConditions.length === 1) {
          // Single filter - apply directly
          andConditions.push(filterConditions[0]);
        } else {
          // Multiple filters - location must match ALL selected filters (AND logic)
          andConditions.push({ $and: filterConditions });
        }

        // Add existing conditions (like _id, rel.licencee) to $and
        Object.keys(locationMatchStage).forEach(key => {
          if (key !== '$or' && key !== '$and') {
            const condition: Record<string, unknown> = {};
            condition[key] = locationMatchStage[key];
            andConditions.push(condition);
          }
        });

        // Replace locationMatchStage with $and structure
        locationMatchStage['$and'] = andConditions;
        delete locationMatchStage['$or'];
      }
    }

    // Add search filter for location name or _id
    if (searchTerm) {
      const searchCondition = {
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { _id: searchTerm }, // Exact match for _id
        ],
      };

      // If $and already exists (from filters), add search condition to it
      // Otherwise, create new $and array
      if (locationMatchStage['$and']) {
        (locationMatchStage['$and'] as Array<Record<string, unknown>>).push(
          searchCondition
        );
      } else {
        // Build $and array with deletedAt check and search condition
        const andConditions: Array<Record<string, unknown>> = [
          {
            $or: [
              { deletedAt: null },
              { deletedAt: { $lt: new Date('2025-01-01') } },
            ],
          },
          searchCondition,
        ];

        // Add existing conditions (like _id, rel.licencee) to $and
        Object.keys(locationMatchStage).forEach(key => {
          if (key !== '$or' && key !== '$and') {
            const condition: Record<string, unknown> = {};
            condition[key] = locationMatchStage[key];
            andConditions.push(condition);
          }
        });

        locationMatchStage['$and'] = andConditions;
        delete locationMatchStage['$or'];
      }
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
      membershipEnabled: 1,
      enableMembership: 1, // Include for compatibility with legacy data
      noSMIBLocation: 1, // Include for SMIB filtering
    }).lean();
    perfTimers.fetchLocations = Date.now() - locationsStart;

    // ============================================================================
    // STEP 8: Calculate gaming day ranges for locations
    // ============================================================================
    const gamingDayStart = Date.now();
    const gamingDayRanges = getGamingDayRangesForLocations(
      locations.map(loc => ({
        _id: (loc._id as { toString: () => string }).toString(),
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
    const locationResults: AggregatedLocation[] = [];

    // 🚀 OPTIMIZED: Use single aggregation for 7d/30d periods (much faster)
    // For shorter periods (Today/Yesterday/Custom), use batch processing
    const useSingleAggregation =
      timePeriod === '7d' ||
      timePeriod === '30d' ||
      timePeriod === 'last7days' ||
      timePeriod === 'last30days';

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
          { deletedAt: { $lt: new Date('2025-01-01') } },
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
          (m: GamingMachine) =>
            m.lastActivity &&
            new Date(m.lastActivity) >
              new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length;
        const sasMachines = machines.filter(
          (m: GamingMachine) => m.isSasMachine
        ).length;
        const nonSasMachines = totalMachines - sasMachines;

        // Check if location has SMIB machines by checking for relayId or smibBoard
        const hasSmibMachines = machines.some(
          (m: GamingMachine) =>
            (m.relayId && m.relayId.trim() !== '') ||
            (m.smibBoard && m.smibBoard.trim() !== '')
        );

        // Use dynamic check if machines are available, otherwise fall back to database flag
        const hasSmib =
          machines.length > 0 ? hasSmibMachines : location.hasSmib || false;
        const noSMIBLocation =
          machines.length > 0
            ? !hasSmibMachines
            : location.noSMIBLocation || false;

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
          membershipEnabled: Boolean(
            location.membershipEnabled ||
              (location as { enableMembership?: boolean }).enableMembership
          ),
          moneyIn: locationMetrics.moneyIn,
          moneyOut: locationMetrics.moneyOut,
          gross: gross,
          coinIn: 0, // Default value - can be calculated if needed
          coinOut: 0, // Default value - can be calculated if needed
          jackpot: 0, // Default value - can be calculated if needed
          totalMachines: totalMachines,
          onlineMachines: onlineMachines,
          sasMachines: sasMachines,
          nonSasMachines: nonSasMachines,
          hasSasMachines: sasMachines > 0,
          hasNonSasMachines: nonSasMachines > 0,
          noSMIBLocation: noSMIBLocation,
          hasSmib: hasSmib,
          gamesPlayed: 0, // Default value - can be calculated if needed
          rel: location.rel,
          country: location.country,
          machines: machines.map((m: GamingMachine) => ({
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

      for (let i = 0; i < locations.length; i += BATCH_SIZE) {
        const batch = locations.slice(i, i + BATCH_SIZE);

        // Process batch in parallel
        const batchResults = await Promise.all(
          batch.map(async (location: { _id: unknown }) => {
            const locationId = String(location._id);
            const gamingDayRange = gamingDayRanges.get(locationId);

            if (!gamingDayRange) {
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
                    { deletedAt: { $lt: new Date('2025-01-01') } },
                  ],
                },
                {
                  _id: 1,
                  assetNumber: 1,
                  serialNumber: 1,
                  isSasMachine: 1,
                  lastActivity: 1,
                  relayId: 1,
                  smibBoard: 1,
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

              // Check if location has SMIB machines by checking for relayId or smibBoard
              const hasSmibMachines = machines.some(m => {
                const machine = m as {
                  relayId?: string | unknown;
                  smibBoard?: string | unknown;
                };
                const relayId = machine.relayId
                  ? String(machine.relayId).trim()
                  : '';
                const smibBoard = machine.smibBoard
                  ? String(machine.smibBoard).trim()
                  : '';
                return relayId !== '' || smibBoard !== '';
              });

              // Use dynamic check if machines are available, otherwise fall back to database flag
              const hasSmib =
                machines.length > 0
                  ? hasSmibMachines
                  : (location as { hasSmib?: boolean }).hasSmib || false;
              const noSMIBLocation =
                machines.length > 0
                  ? !hasSmibMachines
                  : (location as { noSMIBLocation?: boolean }).noSMIBLocation ||
                    false;

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
                membershipEnabled: Boolean(
                  (
                    location as {
                      membershipEnabled?: boolean;
                      enableMembership?: boolean;
                    }
                  ).membershipEnabled ||
                    (location as { enableMembership?: boolean })
                      .enableMembership
                ),
                moneyIn: locationMetrics.moneyIn,
                moneyOut: locationMetrics.moneyOut,
                gross: gross,
                totalMachines: totalMachines,
                onlineMachines: onlineMachines,
                sasMachines: sasMachines,
                nonSasMachines: nonSasMachines,
                hasSasMachines: sasMachines > 0,
                hasNonSasMachines: nonSasMachines > 0,
                coinIn: 0, // Default value - can be calculated if needed
                coinOut: 0, // Default value - can be calculated if needed
                jackpot: 0, // Default value - can be calculated if needed
                noSMIBLocation: noSMIBLocation,
                hasSmib: hasSmib,
                gamesPlayed: 0, // Default value - can be calculated if needed
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

    // ============================================================================
    // STEP 9.5: Add member counts for locations with membership enabled
    // ============================================================================
    const memberCountStart = Date.now();
    const membershipEnabledLocations = locationResults
      .filter(
        loc =>
          loc.membershipEnabled ||
          (loc as { enableMembership?: boolean }).enableMembership
      )
      .map(loc => loc._id);

    if (membershipEnabledLocations.length > 0) {
      const { Member } = await import('@/app/api/lib/models/members');

      // Count members for each membership-enabled location
      const memberCounts = await Member.aggregate([
        {
          $match: {
            gamingLocation: { $in: membershipEnabledLocations },
            deletedAt: { $lt: new Date('2025-01-01') }, // Exclude deleted members
          },
        },
        {
          $group: {
            _id: '$gamingLocation',
            count: { $sum: 1 },
          },
        },
      ]);

      // Create a map of location ID to member count
      const memberCountMap = new Map<string, number>();
      memberCounts.forEach((item: { _id: string; count: number }) => {
        memberCountMap.set(item._id, item.count);
      });

      // Add member counts to locations
      locationResults.forEach(loc => {
        if (loc.membershipEnabled && loc._id) {
          (loc as { memberCount?: number }).memberCount =
            memberCountMap.get(loc._id) || 0;
        }
      });
    }
    perfTimers.memberCounts = Date.now() - memberCountStart;

    // ============================================================================
    // STEP 10: Apply additional SMIB filter check (based on sasMachines count)
    // ============================================================================
    // Note: Most filters are already applied at database level in STEP 6
    // Apply post-aggregation filters that depend on calculated fields
    // This ensures filters are accurate based on actual machine data, not just database flags
    // Database-level filters are applied first for performance, but we verify here for accuracy
    const filterStart = Date.now();
    let filteredResults = locationResults;

    // Apply post-aggregation filters that depend on calculated fields
    // This ensures filters are accurate based on actual machine data, not just database flags
    const smibOnlyFilter = filters.includes('SMIBLocationsOnly');
    const noSmibFilter = filters.includes('NoSMIBLocation');
    const localServerFilter = filters.includes('LocalServersOnly');
    const membershipFilter = filters.includes('MembershipOnly');

    if (
      smibOnlyFilter ||
      noSmibFilter ||
      localServerFilter ||
      membershipFilter
    ) {
      filteredResults = locationResults.filter(loc => {
        // Apply all selected filters with AND logic (location must match ALL selected filters)
        // This ensures that if SMIB is selected, Local Servers are excluded (unless Local Server is also selected)

        // SMIBLocationsOnly: Must have SMIB machines (check hasSmib flag only)
        // This is the authoritative check - must verify based on actual machine data
        // Note: sasMachines > 0 does NOT mean SMIB - SMIB requires relayId or smibBoard
        if (smibOnlyFilter) {
          const totalMachines =
            (loc as { totalMachines?: number }).totalMachines || 0;
          // Only check hasSmib - do NOT check sasMachines as that's different from SMIB
          const hasSmib = (loc as { hasSmib?: boolean }).hasSmib === true;

          // If location has no machines, exclude it (can't have SMIB without machines)
          if (totalMachines === 0) return false;

          // If location has machines but no SMIB machines, exclude it
          // hasSmib must be explicitly true (based on relayId or smibBoard check)
          if (!hasSmib) return false;

          // If SMIB is selected, exclude Local Servers (unless Local Server is also selected)
          if (!localServerFilter) {
            const isLocalServer =
              (loc as { isLocalServer?: boolean }).isLocalServer === true;
            if (isLocalServer) return false; // Exclude Local Servers when only SMIB is selected
          }
        }

        // NoSMIBLocation: Must NOT have SMIB machines
        if (noSmibFilter) {
          const hasSmib =
            (loc as { hasSmib?: boolean }).hasSmib === true ||
            ((loc as { sasMachines?: number }).sasMachines || 0) > 0;
          // Location must NOT have SMIB machines (check both hasSmib and noSMIBLocation flag)
          if (hasSmib) return false;
          // Also verify noSMIBLocation flag is true if available
          const noSMIB = (loc as { noSMIBLocation?: boolean }).noSMIBLocation;
          if (noSMIB === false) return false; // Explicitly false means it has SMIB
        }

        // LocalServersOnly: Must be a local server
        if (localServerFilter) {
          const isLocalServer =
            (loc as { isLocalServer?: boolean }).isLocalServer === true;
          if (!isLocalServer) return false;
          // If Local Server is selected, exclude SMIB locations (unless SMIB is also selected)
          if (!smibOnlyFilter) {
            const hasSmib =
              (loc as { hasSmib?: boolean }).hasSmib === true ||
              ((loc as { sasMachines?: number }).sasMachines || 0) > 0;
            if (hasSmib) return false; // Exclude SMIB locations when only Local Server is selected
          }
        }

        // MembershipOnly: Must have membership enabled
        if (membershipFilter) {
          const membershipEnabled =
            (loc as { membershipEnabled?: boolean }).membershipEnabled === true;
          if (!membershipEnabled) return false;
        }

        return true;
      });
    }
    perfTimers.filters = Date.now() - filterStart;

    // 🔍 PERFORMANCE: Sort and paginate
    const sortStart = Date.now();
    filteredResults.sort((a, b) => b.gross - a.gross);
    const totalCount = filteredResults.length;
    const paginatedResults = filteredResults.slice(skip, skip + limit);
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
              { deletedAt: { $lt: new Date('2025-01-01') } },
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
          const countriesData = await Countries.find({}).lean();
          const countryIdToName = new Map<string, string>();
          countriesData.forEach(country => {
            if (country._id && country.name) {
              countryIdToName.set(String(country._id), country.name);
            }
          });

          // Convert each location's financial data
          convertedData = paginatedData.map(location => {
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
                licenseeIdToName.get(locationLicenseeId.toString()) ||
                'Unknown';
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
              convertedLocation.moneyIn = convertFromUSD(
                usdValue,
                displayCurrency
              );
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
              convertedLocation.gross = convertFromUSD(
                usdValue,
                displayCurrency
              );
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

    // Log only if slow response (>3 seconds)
    if (totalTime > 3000) {
      console.warn(
        `[Locations Report API] Slow response: ${totalTime}ms for ${locations.length} locations`
      );
    }

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
