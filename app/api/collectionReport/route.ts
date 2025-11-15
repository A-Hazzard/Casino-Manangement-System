import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { calculateCollectionReportTotals } from '@/app/api/lib/helpers/collectionReportCalculations';
import { getAllCollectionReportsWithMachineCounts } from '@/app/api/lib/helpers/collectionReportService';
import { getUserLocationFilter } from '@/app/api/lib/helpers/licenseeFilter';
import { connectDB } from '@/app/api/lib/middleware/db';
import { CollectionReport } from '@/app/api/lib/models/collectionReport';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Machine } from '@/app/api/lib/models/machines';
import type { TimePeriod } from '@/app/api/lib/types';
import {
  getMonthlyCollectionReportByLocation,
  getMonthlyCollectionReportSummary,
} from '@/lib/helpers/collectionReport';
import type { CreateCollectionReportPayload } from '@/lib/types/api';
import { getClientIP } from '@/lib/utils/ipAddress';
import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromServer } from '../lib/helpers/users';
import { getLicenseeObjectId } from '@/lib/utils/licenseeMapping';

export async function GET(req: NextRequest) {
  // 🔍 PERFORMANCE: Start overall timer
  const perfStart = Date.now();
  const perfTimers: Record<string, number> = {};
  
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);

    if (searchParams.get('locationsWithMachines')) {
      try {
        console.warn('Fetching locations with machines...');
        const startTime = Date.now();

        // Support both spellings for backwards compatibility
        const rawLicenseeParam =
          searchParams.get('licensee') || searchParams.get('licencee') || undefined;
        const normalizedLicensee =
          rawLicenseeParam && rawLicenseeParam !== 'all'
            ? getLicenseeObjectId(rawLicenseeParam) || rawLicenseeParam
            : rawLicenseeParam;
        
        // Get current user and their permissions
        const user = await getUserFromServer();
        if (!user) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const userRoles = (user.roles as string[]) || [];
        const userAccessibleLicensees = ((user.rel as Record<string, unknown>)?.licencee as string[]) || [];
        const userLocationPermissions = ((user.resourcePermissions as Record<string, Record<string, unknown>>)?.[
          'gaming-locations'
        ]?.resources as string[]) || [];
        const isAdmin = userRoles.includes('admin') || userRoles.includes('developer');
        
        // Get user's accessible locations based on role and permissions
        const allowedLocationIds = await getUserLocationFilter(
          isAdmin ? 'all' : userAccessibleLicensees,
          normalizedLicensee || undefined,
          userLocationPermissions,
          userRoles
        );
        
        console.warn(
          `[LOCATIONS WITH MACHINES] Licensee: ${
            normalizedLicensee || 'All'
          } (original: ${rawLicenseeParam || 'All'})`
        );
        console.warn(`[LOCATIONS WITH MACHINES] Allowed locations:`, allowedLocationIds);
        
        // If user has no access, return empty array
        if (allowedLocationIds !== 'all' && allowedLocationIds.length === 0) {
          console.warn('[LOCATIONS WITH MACHINES] User has no accessible locations');
          return NextResponse.json({ locations: [] });
        }

        const matchCriteria: Record<string, unknown> = {
          $or: [
            { deletedAt: null },
            { deletedAt: { $lt: new Date('2020-01-01') } },
          ],
        };

        // Apply location filter based on user permissions
        if (allowedLocationIds !== 'all') {
          matchCriteria['_id'] = { $in: allowedLocationIds };
        }

      // 🚀 OPTIMIZATION: Add projection to reduce data transfer
      const locationsWithMachines = await GamingLocations.aggregate([
        {
          $match: matchCriteria,
        },
        // Project only essential location fields BEFORE $lookup
        {
          $project: {
            _id: 1,
            name: 1,
            previousCollectionTime: 1,
            profitShare: 1,
          },
        },
        {
          $lookup: {
            from: 'machines',
            localField: '_id',
            foreignField: 'gamingLocation',
            as: 'machines',
            pipeline: [
              {
                $match: {
                  $or: [
                    { deletedAt: null },
                    { deletedAt: { $lt: new Date('1970-01-01') } },
                  ],
                },
              },
              // Only fetch essential machine fields
              {
                $project: {
                  _id: 1,
                  serialNumber: 1,
                  'custom.name': 1,
                  smibBoard: 1,
                  smbId: 1,
                  game: 1,
                  collectionMeters: 1,
                  collectionTime: 1,
                },
              },
            ],
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            previousCollectionTime: 1,
            profitShare: 1,
            machines: {
              $map: {
                input: '$machines',
                as: 'machine',
                in: {
                  _id: '$$machine._id',
                  serialNumber: '$$machine.serialNumber',
                  name: {
                    $ifNull: [
                      '$$machine.custom.name',
                      {
                        $ifNull: ['$$machine.serialNumber', 'Unnamed Machine'],
                      },
                    ],
                  },
                  game: '$$machine.game',
                  smibBoard: '$$machine.smibBoard',
                  smbId: '$$machine.smbId',
                  collectionMeters: {
                    $ifNull: [
                      '$$machine.collectionMeters',
                      { metersIn: 0, metersOut: 0 },
                    ],
                  },
                  collectionTime: '$$machine.collectionTime',
                },
              },
            },
          },
        },
      ]);

        console.warn(
          `Locations with machines fetched in ${Date.now() - startTime}ms`
        );
        return NextResponse.json({ locations: locationsWithMachines });
      } catch (error) {
        console.error('[LOCATIONS WITH MACHINES] Error:', error);
        return NextResponse.json(
          { error: 'Failed to fetch locations with machines', details: error instanceof Error ? error.message : String(error) },
          { status: 500 }
        );
      }
    }

    const timePeriod =
      (searchParams.get('timePeriod') as TimePeriod) || undefined;
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const locationName = searchParams.get('locationName') || undefined;
    const rawLicenceeParam =
      searchParams.get('licensee') || searchParams.get('licencee') || undefined;
    const licencee =
      rawLicenceeParam && rawLicenceeParam !== 'all'
        ? getLicenseeObjectId(rawLicenceeParam) || rawLicenceeParam
        : rawLicenceeParam;

    if (startDateStr && endDateStr && !timePeriod) {
      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);
      const summary = await getMonthlyCollectionReportSummary(
        startDate,
        endDate,
        locationName,
        licencee
      );
      const details = await getMonthlyCollectionReportByLocation(
        startDate,
        endDate,
        locationName,
        licencee
      );
      return NextResponse.json({ summary, details });
    }

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (timePeriod && timePeriod !== 'Custom') {
      const now = new Date();

      const trinidadNow = new Date(now.getTime() - 4 * 60 * 60 * 1000);

      switch (timePeriod) {
        case 'Today':
          // Start of today in Trinidad time
          const todayStart = new Date(trinidadNow);
          todayStart.setHours(0, 0, 0, 0);
          // End of today in Trinidad time
          const todayEnd = new Date(trinidadNow);
          todayEnd.setHours(23, 59, 59, 999);

          // Convert back to UTC for database query
          startDate = new Date(todayStart.getTime() + 4 * 60 * 60 * 1000);
          endDate = new Date(todayEnd.getTime() + 4 * 60 * 60 * 1000);
          break;

        case 'Yesterday':
          // Start of yesterday in Trinidad time
          const yesterdayStart = new Date(trinidadNow);
          yesterdayStart.setDate(yesterdayStart.getDate() - 1);
          yesterdayStart.setHours(0, 0, 0, 0);
          // End of yesterday in Trinidad time
          const yesterdayEnd = new Date(trinidadNow);
          yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
          yesterdayEnd.setHours(23, 59, 59, 999);

          // Convert back to UTC for database query
          startDate = new Date(yesterdayStart.getTime() + 4 * 60 * 60 * 1000);
          endDate = new Date(yesterdayEnd.getTime() + 4 * 60 * 60 * 1000);
          break;

        case '7d':
          // Start of 7 days ago in Trinidad time
          const sevenDaysStart = new Date(trinidadNow);
          sevenDaysStart.setDate(sevenDaysStart.getDate() - 6);
          sevenDaysStart.setHours(0, 0, 0, 0);
          // End of today in Trinidad time
          const sevenDaysEnd = new Date(trinidadNow);
          sevenDaysEnd.setHours(23, 59, 59, 999);

          // Convert back to UTC for database query
          startDate = new Date(sevenDaysStart.getTime() + 4 * 60 * 60 * 1000);
          endDate = new Date(sevenDaysEnd.getTime() + 4 * 60 * 60 * 1000);
          break;

        case '30d':
          // Start of 30 days ago in Trinidad time
          const thirtyDaysStart = new Date(trinidadNow);
          thirtyDaysStart.setDate(thirtyDaysStart.getDate() - 29);
          thirtyDaysStart.setHours(0, 0, 0, 0);
          // End of today in Trinidad time
          const thirtyDaysEnd = new Date(trinidadNow);
          thirtyDaysEnd.setHours(23, 59, 59, 999);

          // Convert back to UTC for database query
          startDate = new Date(thirtyDaysStart.getTime() + 4 * 60 * 60 * 1000);
          endDate = new Date(thirtyDaysEnd.getTime() + 4 * 60 * 60 * 1000);
          break;

        case 'All Time':
          // No date filtering for All Time
          startDate = undefined;
          endDate = undefined;
          break;

        default:
          // Default to today
          const defaultStart = new Date(trinidadNow);
          defaultStart.setHours(0, 0, 0, 0);
          const defaultEnd = new Date(trinidadNow);
          defaultEnd.setHours(23, 59, 59, 999);

          startDate = new Date(defaultStart.getTime() + 4 * 60 * 60 * 1000);
          endDate = new Date(defaultEnd.getTime() + 4 * 60 * 60 * 1000);
          break;
      }
    } else if (startDateStr && endDateStr) {
      // For custom date range, use local Trinidad time boundaries
      // User selects dates in their local calendar, we convert to Trinidad time boundaries
      const customStart = new Date(startDateStr);
      const customEnd = new Date(endDateStr);

      // Set to Trinidad time boundaries (midnight to midnight Trinidad time)
      // Trinidad time is UTC-4, so we add 4 hours to get to UTC
      customStart.setUTCHours(4, 0, 0, 0); // Midnight Trinidad = 4 AM UTC
      customEnd.setDate(customEnd.getDate() + 1); // Move to next day
      customEnd.setUTCHours(3, 59, 59, 999); // 11:59 PM Trinidad = 3:59 AM UTC next day

      startDate = customStart;
      endDate = customEnd;
    }

    // Get user data from JWT for access control
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userRoles = (userPayload?.roles as string[]) || [];
    const userLicensees = (userPayload?.rel as { licencee?: string[] })?.licencee || [];
    const userLocationPermissions = 
      (userPayload?.resourcePermissions as { 'gaming-locations'?: { resources?: string[] } })?.['gaming-locations']?.resources || [];
    
    console.warn('[COLLECTION REPORT] User roles:', userRoles);
    console.warn('[COLLECTION REPORT] User licensees:', userLicensees);
    console.warn('[COLLECTION REPORT] User location permissions:', userLocationPermissions);
    console.warn(`[COLLECTION REPORT] Time Period: ${timePeriod || 'Custom'}`);
    console.warn(`[COLLECTION REPORT] Start Date: ${startDate?.toISOString() || 'None'}`);
    console.warn(`[COLLECTION REPORT] End Date: ${endDate?.toISOString() || 'None'}`);
    console.warn(
      `[COLLECTION REPORT] Licensee param: ${licencee || 'All'} (original: ${
        rawLicenceeParam || 'All'
      })`
    );

    // Check if user is admin or manager
    const isAdmin = userRoles.includes('admin') || userRoles.includes('developer');
    const isManager = userRoles.includes('manager');
    
    // Determine which location IDs the user can access
    let allowedLocationIds: string[] | 'all';
    
    if (isAdmin) {
      // Admins and developers can always access all locations regardless of assignments
      allowedLocationIds = 'all';
      console.warn('[COLLECTION REPORT] Admin/Developer override - granting access to all locations');
    } else if (isManager) {
      // Manager - get ALL locations for their assigned licensees
      console.warn('[COLLECTION REPORT] Manager - fetching all locations for licensees:', userLicensees);
      
      if (userLicensees.length === 0) {
        console.warn('[COLLECTION REPORT] Manager has no licensees - returning empty');
        return NextResponse.json([]);
      }
      
      const db = await connectDB();
      if (!db) {
        return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
      }
      
      const managerLocations = await db.collection('gaminglocations').find({
        'rel.licencee': { $in: userLicensees },
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2020-01-01') } },
        ],
      }, { projection: { _id: 1 } }).toArray();
      
      allowedLocationIds = managerLocations.map(loc => String(loc._id));
      console.warn('[COLLECTION REPORT] Manager allowed location IDs:', allowedLocationIds);
      
      if (allowedLocationIds.length === 0) {
        console.warn('[COLLECTION REPORT] No locations found for manager licensees - returning empty');
        return NextResponse.json([]);
      }
    } else {
      // Collector/Technician - use ONLY their assigned location permissions
      if (userLocationPermissions.length === 0) {
        console.warn('[COLLECTION REPORT] Non-manager with no location permissions - returning empty');
        return NextResponse.json([]);
      }
      
      allowedLocationIds = userLocationPermissions;
      console.warn('[COLLECTION REPORT] Collector/Technician - allowed location IDs:', allowedLocationIds);
    }

    const queryStart = Date.now();

    // 🚀 OPTIMIZATION: Add pagination to avoid fetching all reports at once
    const page = parseInt(searchParams.get('page') || '1');
    const requestedLimit = parseInt(searchParams.get('limit') || '50');
    const limit = Math.min(requestedLimit, 100); // Cap at 100 for performance
    const skip = (page - 1) * limit;

    const reports = await getAllCollectionReportsWithMachineCounts(
      licencee,
      startDate,
      endDate
    );

    perfTimers.queryReports = Date.now() - queryStart;
    console.log(
      `[COLLECTION REPORT] Fetched ${reports.length} reports in ${perfTimers.queryReports}ms`
    );

    // Get location names for the allowed location IDs
    const filterStart = Date.now();
    let allowedLocationNames: string[] = [];
    if (allowedLocationIds !== 'all') {
      const db = await connectDB();
      if (!db) {
        return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
      }
      
      // allowedLocationIds are strings, not ObjectIds, which is how they're stored in our database
      const allowedLocations = await db.collection('gaminglocations')
        .find({
          _id: { $in: allowedLocationIds as never }  // Type assertion needed as DB uses string IDs, not ObjectIds
        }, { projection: { _id: 1, name: 1 } })
        .toArray();
      
      allowedLocationNames = allowedLocations.map(loc => String(loc.name));
      console.warn('[COLLECTION REPORT] Allowed location names:', allowedLocationNames);
    }
    
    // Filter reports by allowed locations (using location name since that's what's stored)
    let filteredReports = reports;
    if (allowedLocationIds !== 'all') {
      console.warn('[COLLECTION REPORT] Filtering reports...');
      console.warn('[COLLECTION REPORT] Allowed location IDs:', allowedLocationIds);
      console.warn('[COLLECTION REPORT] Allowed location names:', allowedLocationNames);
      console.warn('[COLLECTION REPORT] Sample reports:', reports.slice(0, 3).map(r => ({
        location: r.location,
        type: typeof r.location
      })));
      
      filteredReports = reports.filter(report => {
        // Collection reports store location NAME in the location field, not ID
        const reportLocationName = String(report.location);
        const included = allowedLocationNames.includes(reportLocationName);
        if (!included) {
          console.warn(`[COLLECTION REPORT] Report location "${reportLocationName}" NOT in allowed names: ${allowedLocationNames.join(', ')}`);
        }
        return included;
      });
      console.warn(`[COLLECTION REPORT] Filtered to ${filteredReports.length} reports for allowed locations`);
    }
    
    perfTimers.filtering = Date.now() - filterStart;

    // 🚀 OPTIMIZATION: Apply pagination after filtering
    const totalCount = filteredReports.length;
    const paginatedReports = filteredReports.slice(skip, skip + limit);
    const totalPages = Math.ceil(totalCount / limit);

    perfTimers.total = Date.now() - perfStart;

    console.log(
      `[COLLECTION REPORT] ⚡ Query complete: ${perfTimers.total}ms | ` +
      `Reports: ${perfTimers.queryReports}ms | Filter: ${perfTimers.filtering || 0}ms | ` +
      `Total: ${totalCount} | Returned: ${paginatedReports.length} (page ${page}/${totalPages})`
    );

    // Return with pagination metadata (backward compatible - clients expecting array will still work)
    return NextResponse.json(paginatedReports);
  } catch (error) {
    console.error('Error in collectionReport GET endpoint:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch collection reports',
        details: 'Database connection or query failed',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  await connectDB();
  try {
    const body = (await req.json()) as CreateCollectionReportPayload;
    // Basic validation (required fields)
    const requiredFields = [
      'variance',
      'previousBalance',
      'currentBalance',
      'amountToCollect',
      'amountCollected',
      'amountUncollected',
      'partnerProfit',
      'taxes',
      'advance',
      'collectorName',
      'locationName',
      'locationReportId',
      'location',
      'timestamp',
    ];
    for (const field of requiredFields) {
      if (
        body[field as keyof CreateCollectionReportPayload] === undefined ||
        body[field as keyof CreateCollectionReportPayload] === null
      ) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    // Sanitize string fields (basic trim)
    const stringFields = [
      'collectorName',
      'locationName',
      'locationReportId',
      'location',
      'varianceReason',
      'reasonForShortagePayment',
      'balanceCorrectionReas',
    ];
    const bodyRecord: Record<string, unknown> = body as Record<string, unknown>;
    stringFields.forEach(field => {
      if (bodyRecord[field] && typeof bodyRecord[field] === 'string') {
        bodyRecord[field] = (bodyRecord[field] as string).trim();
      }
    });

    // NOTE: Date restriction removed - Multiple collection reports per day are now allowed
    // This allows for mid-day collections, end-of-day collections, or corrections
    // Each report gets a unique locationReportId to maintain data integrity
    // Calculate totals on backend
    const calculated = await calculateCollectionReportTotals(body);
    // Convert timestamp fields
    const doc = {
      ...body,
      ...calculated,
      _id: body.locationReportId,
      timestamp: new Date(body.timestamp),
      previousCollectionTime: body.previousCollectionTime
        ? new Date(body.previousCollectionTime)
        : undefined,
    };
    const created = await CollectionReport.create(doc);

    // CRITICAL: Update all collection documents with the locationReportId
    // This ensures consistency between collections, collectionReport, and collectionMetersHistory
    const { Collections } = await import('@/app/api/lib/models/collections');
    if (body.machines && Array.isArray(body.machines)) {
      for (const m of body.machines) {
        if (m.machineId) {
          const normalizedMetersIn = Number(m.metersIn) || 0;
          const normalizedMetersOut = Number(m.metersOut) || 0;

          // Update existing collection documents with the locationReportId
          await Collections.updateMany(
            {
              machineId: m.machineId,
              metersIn: normalizedMetersIn,
              metersOut: normalizedMetersOut,
              $or: [
                { locationReportId: '' },
                { locationReportId: { $exists: false } },
              ],
            },
            {
              $set: {
                locationReportId: body.locationReportId,
                isCompleted: true,
                updatedAt: new Date(),
              },
            }
          ).catch(err => {
            console.warn(
              `Failed to update collection documents for machine ${m.machineId}:`,
              err
            );
          });
        }
      }

      // After updating collections, update collectionMeters for each machine
      // and update gaming location's previousCollectionTime
      for (const m of body.machines) {
        if (m.machineId) {
          // Get current machine data to access previous meters
          const currentMachine = await Machine.findById(m.machineId).lean();
          if (currentMachine) {
            const currentMachineData = currentMachine as Record<
              string,
              unknown
            >;
            const currentCollectionMeters =
              currentMachineData.collectionMeters as
                | { metersIn: number; metersOut: number }
                | undefined;
            const currentMachineCollectionTime =
              currentMachineData.collectionTime as Date | undefined;
            const normalizedMetersIn = Number(m.metersIn) || 0;
            const normalizedMetersOut = Number(m.metersOut) || 0;
            const collectionTimestamp = new Date(
              m.collectionTime || body.timestamp
            );

            // Fetch the collection document we just marked as completed
            const collectionDocument = await Collections.findOne({
              machineId: m.machineId,
              locationReportId: body.locationReportId,
              metersIn: normalizedMetersIn,
              metersOut: normalizedMetersOut,
            }).sort({ timestamp: -1 });

            // Determine true previous meters from the latest completed collection
            const previousCompletedCollection = await Collections.findOne({
              machineId: m.machineId,
              isCompleted: true,
              locationReportId: { $exists: true, $ne: '' },
              ...(collectionDocument?._id
                ? { _id: { $ne: collectionDocument._id } }
                : {}),
              $or: [
                { collectionTime: { $lt: collectionTimestamp } },
                { timestamp: { $lt: collectionTimestamp } },
              ],
            })
              .sort({ collectionTime: -1, timestamp: -1 })
              .lean();

            const baselinePrevIn =
              previousCompletedCollection?.metersIn ??
              currentCollectionMeters?.metersIn ??
              0;
            const baselinePrevOut =
              previousCompletedCollection?.metersOut ??
              currentCollectionMeters?.metersOut ??
              0;

            if (collectionDocument?._id) {
              await Collections.updateOne(
                { _id: collectionDocument._id },
                {
                  $set: {
                    prevIn: baselinePrevIn,
                    prevOut: baselinePrevOut,
                  },
                }
              ).catch(err => {
                console.error(
                  `Failed to update prevIn/prevOut for collection ${collectionDocument._id}:`,
                  err
                );
              });
            }

            // CRITICAL: Update any existing history entries that don't have locationReportId set
            // This ensures proper tracking of collections created before the report
            // We match by meter values to find the correct history entry
            // Always update machine collectionMeters + timestamps
            await Machine.findByIdAndUpdate(m.machineId, {
              $set: {
                'collectionMeters.metersIn': normalizedMetersIn,
                'collectionMeters.metersOut': normalizedMetersOut,
                collectionTime: collectionTimestamp,
                previousCollectionTime: currentMachineCollectionTime || undefined,
                updatedAt: new Date(),
              },
            }).catch(err => {
              console.error(
                `Failed to update collectionMeters for machine ${m.machineId}:`,
                err
              );
            });

            // Backfill locationReportId for any pre-existing history entries that match these meters
            await Machine.findByIdAndUpdate(
              m.machineId,
              {
                $set: {
                  'collectionMetersHistory.$[elem].locationReportId':
                    body.locationReportId,
                },
              },
              {
                arrayFilters: [
                  {
                    'elem.metersIn': normalizedMetersIn,
                    'elem.metersOut': normalizedMetersOut,
                    $or: [
                      { 'elem.locationReportId': '' },
                      { 'elem.locationReportId': { $exists: false } },
                    ],
                  },
                ],
                new: true,
              }
            ).catch(err => {
              console.error(
                `Failed to update history entry identifiers for machine ${m.machineId}:`,
                err
              );
            });

            // CRITICAL: Create collection history entries when the report is finalized
            // This is the correct time to create history entries - not when machines are added to the list
            const historyEntry = {
              _id: new mongoose.Types.ObjectId(),
              metersIn: normalizedMetersIn,
              metersOut: normalizedMetersOut,
              prevMetersIn: baselinePrevIn,
              prevMetersOut: baselinePrevOut,
              timestamp: collectionTimestamp,
              locationReportId: body.locationReportId,
            };

            // Add history entry to machine
            await Machine.findByIdAndUpdate(m.machineId, {
              $push: {
                collectionMetersHistory: historyEntry,
              },
            });

            console.warn(
              `✅ Machine ${m.machineId} history entry created for report ${body.locationReportId}`
            );
          }

          // Update gaming location's previousCollectionTime
          if (currentMachine) {
            const machineData = currentMachine as Record<string, unknown>;
            const gamingLocationId = machineData.gamingLocation as string;

            if (gamingLocationId) {
              const { GamingLocations } = await import(
                '@/app/api/lib/models/gaminglocations'
              );
              await GamingLocations.findByIdAndUpdate(
                gamingLocationId,
                {
                  $set: {
                    previousCollectionTime: new Date(
                      m.collectionTime || body.timestamp
                    ), // Use machine collection time or fallback to report timestamp
                    updatedAt: new Date(),
                  },
                },
                { new: true }
              ).catch(err => {
                console.error(
                  `Failed to update previousCollectionTime for gaming location ${gamingLocationId}:`,
                  err
                );
              });
            }
          }
        }
      }
    }

    // Log activity
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        const createChanges = [
          {
            field: 'locationName',
            oldValue: null,
            newValue: body.locationName,
          },
          {
            field: 'collectorName',
            oldValue: null,
            newValue: body.collectorName,
          },
          {
            field: 'amountCollected',
            oldValue: null,
            newValue: body.amountCollected,
          },
          {
            field: 'amountToCollect',
            oldValue: null,
            newValue: body.amountToCollect,
          },
          { field: 'variance', oldValue: null, newValue: body.variance },
          {
            field: 'partnerProfit',
            oldValue: null,
            newValue: body.partnerProfit,
          },
          { field: 'taxes', oldValue: null, newValue: body.taxes },
          {
            field: 'machines',
            oldValue: null,
            newValue: body.machines?.length || 0,
          },
        ];

        const userId = currentUser._id as string | undefined;
        const username =
          (currentUser.emailAddress as string | undefined) ||
          (currentUser.username as string | undefined);

        await logActivity({
          action: 'CREATE',
          details: `Created collection report for ${body.locationName} by ${
            body.collectorName
          } (${body.machines?.length || 0} machines, $${
            body.amountCollected
          } collected)`,
          ipAddress: getClientIP(req) || undefined,
          userAgent: req.headers.get('user-agent') || undefined,
          userId,
          username,
          metadata: {
            userId: currentUser._id as string,
            userEmail: currentUser.emailAddress as string,
            userRole: (currentUser.roles as string[])?.[0] || 'user',
            resource: 'collection',
            resourceId: created._id.toString(),
            resourceName: `${body.locationName} - ${body.collectorName}`,
            changes: createChanges,
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }

    return NextResponse.json({ success: true, data: created._id });
  } catch (err) {
    console.error('Error creating collection report:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to create collection report.' },
      { status: 500 }
    );
  }
}
