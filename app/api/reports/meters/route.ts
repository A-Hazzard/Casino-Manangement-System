import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/api/lib/middleware/db';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import {
  convertFromUSD,
  convertToUSD,
  getCountryCurrency,
} from '@/lib/helpers/rates';
import type { CurrencyCode } from '@/shared/types/currency';
import { TimePeriod } from '@/app/api/lib/types';
import { getGamingDayRangesForLocations } from '@/lib/utils/gamingDayRange';
import { getUserFromServer } from '@/app/api/lib/helpers/users';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const locations = searchParams.get('locations');
    const timePeriod = (searchParams.get('timePeriod') as TimePeriod) || 'Today';
    const customStartDate = searchParams.get('startDate');
    const customEndDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const licencee = searchParams.get('licencee');
    const displayCurrency =
      (searchParams.get('currency') as CurrencyCode) || 'USD';

    if (!locations) {
      return NextResponse.json(
        { error: 'Locations parameter is required' },
        { status: 400 }
      );
    }

    // Validate custom date parameters if timePeriod is Custom
    if (timePeriod === 'Custom') {
      if (!customStartDate || !customEndDate) {
        return NextResponse.json(
          { error: 'Custom date range requires both startDate and endDate' },
          { status: 400 }
        );
      }
    }

    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { error: 'DB connection failed' },
        { status: 500 }
      );
    }

    // Get user for role-based access control
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoles = (userPayload?.roles as string[]) || [];
    const isAdminOrDev = userRoles.includes('admin') || userRoles.includes('developer');

    // Parse locations (comma-separated)
    const locationList = locations
      .split(',')
      .map(loc => loc.trim())
      .filter(loc => loc !== 'all' && loc !== '');

    // Build query filter for machines
    const machineMatchStage: Record<string, unknown> = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    };

    // Add location filter if specific locations are selected
    if (locationList.length > 0 && !locationList.includes('all')) {
      machineMatchStage.gamingLocation = { $in: locationList };
    }

    // Get machines data for the selected locations
    let machinesData = await db
      .collection('machines')
      .find(machineMatchStage)
      .project({
        _id: 1,
        serialNumber: 1,
        'Custom.name': 1,
        gamingLocation: 1,
        sasMeters: 1,
        lastActivity: 1,
      })
      .sort({ lastActivity: -1 })
      .toArray();

    // Filter by licensee if provided
    if (licencee && licencee !== 'all') {
      const licenseeLocations = await db
        .collection('gaminglocations')
        .find({ 'rel.licencee': licencee })
        .project({ _id: 1 })
        .toArray();

      const licenseeLocationIds = licenseeLocations.map(loc =>
        loc._id.toString()
      );

      machinesData = machinesData.filter(machine =>
        licenseeLocationIds.includes(
          (machine as unknown as { gamingLocation: string }).gamingLocation
        )
      );
    }

    // Get all gaming locations for name resolution and gaming day offset
    const locationsData = await db
      .collection('gaminglocations')
      .find(
        {
          _id: { $in: locationList as never[] },
          $or: [
            { deletedAt: null },
            { deletedAt: { $lt: new Date('2020-01-01') } },
          ],
        } as never,
        { projection: { _id: 1, name: 1, gameDayOffset: 1, rel: 1, country: 1 } }
      )
      .toArray();

    // Create maps for quick location name lookup
    const locationMap = new Map();
    locationsData.forEach((loc: Record<string, unknown>) => {
      locationMap.set((loc._id as string).toString(), loc.name as string);
    });

    // Calculate gaming day ranges for all selected locations
    const locationsList = locationsData.map((loc) => ({
      _id: String(loc._id),
      gameDayOffset: (loc.gameDayOffset as number) ?? 8, // Default to 8 AM
    }));

    // Parse custom dates if provided
    let customStart: Date | undefined;
    let customEnd: Date | undefined;
    if (timePeriod === 'Custom' && customStartDate && customEndDate) {
      customStart = new Date(customStartDate + 'T00:00:00.000Z');
      customEnd = new Date(customEndDate + 'T00:00:00.000Z');
    }

    const gamingDayRanges = getGamingDayRangesForLocations(
      locationsList,
      timePeriod,
      customStart,
      customEnd
    );

    // Get the earliest start and latest end across all locations
    const rangesArray = Array.from(gamingDayRanges.values());
    const queryStartDate = new Date(
      Math.min(...rangesArray.map((r) => r.rangeStart.getTime()))
    );
    const queryEndDate = new Date(
      Math.max(...rangesArray.map((r) => r.rangeEnd.getTime()))
    );

    console.warn('🔍 METERS API - Date Range:', {
      timePeriod,
      queryStartDate: queryStartDate.toISOString(),
      queryEndDate: queryEndDate.toISOString(),
    });

    // Aggregate meter data for the gaming day range
    const machineIds = machinesData.map((m) => (m._id as string).toString());

    const metersAggregation = await db
      .collection('meters')
      .aggregate([
        {
          $match: {
            machine: { $in: machineIds },
            readAt: { $gte: queryStartDate, $lte: queryEndDate },
          },
        },
        {
          $group: {
            _id: '$machine',
            drop: { $sum: { $ifNull: ['$movement.drop', 0] } },
            totalCancelledCredits: {
              $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
            },
            totalHandPaidCancelledCredits: {
              $sum: { $ifNull: ['$movement.totalHandPaidCancelledCredits', 0] },
            },
            coinIn: { $sum: { $ifNull: ['$movement.coinIn', 0] } },
            coinOut: { $sum: { $ifNull: ['$movement.coinOut', 0] } },
            totalWonCredits: { $sum: { $ifNull: ['$movement.totalWonCredits', 0] } },
            gamesPlayed: { $sum: { $ifNull: ['$movement.gamesPlayed', 0] } },
            jackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
            lastReadAt: { $max: '$readAt' },
          },
        },
      ])
      .toArray();

    // Create a map for meter data lookup
    const metersMap = new Map();
    metersAggregation.forEach((meter: Record<string, unknown>) => {
      metersMap.set(meter._id, meter);
    });

    // Transform data for the table
    let transformedData = machinesData.map(
      (machine: Record<string, unknown>) => {
        const locationName = machine.gamingLocation
          ? locationMap.get(machine.gamingLocation.toString()) ||
            'Unknown Location'
          : 'Unknown Location';

        // Machine ID display
        const serialNumber = machine.serialNumber?.toString().trim() || '';
        const customName =
          (machine.Custom as Record<string, unknown>)?.name
            ?.toString()
            .trim() || '';

        let machineId = '';
        if (serialNumber) {
          machineId = serialNumber;
        } else if (customName) {
          machineId = customName;
        } else {
          machineId = `Machine ${(machine._id as string).toString().slice(-6)}`;
        }

        const machineDocumentId = (machine._id as string).toString();

        // Validate meter values
        const validateMeter = (value: unknown): number => {
          const num = Number(value) || 0;
          return num >= 0 ? num : 0;
        };

        // Use aggregated meter data (always use meters collection for consistency)
        const meterData = metersMap.get(machineDocumentId) || {};

        const metersIn = validateMeter(meterData.coinIn);
        const metersOut = validateMeter(meterData.totalWonCredits);
        const jackpot = validateMeter(meterData.jackpot);
        const billIn = validateMeter(meterData.drop);
        const totalCancelledCredits = validateMeter(
          meterData.totalCancelledCredits
        );
        const handPaidCredits = validateMeter(
          meterData.totalHandPaidCancelledCredits
        );
        const gamesPlayed = validateMeter(meterData.gamesPlayed);

        // Calculate voucher out (net cancelled credits)
        const voucherOut = validateMeter(
          totalCancelledCredits - handPaidCredits
        );

        return {
          machineId: machineId,
          metersIn: metersIn,
          metersOut: metersOut,
          jackpot: jackpot,
          billIn: billIn,
          voucherOut: voucherOut,
          attPaidCredits: handPaidCredits,
          gamesPlayed: gamesPlayed,
          location: locationName,
          locationId: machine.gamingLocation?.toString() || '',
          createdAt: meterData.lastReadAt || machine.lastActivity,
          machineDocumentId: machineDocumentId,
        };
      }
    );

    // Apply search filter if provided - search by machineId, location, serialNumber, and custom.name
    if (search) {
      const searchLower = search.toLowerCase();
      transformedData = transformedData.filter(
        (item: Record<string, unknown>) => {
          // Get the original machine data for additional search fields
          const machineData = machinesData.find(
            (m: Record<string, unknown>) =>
              (m._id as string).toString() ===
              (item as Record<string, unknown>).machineDocumentId
          );

          const serialNumber = machineData?.serialNumber || '';
          const customName =
            (machineData?.Custom as Record<string, unknown>)?.name || '';

          return (
            (item.machineId as string).toLowerCase().includes(searchLower) ||
            (item.location as string).toLowerCase().includes(searchLower) ||
            serialNumber.toLowerCase().includes(searchLower) ||
            (customName as string).toLowerCase().includes(searchLower)
          );
        }
      );
    }

    // Calculate pagination
    const totalCount = transformedData.length;
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    // Apply pagination
    const paginatedData = transformedData.slice(skip, skip + limit);

    const duration = Date.now() - startTime;
    console.warn(
      `Meters report completed successfully in ${duration}ms - ${totalCount} machines`
    );

    // Apply currency conversion if needed (proper multi-currency pattern)
    // Currency conversion ONLY for Admin/Developer viewing "All Licensees"
    let convertedData = paginatedData;

    if (isAdminOrDev && shouldApplyCurrencyConversion(licencee)) {
      console.warn(
        '🔍 REPORTS METERS - Applying multi-currency conversion for All Licensee mode'
      );

      // Fetch licensee mappings
      const allLicensees = await db
        .collection('licencees')
        .find({}, { projection: { _id: 1, name: 1, country: 1 } })
        .toArray();

      const licenseeMap = new Map();
      allLicensees.forEach((lic: Record<string, unknown>) => {
        licenseeMap.set(lic.name, lic.country);
      });

      // Fetch country names from country IDs
      const countryIds = locationsData
        .map((loc: Record<string, unknown>) => loc.country)
        .filter((id): id is string => !!id);

      const countries = await db
        .collection('countries')
        .find({ _id: { $in: countryIds as never[] } } as never, {
          projection: { _id: 1, name: 1 },
        })
        .toArray();

      const countryNameMap = new Map();
      countries.forEach((country: Record<string, unknown>) => {
        countryNameMap.set(String(country._id), country.name as string);
      });

      // Get location details for currency determination
      const locationDetailsMap = new Map();
      locationsData.forEach((loc: Record<string, unknown>) => {
        const countryId = loc.country as string;
        const countryName = countryId ? countryNameMap.get(countryId) : null;
        
        locationDetailsMap.set(String(loc._id), {
          licensee: (loc.rel as Record<string, unknown>)?.licencee || null,
          country: countryName || null,
        });
      });

      // Convert each machine's financial data
      convertedData = paginatedData.map(item => {
        const itemAsRecord = item as unknown as Record<string, unknown>;
        const locationId = String(itemAsRecord.locationId || '');
        const locationDetails = locationDetailsMap.get(locationId);

        // Determine native currency for this machine
        let nativeCurrency: CurrencyCode = 'USD';
        if (locationDetails) {
          if (locationDetails.licensee) {
            const licenseeCountry = licenseeMap.get(locationDetails.licensee);
            if (licenseeCountry) {
              nativeCurrency = getCountryCurrency(licenseeCountry as string);
            }
          } else if (locationDetails.country) {
            nativeCurrency = getCountryCurrency(locationDetails.country as string);
          }
        }

        // Debug logging for first machine
        if (itemAsRecord.machineId === 'TEST') {
          console.warn('🔍 METERS CURRENCY DEBUG:', {
            machineId: itemAsRecord.machineId,
            locationId,
            nativeCurrency,
            displayCurrency,
            willConvert: nativeCurrency !== displayCurrency,
            originalBillIn: itemAsRecord.billIn,
          });
        }

        const convertedItem = { ...item };
        const convertedAsRecord = convertedItem as unknown as Record<
          string,
          unknown
        >;

        // Only convert if native currency differs from display currency
        if (nativeCurrency !== displayCurrency) {
          // Convert financial fields: native → USD → displayCurrency
          const financialFields = [
            'billIn',
            'metersIn',
            'metersOut',
            'jackpot',
            'voucherOut',
            'attPaidCredits',
          ];

          financialFields.forEach(field => {
            if (typeof itemAsRecord[field] === 'number') {
              // Step 1: Convert from native currency to USD
              const usdValue = convertToUSD(
                itemAsRecord[field] as number,
                nativeCurrency
              );
              // Step 2: Convert from USD to display currency
              convertedAsRecord[field] = convertFromUSD(usdValue, displayCurrency);
            }
          });
        }

        return convertedItem;
      });
    }

    return NextResponse.json({
      data: convertedData,
      totalCount,
      totalPages,
      currentPage: page,
      limit,
      locations: locationList,
      dateRange: { start: queryStartDate, end: queryEndDate },
      timePeriod,
      currency: displayCurrency,
      converted: isAdminOrDev && shouldApplyCurrencyConversion(licencee),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(
      ` Meters report failed after ${duration}ms:`,
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server Error' },
      { status: 500 }
    );
  }
}
