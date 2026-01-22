/**
 * Machines API Route
 *
 * This route handles CRUD operations for gaming machines.
 * It supports:
 * - Fetching machines by ID or location
 * - Creating new machines
 * - Updating existing machines
 * - Soft deleting machines
 * - Time period filtering for meter data
 * - Location-based access control
 * - Meter data aggregation
 *
 * @module app/api/machines/route
 */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { checkUserLocationAccess } from '@/app/api/lib/helpers/licenseeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Collections } from '@/app/api/lib/models/collections';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import { convertResponseToTrinidadTime } from '@/app/api/lib/utils/timezone';
import { generateMongoId } from '@/lib/utils/id';
import { getClientIP } from '@/lib/utils/ipAddress';
import type { GamingMachine } from '@/shared/types/entities';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

// TODO: Move these to shared types or create new ones
type NewMachineData = Omit<GamingMachine, '_id' | 'createdAt' | 'updatedAt'> & {
  collectionSettings?: {
    lastCollectionTime?: string;
    lastMetersIn?: string;
    lastMetersOut?: string;
  };
};
type MachineUpdateData = Partial<GamingMachine>;

// Validation helpers mirroring frontend rules
function validateSerialNumber(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length < 3) {
    return 'Serial number must be at least 3 characters long';
  }
  return null;
}

function normalizeSerialNumber(value: string): string {
  return value.toUpperCase();
}

function validateSmibBoard(value: unknown): string | null {
  if (value === undefined || value === null || value === '') {
    // Optional field – no error when empty
    return null;
  }
  if (typeof value !== 'string') {
    return 'SMIB Board must be a string';
  }
  const v = value.toLowerCase();
  if (v.length !== 12) {
    return 'SMIB Board must be exactly 12 characters long';
  }
  if (!/^[0-9a-f]+$/.test(v)) {
    return 'SMIB Board must contain only lowercase hexadecimal characters (0-9, a-f)';
  }
  const lastChar = v.charAt(11);
  if (!['0', '4', '8', 'c'].includes(lastChar)) {
    return 'SMIB Board must end with 0, 4, 8, or c';
  }
  return null;
}

function normalizeSmibBoard(value: string | undefined): string | undefined {
  if (!value) return value;
  return value.toLowerCase();
}

/**
 * Main GET handler for fetching machines
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse query parameters (id, locationId, timePeriod)
 * 3. Validate parameters
 * 4. Route to appropriate fetch logic (single machine or location-based)
 * 5. Check location access if locationId provided
 * 6. Fetch machine(s) from database
 * 7. Aggregate meter data if timePeriod provided
 * 8. Return machine data with meter information
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database and authenticate user
    // ============================================================================
    await connectDB();

    // Get authenticated user and check permissions
    const user = await getUserFromServer();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Note: Collectors can access machine data via API for collection reports
    // Page-level access is restricted in ProtectedRoute, but API access is allowed

    // ============================================================================
    // STEP 2: Parse query parameters
    // ============================================================================
    const id = request.nextUrl.searchParams.get('id');
    const locationId = request.nextUrl.searchParams.get('locationId');
    const timePeriod = request.nextUrl.searchParams.get('timePeriod');

    // ============================================================================
    // STEP 3: Validate parameters
    // ============================================================================
    // Support both single machine fetch (id) and location-based fetch (locationId)
    if (!id && !locationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either Cabinet ID or Location ID is required',
        },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: Route to appropriate fetch logic
    // ============================================================================
    // If locationId is provided, fetch all machines for that location
    if (locationId && !id) {
      // ============================================================================
      // STEP 5: Check location access if locationId provided
      // ============================================================================
      const hasAccess = await checkUserLocationAccess(locationId);
      if (!hasAccess) {
        return NextResponse.json(
          {
            success: false,
            error: 'Unauthorized: You do not have access to this location',
          },
          { status: 403 }
        );
      }

      // ============================================================================
      // STEP 6: Fetch machines from database
      // ============================================================================
      const machines = await Machine.find({
        gamingLocation: locationId,
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2025-01-01') } },
        ],
      }).sort({ serialNumber: 1 });

      // ============================================================================
      // STEP 8: Return machine data
      // ============================================================================
      return NextResponse.json({
        success: true,
        data: machines.map(machine =>
          convertResponseToTrinidadTime(machine.toObject())
        ),
      });
    }

    // Original single machine fetch logic
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cabinet ID is required for single machine fetch',
        },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 6: Fetch machine from database
    // ============================================================================
    const machine = await Machine.findOne({
      _id: id,
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2025-01-01') } },
      ],
    });

    if (!machine) {
      return NextResponse.json(
        { success: false, error: 'Cabinet not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 7: Aggregate meter data if timePeriod provided
    // ============================================================================
    // Implement timezone-aware date filtering using $facet aggregation
    // This approach calculates all time periods in a single efficient query
    let meterData;

    if (timePeriod && timePeriod !== 'All Time') {
      // Use $facet to calculate specific time period efficiently
      const facetAggregation = await Meters.aggregate([
        // Stage 1: Filter meter records to only this specific machine
        { $match: { machine: id } },

        // Stage 2: Set up timezone and current time for calculations
        {
          $set: {
            tz: 'America/Port_of_Spain',
            now: '$$NOW',
          },
        },

        // Stage 3: Calculate time boundaries for different periods (today, last 7 days, last 30 days)
        {
          $set: {
            todayStart: {
              $dateTrunc: { date: '$now', unit: 'day', timezone: '$tz' },
            },
            tomorrowStart: {
              $dateAdd: {
                startDate: {
                  $dateTrunc: { date: '$now', unit: 'day', timezone: '$tz' },
                },
                unit: 'day',
                amount: 1,
              },
            },
            last7Start: {
              $dateSubtract: { startDate: '$now', unit: 'day', amount: 7 },
            },
            last30Start: {
              $dateSubtract: { startDate: '$now', unit: 'day', amount: 30 },
            },
          },
        },

        // Stage 4: Use $facet to compute metrics for the requested time window
        {
          $facet: {
            [timePeriod]: (() => {
              switch (timePeriod) {
                case 'Today':
                  return [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            { $gte: ['$createdAt', '$todayStart'] },
                            { $lt: ['$createdAt', '$tomorrowStart'] },
                          ],
                        },
                      },
                    },
                    {
                      $group: {
                        _id: null,
                        drop: { $sum: '$movement.drop' },
                        totalCancelledCredits: {
                          $sum: '$movement.totalCancelledCredits',
                        },
                        jackpot: { $sum: '$movement.jackpot' },
                        coinIn: { $sum: '$movement.coinIn' },
                        coinOut: { $sum: '$movement.coinOut' },
                        gamesPlayed: { $sum: '$movement.gamesPlayed' },
                        gamesWon: { $sum: '$movement.gamesWon' },
                      },
                    },
                  ];
                case 'Yesterday':
                  return [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            {
                              $gte: [
                                '$createdAt',
                                {
                                  $dateSubtract: {
                                    startDate: '$todayStart',
                                    unit: 'day',
                                    amount: 1,
                                  },
                                },
                              ],
                            },
                            { $lt: ['$createdAt', '$todayStart'] },
                          ],
                        },
                      },
                    },
                    {
                      $group: {
                        _id: null,
                        drop: { $sum: '$movement.drop' },
                        totalCancelledCredits: {
                          $sum: '$movement.totalCancelledCredits',
                        },
                        jackpot: { $sum: '$movement.jackpot' },
                        coinIn: { $sum: '$movement.coinIn' },
                        coinOut: { $sum: '$movement.coinOut' },
                        gamesPlayed: { $sum: '$movement.gamesPlayed' },
                        gamesWon: { $sum: '$movement.gamesWon' },
                      },
                    },
                  ];
                case '7d':
                  return [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            { $gte: ['$createdAt', '$last7Start'] },
                            { $lt: ['$createdAt', '$now'] },
                          ],
                        },
                      },
                    },
                    {
                      $group: {
                        _id: null,
                        drop: { $sum: '$movement.drop' },
                        totalCancelledCredits: {
                          $sum: '$movement.totalCancelledCredits',
                        },
                        jackpot: { $sum: '$movement.jackpot' },
                        coinIn: { $sum: '$movement.coinIn' },
                        coinOut: { $sum: '$movement.coinOut' },
                        gamesPlayed: { $sum: '$movement.gamesPlayed' },
                        gamesWon: { $sum: '$movement.gamesWon' },
                      },
                    },
                  ];
                case '30d':
                  return [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            { $gte: ['$createdAt', '$last30Start'] },
                            { $lt: ['$createdAt', '$now'] },
                          ],
                        },
                      },
                    },
                    {
                      $group: {
                        _id: null,
                        drop: { $sum: '$movement.drop' },
                        totalCancelledCredits: {
                          $sum: '$movement.totalCancelledCredits',
                        },
                        jackpot: { $sum: '$movement.jackpot' },
                        coinIn: { $sum: '$movement.coinIn' },
                        coinOut: { $sum: '$movement.coinOut' },
                        gamesPlayed: { $sum: '$movement.gamesPlayed' },
                        gamesWon: { $sum: '$movement.gamesWon' },
                      },
                    },
                  ];
                default:
                  return [{ $group: { _id: null, drop: { $literal: 0 } } }];
              }
            })(),
          },
        },

        // 4) Coalesce empty results to 0
        {
          $project: {
            machine: id,
            drop: {
              $ifNull: [{ $arrayElemAt: [`$${timePeriod}.drop`, 0] }, 0],
            },
            totalCancelledCredits: {
              $ifNull: [
                { $arrayElemAt: [`$${timePeriod}.totalCancelledCredits`, 0] },
                0,
              ],
            },
            jackpot: {
              $ifNull: [{ $arrayElemAt: [`$${timePeriod}.jackpot`, 0] }, 0],
            },
            coinIn: {
              $ifNull: [{ $arrayElemAt: [`$${timePeriod}.coinIn`, 0] }, 0],
            },
            coinOut: {
              $ifNull: [{ $arrayElemAt: [`$${timePeriod}.coinOut`, 0] }, 0],
            },
            gamesPlayed: {
              $ifNull: [{ $arrayElemAt: [`$${timePeriod}.gamesPlayed`, 0] }, 0],
            },
            gamesWon: {
              $ifNull: [{ $arrayElemAt: [`$${timePeriod}.gamesWon`, 0] }, 0],
            },
          },
        },
      ]);

      meterData = facetAggregation;
    } else {
      // Fetch all meter data without filtering (All Time)
      meterData = await Meters.aggregate([
        // Stage 1: Filter meter records to only this specific machine
        { $match: { machine: id } },

        // Stage 2: Aggregate all financial metrics across all time periods
        {
          $group: {
            _id: null,
            // Financial metrics as per financial-metrics-guide.md
            drop: { $sum: '$movement.drop' }, // Money In (Handle)
            totalCancelledCredits: { $sum: '$movement.totalCancelledCredits' }, // Money Out
            jackpot: { $sum: '$movement.jackpot' },
            coinIn: { $sum: '$movement.coinIn' },
            coinOut: { $sum: '$movement.coinOut' },
            gamesPlayed: { $sum: '$movement.gamesPlayed' },
            gamesWon: { $sum: '$movement.gamesWon' },
          },
        },
      ]);
    }

    // Integrate meter data with machine data
    if (meterData.length > 0) {
      const aggregatedMeters = meterData[0];
      machine.sasMeters = {
        drop: aggregatedMeters.drop || 0,
        totalCancelledCredits: aggregatedMeters.totalCancelledCredits || 0,
        jackpot: aggregatedMeters.jackpot || 0,
        coinIn: aggregatedMeters.coinIn || 0,
        coinOut: aggregatedMeters.coinOut || 0,
        gamesPlayed: aggregatedMeters.gamesPlayed || 0,
        gamesWon: aggregatedMeters.gamesWon || 0,
      };

      // Also update meterData for compatibility
      machine.meterData = {
        movement: machine.sasMeters,
      };
    }

    // ============================================================================
    // STEP 8: Return machine data with meter information
    // ============================================================================
    return NextResponse.json({
      success: true,
      data: convertResponseToTrinidadTime(machine.toObject()),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch machine';
    console.error(
      `[Machines API GET] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Main POST handler for creating a new machine
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse and validate request body
 * 3. Validate serial number and SMIB board
 * 4. Normalize fields
 * 5. Validate location ID
 * 6. Generate machine ID
 * 7. Create machine document
 * 8. Save machine to database
 * 9. Log activity
 * 10. Return created machine
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    const db = await connectDB();

    if (!db) {
      console.error('Failed to connect to the database');
      return NextResponse.json(
        { success: false, error: 'Failed to connect to the database' },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 2: Parse and validate request body
    // ============================================================================
    const data = (await request.json()) as NewMachineData;

    // ============================================================================
    // STEP 3: Validate serial number and SMIB board
    // ============================================================================
    const serialNumberError = validateSerialNumber(data.serialNumber);
    if (serialNumberError) {
      return NextResponse.json(
        { success: false, error: serialNumberError },
        { status: 400 }
      );
    }
    const smibError = validateSmibBoard(data.smibBoard);
    if (smibError) {
      return NextResponse.json(
        { success: false, error: smibError },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: Normalize fields
    // ============================================================================
    data.serialNumber = normalizeSerialNumber(data.serialNumber);
    data.smibBoard = normalizeSmibBoard(data.smibBoard) ?? '';

    // ============================================================================
    // STEP 5: Validate location ID
    // ============================================================================
    if (!data.gamingLocation) {
      return NextResponse.json(
        { success: false, error: 'Location ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 6: Generate machine ID
    // ============================================================================
    const machineId = await generateMongoId();

    // ============================================================================
    // STEP 7: Create machine document
    // ============================================================================
    const newMachine = new Machine({
      _id: machineId,
      serialNumber: data.serialNumber,
      game: data.game,
      gameType: data.gameType || 'slot', // Default to "slot" if not provided
      isCronosMachine: data.isCronosMachine || false,
      // Handle isCronosMachine vs isSasMachine logic
      isSasMachine: data.isCronosMachine ? false : true, // If Cronos, not SAS. If not given, default to SAS
      loggedIn: false, // Default to not logged in
      machineMembershipSettings: {
        isPointsAllowed: true,
        isFreePlayAllowed: true,
        pointsAwardMethod: 'gamesPlayed',
        freePlayAmount: 200,
        freePlayCreditsTimeout: 86400,
      },
      nonRestricted: 0,
      restricted: 0,
      sasVersion: '',
      uaccount: 0,
      gameConfig: {
        accountingDenomination:
          parseFloat(data.accountingDenomination.toString()) || 0,
        additionalId: '',
        gameOptions: '',
        maxBet: '',
        payTableId: '',
        progressiveGroup: '',
        theoreticalRtp: 0,
      },
      cabinetType: data.cabinetType,
      assetStatus: data.assetStatus,
      gamingLocation: data.gamingLocation, // Set the location ID
      relayId: data.smibBoard,
      collectionTime: data.collectionSettings?.lastCollectionTime,
      previousCollectionTime: null, // Default to null for new machines
      collectionMeters: {
        metersIn: parseFloat(data.collectionSettings?.lastMetersIn || '0') || 0,
        metersOut:
          parseFloat(data.collectionSettings?.lastMetersOut || '0') || 0,
      },
      // Add all missing fields with default values
      billValidator: {
        balance: 0,
        notes: [],
      },
      config: {
        enableRte: false,
        lockMachine: false,
        lockBvOnLogOut: false,
      },
      playableBalance: 0,
      custom: { name: data.serialNumber },
      balances: { cashable: 0 },
      curProcess: { name: '', next: '' },
      tasks: {
        pendingHandpay: {
          name: '',
          steps: [],
          currentStepIndex: 0,
          retryAttempts: 0,
        },
      },
      origSerialNumber: '',
      machineId: '',
      gamingBoard: '',

      manuf: data.manufacturer || '',
      smibBoard: data.smibBoard,
      smibVersion: { firmware: '', version: '' },
      smibConfig: {
        mqtt: {
          mqttSecure: 0,
          mqttQOS: 0,
          mqttURI: '',
          mqttSubTopic: '',
          mqttPubTopic: '',
          mqttCfgTopic: '',
          mqttIdleTimeS: 0,
        },
        net: {
          netMode: 0,
          netStaSSID: '',
          netStaPwd: '',
          netStaChan: 0,
        },
        coms: {
          comsAddr: 0,
          comsMode: 0,
          comsRateMs: 0,
          comsRTE: 0,
          comsGPC: 0,
        },
        ota: {
          otaURL: '',
        },
      },
      sasMeters: {
        drop: 0,
        totalCancelledCredits: 0,
        gamesPlayed: 0,
        moneyOut: 0,
        slotDoorOpened: 0,
        powerReset: 0,
        totalHandPaidCancelledCredits: 0,
        coinIn: 0,
        coinOut: 0,
        totalWonCredits: 0,
        jackpot: 0,
        currentCredits: 0,
        gamesWon: 0,
      },
      billMeters: {
        dollar1: 0,
        dollar2: 0,
        dollar5: 0,
        dollar10: 0,
        dollar20: 0,
        dollar50: 0,
        dollar100: 0,
        dollar500: 0,
        dollar1000: 0,
        dollar2000: 0,
        dollar5000: 0,
        dollarTotal: 0,
        dollarTotalUnknown: 0,
      },
      operationsWhileIdle: { extendedMeters: new Date() },
      collectionMetersHistory: [],

      manufacturer: data.manufacturer || '',
      gameNumber: '',
      protocols: [],
      numberOfEnabledGames: 0,
      enabledGameNumbers: [],
      noOfGames: 0,
      viewingAccountDenomination: [],
      isSunBoxDevice: false,
      sessionHistory: [],
      currentSession: '',
      viewingAccountDenominationHistory: [],
      selectedDenomination: { drop: 0, totalCancelledCredits: 0 },
      lastBillMeterAt: new Date(),
      lastSasMeterAt: new Date(),
      machineType: '',
      machineStatus: '',
      lastMaintenanceDate: new Date(),
      nextMaintenanceDate: new Date(),
      maintenanceHistory: [],
      lastActivity: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: new Date(-1), // SMIB boards require all fields to be present
      // Add the new fields from the schema
      collectorDenomination: 1, // Collection Report Multiplier as specified in prompt
    });

    // ============================================================================
    // STEP 8: Save machine to database
    // ============================================================================
    await newMachine.save();

    // ============================================================================
    // STEP 9: Log activity
    // ============================================================================
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        const createChanges = [
          {
            field: 'serialNumber',
            oldValue: null,
            newValue: data.serialNumber,
          },
          { field: 'game', oldValue: null, newValue: data.game },
          {
            field: 'gameType',
            oldValue: null,
            newValue: data.gameType || 'slot',
          },
          {
            field: 'isCronosMachine',
            oldValue: null,
            newValue: data.isCronosMachine,
          },
          { field: 'cabinetType', oldValue: null, newValue: data.cabinetType },
          { field: 'assetStatus', oldValue: null, newValue: data.assetStatus },
          {
            field: 'gamingLocation',
            oldValue: null,
            newValue: data.gamingLocation,
          },
          { field: 'smibBoard', oldValue: null, newValue: data.smibBoard },
          {
            field: 'accountingDenomination',
            oldValue: null,
            newValue: data.accountingDenomination,
          },

          {
            field: 'serialNumber',
            oldValue: null,
            newValue: data.serialNumber,
          },
          { field: 'game', oldValue: null, newValue: data.game },
          {
            field: 'gameType',
            oldValue: null,
            newValue: data.gameType || 'slot',
          },
          {
            field: 'isCronosMachine',
            oldValue: null,
            newValue: data.isCronosMachine,
          },
          { field: 'cabinetType', oldValue: null, newValue: data.cabinetType },
          { field: 'assetStatus', oldValue: null, newValue: data.assetStatus },
          {
            field: 'gamingLocation',
            oldValue: null,
            newValue: data.gamingLocation,
          },
          { field: 'smibBoard', oldValue: null, newValue: data.smibBoard },
          {
            field: 'accountingDenomination',
            oldValue: null,
            newValue: data.accountingDenomination,
          },
        ];

        await logActivity({
          action: 'CREATE',
          details: `Created new machine "${data.serialNumber}" with game "${data.game}"`,
          ipAddress: getClientIP(request) || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          userId: currentUser._id as string,
          username: currentUser.emailAddress as string,
          metadata: {
            userId: currentUser._id as string,
            userEmail: currentUser.emailAddress as string,
            userRole: (currentUser.roles as string[])?.[0] || 'user',
            resource: 'machine',
            resourceId: machineId,
            resourceName: data.serialNumber,
            changes: createChanges,
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }

    // ============================================================================
    // STEP 10: Return created machine
    // ============================================================================
    // Force revalidation of the cabinets and machines pages
    revalidatePath('/cabinets');
    revalidatePath('/machines');

    return NextResponse.json({
      success: true,
      data: convertResponseToTrinidadTime(newMachine),
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    let errorMessage =
      error instanceof Error ? error.message : 'Failed to create new machine';
    let status = 500;

    // Handle MongoDB duplicate key error (code 11000)
    if (error && typeof error === 'object' && error.code === 11000) {
      let fieldName = 'field';
      if (error.keyPattern) {
        fieldName = Object.keys(error.keyPattern)[0];
      } else if (error.message && error.message.includes('index:')) {
        const match = error.message.match(/index: (.+?)_\d/);
        if (match && match[1]) fieldName = match[1];
      }

      const friendlyFieldMap: Record<string, string> = {
        serialNumber: 'Serial Number',
        assetNumber: 'Asset Number',
        relayId: 'Relay ID',
      };

      const displayField = friendlyFieldMap[fieldName] || fieldName;
      errorMessage = `A machine with this ${displayField} already exists. Please use a unique value.`;
      status = 400;
    }

    console.error(
      `[Machines API POST] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status }
    );
  }
}

/**
 * Main PUT handler for updating an existing machine
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse machine ID from query parameters
 * 3. Parse and validate request body
 * 4. Validate update fields
 * 5. Find original machine
 * 6. Update machine in database
 * 7. Update related Collections if serial number or game changed
 * 8. Return updated machine
 */
export async function PUT(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse machine ID from query parameters
    // ============================================================================
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Cabinet ID is required' },
        { status: 400 }
      );
    }

    // ID validation removed - _id is stored as String, not ObjectId

    // ============================================================================
    // STEP 3: Parse and validate request body
    // ============================================================================
    const data = (await request.json()) as MachineUpdateData;

    // ============================================================================
    // STEP 4: Validate update fields
    // ============================================================================
    // Backend validations mirroring frontend (only when provided)
    if (data.serialNumber !== undefined) {
      const serialNumberError = validateSerialNumber(data.serialNumber);
      if (serialNumberError) {
        return NextResponse.json(
          { success: false, error: serialNumberError },
          { status: 400 }
        );
      }
      data.serialNumber = normalizeSerialNumber(data.serialNumber);
    }

    if (data.smibBoard !== undefined) {
      const smibError = validateSmibBoard(data.smibBoard);
      if (smibError) {
        return NextResponse.json(
          { success: false, error: smibError },
          { status: 400 }
        );
      }
      data.smibBoard = normalizeSmibBoard(data.smibBoard) ?? '';
    }

    // ============================================================================
    // STEP 5: Find original machine
    // ============================================================================
    // CRITICAL: Use findOne with _id instead of findById (repo rule)
    const originalMachine = await Machine.findOne({ _id: id });
    if (!originalMachine) {
      return NextResponse.json(
        { success: false, error: 'Cabinet not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 6: Update machine in database
    // ============================================================================
    // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
    const updatedMachine = await Machine.findOneAndUpdate({ _id: id }, data, {
      new: true,
      runValidators: true,
    });

    // ============================================================================
    // STEP 7: Update related Collections if serial number or game changed
    // ============================================================================
    // If serial number was updated, also update it in Collections
    if (
      data.serialNumber !== undefined &&
      data.serialNumber !== '' &&
      data.serialNumber !== originalMachine.serialNumber
    ) {
      try {
        await Collections.updateMany(
          { machineId: id },
          { $set: { serialNumber: data.serialNumber } }
        );

        console.warn(
          `Updated serial number in Collections for machine ${id} from "${originalMachine.serialNumber}" to "${data.serialNumber}"`
        );
      } catch (collectionsError) {
        console.error(
          'Failed to update serial number in Collections:',
          collectionsError
        );
        // Don't fail the entire operation if Collections update fails
      }
    }

    // If game name was updated, also update it in Collections
    if (
      data.game !== undefined &&
      data.game !== '' &&
      data.game !== originalMachine.game
    ) {
      try {
        await Collections.updateMany(
          { machineId: id },
          { $set: { machineName: data.game } }
        );

        console.warn(
          `Updated machine name in Collections for machine ${id} from "${originalMachine.game}" to "${data.game}"`
        );
      } catch (collectionsError) {
        console.error(
          'Failed to update machine name in Collections:',
          collectionsError
        );
        // Don't fail the entire operation if Collections update fails
      }
    }

    // ============================================================================
    // STEP 8: Log activity with accurate change tracking
    // ============================================================================
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        // Build changes array - ONLY for fields that were actually updated
        const updateChanges: Array<{
          field: string;
          oldValue: unknown;
          newValue: unknown;
        }> = [];

        if (data.serialNumber !== undefined) {
          updateChanges.push({
            field: 'serialNumber',
            oldValue: originalMachine.serialNumber,
            newValue: data.serialNumber,
          });
        }
        if (data.game !== undefined) {
          updateChanges.push({
            field: 'game',
            oldValue: originalMachine.game,
            newValue: data.game,
          });
        }
        if (data.gameType !== undefined) {
          updateChanges.push({
            field: 'gameType',
            oldValue: originalMachine.gameType,
            newValue: data.gameType,
          });
        }
        if (data.isCronosMachine !== undefined) {
          updateChanges.push({
            field: 'isCronosMachine',
            oldValue: originalMachine.isCronosMachine,
            newValue: data.isCronosMachine,
          });
        }
        if (data.cabinetType !== undefined) {
          updateChanges.push({
            field: 'cabinetType',
            oldValue: originalMachine.cabinetType,
            newValue: data.cabinetType,
          });
        }
        if (data.assetStatus !== undefined) {
          updateChanges.push({
            field: 'assetStatus',
            oldValue: originalMachine.assetStatus,
            newValue: data.assetStatus,
          });
        }
        if (data.gamingLocation !== undefined) {
          updateChanges.push({
            field: 'gamingLocation',
            oldValue: originalMachine.gamingLocation,
            newValue: data.gamingLocation,
          });
        }
        if (data.smibBoard !== undefined) {
          updateChanges.push({
            field: 'smibBoard',
            oldValue: originalMachine.smibBoard,
            newValue: data.smibBoard,
          });
        }
        if (data.accountingDenomination !== undefined) {
          updateChanges.push({
            field: 'accountingDenomination',
            oldValue: originalMachine.accountingDenomination,
            newValue: data.accountingDenomination,
          });
        }

        await logActivity({
          action: 'UPDATE',
          details: `Updated machine "${originalMachine.serialNumber}" (${updateChanges.length} change${updateChanges.length !== 1 ? 's' : ''})`,
          ipAddress: getClientIP(request) || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          userId: currentUser._id as string,
          username: currentUser.emailAddress as string,
          metadata: {
            userId: currentUser._id as string,
            userEmail: currentUser.emailAddress as string,
            userRole: (currentUser.roles as string[])?.[0] || 'user',
            resource: 'machine',
            resourceId: id,
            resourceName: originalMachine.serialNumber,
            changes: updateChanges,
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }

    // ============================================================================
    // STEP 9: Return updated machine
    // ============================================================================
    // Force revalidation of the cabinets and machines pages
    revalidatePath('/cabinets');
    revalidatePath('/machines');

    return NextResponse.json({
      success: true,
      data: convertResponseToTrinidadTime(updatedMachine),
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    let errorMessage =
      error instanceof Error ? error.message : 'Failed to update machine';
    let status = 500;

    // Handle MongoDB duplicate key error (code 11000)
    if (error && typeof error === 'object' && error.code === 11000) {
      let fieldName = 'field';
      if (error.keyPattern) {
        fieldName = Object.keys(error.keyPattern)[0];
      } else if (error.message && error.message.includes('index:')) {
        const match = error.message.match(/index: (.+?)_\d/);
        if (match && match[1]) fieldName = match[1];
      }

      const friendlyFieldMap: Record<string, string> = {
        serialNumber: 'Serial Number',
        assetNumber: 'Asset Number',
        relayId: 'Relay ID',
      };

      const displayField = friendlyFieldMap[fieldName] || fieldName;
      errorMessage = `A machine with this ${displayField} already exists. Please use a unique value.`;
      status = 400;
    }

    console.error(
      `[Machines API PUT] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status }
    );
  }
}

/**
 * Main DELETE handler for soft deleting a machine
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse machine ID from query parameters
 * 3. Find machine to delete
 * 4. Perform soft delete
 * 5. Log activity
 * 6. Return deletion result
 */
export async function DELETE(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse machine ID from query parameters
    // ============================================================================
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Cabinet ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Find machine to delete
    // ============================================================================
    // CRITICAL: Use findOne with _id instead of findById (repo rule)
    const machineToDelete = await Machine.findOne({ _id: id });
    if (!machineToDelete) {
      return NextResponse.json(
        { success: false, error: 'Cabinet not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 4: Perform soft delete
    // ============================================================================
    // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
    await Machine.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          deletedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    // ============================================================================
    // STEP 5: Log activity
    // ============================================================================
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        const deleteChanges = [
          {
            field: 'serialNumber',
            oldValue: machineToDelete.serialNumber,
            newValue: null,
          },
          { field: 'game', oldValue: machineToDelete.game, newValue: null },
          {
            field: 'gameType',
            oldValue: machineToDelete.gameType,
            newValue: null,
          },
          {
            field: 'isCronosMachine',
            oldValue: machineToDelete.isCronosMachine,
            newValue: null,
          },
          {
            field: 'cabinetType',
            oldValue: machineToDelete.cabinetType,
            newValue: null,
          },
          {
            field: 'assetStatus',
            oldValue: machineToDelete.assetStatus,
            newValue: null,
          },
          {
            field: 'gamingLocation',
            oldValue: machineToDelete.gamingLocation,
            newValue: null,
          },
          {
            field: 'smibBoard',
            oldValue: machineToDelete.smibBoard,
            newValue: null,
          },

          {
            field: 'serialNumber',
            oldValue: machineToDelete.serialNumber,
            newValue: null,
          },
          { field: 'game', oldValue: machineToDelete.game, newValue: null },
          {
            field: 'gameType',
            oldValue: machineToDelete.gameType,
            newValue: null,
          },
          {
            field: 'isCronosMachine',
            oldValue: machineToDelete.isCronosMachine,
            newValue: null,
          },
          {
            field: 'cabinetType',
            oldValue: machineToDelete.cabinetType,
            newValue: null,
          },
          {
            field: 'assetStatus',
            oldValue: machineToDelete.assetStatus,
            newValue: null,
          },
          {
            field: 'gamingLocation',
            oldValue: machineToDelete.gamingLocation,
            newValue: null,
          },
          {
            field: 'smibBoard',
            oldValue: machineToDelete.smibBoard,
            newValue: null,
          },
        ];

        await logActivity({
          action: 'DELETE',
          details: `Deleted machine "${
            machineToDelete.serialNumber || machineToDelete.game
          }"`,
          ipAddress: getClientIP(request) || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          userId: currentUser._id as string,
          username: currentUser.emailAddress as string,
          metadata: {
            userId: currentUser._id as string,
            userEmail: currentUser.emailAddress as string,
            userRole: (currentUser.roles as string[])?.[0] || 'user',
            resource: 'machine',
            resourceId: id,
            resourceName: machineToDelete.serialNumber || machineToDelete.game,
            changes: deleteChanges,
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }

    // ============================================================================
    // STEP 6: Return deletion result
    // ============================================================================
    // Force revalidation of the cabinets and machines pages
    revalidatePath('/cabinets');
    revalidatePath('/machines');

    return NextResponse.json({
      success: true,
      message: 'Cabinet deleted successfully',
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to delete cabinet';
    console.error(
      `[Machines API DELETE] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

