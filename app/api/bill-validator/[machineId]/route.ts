/**
 * Bill Validator API Route
 *
 * This route handles fetching bill validator data for a specific machine.
 * It supports:
 * - V1 and V2 data format handling
 * - Gaming day offset calculations
 * - Time period filtering
 * - Custom date range filtering
 * - Bill denomination filtering based on location settings
 *
 * @module app/api/bill-validator/[machineId]/route
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { AcceptedBill } from '@/app/api/lib/models/acceptedBills';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Machine } from '@/app/api/lib/models/machines';
import type { TimePeriod } from '@/shared/types/common';
import {
  processBillsData,
  createDateFilter,
  DEFAULT_BILL_VALIDATOR_OPTIONS,
  type BillDocument,
} from '@/app/api/lib/helpers/billValidator/validatorOperations';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/bill-validator/[machineId]
 *
 * Returns denomination-level bill validator data (counts, subtotals, and totals)
 * for a single machine, filtered by time period or a custom date range. Supports
 * both legacy V1 (value field / createdAt) and current V2 (movement object / readAt)
 * data formats. Technician-only sessions are automatically restricted to LastHour.
 *
 * URL params:
 * @param machineId  {string} Required (path). The machine whose bill validator data is fetched.
 *
 * Query params:
 * @param timePeriod  {TimePeriod} Optional. Predefined window such as 'Today', 'Yesterday',
 *                    '7d', '30d', 'Quarterly', 'All Time', or 'LastHour'. Defaults to '7d'.
 *                    Ignored when startDate + endDate are both supplied.
 *                    Forced to 'LastHour' for technician-only sessions.
 * @param startDate   {string} Optional. ISO 8601 date/datetime for custom range start.
 *                    Must be paired with endDate. Maps to createdAt (V1) or readAt (V2).
 * @param endDate     {string} Optional. ISO 8601 date/datetime for custom range end.
 *                    Must be paired with startDate.
 *
 * Flow:
 * 1. Extract machine ID from URL path
 * 2. Validate machine ID
 * 3. Parse query parameters (timePeriod, dates)
 * 4. Get machine and location data
 * 5. Restrict technicians to last hour
 * 6. Determine gaming day offset
 * 7. Query bills with appropriate date filter
 * 8. Process bills data (V1 or V2)
 * 9. Return processed bill validator data
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/bill-validator/[machineId]';
  const user = extractUserFromRequest(req);

  return withApiAuth(req, async ({ userRoles }) => {
    try {
      // ============================================================================
      // STEP 1: Extract machine ID from URL path
      // ============================================================================
      const url = new URL(req.url);
      const pathSegments = url.pathname.split('/');
      const machineId = pathSegments[pathSegments.length - 1];

      // ============================================================================
      // STEP 2: Validate machine ID
      // ============================================================================
      if (!machineId) {
        logRouteError(
          functionName,
          'GET',
          '/api/bill-validator/[machineId]',
          'Machine ID is required',
          user
        );
        return NextResponse.json(
          { error: 'Machine ID is required' },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 3: Parse query parameters
      // ============================================================================
      const searchParams = req.nextUrl.searchParams;
      let timePeriod = (searchParams.get('timePeriod') as TimePeriod) || '7d';
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      // ============================================================================
      // STEP 4: Get machine and location data
      // ============================================================================
      let gamingLocation = null;
      const machine = await Machine.findOne({ _id: machineId });

      if (machine?.gamingLocation) {
        gamingLocation = await GamingLocations.findOne({
          _id: machine.gamingLocation,
        });
      }

      // ============================================================================
      // STEP 5: Technician restriction — force LastHour for technicians only
      // ============================================================================
      const userRolesLower = userRoles.map(
        (role: string) => role?.toLowerCase?.() ?? String(role).toLowerCase()
      );
      const isOnlyTechnician =
        userRolesLower.includes('technician') &&
        !userRolesLower.some((role: string) =>
          ['admin', 'developer', 'manager', 'location admin'].includes(role)
        );

      if (isOnlyTechnician) {
        timePeriod = 'LastHour' as TimePeriod;
      }

      // ============================================================================
      // STEP 6: Determine gaming day offset
      // ============================================================================
      const gameDayOffset = gamingLocation?.gameDayOffset ?? 8;

      // ============================================================================
      // STEP 7: Query bills with appropriate date filter
      // ============================================================================
      let bills: BillDocument[] = [];
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
          const v2DateFilter = createDateFilter(
            startDate,
            endDate,
            timePeriod,
            'readAt',
            gameDayOffset
          );
          bills = await AcceptedBill.find({
            machine: machineId,
            ...v2DateFilter,
          })
            .sort({ readAt: -1 })
            .lean<BillDocument[]>();
        } else {
          const v1DateFilter = createDateFilter(
            startDate,
            endDate,
            timePeriod,
            'createdAt',
            gameDayOffset
          );
          bills = await AcceptedBill.find({
            machine: machineId,
            ...v1DateFilter,
          })
            .sort({ createdAt: -1 })
            .lean<BillDocument[]>();
        }
      }

      // Get current balance from machine
      const currentBalance = machine?.billValidator?.balance || 0;

      // Resolve location from bills if not found via machine
      if (!gamingLocation && bills.length > 0) {
        const billObj = bills[0].toObject ? bills[0].toObject() : bills[0];
        const billLocationId = billObj.location;

        if (billLocationId) {
          gamingLocation = await GamingLocations.findOne({
            _id: billLocationId,
          });
        }
      }

      const billValidatorOptions =
        gamingLocation?.billValidatorOptions || DEFAULT_BILL_VALIDATOR_OPTIONS;

      // ============================================================================
      // STEP 8: Process bills data (V1 or V2)
      // ============================================================================
      const processedData = processBillsData(
        bills,
        currentBalance,
        billValidatorOptions as Record<string, boolean>
      );

      // ============================================================================
      // STEP 9: Return processed bill validator data
      // ============================================================================
      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/bill-validator/[machineId]',
        bills.length,
        user,
        duration
      );

      if (duration > 1000) {
        console.warn(`[${functionName}] Slow response — ${duration}ms`);
      }

      return NextResponse.json({
        success: true,
        data: processedData,
        currentBalance,
        totalBills: bills.length,
        dataVersion: processedData.version,
      });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Internal server error';
      logRouteError(
        functionName,
        'GET',
        '/api/bill-validator/[machineId]',
        errorMessage,
        user
      );
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  });
}
