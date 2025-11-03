import { NextRequest, NextResponse } from 'next/server';
import { AcceptedBill } from '@/app/api/lib/models/acceptedBills';
import { Machine } from '@/app/api/lib/models/machines';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import type { TimePeriod } from '@/app/api/lib/types';
import { connectDB } from '@/app/api/lib/middleware/db';

type BillDocument = {
  toObject?: () => Record<string, unknown>;
  value?: number;
  movement?: Record<string, number> & {
    dollarTotalUnknown?: number;
  };
  readAt?: Date;
  createdAt?: Date;
} & Record<string, unknown>;

export async function GET(req: NextRequest) {
  try {
    const db = await connectDB();
    if (!db) {
      console.error('Database connection failed');
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Extract machineId from the URL path
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const machineId = pathSegments[pathSegments.length - 1];

    if (!machineId) {
      return NextResponse.json(
        { error: 'Machine ID is required' },
        { status: 400 }
      );
    }

    const searchParams = req.nextUrl.searchParams;

    // Get time period and date range from query params
    const timePeriod = (searchParams.get('timePeriod') as TimePeriod) || '7d';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Get gaming location first to access gameDayOffset for proper date filtering
    let gamingLocation = null;

    // First try to get location from machine
    const machine = await Machine.findById(machineId);
    console.warn(`[BILL VALIDATOR] Machine lookup:`, {
      machineId,
      machineFound: !!machine,
      locationId: machine?.locationId,
    });

    if (machine?.locationId) {
      gamingLocation = await GamingLocations.findById(machine.locationId);
      console.warn(`[BILL VALIDATOR] Location lookup:`, {
        locationId: machine.locationId,
        locationFound: !!gamingLocation,
        gameDayOffset: gamingLocation?.gameDayOffset,
      });
    }

    // If no location found via machine, we'll get it from bills data later
    const gameDayOffset = gamingLocation?.gameDayOffset ?? 8; // Default to 8 AM Trinidad time (Rule 1)

    // Calculate date range with gaming day support
    let dateFilter: Record<string, unknown> = {};
    if (startDate && endDate) {
      // Custom date range - use the exact dates provided by the user without gaming day offset
      // The Date constructor already handles the local time to UTC conversion
      const customStart = new Date(startDate);
      const customEnd = new Date(endDate);

      dateFilter = {
        createdAt: { $gte: customStart, $lte: customEnd },
      };

      console.warn(`[BILL VALIDATOR] Custom date range (V1):`, {
        startDate,
        endDate,
        customStart: customStart.toISOString(),
        customEnd: customEnd.toISOString(),
      });
    } else if (timePeriod && timePeriod !== 'All Time') {
      // Predefined time period - use gaming day range utilities
      const gamingDayRange = getGamingDayRangeForPeriod(
        timePeriod,
        gameDayOffset
      );
      dateFilter = {
        createdAt: {
          $gte: gamingDayRange.rangeStart,
          $lte: gamingDayRange.rangeEnd,
        },
      };
    }

    // Query accepted bills for the machine
    let bills;
    let v2DateFilter: Record<string, unknown> = {};

    // First, check if we have V1 or V2 data by looking at one bill
    const sampleBill = await AcceptedBill.findOne({ machine: machineId });
    if (sampleBill) {
      const sampleBillObj = sampleBill.toObject
        ? sampleBill.toObject()
        : sampleBill;
      const isV2 =
        sampleBillObj.movement &&
        typeof sampleBillObj.movement === 'object' &&
        sampleBillObj.value === undefined;

      if (isV2) {
        // V2: Use readAt field for filtering
        if (startDate && endDate) {
          // Custom date range - use the exact dates provided by the user without gaming day offset
          // The Date constructor already handles the local time to UTC conversion
          const customStart = new Date(startDate);
          const customEnd = new Date(endDate);

          v2DateFilter = {
            readAt: { $gte: customStart, $lte: customEnd },
          };

          console.warn(`[BILL VALIDATOR] Custom date range (V2):`, {
            startDate,
            endDate,
            customStart: customStart.toISOString(),
            customEnd: customEnd.toISOString(),
          });
        } else if (timePeriod && timePeriod !== 'All Time') {
          // Predefined time period - use gaming day range utilities
          const gamingDayRange = getGamingDayRangeForPeriod(
            timePeriod,
            gameDayOffset
          );
          v2DateFilter = {
            readAt: {
              $gte: gamingDayRange.rangeStart,
              $lte: gamingDayRange.rangeEnd,
            },
          };

          console.warn(`[BILL VALIDATOR] V2 gaming day range:`, {
            timePeriod,
            gameDayOffset,
            rangeStart: gamingDayRange.rangeStart.toISOString(),
            rangeEnd: gamingDayRange.rangeEnd.toISOString(),
          });
        }

        bills = await AcceptedBill.find({
          machine: machineId,
          ...v2DateFilter,
        }).sort({ readAt: -1 });

        console.warn(`[BILL VALIDATOR] Using V2 filtering (readAt field)`);
        console.warn(
          `[BILL VALIDATOR] V2 Date filter:`,
          JSON.stringify(v2DateFilter, null, 2)
        );
      } else {
        // V1: Use createdAt field for filtering
        bills = await AcceptedBill.find({
          machine: machineId,
          ...dateFilter,
        }).sort({ createdAt: -1 });

        console.warn(`[BILL VALIDATOR] Using V1 filtering (createdAt field)`);
      }
    } else {
      bills = [];
    }

    console.warn(
      `[BILL VALIDATOR] Found ${bills.length} bills for machine ${machineId}`
    );

    // Log the date filter that was actually used
    if (bills.length > 0) {
      const sampleBill = bills[0];
      const sampleBillObj = sampleBill.toObject
        ? sampleBill.toObject()
        : sampleBill;
      const isV2 =
        sampleBillObj.movement &&
        typeof sampleBillObj.movement === 'object' &&
        sampleBillObj.value === undefined;

      if (isV2) {
        console.warn(
          `[BILL VALIDATOR] V2 Date filter used:`,
          JSON.stringify(v2DateFilter, null, 2)
        );
      } else {
        console.warn(
          `[BILL VALIDATOR] V1 Date filter used:`,
          JSON.stringify(dateFilter, null, 2)
        );
      }
    } else {
      console.warn(
        `[BILL VALIDATOR] No bills found, date filter:`,
        JSON.stringify(dateFilter, null, 2)
      );
    }

    console.warn(`[BILL VALIDATOR] Time period:`, timePeriod);
    console.warn(`[BILL VALIDATOR] Game day offset:`, gameDayOffset);

    // Log first few bills to understand the data structure
    if (bills.length > 0) {
      const firstBill = bills[0];
      const billObj = firstBill.toObject ? firstBill.toObject() : firstBill;
      console.warn(`[BILL VALIDATOR] First bill structure:`, {
        hasValue: billObj.value !== undefined,
        hasMovement: billObj.movement !== undefined,
        value: billObj.value,
        createdAt: billObj.createdAt,
        readAt: billObj.readAt,
        movementKeys: billObj.movement ? Object.keys(billObj.movement) : 'none',
      });
    }

    // Get current balance from machine
    const currentBalance = machine?.billValidator?.balance || 0;

    // If no location found via machine, try to get it from the bills data
    if (!gamingLocation && bills.length > 0) {
      const firstBill = bills[0];
      // Convert Mongoose document to plain object to access all fields
      const billObj = firstBill.toObject ? firstBill.toObject() : firstBill;
      const billLocationId = billObj.location;

      if (billLocationId) {
        gamingLocation = await GamingLocations.findById(billLocationId);
      }
    }

    // Location lookup completed - filtering will be applied based on billValidatorOptions

    const billValidatorOptions = gamingLocation?.billValidatorOptions || {
      denom1: true,
      denom2: true,
      denom5: true,
      denom10: true,
      denom20: true,
      denom50: true,
      denom100: true,
      denom200: true,
      denom500: true,
      denom1000: true,
      denom2000: true,
      denom5000: true,
      denom10000: true,
    };

    // console.warn(`[BILL VALIDATOR] Final bill validator options:`, billValidatorOptions);
    // console.warn(`[BILL VALIDATOR] Number of bills to process:`, bills.length);

    // Process bills to detect V1 vs V2 and calculate totals
    const processedData = processBillsData(
      bills,
      currentBalance,
      billValidatorOptions
    );

    // console.warn(`[BILL VALIDATOR] ===== FINAL RESULT =====`);
    // console.warn(`[BILL VALIDATOR] Processed denominations:`, processedData.denominations);

    return NextResponse.json({
      success: true,
      data: processedData,
      currentBalance,
      totalBills: bills.length,
      dataVersion: processedData.version,
    });
  } catch (error) {
    console.error('Error fetching bill validator data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function processBillsData(
  bills: BillDocument[],
  currentBalance: number,
  billValidatorOptions: Record<string, boolean>
) {
  if (bills.length === 0) {
    return {
      version: 'none',
      denominations: [],
      totalAmount: 0,
      totalQuantity: 0,
      unknownBills: 0,
    };
  }

  // Check if we have V1 or V2 data by looking at the first bill
  const firstBill = bills[0];

  // Convert Mongoose document to plain object to access actual properties
  const firstBillObj = firstBill.toObject ? firstBill.toObject() : firstBill;

  // V1: Uses value field (e.g., value: 5) - filter by createdAt (legacy format)
  // V2: Uses movement object (e.g., movement.dollar1) - filter by readAt (current format)
  // V1 data has BOTH value and movement fields, but we prioritize value field for counting
  const isV1 = firstBillObj.value !== undefined;
  const isV2 =
    firstBillObj.movement &&
    typeof firstBillObj.movement === 'object' &&
    firstBillObj.value === undefined;

  if (isV1) {
    console.warn('[BILL VALIDATOR] Using V1 data structure (value field)');
    return processV1Data(bills, currentBalance, billValidatorOptions);
  } else if (isV2) {
    console.warn('[BILL VALIDATOR] Using V2 data structure (movement object)');
    return processV2Data(bills, currentBalance, billValidatorOptions);
  } else {
    console.warn('[BILL VALIDATOR] Unknown data structure, defaulting to V1');
    return processV1Data(bills, currentBalance, billValidatorOptions);
  }
}

function processV1Data(
  bills: BillDocument[],
  currentBalance: number,
  billValidatorOptions: Record<string, boolean>
) {
  // V1: Count documents by value field
  const denominationTotals: Record<number, number> = {};
  let maxDenomination = 0; // Track the highest denomination found in the data

  // console.warn(`[BILL VALIDATOR] Processing ${bills.length} V1 bills`);

  bills.forEach((bill: BillDocument, _index: number) => {
    // Convert Mongoose document to plain object
    const billObj = bill.toObject ? bill.toObject() : bill;

    // if (_index < 5) { // Log first 5 bills for debugging
    //   console.warn(`[BILL VALIDATOR] V1 Bill ${_index}:`, JSON.stringify(billObj, null, 2));
    // }

    if (billObj.value !== undefined) {
      const value = Number(billObj.value);

      // Track the maximum denomination found in the data
      maxDenomination = Math.max(maxDenomination, value);

      // Always initialize denomination totals, but only add values if enabled
      if (!denominationTotals[value]) {
        denominationTotals[value] = 0;
      }

      // Check if this denomination is allowed by billValidatorOptions
      const denominationKey = getDenominationKey(value);
      const isEnabled = billValidatorOptions[denominationKey] === true;

      if (isEnabled) {
        denominationTotals[value]++;
        // console.warn(`[BILL VALIDATOR] ADDED V1 bill value ${value} (${denominationKey} enabled)`);
      } else {
        // console.warn(`[BILL VALIDATOR] FILTERED OUT V1 bill value ${value} (${denominationKey} disabled) - showing as 0`);
      }
    }
  });

  // console.warn("[BILL VALIDATOR] V1 denomination totals:", denominationTotals);

  // Create dynamic denomination range based on the maximum found in the data
  const allDenominations = [
    1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000,
  ].filter(value => value <= maxDenomination || maxDenomination === 0); // Show all if no data

  const denominations = allDenominations.map(value => ({
    denomination: value,
    label: `$${value}`,
    quantity: denominationTotals[value] || 0,
    subtotal: (denominationTotals[value] || 0) * value,
  }));

  const totalAmount = denominations.reduce(
    (sum, item) => sum + item.subtotal,
    0
  );
  const totalQuantity = denominations.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return {
    version: 'v1',
    denominations,
    totalAmount,
    totalQuantity,
    unknownBills: 0, // V1 doesn't have unknown bills
    currentBalance,
  };
}

function processV2Data(
  bills: BillDocument[],
  currentBalance: number,
  billValidatorOptions: Record<string, boolean>
) {
  // V2: Use movement object from each bill
  const denominationTotals: Record<
    string,
    { quantity: number; subtotal: number }
  > = {};
  let maxDenomination = 0; // Track the highest denomination found in the data

  // console.warn(`[BILL VALIDATOR] Processing ${bills.length} V2 bills`);

  bills.forEach((bill: BillDocument, _index: number) => {
    // Convert Mongoose document to plain object
    const billObj = bill.toObject ? bill.toObject() : bill;

    // if (_index < 3) { // Log first 3 bills for debugging
    //   console.warn(`[BILL VALIDATOR] V2 Bill ${_index}:`, JSON.stringify(billObj, null, 2));
    // }

    if (billObj.movement) {
      const denominationMap = [
        { key: 'dollar1', value: 1, optionKey: 'denom1' },
        { key: 'dollar2', value: 2, optionKey: 'denom2' },
        { key: 'dollar5', value: 5, optionKey: 'denom5' },
        { key: 'dollar10', value: 10, optionKey: 'denom10' },
        { key: 'dollar20', value: 20, optionKey: 'denom20' },
        { key: 'dollar50', value: 50, optionKey: 'denom50' },
        { key: 'dollar100', value: 100, optionKey: 'denom100' },
        { key: 'dollar200', value: 200, optionKey: 'denom200' },
        { key: 'dollar500', value: 500, optionKey: 'denom500' },
        { key: 'dollar1000', value: 1000, optionKey: 'denom1000' },
        { key: 'dollar2000', value: 2000, optionKey: 'denom2000' },
        { key: 'dollar5000', value: 5000, optionKey: 'denom5000' },
        { key: 'dollar10000', value: 10000, optionKey: 'denom10000' },
      ];

      denominationMap.forEach(({ key, value, optionKey }) => {
        const quantity =
          (billObj.movement as Record<string, number>)?.[key] || 0;

        // Track the maximum denomination found in the data
        if (quantity > 0) {
          maxDenomination = Math.max(maxDenomination, value);
        }

        // Always initialize denomination totals, but only add values if enabled
        if (!denominationTotals[key]) {
          denominationTotals[key] = { quantity: 0, subtotal: 0 };
        }

        // Check if this denomination is allowed by billValidatorOptions
        if (quantity > 0) {
          const isEnabled = billValidatorOptions[optionKey] === true;

          if (isEnabled) {
            denominationTotals[key].quantity += quantity;
            denominationTotals[key].subtotal += quantity * value;
            // console.warn(`[BILL VALIDATOR]  ADDED ${key}: ${quantity} bills (${optionKey} enabled)`);
          } else {
            // console.warn(`[BILL VALIDATOR] ❌ FILTERED OUT ${key}: ${quantity} bills (${optionKey} disabled) - showing as 0`);
          }
        }
      });
    }
  });

  // Create dynamic denomination range based on the maximum found in the data
  const allDenominations = [
    { key: 'dollar1', value: 1 },
    { key: 'dollar2', value: 2 },
    { key: 'dollar5', value: 5 },
    { key: 'dollar10', value: 10 },
    { key: 'dollar20', value: 20 },
    { key: 'dollar50', value: 50 },
    { key: 'dollar100', value: 100 },
    { key: 'dollar200', value: 200 },
    { key: 'dollar500', value: 500 },
    { key: 'dollar1000', value: 1000 },
    { key: 'dollar2000', value: 2000 },
    { key: 'dollar5000', value: 5000 },
    { key: 'dollar10000', value: 10000 },
  ].filter(({ value }) => value <= maxDenomination || maxDenomination === 0); // Show all if no data

  const denominations = allDenominations
    .map(({ key, value }) => {
      const data = denominationTotals[key] || { quantity: 0, subtotal: 0 };
      return {
        denomination: value,
        label: `$${value}`,
        quantity: data.quantity,
        subtotal: data.subtotal,
      };
    })
    .sort((a, b) => a.denomination - b.denomination);

  const totalAmount = denominations.reduce(
    (sum, item) => sum + item.subtotal,
    0
  );
  const totalQuantity = denominations.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  // Calculate total known and unknown amounts from movement objects, respecting billValidatorOptions
  const totalKnownAmount = bills.reduce((sum: number, bill: BillDocument) => {
    const billObj = bill.toObject ? bill.toObject() : bill;
    const movement = billObj.movement as
      | (Record<string, number> & { dollarTotal?: number })
      | undefined;

    if (!movement) return sum;

    // Only include amounts for enabled denominations
    const denominationMap = [
      { key: 'dollar1', optionKey: 'denom1' },
      { key: 'dollar2', optionKey: 'denom2' },
      { key: 'dollar5', optionKey: 'denom5' },
      { key: 'dollar10', optionKey: 'denom10' },
      { key: 'dollar20', optionKey: 'denom20' },
      { key: 'dollar50', optionKey: 'denom50' },
      { key: 'dollar100', optionKey: 'denom100' },
      { key: 'dollar200', optionKey: 'denom200' },
      { key: 'dollar500', optionKey: 'denom500' },
      { key: 'dollar1000', optionKey: 'denom1000' },
      { key: 'dollar2000', optionKey: 'denom2000' },
      { key: 'dollar5000', optionKey: 'denom5000' },
      { key: 'dollar10000', optionKey: 'denom10000' },
    ];

    let billKnownAmount = 0;
    denominationMap.forEach(({ key, optionKey }) => {
      const quantity = movement[key] || 0;
      const denominationValue = parseInt(key.replace('dollar', ''));
      if (quantity > 0 && billValidatorOptions[optionKey] === true) {
        billKnownAmount += quantity * denominationValue;
      }
    });

    return sum + billKnownAmount;
  }, 0);

  const totalUnknownAmount = bills.reduce((sum: number, bill: BillDocument) => {
    const billObj = bill.toObject ? bill.toObject() : bill;
    const movement = billObj.movement as
      | (Record<string, number> & { dollarTotalUnknown?: number })
      | undefined;
    return sum + (movement?.dollarTotalUnknown || 0);
  }, 0);

  return {
    version: 'v2',
    denominations,
    totalAmount,
    totalQuantity,
    totalKnownAmount,
    totalUnknownAmount,
    unknownBills: totalUnknownAmount, // Keep for backward compatibility
    currentBalance,
  };
}

// getDenominationValue function removed - no longer needed

function getDenominationKey(value: number): string {
  const map: Record<number, string> = {
    1: 'denom1',
    2: 'denom2',
    5: 'denom5',
    10: 'denom10',
    20: 'denom20',
    50: 'denom50',
    100: 'denom100',
    500: 'denom500',
    1000: 'denom1000',
    2000: 'denom2000',
    5000: 'denom5000',
  };
  return map[value] || '';
}
