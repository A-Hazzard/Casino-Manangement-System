import { connectDB } from '@/app/api/lib/middleware/db';
import { TimePeriod } from '@/app/api/lib/types';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
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
    const licencee = searchParams.get('licensee') || searchParams.get('licencee') || undefined;
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
    const userLicensees = (userPayload?.rel as { licencee?: string[] })?.licencee || [];
    const userLocationPermissions = 
      (userPayload?.resourcePermissions as { 'gaming-locations'?: { resources?: string[] } })?.['gaming-locations']?.resources || [];
    
    // Check if user is admin or manager
    const isAdmin = userRoles.includes('admin') || userRoles.includes('developer');
    const isManager = userRoles.includes('manager');

    // Build location filter
    const locationMatchStage: Record<string, unknown> = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    };

    // Apply user-based filtering
    if (isAdmin && userLocationPermissions.length === 0) {
      // Admin with no location restrictions - optionally filter by licencee param
    if (licencee && licencee !== 'all') {
      locationMatchStage['rel.licencee'] = licencee;
      }
    } else if (isAdmin && userLocationPermissions.length > 0) {
      // Admin with location restrictions
      locationMatchStage['_id'] = { $in: userLocationPermissions };
    } else if (isManager) {
      // Manager - get ALL locations for their assigned licensees
      if (userLicensees.length === 0) {
        return NextResponse.json({
          data: [],
          pagination: { page, limit, totalCount: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false },
          currency: displayCurrency,
          converted: false,
        });
      }
      
      // Filter by user's licensees
      let managerLicenseesFilter = userLicensees;
      
      // If a specific licensee is selected via query param, further restrict to that licensee
      if (licencee && licencee !== 'all') {
        // Only show the selected licensee if user has access to it
        if (userLicensees.includes(licencee)) {
          managerLicenseesFilter = [licencee];
        } else {
          // User doesn't have access to the requested licensee
          return NextResponse.json({
            data: [],
            pagination: { page, limit, totalCount: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false },
            currency: displayCurrency,
            converted: false,
          });
        }
      }
      
      locationMatchStage['rel.licencee'] = { $in: managerLicenseesFilter };
    } else {
      // Collector/Technician - use ONLY their assigned location permissions
      if (userLocationPermissions.length === 0) {
        return NextResponse.json({
          data: [],
          pagination: { page, limit, totalCount: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false },
          currency: displayCurrency,
          converted: false,
        });
      }
      
      // Start with location permissions
      locationMatchStage['_id'] = { $in: userLocationPermissions };
      
      // If a specific licensee is selected, also filter by that licensee
      if (licencee && licencee !== 'all') {
        // User can only see their assigned locations that also belong to the selected licensee
        if (userLicensees.length > 0 && !userLicensees.includes(licencee)) {
          // User doesn't have access to the requested licensee
          return NextResponse.json({
            data: [],
            pagination: { page, limit, totalCount: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false },
            currency: displayCurrency,
            converted: false,
          });
        }
        locationMatchStage['rel.licencee'] = licencee;
      } else if (userLicensees.length > 0) {
        // Filter by user's assigned licensees
        locationMatchStage['rel.licencee'] = { $in: userLicensees };
      }
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
    
    // Process locations in parallel batches for better performance
    const BATCH_SIZE = 20; // Process 20 locations at a time
    
    for (let i = 0; i < locations.length; i += BATCH_SIZE) {
      const batch = locations.slice(i, i + BATCH_SIZE);
      
      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(async (location) => {
      const locationId = location._id.toString();
      const gamingDayRange = gamingDayRanges.get(locationId);

      if (!gamingDayRange) {
        console.warn(`⚠️ [LOCATIONS API] No gaming day range for location ${locationId}`);
        return null;
      }

      try {
        // 🚀 OPTIMIZATION: Fetch machines and meters in parallel
        const [machines, metrics] = await Promise.all([
          // Query 1: Get machines for this location
          db.collection('machines').find({
            gamingLocation: locationId,
            $or: [
              { deletedAt: null },
              { deletedAt: { $lt: new Date('2020-01-01') } },
            ],
          }).toArray(),
          
          // Query 2: Get meter aggregations (run in parallel with machines query)
          (async () => {
            // First get machine IDs efficiently
            const machineIds = await db.collection('machines')
              .find(
                { gamingLocation: locationId },
                { projection: { _id: 1 } }
              )
              .toArray()
              .then(docs => docs.map(d => d._id.toString()));
            
            if (machineIds.length === 0) {
              return [{ moneyIn: 0, moneyOut: 0, meterCount: 0 }];
            }
            
            // Then aggregate meters for those machines
            return db.collection('meters').aggregate([
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
                $group: {
                  _id: null,
                  moneyIn: { $sum: '$movement.drop' },
                  moneyOut: { $sum: '$movement.totalCancelledCredits' },
                  meterCount: { $sum: 1 },
                },
              },
            ]).toArray();
          })(),
        ]);

        const locationMetrics = metrics[0] || { moneyIn: 0, moneyOut: 0, meterCount: 0 };
        const gross = locationMetrics.moneyIn - locationMetrics.moneyOut;

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
        console.error(`❌ Error processing location ${locationId}:`, error);
        return null;
      }
        })
      );
      
      // Filter out null results and add to main results
      const validResults = batchResults.filter(r => r !== null);
      locationResults.push(...validResults);
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
    const isAdminOrDev = userRoles.includes('admin') || userRoles.includes('developer');

    if (isAdminOrDev && shouldApplyCurrencyConversion(licencee)) {
      try {
        
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
          const locationLicenseeId = location.rel?.licencee as string | undefined;
          
          if (!locationLicenseeId) {
            return location;
          }

          const licenseeName = licenseeIdToName.get(locationLicenseeId.toString()) || '';
          
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
            convertedLocation.moneyIn = convertCurrency(location.moneyIn, sourceCurrency, displayCurrency);
          }
          
          if (typeof location.moneyOut === 'number') {
            convertedLocation.moneyOut = convertCurrency(location.moneyOut, sourceCurrency, displayCurrency);
          }
          
          if (typeof location.gross === 'number') {
            convertedLocation.gross = convertCurrency(location.gross, sourceCurrency, displayCurrency);
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
    console.log('⚡ /api/reports/locations - ' + 
      `${totalTime}ms | ` +
      `${locations.length} locations | ` +
      `${(perfTimers.processing / locations.length).toFixed(1)}ms/loc | ` +
      `${(locations.length / (totalTime / 1000)).toFixed(0)}/sec | ` +
      `Processing: ${((perfTimers.processing / totalTime) * 100).toFixed(0)}% | ` +
      `Currency: ${((perfTimers.currencyConversion / totalTime) * 100).toFixed(0)}%`);

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
        avgTimePerLocation: parseFloat((perfTimers.processing / locations.length).toFixed(2)),
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
