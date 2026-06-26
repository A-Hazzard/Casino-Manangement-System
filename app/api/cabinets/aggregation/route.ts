/**
 * Cabinets Aggregation API Route
 *
 * This route handles aggregating machine data across multiple locations.
 * It supports:
 * - Time period filtering (today, week, month, custom dates)
 * - Licencee filtering
 * - Location filtering
 * - Search functionality
 * - Currency conversion (Admin/Developer only for "All Licencees")
 * - Gaming day offset calculations per location
 * - Pagination
 * - Optimized batch processing for performance
 *
 * @module app/api/cabinets/aggregation/route
 */

import {
  getUserAccessibleLicenceesFromToken,
  getUserLocationFilter,
} from '@/app/api/lib/helpers/licenceeFilter';
import {
  buildBatchMetersPipeline,
  buildLocationRangeInputs,
  buildMachineMatchQuery,
  buildMachineResponse,
  buildPerLocationMetersPipeline,
  getDefaultMetrics,
  parseCabinetAggregationParams,
  refineOfflineStatus,
  applyReviewerScale,
  sortCabinetMachines,
} from '@/app/api/lib/helpers/cabinetAggregation';
import type {
  CabinetMachineResponse,
  MachineMetrics,
} from '@/app/api/lib/helpers/cabinetAggregation';
import { connectDB } from '@/app/api/lib/middleware/db';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { Countries } from '@/app/api/lib/models/countries';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Licencee } from '@/app/api/lib/models/licencee';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import { convertFromUSD } from '@/lib/helpers/rates';
import type { LocationDocument } from '@/lib/types/common';
import { getGamingDayRangesForLocations } from '@/lib/utils/gamingDayRange';
import type {
  CountryDocument,
  GamingMachine,
  LicenceeDocument,
} from '@shared/types';
import { MachineAggregationMatchStage } from '@/shared/types/mongo';
import { NextRequest, NextResponse } from 'next/server';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import {
  getMoneyInScale,
  getMoneyOutAndJackpotScale,
} from '@/app/api/lib/utils/reviewerScale';

/**
 * Main GET handler for Cabinet Aggregation
 *
 * @param {string} locationId - Comma-separated location IDs to filter by
 * @param {string} gameType - Comma-separated game types to filter by
 * @param {string} search - Search query for serial, name, or SMIB
 * @param {string} licencee - Filter machines by licencee name
 * @param {string} timePeriod - Time range preset ('Today', 'Yesterday', '7d', '30d', 'Custom', 'LastHour')
 * @param {string} currency - Target currency code for values (e.g., 'USD', 'GYD')
 * @param {string} onlineStatus - Filter by status ('online', 'offline', 'never-online', 'archived')
 * @param {string} smibStatus - Filter by SMIB presence ('smib', 'no-smib')
 * @param {string} membership - Filter by membership status ('enabled', 'disabled')
 * @param {number} page - Page number for pagination
 * @param {number} limit - Items per page
 * @param {string} startDate - ISO date for custom range start
 * @param {string} endDate - ISO date for custom range end
 * @param {boolean} debug - Enabled detailed metadata in response
 *
 * Flow:
 * 1. Parse query parameters
 * 2. Validate timePeriod parameter
 * 3. Get user's accessible licencees and permissions
 * 4. Technician restriction
 * 5. Fetch locations with gameDayOffset
 * 6. Calculate gaming day ranges per location
 * 7. Aggregate machine metrics (optimized for 30d/7d vs Today/Yesterday)
 * 8. Refine offline status
 * 9. Apply currency conversion if needed
 * 10. Apply reviewer scale
 * 11. Sort and paginate
 * 12. Return aggregated machine data
 */
export async function GET(req: NextRequest) {
  return withApiAuth(
    req,
    async ({ user: userPayload, userRoles, isAdminOrDev }) => {
      const startTime = Date.now();
      const functionName = 'GET /api/cabinets/aggregation';
      const user = extractUserFromRequest(req);

      // ============================================================================
      // STEP 1: Parse query parameters
      // ============================================================================
      const { searchParams } = new URL(req.url);
      const params = parseCabinetAggregationParams(searchParams);
      let { timePeriod } = params;
      const {
        locationIdArray,
        selectedGameTypes,
        searchTerm,
        licencee,
        displayCurrency,
        onlineStatus,
        smibStatus,
        membership,
        page,
        limit,
        startDateParam,
        endDateParam,
        debug,
      } = params;

      // ============================================================================
      // STEP 2: Validate timePeriod parameter
      // ============================================================================
      if (!timePeriod) {
        logRouteError(
          functionName,
          'GET',
          '/api/cabinets/aggregation',
          'timePeriod parameter is required',
          user
        );
        return NextResponse.json(
          { error: 'timePeriod parameter is required' },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 3: Get user's accessible licencees and permissions
      // ============================================================================
      const userAccessibleLicencees =
        await getUserAccessibleLicenceesFromToken();
      let userLocationPermissions: string[] = [];
      if (
        Array.isArray(
          (userPayload as { assignedLocations?: string[] })?.assignedLocations
        )
      ) {
        userLocationPermissions = (
          userPayload as { assignedLocations: string[] }
        ).assignedLocations;
      }

      let allowedLocationIds = await getUserLocationFilter(
        userAccessibleLicencees,
        licencee || undefined,
        userLocationPermissions,
        userRoles
      );

      const isAdmin = userRoles
        .map(r => r?.toLowerCase?.() ?? r)
        .some(r => r === 'admin' || r === 'developer' || r === 'owner');
      if (isAdmin && locationIdArray.length > 0) {
        allowedLocationIds = 'all';
      }

      // ============================================================================
      // STEP 4: Technician Restriction - Force last hour meter data
      // ============================================================================
      const userRolesLower = userRoles.map(
        r => r?.toLowerCase?.() ?? String(r).toLowerCase()
      );
      const isOnlyTechnician =
        userRolesLower.includes('technician') &&
        !userRolesLower.some(r =>
          ['admin', 'developer', 'manager', 'location admin', 'owner'].includes(
            r
          )
        );
      if (isOnlyTechnician && !isAdmin) {
        timePeriod = 'LastHour';
      }

      if (allowedLocationIds !== 'all' && allowedLocationIds.length === 0) {
        const response = { success: true, data: [] };
        if (debug) {
          return NextResponse.json({
            ...response,
            debug: {
              userAccessibleLicencees,
              userRoles,
              userLocationPermissions,
              licenceeParam: licencee,
              allowedLocationIds: 'EMPTY',
              reason: 'No accessible locations',
            },
          });
        }
        return NextResponse.json(response);
      }

      // ============================================================================
      // STEP 5: Fetch locations with gameDayOffset
      // ============================================================================
      let timePeriodForGamingDay: string;
      let customStartDateForGamingDay: Date | undefined;
      let customEndDateForGamingDay: Date | undefined;

      if (timePeriod === 'Custom' && startDateParam && endDateParam) {
        timePeriodForGamingDay = 'Custom';
        customStartDateForGamingDay = startDateParam.includes('T')
          ? new Date(startDateParam)
          : new Date(startDateParam + 'T00:00:00.000Z');
        customEndDateForGamingDay = endDateParam.includes('T')
          ? new Date(endDateParam)
          : new Date(endDateParam + 'T00:00:00.000Z');

        if (
          isNaN(customStartDateForGamingDay.getTime()) ||
          isNaN(customEndDateForGamingDay.getTime())
        ) {
          return NextResponse.json(
            { error: 'Invalid date parameters' },
            { status: 400 }
          );
        }
      } else {
        timePeriodForGamingDay = timePeriod;
      }

      const isArchivedRequested = onlineStatus === 'archived';
      const deletedFilter: Record<string, unknown> = isArchivedRequested
        ? { deletedAt: { $gte: new Date('2025-01-01') } }
        : {
            $or: [
              { deletedAt: null },
              { deletedAt: { $lt: new Date('2025-01-01') } },
            ],
          };

      const matchStage: MachineAggregationMatchStage = isArchivedRequested
        ? {}
        : {
            $or: [
              { deletedAt: null },
              { deletedAt: { $lt: new Date('2025-01-01') } },
            ],
          };

      if (locationIdArray.length > 0) {
        const filteredLocationIds = locationIdArray.filter(locId => {
          const idStr = String(locId);
          return (
            allowedLocationIds === 'all' ||
            allowedLocationIds.some((id: string) => String(id) === idStr)
          );
        });

        if (filteredLocationIds.length === 0) {
          return NextResponse.json({ success: true, data: [] });
        }
        matchStage._id = { $in: filteredLocationIds };
      } else if (allowedLocationIds !== 'all') {
        matchStage._id = { $in: allowedLocationIds };
      }

      if (membership === 'enabled') {
        matchStage.membershipEnabled = true;
      } else if (membership === 'disabled') {
        matchStage.membershipEnabled = false;
      }

      const locations =
        await GamingLocations.find(matchStage).lean<LocationDocument[]>();

      if (locations.length === 0) {
        return NextResponse.json({ success: true, data: [] });
      }

      const rawLicenceeRels = locations
        .map(loc => loc.rel?.licencee)
        .filter(Boolean);
      const licenceeIds = Array.from(
        new Set(
          rawLicenceeRels.flatMap(rel =>
            Array.isArray(rel) ? rel : [rel as string]
          )
        )
      );
      const licencees = await Licencee.find({ _id: { $in: licenceeIds } }).lean<
        LicenceeDocument[]
      >();
      const licenceeIncludeJackpotMap = new Map(
        licencees.map(licenceeDoc => [
          String(licenceeDoc._id),
          !!licenceeDoc.includeJackpot,
        ])
      );

      // ============================================================================
      // STEP 6: Calculate gaming day ranges per location
      // ============================================================================
      const gamingDayRanges = getGamingDayRangesForLocations(
        buildLocationRangeInputs(locations, licenceeIncludeJackpotMap),
        timePeriodForGamingDay,
        customStartDateForGamingDay,
        customEndDateForGamingDay
      );

      // ============================================================================
      // STEP 7: Aggregate machine metrics
      // ============================================================================
      let allMachines: CabinetMachineResponse[] = [];
      const useSingleAggregation = timePeriod === '30d' || timePeriod === '7d';

      if (useSingleAggregation) {
        const allLocationIds = locations.map(loc => String(loc._id));

        const machineMatchQuery = buildMachineMatchQuery(
          allLocationIds,
          deletedFilter,
          { searchTerm, selectedGameTypes, onlineStatus, smibStatus },
          locations
        );

        const allLocationMachines =
          await Machine.find(machineMatchQuery).lean<GamingMachine[]>();

        if (allLocationMachines.length > 0) {
          const machineToLocation = new Map<string, string>();
          allLocationMachines.forEach(machine => {
            machineToLocation.set(
              String(machine._id),
              machine.gamingLocation ? String(machine.gamingLocation) : ''
            );
          });

          const locationRanges = new Map<
            string,
            { rangeStart: Date; rangeEnd: Date }
          >();
          locations.forEach(loc => {
            const locationId = String(loc._id);
            const gameDayRange = gamingDayRanges.get(locationId);
            if (gameDayRange) {
              locationRanges.set(locationId, gameDayRange);
            }
          });

          const machinesByLocation = new Map<string, string[]>();
          allLocationMachines.forEach(machine => {
            const machineId = String(machine._id);
            const locationId = machineToLocation.get(machineId);
            if (locationId) {
              if (!machinesByLocation.has(locationId)) {
                machinesByLocation.set(locationId, []);
              }
              machinesByLocation.get(locationId)?.push(machineId);
            }
          });

          const allMetrics: Array<Record<string, unknown>> = [];

          await Promise.all(
            Array.from(machinesByLocation.entries()).map(
              async ([locationId, machineIds]) => {
                const gameDayRange = locationRanges.get(locationId);
                if (!gameDayRange) return;

                const locationPipeline = buildPerLocationMetersPipeline(
                  machineIds,
                  gameDayRange
                );

                const locationMetrics: Array<Record<string, unknown>> = [];
                const locationMetricsCursor = Meters.aggregate(
                  locationPipeline,
                  { allowDiskUse: true, maxTimeMS: 90000 }
                ).cursor({ batchSize: 1000 });

                for await (const doc of locationMetricsCursor) {
                  locationMetrics.push(doc);
                }
                allMetrics.push(...locationMetrics);
              }
            )
          );

          const metricsMap = new Map<string, MachineMetrics>();
          allMetrics.forEach(metrics => {
            metricsMap.set(
              String(metrics._id),
              metrics as unknown as MachineMetrics
            );
          });

          const locationMap = new Map<string, LocationDocument>();
          locations.forEach(loc => {
            locationMap.set(String(loc._id), loc);
          });

          allLocationMachines.forEach(machine => {
            const machineId = String(machine._id);
            const locationId = machineToLocation.get(machineId);
            const location = locationId
              ? locationMap.get(locationId)
              : undefined;
            if (!location) return;

            const metrics = metricsMap.get(machineId) || getDefaultMetrics();
            allMachines.push(
              buildMachineResponse(
                machine,
                metrics,
                location,
                licenceeIncludeJackpotMap,
                timePeriod
              )
            );
          });
        }
      } else {
        // Batch processing for Today/Yesterday/Custom/LastHour
        const BATCH_SIZE = 20;
        for (
          let locationIndex = 0;
          locationIndex < locations.length;
          locationIndex += BATCH_SIZE
        ) {
          const batch = locations.slice(
            locationIndex,
            locationIndex + BATCH_SIZE
          );
          const batchLocationIds = batch
            .map(loc => String(loc._id))
            .filter(id => gamingDayRanges.has(id));

          if (batchLocationIds.length === 0) continue;

          const batchMachineMatchQuery = buildMachineMatchQuery(
            batchLocationIds,
            deletedFilter,
            { searchTerm, selectedGameTypes, onlineStatus, smibStatus },
            batch
          );

          const batchAllMachines = await Machine.find(
            batchMachineMatchQuery
          ).lean<GamingMachine[]>();

          if (batchAllMachines.length === 0) continue;

          const batchMachinesByLocation = new Map<string, GamingMachine[]>();
          batchAllMachines.forEach(machine => {
            const locationId = machine.gamingLocation
              ? String(machine.gamingLocation)
              : null;
            if (locationId && batchLocationIds.includes(locationId)) {
              if (!batchMachinesByLocation.has(locationId)) {
                batchMachinesByLocation.set(locationId, []);
              }
              batchMachinesByLocation.get(locationId)?.push(machine);
            }
          });

          let batchGlobalStart = new Date();
          let batchGlobalEnd = new Date(0);
          batchLocationIds.forEach(locId => {
            const range = gamingDayRanges.get(locId);
            if (range) {
              if (range.rangeStart < batchGlobalStart)
                batchGlobalStart = range.rangeStart;
              if (range.rangeEnd > batchGlobalEnd)
                batchGlobalEnd = range.rangeEnd;
            }
          });

          const allBatchMachineIds = batchAllMachines.map(m => String(m._id));
          const machineToLocationMap = new Map<string, string>();
          batchAllMachines.forEach(machine => {
            const machineId = String(machine._id);
            const locId = machine.gamingLocation
              ? String(machine.gamingLocation)
              : null;
            if (locId) machineToLocationMap.set(machineId, locId);
          });

          const batchMetersPipeline = buildBatchMetersPipeline(
            allBatchMachineIds,
            batchGlobalStart,
            batchGlobalEnd,
            timePeriod
          );

          const batchMetricsCursor = Meters.aggregate(batchMetersPipeline, {
            allowDiskUse: true,
            maxTimeMS: 90000,
          }).cursor({ batchSize: 1000 });

          const metricsByMachine = new Map<string, MachineMetrics>();
          for await (const agg of batchMetricsCursor) {
            const machineId = String(agg._id);
            const locationId = machineToLocationMap.get(machineId);
            const gameDayRange = locationId
              ? gamingDayRanges.get(locationId)
              : undefined;
            const aggRecord = agg as Record<string, unknown>;

            if (!gameDayRange || timePeriod === 'All Time') {
              metricsByMachine.set(machineId, {
                moneyIn: (aggRecord.moneyIn as number) || 0,
                moneyOut: (aggRecord.moneyOut as number) || 0,
                jackpot: (aggRecord.jackpot as number) || 0,
                coinIn: (aggRecord.coinIn as number) || 0,
                coinOut: (aggRecord.coinOut as number) || 0,
                gamesPlayed: (aggRecord.gamesPlayed as number) || 0,
                gamesWon: (aggRecord.gamesWon as number) || 0,
                handPaidCancelledCredits:
                  (aggRecord.handPaidCancelledCredits as number) || 0,
                meterCount: (aggRecord.meterCount as number) || 0,
              });
            } else {
              const minReadAt = new Date(aggRecord.minReadAt as Date);
              const maxReadAt = new Date(aggRecord.maxReadAt as Date);
              const hasValidReadAt =
                (minReadAt >= gameDayRange.rangeStart &&
                  minReadAt <= gameDayRange.rangeEnd) ||
                (maxReadAt >= gameDayRange.rangeStart &&
                  maxReadAt <= gameDayRange.rangeEnd) ||
                (minReadAt <= gameDayRange.rangeStart &&
                  maxReadAt >= gameDayRange.rangeEnd);

              if (hasValidReadAt) {
                const existing = metricsByMachine.get(machineId);
                const newMetrics: MachineMetrics = {
                  moneyIn: (aggRecord.moneyIn as number) || 0,
                  moneyOut: (aggRecord.moneyOut as number) || 0,
                  jackpot: (aggRecord.jackpot as number) || 0,
                  coinIn: (aggRecord.coinIn as number) || 0,
                  coinOut: (aggRecord.coinOut as number) || 0,
                  gamesPlayed: (aggRecord.gamesPlayed as number) || 0,
                  gamesWon: (aggRecord.gamesWon as number) || 0,
                  handPaidCancelledCredits:
                    (aggRecord.handPaidCancelledCredits as number) || 0,
                  meterCount: (aggRecord.meterCount as number) || 0,
                };

                if (existing) {
                  existing.moneyIn += newMetrics.moneyIn;
                  existing.moneyOut += newMetrics.moneyOut;
                  existing.jackpot += newMetrics.jackpot;
                  existing.meterCount += newMetrics.meterCount;
                } else {
                  metricsByMachine.set(machineId, newMetrics);
                }
              }
            }
          }

          const batchLocationMap = new Map<string, LocationDocument>();
          batch.forEach(loc => {
            batchLocationMap.set(String(loc._id), loc);
          });

          batch.forEach(location => {
            const locationIdStr = String(location._id);
            const locationMachines =
              batchMachinesByLocation.get(locationIdStr) || [];
            if (locationMachines.length === 0) return;

            locationMachines.forEach(machine => {
              const machineId = String(machine._id);
              const metrics =
                metricsByMachine.get(machineId) || getDefaultMetrics();
              allMachines.push(
                buildMachineResponse(
                  machine,
                  metrics,
                  location,
                  licenceeIncludeJackpotMap,
                  timePeriod
                )
              );
            });
          });
        }
      }

      // ============================================================================
      // STEP 8: Refine offline status and apply filtering
      // ============================================================================
      allMachines = refineOfflineStatus(
        allMachines,
        onlineStatus,
        timePeriod,
        gamingDayRanges
      );

      let filteredMachines = allMachines;

      // ============================================================================
      // STEP 9: Apply currency conversion if needed
      // ============================================================================
      if (isAdminOrDev && shouldApplyCurrencyConversion(licencee)) {
        const db = await connectDB();
        if (!db) {
          return NextResponse.json(
            { error: 'DB connection failed' },
            { status: 500 }
          );
        }

        const licenceesData = await Licencee.find(
          {
            $or: [
              { deletedAt: null },
              { deletedAt: { $lt: new Date('2025-01-01') } },
            ],
          },
          { _id: 1, name: 1, includeJackpot: 1 }
        ).lean<LicenceeDocument[]>();

        const licenceeIdToName = new Map<string, string>();
        const licenceeIdToIncludeJackpot = new Map<string, boolean>();
        licenceesData.forEach(lic => {
          licenceeIdToName.set(String(lic._id), lic.name as string);
          licenceeIdToIncludeJackpot.set(
            String(lic._id),
            Boolean(lic.includeJackpot)
          );
        });

        const { getCountryCurrency, getLicenceeCurrency, convertToUSD } =
          await import('@/lib/helpers/rates');
        const countriesData = await Countries.find({}).lean<
          CountryDocument[]
        >();
        const countryIdToName = new Map<string, string>();
        countriesData.forEach(country => {
          if (country._id && country.name) {
            countryIdToName.set(String(country._id), country.name);
          }
        });

        const locationDetailsMap = new Map<string, LocationDocument>();
        for (const location of locations) {
          locationDetailsMap.set(String(location._id), location);
        }

        filteredMachines = filteredMachines.map(machine => {
          const locationDetails = locationDetailsMap.get(machine.locationId);
          const machineLicenceeId = locationDetails?.rel?.licencee
            ? ((Array.isArray(locationDetails.rel.licencee)
                ? locationDetails.rel.licencee[0]
                : locationDetails.rel.licencee) as string)
            : undefined;

          let nativeCurrency: string = 'USD';

          if (!machineLicenceeId) {
            const countryId = locationDetails?.country as string | undefined;
            const countryName = countryId
              ? countryIdToName.get(countryId.toString())
              : undefined;
            nativeCurrency = countryName
              ? getCountryCurrency(countryName)
              : 'USD';
          } else {
            const licenceeName =
              licenceeIdToName.get(machineLicenceeId.toString()) || 'Unknown';
            nativeCurrency = getLicenceeCurrency(licenceeName);
          }

          const roundTwo = (v: number) => Math.round(v * 100) / 100;

          if (nativeCurrency === displayCurrency) {
            const moneyIn = roundTwo(machine.moneyIn);
            const baseMoneyOut = roundTwo(machine.cancelledCredits);
            const jackpot = roundTwo(machine.jackpot);
            const includeJackpot =
              (machineLicenceeId &&
                licenceeIdToIncludeJackpot.get(machineLicenceeId.toString())) ||
              false;
            const moneyOut = baseMoneyOut + (includeJackpot ? jackpot : 0);
            const gross = roundTwo(moneyIn - moneyOut);
            const netGross = roundTwo(moneyIn - baseMoneyOut - jackpot);

            return {
              ...machine,
              moneyIn,
              moneyOut,
              cancelledCredits: baseMoneyOut,
              jackpot,
              gross,
              netGross,
              coinIn: roundTwo(machine.coinIn),
              coinOut: roundTwo(machine.coinOut),
              includeJackpot,
            };
          }

          const moneyInUSD = convertToUSD(machine.moneyIn, nativeCurrency);
          const cancelledCreditsUSD = convertToUSD(
            machine.cancelledCredits,
            nativeCurrency
          );
          const jackpotUSD = convertToUSD(machine.jackpot, nativeCurrency);
          const coinInUSD = convertToUSD(machine.coinIn, nativeCurrency);
          const coinOutUSD = convertToUSD(machine.coinOut, nativeCurrency);

          const moneyIn = roundTwo(convertFromUSD(moneyInUSD, displayCurrency));
          const baseMoneyOut = roundTwo(
            convertFromUSD(cancelledCreditsUSD, displayCurrency)
          );
          const jackpot = roundTwo(convertFromUSD(jackpotUSD, displayCurrency));
          const includeJackpot =
            (machineLicenceeId &&
              licenceeIdToIncludeJackpot.get(machineLicenceeId.toString())) ||
            false;
          const moneyOut = baseMoneyOut + (includeJackpot ? jackpot : 0);
          const gross = roundTwo(moneyIn - moneyOut);
          const netGross = roundTwo(moneyIn - baseMoneyOut - jackpot);

          return {
            ...machine,
            moneyIn,
            moneyOut,
            cancelledCredits: roundTwo(
              convertFromUSD(cancelledCreditsUSD, displayCurrency)
            ),
            jackpot,
            gross,
            netGross,
            coinIn: roundTwo(convertFromUSD(coinInUSD, displayCurrency)),
            coinOut: roundTwo(convertFromUSD(coinOutUSD, displayCurrency)),
            includeJackpot,
          };
        });
      }

      // ============================================================================
      // STEP 10: Apply reviewer multiplier
      // ============================================================================
      const scaleReferenceDate = customEndDateForGamingDay ?? new Date();
      const moneyInScale = getMoneyInScale(
        userPayload as {
          moneyInMultiplier?: number | null;
          roles?: string[];
          reviewerMultiplierStartTime?: Date | string | null;
        },
        scaleReferenceDate
      );
      const moneyOutScale = getMoneyOutAndJackpotScale(
        userPayload as {
          moneyOutAndJackpotMultiplier?: number | null;
          roles?: string[];
          reviewerMultiplierStartTime?: Date | string | null;
        },
        scaleReferenceDate
      );
      filteredMachines = applyReviewerScale(
        filteredMachines,
        moneyInScale,
        moneyOutScale
      );

      // ============================================================================
      // STEP 11: Sort and paginate
      // ============================================================================
      const sortBy = searchParams.get('sortBy') || 'moneyIn';
      const sortOrderRaw = searchParams.get('sortOrder') || 'desc';
      const sortOrder = sortOrderRaw.toLowerCase() === 'asc' ? 1 : -1;

      sortCabinetMachines(filteredMachines, searchTerm, sortBy, sortOrder);

      const totalCount = filteredMachines.length;
      let paginatedMachines = filteredMachines;

      if (limit) {
        const skip = (page - 1) * limit;
        paginatedMachines = filteredMachines.slice(skip, skip + limit);
      }

      // ============================================================================
      // STEP 12: Return aggregated machine data
      // ============================================================================
      type DebugInfo = {
        userAccessibleLicencees: string[] | 'all';
        userRoles: string[];
        userLocationPermissions: string[];
        licenceeParam: string | null;
        allowedLocationIds: string | string[];
        locationsFound: number;
        locationSample: Array<{ id: string; name: string; licencee?: string }>;
        machinesReturned: number;
        totalMachines?: number;
        timePeriod: string;
      };

      type ApiResponse = {
        success: boolean;
        data: typeof paginatedMachines;
        pagination?: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
        debug?: DebugInfo;
      };

      const response: ApiResponse = {
        success: true,
        data: paginatedMachines,
      };

      if (limit) {
        response.pagination = {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        };
      }

      if (debug) {
        response.debug = {
          userAccessibleLicencees,
          userRoles,
          userLocationPermissions,
          licenceeParam: licencee,
          allowedLocationIds:
            allowedLocationIds === 'all'
              ? 'ALL'
              : (allowedLocationIds as string[])?.slice(0, 10),
          locationsFound: locations.length,
          locationSample: locations.slice(0, 3).map(l => ({
            id: String(l._id),
            name: String(l.name),
            licencee: l.rel?.licencee ? String(l.rel.licencee) : undefined,
          })),
          machinesReturned: paginatedMachines.length,
          totalMachines: totalCount,
          timePeriod,
        };
      }

      const duration = Date.now() - startTime;
      if (duration > 1000) {
        console.warn(`[Cabinet Aggregation API] Completed in ${duration}ms`);
      }
      logRouteFetch(
        functionName,
        'GET',
        '/api/cabinets/aggregation',
        paginatedMachines.length,
        user,
        duration
      );

      return NextResponse.json(response);
    }
  );
}
