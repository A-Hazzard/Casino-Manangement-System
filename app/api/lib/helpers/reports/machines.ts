/**
 * Machines Report Helper Functions
 *
 * This module contains helper functions for the machines report API route.
 * It handles fetching machine statistics, overview, and performance evaluation.
 *
 * @module app/api/lib/helpers/machinesReport
 */

import { Countries } from '@/app/api/lib/models/countries';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Licencee } from '@/app/api/lib/models/licencee';
import { Machine } from '@/app/api/lib/models/machines';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import {
    convertFromUSD,
    convertToUSD,
    getCountryCurrency,
} from '@/lib/helpers/rates';
import { getGamingDayRangesForLocations } from '@/lib/utils/gamingDayRange';
import type { CurrencyCode } from '@/shared/types/currency';
import { formatDistanceToNow } from 'date-fns';
// Note: Db type from mongodb not imported to avoid mongoose/mongodb version mismatch
import type { PipelineStage } from 'mongoose';
import { NextResponse } from 'next/server';

/**
 * Fetches machine stats (online/offline counts and financial totals)
 */
export async function getMachineStats(
  machineMatchStage: Record<string, unknown>,
  locationMatchStage: Record<string, unknown>,
  startDate: Date | undefined,
  endDate: Date | undefined,
  licencee: string | undefined,
  displayCurrency: CurrencyCode,
  isAdminOrDev: boolean
) {
  const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

  // Use aggregation to join machines with gaminglocations for licensee filtering
  const aggregationPipeline: PipelineStage[] = [
    { $match: { deletedAt: { $in: [null, new Date(-1)] } } },
    {
      $lookup: {
        from: 'gaminglocations',
        localField: 'gamingLocation',
        foreignField: '_id',
        as: 'locationDetails',
      },
    },
    { $unwind: { path: '$locationDetails', preserveNullAndEmptyArrays: true } },
  ];

  // Add location filter if licensee is specified
  if (
    locationMatchStage &&
    typeof locationMatchStage === 'object' &&
    'rel.licencee' in locationMatchStage
  ) {
    aggregationPipeline.push({
      $match: {
        'locationDetails.rel.licencee': locationMatchStage['rel.licencee'],
      },
    });
  }

  // Get total machines count (only machines with lastActivity field)
  const totalCountResult = await Machine.aggregate([
    ...aggregationPipeline,
    { $match: { lastActivity: { $exists: true } } },
    { $count: 'total' },
  ]).exec();
  const totalCount = totalCountResult[0]?.total || 0;

  // Get online machines count (machines with lastActivity >= 3 minutes ago)
  const onlineCountResult = await Machine.aggregate([
    ...aggregationPipeline,
    { $match: { lastActivity: { $exists: true, $gte: threeMinutesAgo } } },
    { $count: 'total' },
  ]).exec();
  const onlineCount = onlineCountResult[0]?.total || 0;

  // Calculate financial totals from meters collection within the date filter
  const financialTotalsPipeline: PipelineStage[] = [
    { $match: machineMatchStage },
    {
      $lookup: {
        from: 'gaminglocations',
        localField: 'gamingLocation',
        foreignField: '_id',
        as: 'locationDetails',
      },
    },
    {
      $unwind: { path: '$locationDetails', preserveNullAndEmptyArrays: true },
    },
    // Add location filter if licensee is specified
    ...(locationMatchStage &&
    typeof locationMatchStage === 'object' &&
    'rel.licencee' in locationMatchStage
      ? [
          {
            $match: {
              'locationDetails.rel.licencee':
                locationMatchStage['rel.licencee'],
            },
          },
        ]
      : []),
    // Add meters lookup with proper aggregation
    {
      $lookup: {
        from: 'meters',
        let: { machineId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$machine', '$$machineId'] },
                  // Only include meters within the date range if dates are provided
                  ...(startDate && endDate
                    ? [
                        { $gte: ['$readAt', startDate] },
                        { $lte: ['$readAt', endDate] },
                      ]
                    : []),
                ],
              },
            },
          },
          // Sum up the movement data
          {
            $group: {
              _id: null,
              drop: { $sum: { $ifNull: ['$movement.drop', 0] } },
              moneyOut: {
                $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
              },
              coinIn: { $sum: { $ifNull: ['$movement.coinIn', 0] } },
              coinOut: { $sum: { $ifNull: ['$movement.coinOut', 0] } },
            },
          },
        ],
        as: 'meterData',
      },
    },
    {
      $unwind: {
        path: '$meterData',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: null,
        totalGross: {
          $sum: {
            $subtract: [
              { $ifNull: ['$meterData.drop', 0] },
              { $ifNull: ['$meterData.moneyOut', 0] },
            ],
          },
        },
        totalDrop: { $sum: { $ifNull: ['$meterData.drop', 0] } },
        totalCancelledCredits: {
          $sum: { $ifNull: ['$meterData.moneyOut', 0] },
        },
      },
    },
  ];

  // Use cursor for Meters aggregation
  const financialTotalsResult: Array<{
    totalGross: number;
    totalDrop: number;
    totalCancelledCredits: number;
  }> = [];
  const financialCursor = Machine.aggregate(financialTotalsPipeline).cursor({
    batchSize: 1000,
  });
  for await (const doc of financialCursor) {
    financialTotalsResult.push(doc);
  }

  const totals = financialTotalsResult[0] || {
    totalGross: 0,
    totalDrop: 0,
    totalCancelledCredits: 0,
  };

  // Apply currency conversion if needed
  let convertedTotals = totals;

  if (isAdminOrDev && shouldApplyCurrencyConversion(licencee)) {
    const licensees = await Licencee.find({}).lean();
    const licenseeIdToCurrency = new Map<string, string>();
    licensees.forEach(licensee => {
      if (licensee._id) {
        licenseeIdToCurrency.set(
          String(licensee._id),
          licensee.currency || 'USD'
        );
      }
    });

    const countriesData = await Countries.find({}).lean();
    const countryIdToName = new Map<string, string>();
    countriesData.forEach(country => {
      if (country._id && country.name) {
        countryIdToName.set(String(country._id), country.name);
      }
    });

    // Re-fetch machines with location and currency info using cursor
    const conversionPipeline: PipelineStage[] = [
      { $match: machineMatchStage },
      {
        $lookup: {
          from: 'gaminglocations',
          localField: 'gamingLocation',
          foreignField: '_id',
          as: 'locationDetails',
        },
      },
      {
        $unwind: { path: '$locationDetails', preserveNullAndEmptyArrays: true },
      },
      ...(locationMatchStage &&
      typeof locationMatchStage === 'object' &&
      'rel.licencee' in locationMatchStage
        ? [
            {
              $match: {
                'locationDetails.rel.licencee':
                  locationMatchStage['rel.licencee'],
              },
            },
          ]
        : []),
      {
        $lookup: {
          from: 'meters',
          let: { machineId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$machine', '$$machineId'] },
                    ...(startDate && endDate
                      ? [
                          { $gte: ['$readAt', startDate] },
                          { $lte: ['$readAt', endDate] },
                        ]
                      : []),
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                drop: { $sum: { $ifNull: ['$movement.drop', 0] } },
                moneyOut: {
                  $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
                },
              },
            },
          ],
          as: 'meterData',
        },
      },
      {
        $unwind: {
          path: '$meterData',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          drop: { $ifNull: ['$meterData.drop', 0] },
          moneyOut: { $ifNull: ['$meterData.moneyOut', 0] },
          gross: {
            $subtract: [
              { $ifNull: ['$meterData.drop', 0] },
              { $ifNull: ['$meterData.moneyOut', 0] },
            ],
          },
          licenceeId: '$locationDetails.rel.licencee',
          countryId: '$locationDetails.country',
        },
      },
    ];

    let totalDropUSD = 0;
    let totalMoneyOutUSD = 0;
    let totalGrossUSD = 0;

    const conversionCursor = Machine.aggregate(conversionPipeline).cursor({
      batchSize: 1000,
    });
    for await (const machine of conversionCursor) {
      const machineLicenseeId = machine.licenceeId?.toString();
      const countryId = machine.countryId?.toString();

      let nativeCurrency = 'USD';
      if (machineLicenseeId && licenseeIdToCurrency.has(machineLicenseeId)) {
        nativeCurrency = licenseeIdToCurrency.get(machineLicenseeId) || 'USD';
      } else if (countryId) {
        const countryName = countryIdToName.get(countryId);
        nativeCurrency = countryName ? getCountryCurrency(countryName) : 'USD';
      }

      totalDropUSD += convertToUSD(machine.drop || 0, nativeCurrency);
      totalMoneyOutUSD += convertToUSD(machine.moneyOut || 0, nativeCurrency);
      totalGrossUSD += convertToUSD(machine.gross || 0, nativeCurrency);
    }

    convertedTotals = {
      totalDrop:
        Math.round(convertFromUSD(totalDropUSD, displayCurrency) * 100) / 100,
      totalGross:
        Math.round(convertFromUSD(totalGrossUSD, displayCurrency) * 100) / 100,
      totalCancelledCredits:
        Math.round(convertFromUSD(totalMoneyOutUSD, displayCurrency) * 100) /
        100,
    };
  }

  return NextResponse.json({
    onlineCount,
    offlineCount: totalCount - onlineCount,
    totalCount,
    totalGross: convertedTotals.totalGross || 0,
    totalDrop: convertedTotals.totalDrop || 0,
    totalCancelledCredits: convertedTotals.totalCancelledCredits || 0,
    currency: displayCurrency,
    converted: isAdminOrDev && shouldApplyCurrencyConversion(licencee),
  });
}

/**
 * Fetches overview machines with pagination
 */
export async function getOverviewMachines(
  machineMatchStage: Record<string, unknown>,
  locationMatchStage: Record<string, unknown>,
  page: number,
  limit: number,
  skip: number,
  startDate: Date | undefined,
  endDate: Date | undefined,
  timePeriod: string = 'Today'
) {
  // Fetch locations to get gaming day ranges
  const locationsWithOffset = await GamingLocations.find(locationMatchStage).select('gameDayOffset _id').lean();
  const gamingDayRanges = getGamingDayRangesForLocations(locationsWithOffset as any, timePeriod, startDate, endDate);

  const aggregationPipeline: PipelineStage[] = [
    { $match: machineMatchStage },
    {
      $lookup: {
        from: 'gaminglocations',
        localField: 'gamingLocation',
        foreignField: '_id',
        as: 'locationDetails',
      },
    },
    { $unwind: { path: '$locationDetails', preserveNullAndEmptyArrays: true } },
  ];

  if (locationMatchStage && locationMatchStage['rel.licencee']) {
    aggregationPipeline.push({
      $match: {
        'locationDetails.rel.licencee': locationMatchStage['rel.licencee'],
      },
    });
  }

  aggregationPipeline.push(
    {
      $lookup: {
        from: 'meters',
        let: { machineId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$machine', '$$machineId'] },
                  ...(startDate && endDate
                    ? [
                        { $gte: ['$readAt', startDate] },
                        { $lte: ['$readAt', endDate] },
                      ]
                    : []),
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              drop: { $sum: { $ifNull: ['$movement.drop', 0] } },
              moneyOut: {
                $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
              },
              coinIn: { $sum: { $ifNull: ['$movement.coinIn', 0] } },
              coinOut: { $sum: { $ifNull: ['$movement.coinOut', 0] } },
              gamesPlayed: { $sum: { $ifNull: ['$movement.gamesPlayed', 0] } },
              jackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
            },
          },
        ],
        as: 'meterData',
      },
    },
    {
      $unwind: {
        path: '$meterData',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        serialNumber: 1,
        origSerialNumber: 1,
        'custom.name': 1,
        gamingLocation: 1,
        game: 1,
        manuf: 1,
        manufacturer: 1,
        lastActivity: 1,
        isSasMachine: 1,
        gameConfig: 1,
        locationName: '$locationDetails.name',
        drop: { $ifNull: ['$meterData.drop', 0] },
        moneyOut: { $ifNull: ['$meterData.moneyOut', 0] },
        coinIn: { $ifNull: ['$meterData.coinIn', 0] },
        coinOut: { $ifNull: ['$meterData.coinOut', 0] },
        gamesPlayed: { $ifNull: ['$meterData.gamesPlayed', 0] },
        jackpot: { $ifNull: ['$meterData.jackpot', 0] },
        netWin: {
          $subtract: [
            { $ifNull: ['$meterData.coinIn', 0] },
            { $ifNull: ['$meterData.coinOut', 0] },
          ],
        },
        gross: {
          $subtract: [
            { $ifNull: ['$meterData.drop', 0] },
            { $ifNull: ['$meterData.moneyOut', 0] },
          ],
        },
        holdPct: {
          $cond: [
            { $gt: [{ $ifNull: ['$meterData.coinIn', 0] }, 0] },
            {
              $multiply: [
                {
                  $divide: [
                    {
                      $subtract: [
                        { $ifNull: ['$meterData.drop', 0] },
                        { $ifNull: ['$meterData.totalCancelledCredits', 0] },
                      ],
                    },
                    { $ifNull: ['$meterData.coinIn', 0] },
                  ],
                },
                100,
              ],
            },
            0,
          ],
        },
      },
    },
    { $sort: { netWin: -1 } },
    { $skip: skip },
    { $limit: limit }
  );

  const machines: Array<Record<string, unknown>> = [];
  const cursor = Machine.aggregate(aggregationPipeline).cursor({
    batchSize: 1000,
  });
  for await (const doc of cursor) {
    machines.push(doc);
  }

  const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

  const transformedMachines = machines.map(machine => {
    const gameConfig = machine.gameConfig as
      | { theoreticalRtp?: number }
      | undefined;
    
    // Calculate offline labels
    const lastActivity = machine.lastActivity ? new Date(machine.lastActivity as string) : null;
    const isOnline = !!(lastActivity && lastActivity > threeMinutesAgo);
    
    let offlineTimeLabel : string | undefined = undefined;
    let actualOfflineTime : string | undefined = undefined;

    if (!isOnline && lastActivity) {
        const actualDuration = formatDistanceToNow(lastActivity, { addSuffix: true });
        actualOfflineTime = actualDuration;

        const locationId = machine.gamingLocation;
        const range = gamingDayRanges.get(String(locationId));

        if (range) {
            if (lastActivity < range.rangeStart && (timePeriod === '7d' || timePeriod === '30d' || timePeriod === 'Custom' || timePeriod === 'last7days' || timePeriod === 'last30days')) {
                const days = (timePeriod === '7d' || timePeriod === 'last7days') ? '7' : (timePeriod === '30d' || timePeriod === 'last30days') ? '30' : undefined;
                if (days) {
                    offlineTimeLabel = `within the last ${days} days`;
                } else {
                    const diffMs = range.rangeEnd.getTime() - range.rangeStart.getTime();
                    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                    offlineTimeLabel = `within the last ${diffDays} days`;
                }
            } else {
                offlineTimeLabel = actualDuration;
            }
        }
    } else if (!isOnline && !lastActivity) {
        actualOfflineTime = 'Never';
        offlineTimeLabel = 'Never';
    }

    return {
      machineId: (machine._id as string).toString(),
      machineName:
        (machine.custom as { name?: string })?.name ||
        (machine.serialNumber as string) ||
        'Unknown Machine',
      serialNumber:
        (machine.serialNumber as string) ||
        (machine.origSerialNumber as string) ||
        '',
      customName: (machine.custom as { name?: string })?.name || '',
      locationId: (machine.gamingLocation as string)?.toString() || '',
      locationName: (machine.locationName as string) || 'Unknown Location',
      gameTitle: (machine.game as string) || '(game name not provided)',
      manufacturer:
        (machine.manufacturer as string) ||
        (machine.manuf as string) ||
        'Unknown Manufacturer',
      isOnline,
      lastActivity: machine.lastActivity as string,
      offlineTimeLabel,
      actualOfflineTime,
      isSasEnabled: (machine.isSasMachine as boolean) || false,
      drop: Math.round((Number(machine.drop) || 0) * 100) / 100,
      totalCancelledCredits:
        Math.round((Number(machine.moneyOut) || 0) * 100) / 100,
      netWin: Math.round((Number(machine.netWin) || 0) * 100) / 100,
      gross: Math.round((Number(machine.gross) || 0) * 100) / 100,
      theoreticalHold: gameConfig?.theoreticalRtp
        ? (1 - Number(gameConfig.theoreticalRtp)) * 100
        : 0,
      gamesPlayed: (machine.gamesPlayed as number) || 0,
      jackpot: Math.round((Number(machine.jackpot) || 0) * 100) / 100,
      coinIn: Math.round((Number(machine.coinIn) || 0) * 100) / 100,
      coinOut: Math.round((Number(machine.coinOut) || 0) * 100) / 100,
      avgBet:
        (machine.gamesPlayed as number) > 0
          ? Math.round(
              (Number(machine.coinIn || 0) / Number(machine.gamesPlayed)) * 100
            ) / 100
          : 0,
      actualHold: (machine.holdPct as number) || 0,
    };
  });

  const countPipeline: PipelineStage[] = [
    { $match: machineMatchStage },
    {
      $lookup: {
        from: 'gaminglocations',
        localField: 'gamingLocation',
        foreignField: '_id',
        as: 'locationDetails',
      },
    },
    { $unwind: { path: '$locationDetails', preserveNullAndEmptyArrays: true } },
  ];

  if (locationMatchStage && locationMatchStage['rel.licencee']) {
    countPipeline.push({
      $match: {
        'locationDetails.rel.licencee': locationMatchStage['rel.licencee'],
      },
    });
  }

  countPipeline.push({ $count: 'total' });
  const totalCountResult = await Machine.aggregate(countPipeline).exec();
  const totalCount = totalCountResult[0]?.total || 0;
  const totalPages = Math.ceil(totalCount / limit);

  return NextResponse.json({
    data: transformedMachines,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
}

/**
 * Fetches all machines for performance analysis
 */
export async function getAllMachines(
  searchParams: URLSearchParams,
  startDate: Date | undefined,
  endDate: Date | undefined,
  locationMatchStage: Record<string, unknown>
) {
  const searchTerm = searchParams.get('search');
  const machineMatchStage: Record<string, unknown> = {
    $or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2025-01-01') } }],
  };

  if (searchTerm && searchTerm.trim()) {
    machineMatchStage.$or = [
      { serialNumber: { $regex: searchTerm, $options: 'i' } },
      { game: { $regex: searchTerm, $options: 'i' } },
      { manuf: { $regex: searchTerm, $options: 'i' } },
      { 'custom.name': { $regex: searchTerm, $options: 'i' } },
    ];
  }

  const aggregationPipeline: PipelineStage[] = [
    { $match: machineMatchStage },
    {
      $lookup: {
        from: 'gaminglocations',
        localField: 'gamingLocation',
        foreignField: '_id',
        as: 'locationDetails',
      },
    },
    { $unwind: { path: '$locationDetails', preserveNullAndEmptyArrays: true } },
  ];

  if (locationMatchStage['rel.licencee']) {
    aggregationPipeline.push({
      $match: {
        'locationDetails.rel.licencee': locationMatchStage['rel.licencee'],
      },
    });
  }

  aggregationPipeline.push(
    {
      $lookup: {
        from: 'meters',
        let: { machineId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$machine', '$$machineId'] },
                  ...(startDate && endDate
                    ? [
                        { $gte: ['$readAt', startDate] },
                        { $lte: ['$readAt', endDate] },
                      ]
                    : []),
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              drop: { $sum: { $ifNull: ['$movement.drop', 0] } },
              moneyOut: {
                $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
              },
              coinIn: { $sum: { $ifNull: ['$movement.coinIn', 0] } },
              coinOut: { $sum: { $ifNull: ['$movement.coinOut', 0] } },
              gamesPlayed: { $sum: { $ifNull: ['$movement.gamesPlayed', 0] } },
              jackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
            },
          },
        ],
        as: 'meterData',
      },
    },
    {
      $unwind: {
        path: '$meterData',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        serialNumber: 1,
        origSerialNumber: 1,
        'custom.name': 1,
        gamingLocation: 1,
        game: 1,
        manuf: 1,
        manufacturer: 1,
        lastActivity: 1,
        isSasMachine: 1,
        gameConfig: 1,
        locationName: '$locationDetails.name',
        drop: { $ifNull: ['$meterData.drop', 0] },
        moneyOut: { $ifNull: ['$meterData.moneyOut', 0] },
        gamesPlayed: { $ifNull: ['$meterData.gamesPlayed', 0] },
        jackpot: { $ifNull: ['$meterData.jackpot', 0] },
        netWin: {
          $subtract: [
            { $ifNull: ['$meterData.coinIn', 0] },
            { $ifNull: ['$meterData.coinOut', 0] },
          ],
        },
        gross: {
          $subtract: [
            { $ifNull: ['$meterData.drop', 0] },
            { $ifNull: ['$meterData.moneyOut', 0] },
          ],
        },
        holdPct: {
          $cond: [
            { $gt: [{ $ifNull: ['$meterData.coinIn', 0] }, 0] },
            {
              $multiply: [
                {
                  $divide: [
                    {
                      $subtract: [
                        { $ifNull: ['$meterData.drop', 0] },
                        { $ifNull: ['$meterData.totalCancelledCredits', 0] },
                      ],
                    },
                    { $ifNull: ['$meterData.coinIn', 0] },
                  ],
                },
                100,
              ],
            },
            0,
          ],
        },
      },
    }
  );

  const machines: Array<Record<string, unknown>> = [];
  const cursor = Machine.aggregate(aggregationPipeline).cursor({
    batchSize: 1000,
  });
  for await (const doc of cursor) {
    machines.push(doc);
  }

  const transformedMachines = machines.map(machine => {
    const gameConfig = machine.gameConfig as
      | { theoreticalRtp?: number }
      | undefined;
    return {
      machineId: (machine._id as string).toString(),
      serialNumber:
        (machine.serialNumber as string) ||
        (machine.origSerialNumber as string) ||
        '',
      customName: (machine.custom as { name?: string })?.name || '',
      machineName:
        (machine.custom as { name?: string })?.name ||
        (machine.serialNumber as string) ||
        'Unknown Machine',
      locationId: (machine.gamingLocation as string)?.toString() || '',
      locationName: (machine.locationName as string) || 'Unknown Location',
      gameTitle: (machine.game as string) || '(game name not provided)',
      manufacturer:
        (machine.manufacturer as string) ||
        (machine.manuf as string) ||
        'Unknown Manufacturer',
      isOnline: !!(
        machine.lastActivity &&
        new Date(machine.lastActivity as string) >=
          new Date(Date.now() - 3 * 60 * 1000)
      ),
      lastActivity: machine.lastActivity as string,
      isSasEnabled: (machine.isSasMachine as boolean) || false,
      drop: Math.round((Number(machine.drop) || 0) * 100) / 100,
      totalCancelledCredits:
        Math.round((Number(machine.moneyOut) || 0) * 100) / 100,
      netWin: Math.round((Number(machine.netWin) || 0) * 100) / 100,
      gross: Math.round((Number(machine.gross) || 0) * 100) / 100,
      theoreticalHold: gameConfig?.theoreticalRtp
        ? (1 - Number(gameConfig.theoreticalRtp)) * 100
        : 0,
      gamesPlayed: (machine.gamesPlayed as number) || 0,
      jackpot: (machine.jackpot as number) || 0,
      coinIn: (machine.coinIn as number) || 0,
      coinOut: (machine.coinOut as number) || 0,
      avgBet:
        (machine.gamesPlayed as number) > 0
          ? (machine.coinIn as number) / ((machine.gamesPlayed as number) || 1)
          : 0,
      actualHold: (machine.holdPct as number) || 0,
    };
  });

  return NextResponse.json({
    data: transformedMachines,
    pagination: {
      totalCount: transformedMachines.length,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
  });
}

/**
 * Fetches offline machines with pagination
 */
export async function getOfflineMachines(
  searchParams: URLSearchParams,
  page: number,
  limit: number,
  skip: number,
  startDate: Date | undefined,
  endDate: Date | undefined,
  locationMatchStage: Record<string, unknown>,
  timePeriod: string = 'Today'
) {
  // Fetch locations to get gaming day ranges
  const locationsWithOffset = await GamingLocations.find(locationMatchStage).select('gameDayOffset _id').lean();
  const gamingDayRanges = getGamingDayRangesForLocations(locationsWithOffset as any, timePeriod, startDate, endDate);

  const searchTerm = searchParams.get('search');
  const locationId = searchParams.get('locationId');
  const durationFilter =
    searchParams.get('duration') || searchParams.get('offlineDuration');
  const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

  const machineMatchStage: Record<string, unknown> = {
    $and: [
      {
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2025-01-01') } },
        ],
      },
    ],
  };

  const andArray = machineMatchStage.$and as Array<Record<string, unknown>>;

  // Apply duration filter
  if (durationFilter === 'never') {
    // Specific filter for machines that have NEVER been online
    andArray.push({ lastActivity: { $exists: false } });
  } else {
    // Default: Must have been online at some point, but not recently
    // This matches the original logic for 'offline'
    andArray.push({ lastActivity: { $exists: true, $lt: threeMinutesAgo } });

    if (durationFilter && durationFilter !== 'all') {
      const now = new Date();
      let durationThreshold: Date;

      switch (durationFilter) {
        case '1h':
          durationThreshold = new Date(now.getTime() - 1 * 60 * 60 * 1000);
          break;
        case '4h':
          durationThreshold = new Date(now.getTime() - 4 * 60 * 60 * 1000);
          break;
        case '24h':
          durationThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          durationThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        default:
          durationThreshold = threeMinutesAgo;
      }

      andArray.push({
        $or: [
          { lastActivity: { $exists: false } },
          { lastActivity: { $lt: durationThreshold } },
        ],
      });
    }
  }

  if (locationId && locationId !== 'all') {
    const locationIds = locationId.split(',').filter(id => id.trim() !== '');
    const andArray = machineMatchStage.$and as Array<Record<string, unknown>>;
    if (locationIds.length > 0) {
      andArray.push({
        gamingLocation:
          locationIds.length === 1 ? locationIds[0] : { $in: locationIds },
      });
    }
  }

  if (searchTerm && searchTerm.trim()) {
    const andArray = machineMatchStage.$and as Array<Record<string, unknown>>;
    andArray.push({
      $or: [
        { serialNumber: { $regex: searchTerm, $options: 'i' } },
        { origSerialNumber: { $regex: searchTerm, $options: 'i' } },
        { game: { $regex: searchTerm, $options: 'i' } },
        { manuf: { $regex: searchTerm, $options: 'i' } },
        { 'custom.name': { $regex: searchTerm, $options: 'i' } },
      ],
    });
  }

  const aggregationPipeline: PipelineStage[] = [
    { $match: machineMatchStage },
    {
      $lookup: {
        from: 'gaminglocations',
        localField: 'gamingLocation',
        foreignField: '_id',
        as: 'locationDetails',
      },
    },
    { $unwind: { path: '$locationDetails', preserveNullAndEmptyArrays: true } },
  ];

  if (locationMatchStage && locationMatchStage['rel.licencee']) {
    aggregationPipeline.push({
      $match: {
        'locationDetails.rel.licencee': locationMatchStage['rel.licencee'],
      },
    });
  }

  aggregationPipeline.push(
    {
      $lookup: {
        from: 'meters',
        let: { machineId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$machine', '$$machineId'] },
                  ...(startDate && endDate
                    ? [
                        { $gte: ['$readAt', startDate] },
                        { $lte: ['$readAt', endDate] },
                      ]
                    : []),
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              drop: { $sum: { $ifNull: ['$movement.drop', 0] } },
              moneyOut: {
                $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
              },
              coinIn: { $sum: { $ifNull: ['$movement.coinIn', 0] } },
              coinOut: { $sum: { $ifNull: ['$movement.coinOut', 0] } },
              gamesPlayed: { $sum: { $ifNull: ['$movement.gamesPlayed', 0] } },
              jackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
            },
          },
        ],
        as: 'meterData',
      },
    },
    {
      $unwind: {
        path: '$meterData',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        serialNumber: 1,
        origSerialNumber: 1,
        'custom.name': 1,
        'Custom.name': 1,
        gamingLocation: 1,
        game: 1,
        manuf: 1,
        manufacturer: 1,
        lastActivity: 1,
        isSasMachine: 1,
        gameConfig: 1,
        locationName: '$locationDetails.name',
        drop: { $ifNull: ['$meterData.drop', 0] },
        moneyOut: { $ifNull: ['$meterData.moneyOut', 0] },
        gamesPlayed: { $ifNull: ['$meterData.gamesPlayed', 0] },
        jackpot: { $ifNull: ['$meterData.jackpot', 0] },
        netWin: {
          $subtract: [
            { $ifNull: ['$meterData.coinIn', 0] },
            { $ifNull: ['$meterData.coinOut', 0] },
          ],
        },
        gross: {
          $subtract: [
            { $ifNull: ['$meterData.drop', 0] },
            { $ifNull: ['$meterData.moneyOut', 0] },
          ],
        },
        holdPct: {
          $cond: [
            { $gt: [{ $ifNull: ['$meterData.coinIn', 0] }, 0] },
            {
              $multiply: [
                {
                  $divide: [
                    {
                      $subtract: [
                        { $ifNull: ['$meterData.coinIn', 0] },
                        { $ifNull: ['$meterData.coinOut', 0] },
                      ],
                    },
                    { $ifNull: ['$meterData.coinIn', 0] },
                  ],
                },
                100,
              ],
            },
            0,
          ],
        },
      },
    },
    { $sort: { netWin: -1 } },
    { $skip: skip },
    { $limit: limit }
  );

  const machines: Array<Record<string, unknown>> = [];
  const cursor = Machine.aggregate(aggregationPipeline).cursor({
    batchSize: 1000,
  });
  for await (const doc of cursor) {
    machines.push(doc);
  }

  const transformedMachines = machines.map(machine => {
    const gameConfig = machine.gameConfig as
      | { theoreticalRtp?: number }
      | undefined;

    // Calculate offline labels
    const lastActivity = machine.lastActivity ? new Date(machine.lastActivity as string) : null;
    const isOnline = !!(lastActivity && lastActivity > threeMinutesAgo);
    
    let offlineTimeLabel : string | undefined = undefined;
    let actualOfflineTime : string | undefined = undefined;

    if (!isOnline && lastActivity) {
        const actualDuration = formatDistanceToNow(lastActivity, { addSuffix: true });
        actualOfflineTime = actualDuration;

        const locationId = machine.gamingLocation;
        const range = gamingDayRanges.get(String(locationId));

        if (range) {
            if (lastActivity < range.rangeStart && (timePeriod === '7d' || timePeriod === '30d' || timePeriod === 'Custom' || timePeriod === 'last7days' || timePeriod === 'last30days')) {
                const days = (timePeriod === '7d' || timePeriod === 'last7days') ? '7' : (timePeriod === '30d' || timePeriod === 'last30days') ? '30' : undefined;
                if (days) {
                    offlineTimeLabel = `within the last ${days} days`;
                } else {
                    const diffMs = range.rangeEnd.getTime() - range.rangeStart.getTime();
                    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                    offlineTimeLabel = `within the last ${diffDays} days`;
                }
            } else {
                offlineTimeLabel = actualDuration;
            }
        }
    } else if (!isOnline && !lastActivity) {
        actualOfflineTime = 'Never';
        offlineTimeLabel = 'Never';
    }

    return {
      machineId: (machine._id as string).toString(),
      serialNumber:
        (machine.serialNumber as string) ||
        (machine.origSerialNumber as string) ||
        '',
      customName: (machine.custom as { name?: string })?.name || '',
      machineName:
        (machine.custom as { name?: string })?.name ||
        (machine.serialNumber as string) ||
        'Unknown Machine',
      locationId: (machine.gamingLocation as string)?.toString() || '',
      locationName: (machine.locationName as string) || 'Unknown Location',
      gameTitle: (machine.game as string) || '(game name not provided)',
      manufacturer:
        (machine.manufacturer as string) ||
        (machine.manuf as string) ||
        'Unknown Manufacturer',
      isOnline,
      lastActivity: machine.lastActivity as string,
      offlineTimeLabel,
      actualOfflineTime,
      isSasEnabled: (machine.isSasMachine as boolean) || false,
      drop: Math.round((Number(machine.drop) || 0) * 100) / 100,
      totalCancelledCredits:
        Math.round((Number(machine.moneyOut) || 0) * 100) / 100,
      netWin: Math.round((Number(machine.netWin) || 0) * 100) / 100,
      gross: Math.round((Number(machine.gross) || 0) * 100) / 100,
      theoreticalHold: gameConfig?.theoreticalRtp
        ? (1 - Number(gameConfig.theoreticalRtp)) * 100
        : 0,
      gamesPlayed: (machine.gamesPlayed as number) || 0,
      jackpot: (machine.jackpot as number) || 0,
      coinIn: (machine.coinIn as number) || 0,
      coinOut: (machine.coinOut as number) || 0,
      avgBet:
        (machine.gamesPlayed as number) > 0
          ? (machine.coinIn as number) / (machine.gamesPlayed as number)
          : 0,
      actualHold: (machine.holdPct as number) || 0,
    };
  });

  return NextResponse.json({
    data: transformedMachines,
    pagination: {
      totalCount: transformedMachines.length,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
  });
}
