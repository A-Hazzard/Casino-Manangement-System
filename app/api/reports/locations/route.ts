import { connectDB } from '@/app/api/lib/middleware/db';
import { TimePeriod } from '@/app/api/lib/types';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import { getGamingDayRangesForLocations } from '@/lib/utils/gamingDayRange';
import type { CurrencyCode } from '@/shared/types/currency';
import { NextRequest, NextResponse } from 'next/server';

// Force recompilation to pick up rates.ts changes
// Removed auto-index creation to avoid conflicts and extra latency

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const timePeriod = (searchParams.get('timePeriod') as TimePeriod) || '7d';
    const licencee = searchParams.get('licencee') || undefined;
    const displayCurrency =
      (searchParams.get('currency') as CurrencyCode) || 'USD';
    const searchTerm = searchParams.get('search')?.trim() || '';

    const showAllLocations = searchParams.get('showAllLocations') === 'true';

    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const requestedLimit = parseInt(searchParams.get('limit') || '10');

    // When showAllLocations is true, return all locations for client-side pagination
    // Otherwise, use server-side pagination with limit
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

    // Debug logging removed to reduce spam

    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { error: 'DB connection failed' },
        { status: 500 }
      );
    }

    // Ensure indexes are created for optimal performance
    // Do not auto-create indexes on every request

    // Build location filter
    const locationMatchStage: Record<string, unknown> = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    };

    if (licencee && licencee !== 'all') {
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

    // Fetch all locations with their gameDayOffset, rel, and country for currency conversion
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

    // Calculate gaming day ranges for all locations
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

    // Gaming day ranges calculated for all locations
    console.log(`🔍 [LOCATIONS API] Processing ${locations.length} locations for time period: ${timePeriod}`);

    // Process each location individually with its gaming day range
    const locationResults = [];

    for (const location of locations) {
      const locationId = location._id.toString();
      const gamingDayRange = gamingDayRanges.get(locationId);

      if (!gamingDayRange) {
        console.warn(`⚠️ [LOCATIONS API] No gaming day range for location ${locationId}`);
        continue;
      }

      console.log(`🔍 [LOCATIONS API] Location: ${location.name} (${locationId})`);
      console.log(`   Gaming Day Offset: ${location.gameDayOffset ?? 8}`);
      console.log(`   Range Start: ${gamingDayRange.rangeStart.toISOString()}`);
      console.log(`   Range End: ${gamingDayRange.rangeEnd.toISOString()}`);

      // Get machines for this location
      const machines = await db
        .collection('machines')
        .find({
          gamingLocation: locationId,
          $or: [
            { deletedAt: null },
            { deletedAt: { $lt: new Date('2020-01-01') } },
          ],
        })
        .toArray();

      console.log(`   Machines found: ${machines.length}`);

      // Get machine IDs for this location
      const machineIds = machines.map(m => m._id.toString());
      console.log(`   Machine IDs:`, machineIds);

      // Calculate financial metrics for this location using MACHINE IDs (not location ID)
      // This matches how the individual location API works
      const metrics = await db
        .collection('meters')
        .aggregate([
          {
            $match: {
              machine: { $in: machineIds }, // Query by machine IDs, not location ID!
              readAt: {
                $gte: gamingDayRange.rangeStart,
                $lte: gamingDayRange.rangeEnd,
              },
            },
          },
          {
            $group: {
              _id: null,
              moneyIn: { $sum: '$movement.drop' },
              moneyOut: { $sum: '$movement.totalCancelledCredits' },
              meterCount: { $sum: 1 },
            },
          },
        ])
        .toArray();

      console.log(`   Meters query result:`, JSON.stringify(metrics, null, 2));

      const locationMetrics = metrics[0] || { moneyIn: 0, moneyOut: 0, meterCount: 0 };
      const gross = locationMetrics.moneyIn - locationMetrics.moneyOut;
      
      console.log(`   Final metrics - moneyIn: ${locationMetrics.moneyIn}, moneyOut: ${locationMetrics.moneyOut}, gross: ${gross}, meters: ${locationMetrics.meterCount}`);

      // Calculate machine status metrics
      const totalMachines = machines.length;
      const onlineMachines = machines.filter(m => {
        if (!m.lastActivity) return false;
        const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
        return m.lastActivity > threeMinutesAgo;
      }).length;

      const sasMachines = machines.filter(m => m.isSasMachine === true).length;
      const nonSasMachines = totalMachines - sasMachines;

      // Apply showAllLocations filter
      // If showAllLocations is false, skip locations with no data
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
        rel: location.rel, // Include rel for licensee information
        country: location.country, // Include country for currency mapping
        machines: machines.map(m => ({
          _id: m._id.toString(),
          assetNumber: m.assetNumber,
          serialNumber: m.serialNumber,
          isSasMachine: m.isSasMachine,
          lastActivity: m.lastActivity,
        })),
      });
    }

    // Sort by gross revenue (highest first)
    locationResults.sort((a, b) => b.gross - a.gross);

    // Apply pagination to the filtered and sorted results
    const totalCount = locationResults.length;
    const paginatedResults = locationResults.slice(skip, skip + limit);

    // Processed all locations with pagination

    const result = [
      {
        metadata: [{ totalCount }],
        data: paginatedResults,
      },
    ];

    // Extract results
    const paginatedData = result[0]?.data || [];
    const totalPages = Math.ceil(totalCount / limit);

    // Data processed successfully

    // Data ready for response

    // Request completed

    // Apply currency conversion using the proper helper
    // Data comes in native currency (TTD for TTG, GYD for Cabana, etc.)
    // Need to convert to display currency
    let convertedData = paginatedData;

    console.log(`🔍 [LOCATIONS API] shouldApplyCurrencyConversion: ${shouldApplyCurrencyConversion(licencee)}`);
    console.log(`🔍 [LOCATIONS API] displayCurrency: ${displayCurrency}`);
    console.log(`🔍 [LOCATIONS API] licencee param: ${licencee}`);
    console.log(`🔍 [LOCATIONS API] paginatedData before conversion:`, JSON.stringify(paginatedData, null, 2));

    if (shouldApplyCurrencyConversion(licencee)) {
      try {
        console.log(`💱 Starting currency conversion...`);
        
        // Import conversion helpers
        const { convertCurrency, getLicenseeCurrency } = await import('@/lib/helpers/rates');
        
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
          console.log(`\n💱 Currency conversion for location: ${location.locationName}`);
          console.log(`   Before conversion - moneyIn: ${location.moneyIn}, moneyOut: ${location.moneyOut}, gross: ${location.gross}`);
          
          const locationLicenseeId = location.rel?.licencee as string | undefined;
          
          if (!locationLicenseeId) {
            console.log(`   No licensee - skipping conversion (treating as USD)`);
            return location;
          }

          const licenseeName = licenseeIdToName.get(locationLicenseeId.toString()) || '';
          console.log(`   Licensee ID: ${locationLicenseeId}`);
          console.log(`   Licensee name: ${licenseeName}`);
          
          if (!licenseeName || licenseeName === 'Unknown') {
            console.log(`   Unknown licensee - skipping conversion`);
            return location;
          }

          // Get the source currency for this licensee
          const sourceCurrency = getLicenseeCurrency(licenseeName);
          console.log(`   Source currency (${licenseeName}): ${sourceCurrency}`);
          console.log(`   Target currency: ${displayCurrency}`);

          // If source and target are the same, no conversion needed
          if (sourceCurrency === displayCurrency) {
            console.log(`   No conversion needed (same currency)`);
            return location;
          }

          // Convert financial fields
          const convertedLocation = { ...location };

          if (typeof location.moneyIn === 'number') {
            const converted = convertCurrency(location.moneyIn, sourceCurrency, displayCurrency);
            console.log(`   moneyIn: ${location.moneyIn} ${sourceCurrency} -> ${converted} ${displayCurrency}`);
            convertedLocation.moneyIn = converted;
          }
          
          if (typeof location.moneyOut === 'number') {
            const converted = convertCurrency(location.moneyOut, sourceCurrency, displayCurrency);
            console.log(`   moneyOut: ${location.moneyOut} ${sourceCurrency} -> ${converted} ${displayCurrency}`);
            convertedLocation.moneyOut = converted;
          }
          
          if (typeof location.gross === 'number') {
            const converted = convertCurrency(location.gross, sourceCurrency, displayCurrency);
            console.log(`   gross: ${location.gross} ${sourceCurrency} -> ${converted} ${displayCurrency}`);
            convertedLocation.gross = converted;
          }

          console.log(`   After conversion - moneyIn: ${convertedLocation.moneyIn}, moneyOut: ${convertedLocation.moneyOut}, gross: ${convertedLocation.gross}`);
          return convertedLocation;
        });
        
        console.log(`💱 Currency conversion completed. Converted ${convertedData.length} locations`);
      } catch (conversionError) {
        console.error(`❌ [LOCATIONS API] Currency conversion failed:`, conversionError);
        // If conversion fails, use original data
        convertedData = paginatedData;
      }
    } else {
      console.log(`💱 Skipping currency conversion (specific licensee selected)`);
    }

    console.log(`🔍 [LOCATIONS API] convertedData after conversion:`, JSON.stringify(convertedData, null, 2));

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
    };
    console.log(`🔍 [LOCATIONS API] Response:`, JSON.stringify(response, null, 2));
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
