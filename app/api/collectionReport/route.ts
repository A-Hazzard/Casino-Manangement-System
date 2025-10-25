import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { Machine } from '@/app/api/lib/models/machines';
import {
  getMonthlyCollectionReportSummary,
  getMonthlyCollectionReportByLocation,
} from '@/lib/helpers/collectionReport';
import { getAllCollectionReportsWithMachineCounts } from '@/app/api/lib/helpers/collectionReportService';
import { connectDB } from '@/app/api/lib/middleware/db';
import { CollectionReport } from '@/app/api/lib/models/collectionReport';
import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserFromServer } from '../lib/helpers/users';
import { getClientIP } from '@/lib/utils/ipAddress';
import type { CreateCollectionReportPayload } from '@/lib/types/api';
import type { TimePeriod } from '@/app/api/lib/types';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { calculateCollectionReportTotals } from '@/app/api/lib/helpers/collectionReportCalculations';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);

    if (searchParams.get('locationsWithMachines')) {
      console.warn('Fetching locations with machines...');
      const startTime = Date.now();

      const licencee = searchParams.get('licencee');
      const matchCriteria: Record<string, unknown> = {
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2020-01-01') } },
        ],
      };

      if (licencee && licencee !== 'all') {
        matchCriteria['rel.licencee'] = licencee;
      }

      console.warn(`[LOCATIONS WITH MACHINES] Licensee: ${licencee || 'All'}`);

      const locationsWithMachines = await GamingLocations.aggregate([
        {
          $match: matchCriteria,
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
    }

    const timePeriod =
      (searchParams.get('timePeriod') as TimePeriod) || undefined;
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const locationName = searchParams.get('locationName') || undefined;
    const licencee = searchParams.get('licencee') || undefined;

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

    console.warn('Fetching collection reports...');
    console.warn(`[COLLECTION REPORTS] Time Period: ${timePeriod || 'Custom'}`);
    console.warn(
      `[COLLECTION REPORTS] Start Date: ${startDate?.toISOString() || 'None'}`
    );
    console.warn(
      `[COLLECTION REPORTS] End Date: ${endDate?.toISOString() || 'None'}`
    );
    console.warn(`[COLLECTION REPORTS] Licensee: ${licencee || 'All'}`);

    const startTime = Date.now();

    console.warn(
      `[COLLECTION REPORTS] Calling getAllCollectionReportsWithMachineCounts with:`
    );
    console.warn(`  - licencee: ${licencee}`);
    console.warn(`  - startDate: ${startDate?.toISOString()}`);
    console.warn(`  - endDate: ${endDate?.toISOString()}`);
    console.warn(`  - timePeriod: ${timePeriod}`);
    console.warn(`  - startDateStr: ${startDateStr}`);
    console.warn(`  - endDateStr: ${endDateStr}`);

    const reports = await getAllCollectionReportsWithMachineCounts(
      licencee,
      startDate,
      endDate
    );

    console.warn(
      `Collection reports fetched in ${Date.now() - startTime}ms (${
        reports.length
      } reports)`
    );

    console.warn(
      `[COLLECTION REPORTS API] About to return ${reports.length} reports`
    );
    if (reports.length > 0) {
      console.warn(`[COLLECTION REPORTS API] Sample report:`, {
        location: reports[0].location,
        time: reports[0].time,
        collector: reports[0].collector,
      });
    }

    return NextResponse.json(reports);
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

    // Check for duplicate reports on the same gaming day
    const reportDate = new Date(body.timestamp);
    const existingReport = await CollectionReport.findOne({
      locationName: body.locationName,
      $expr: {
        $eq: [
          { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          { $dateToString: { format: '%Y-%m-%d', date: reportDate } },
        ],
      },
    });

    if (existingReport) {
      return NextResponse.json(
        {
          success: false,
          error:
            'A collection report already exists for this location on this gaming day',
          details: `Report ${existingReport.locationReportId} was created on ${
            existingReport.timestamp.toISOString().split('T')[0]
          }. To create a new report for this date, please delete the existing report first.`,
          existingReportId: existingReport.locationReportId,
          existingReportDate: existingReport.timestamp
            .toISOString()
            .split('T')[0],
          actionRequired: 'DELETE_EXISTING_REPORT',
        },
        { status: 409 } // Conflict status code
      );
    }
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
          // Update existing collection documents with the locationReportId
          await Collections.updateMany(
            {
              machineId: m.machineId,
              metersIn: Number(m.metersIn) || 0,
              metersOut: Number(m.metersOut) || 0,
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

            // CRITICAL: Update any existing history entries that don't have locationReportId set
            // This ensures proper tracking of collections created before the report
            // We match by meter values to find the correct history entry
            await Machine.findByIdAndUpdate(
              m.machineId,
              {
                $set: {
                  'collectionMetersHistory.$[elem].locationReportId':
                    body.locationReportId,
                  'collectionMeters.metersIn': Number(m.metersIn) || 0,
                  'collectionMeters.metersOut': Number(m.metersOut) || 0,
                  previousCollectionTime: currentCollectionMeters?.metersIn
                    ? currentMachineCollectionTime ||
                      new Date(Date.now() - 24 * 60 * 60 * 1000)
                    : undefined,
                  collectionTime: new Date(m.collectionTime || body.timestamp),
                  updatedAt: new Date(),
                },
              },
              {
                arrayFilters: [
                  {
                    'elem.metersIn': Number(m.metersIn) || 0,
                    'elem.metersOut': Number(m.metersOut) || 0,
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
                `Failed to update collectionMeters and history for machine ${m.machineId}:`,
                err
              );
              return null;
            });

            // CRITICAL: Create collection history entries when the report is finalized
            // This is the correct time to create history entries - not when machines are added to the list
            const historyEntry = {
              _id: new mongoose.Types.ObjectId(),
              metersIn: Number(m.metersIn) || 0,
              metersOut: Number(m.metersOut) || 0,
              prevMetersIn: currentCollectionMeters?.metersIn || 0,
              prevMetersOut: currentCollectionMeters?.metersOut || 0,
              timestamp: new Date(m.collectionTime || body.timestamp),
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

        await logActivity({
          action: 'CREATE',
          details: `Created collection report for ${body.locationName} by ${
            body.collectorName
          } (${body.machines?.length || 0} machines, $${
            body.amountCollected
          } collected)`,
          ipAddress: getClientIP(req) || undefined,
          userAgent: req.headers.get('user-agent') || undefined,
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
