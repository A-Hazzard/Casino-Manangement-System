/**
 * Unified Cabinet Detail API Route
 *
 * This route provides a centralized endpoint for all cabinet-specific operations,
 * merging functionality from legacy machine and location-scoped routes.
 * 
 * It supports:
 * - GET: Fetch cabinet details with financial metrics and currency conversion
 * - PUT: Full update of cabinet configuration and related collections
 * - PATCH: Partial updates (restore, collection settings, SMIB config)
 * - DELETE: Soft/Hard deletion of cabinets
 *
 * @module app/api/cabinets/[cabinetId]/route
 */

import { checkUserLocationAccess } from '@/app/api/lib/helpers/licenceeFilter';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { getReviewerScale } from '@/app/api/lib/utils/reviewerScale';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Collections } from '@/app/api/lib/models/collections';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Licencee } from '@/app/api/lib/models/licencee';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import {
  convertFromUSD,
  convertToUSD,
  getCountryCurrency,
  getLicenceeCurrency,
} from '@/lib/helpers/rates';
import type {
  LocationDocument,
  MachineDocument,
} from '@/lib/types/common';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import type { CurrencyCode } from '@/shared/types/currency';
import type { TimePeriod } from '@/shared/types/common';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/cabinets/[cabinetId]
 *
 * Returns a single cabinet document augmented with aggregated financial metrics.
 * 
 * URL params:
 * @param cabinetId   {string} Required (path). The ID of the machine to retrieve.
 *
 * Query params:
 * @param timePeriod  {TimePeriod} Optional. Window for metrics (e.g. 'Today', '7d').
 * @param startDate   {string} Optional. Custom range start (ISO 8601).
 * @param endDate     {string} Optional. Custom range end (ISO 8601).
 * @param currency    {CurrencyCode} Optional. Target display currency.
 */
export async function GET(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cabinetId = pathname.split('/').pop() || '';

  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    try {
      await connectDB();
      const { searchParams } = new URL(request.url);
      const startDateParam = searchParams.get('startDate');
      const endDateParam = searchParams.get('endDate');
      const timePeriod = searchParams.get('timePeriod') as TimePeriod;
      const displayCurrency = (searchParams.get('currency') as CurrencyCode) || 'USD';

      // ============================================================================
      // STEP 1: Fetch and Validate Machine
      // ============================================================================
      const machine = (await Machine.findOne({ _id: cabinetId }).lean()) as MachineDocument;
      if (!machine) {
        return NextResponse.json({ success: false, error: 'Cabinet not found' }, { status: 404 });
      }

      const locationId = String(machine.gamingLocation);
      if (!locationId) {
        return NextResponse.json({ success: false, error: 'Cabinet has no associated location' }, { status: 400 });
      }

      // Check access
      const hasAccess = await checkUserLocationAccess(locationId);
      if (!hasAccess) {
        return NextResponse.json({ success: false, error: 'Unauthorized: Access denied' }, { status: 403 });
      }

      // ============================================================================
      // STEP 2: Fetch Location and Licensee Settings
      // ============================================================================
      const location = (await GamingLocations.findOne({ _id: locationId }).select('name gameDayOffset rel aceEnabled country').lean()) as LocationDocument | null;
      const gameDayOffset = location?.gameDayOffset ?? 8;
      const aceEnabled = location?.aceEnabled === true;

      let includeJackpot = false;
      const licenceeId = Array.isArray(location?.rel?.licencee) ? location.rel.licencee[0] : location?.rel?.licencee;
      if (licenceeId) {
        const licDoc = await Licencee.findOne({ _id: licenceeId }, { includeJackpot: 1 }).lean() as { includeJackpot?: boolean } | null;
        includeJackpot = Boolean(licDoc?.includeJackpot);
      }

      // ============================================================================
      // STEP 3: Aggregate Financial Metrics
      // ============================================================================
      const metrics = { moneyIn: 0, moneyOut: 0, jackpot: 0, gross: 0, netGross: 0, coinIn: 0, coinOut: 0, gamesPlayed: 0, gamesWon: 0, handPaidCancelledCredits: 0 };

      if (timePeriod || (startDateParam && endDateParam)) {
        let startDate: Date | undefined;
        let endDate: Date | undefined;

        if (timePeriod === 'Custom' && startDateParam && endDateParam) {
          const customStart = new Date(startDateParam.includes('T') ? startDateParam : startDateParam + 'T00:00:00.000Z');
          const customEnd = new Date(endDateParam.includes('T') ? endDateParam : endDateParam + 'T00:00:00.000Z');
          const range = getGamingDayRangeForPeriod('Custom', gameDayOffset, customStart, customEnd);
          startDate = range.rangeStart;
          endDate = range.rangeEnd;
        } else if (timePeriod !== 'All Time') {
          const range = getGamingDayRangeForPeriod((timePeriod || 'Today') as TimePeriod, gameDayOffset);
          startDate = range.rangeStart;
          endDate = range.rangeEnd;
        }

        const aggregation = await Meters.aggregate([
          { $match: { machine: cabinetId, readAt: { $gte: startDate, $lte: endDate } } },
          {
            $group: {
              _id: null,
              moneyIn: { $sum: '$movement.drop' },
              moneyOut: { $sum: '$movement.totalCancelledCredits' },
              jackpot: { $sum: '$movement.jackpot' },
              coinIn: { $sum: { $ifNull: ['$movement.coinIn', 0] } },
              coinOut: { $sum: { $ifNull: ['$movement.coinOut', 0] } },
              gamesPlayed: { $sum: { $ifNull: ['$movement.gamesPlayed', 0] } },
              gamesWon: { $sum: { $ifNull: ['$movement.gamesWon', 0] } },
              handPaidCancelledCredits: { $sum: { $ifNull: ['$movement.handPaidCancelledCredits', 0] } }
            }
          }
        ]);

        if (aggregation[0]) {
          const raw = aggregation[0];
          const mult = getReviewerScale(userPayload as { multiplier?: number | null; roles?: string[] });
          
          metrics.moneyIn = raw.moneyIn * mult;
          metrics.jackpot = raw.jackpot * mult;
          const rawCancelled = raw.moneyOut * mult;
          metrics.moneyOut = rawCancelled + (includeJackpot ? metrics.jackpot : 0);
          metrics.gross = metrics.moneyIn - metrics.moneyOut;
          metrics.netGross = metrics.gross - metrics.jackpot;
          metrics.coinIn = raw.coinIn;
          metrics.coinOut = raw.coinOut;
          metrics.gamesPlayed = raw.gamesPlayed;
          metrics.gamesWon = raw.gamesWon;
          metrics.handPaidCancelledCredits = raw.handPaidCancelledCredits;
        }
      }

      // ============================================================================
      // STEP 4: Apply Currency Conversion
      // ============================================================================
      const isStaff = userRoles.some(r => ['cashier', 'vault-manager'].includes(r.toLowerCase()));
      if (displayCurrency && !isStaff && (metrics.moneyIn !== 0 || metrics.moneyOut !== 0)) {
        let nativeCurrency: CurrencyCode = 'USD';
        if (licenceeId) {
          const lic = await Licencee.findOne({ _id: licenceeId }, { name: 1 }).lean() as { name: string } | null;
          if (lic) nativeCurrency = getLicenceeCurrency(lic.name);
        } else if (location?.country) {
          nativeCurrency = getCountryCurrency(location.country);
        }

        if (nativeCurrency !== displayCurrency) {
          metrics.moneyIn = convertFromUSD(convertToUSD(metrics.moneyIn, nativeCurrency), displayCurrency);
          metrics.moneyOut = convertFromUSD(convertToUSD(metrics.moneyOut, nativeCurrency), displayCurrency);
          metrics.jackpot = convertFromUSD(convertToUSD(metrics.jackpot, nativeCurrency), displayCurrency);
          metrics.coinIn = convertFromUSD(convertToUSD(metrics.coinIn, nativeCurrency), displayCurrency);
          metrics.coinOut = convertFromUSD(convertToUSD(metrics.coinOut, nativeCurrency), displayCurrency);
          metrics.gross = metrics.moneyIn - metrics.moneyOut;
          metrics.netGross = metrics.gross - metrics.jackpot;
        }
      }

      // ============================================================================
      // STEP 5: Transform and Return Data
      // ============================================================================
      const transformed = {
        ...machine,
        locationName: location?.name || 'Unknown Location',
        aceEnabled,
        includeJackpot,
        ...metrics,
        // UI expects serialNumber/assetNumber consistency
        assetNumber: machine.serialNumber,
        status: machine.assetStatus
      };

      return NextResponse.json({ success: true, data: transformed });
    } catch (error) {
      console.error('[Cabinet API GET] Error:', error);
      return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
  });
}

/**
 * PUT /api/cabinets/[cabinetId]
 */
export async function PUT(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cabinetId = pathname.split('/').pop() || '';

  return withApiAuth(request, async () => {
    try {
      await connectDB();
      const data = await request.json();
      const originalCabinet = await Machine.findOne({ _id: cabinetId });
      if (!originalCabinet) return NextResponse.json({ success: false, error: 'Cabinet not found' }, { status: 404 });

      // Build update fields (standardized mapping)
      const updateFields: Record<string, string | number | boolean | Date | object> = { updatedAt: new Date() };
      if (data.assetNumber) updateFields.serialNumber = data.assetNumber;
      if (data.installedGame) updateFields.game = data.installedGame;
      if (data.gameType) updateFields.gameType = data.gameType;
      if (data.manufacturer) { updateFields.manufacturer = data.manufacturer; updateFields.manuf = data.manufacturer; }
      if (data.status) updateFields.assetStatus = data.status;
      if (data.cabinetType) updateFields.cabinetType = data.cabinetType;
      if (data.accountingDenomination) updateFields['gameConfig.accountingDenomination'] = Number(data.accountingDenomination);
      
      const mult = data.collectionMultiplier ?? data.collectorDenomination;
      if (mult !== undefined) { updateFields.collectionMultiplier = String(mult); updateFields.collectorDenomination = Number(mult); }
      
      if (data.isCronosMachine !== undefined) updateFields.isSasMachine = !data.isCronosMachine;
      
      const smib = data.smbId ?? data.smibBoard ?? data.relayId;
      if (smib !== undefined) { updateFields.relayId = smib; updateFields.smibBoard = smib; updateFields.smbId = smib; }

      const updatedMachine = await Machine.findOneAndUpdate({ _id: cabinetId }, { $set: updateFields }, { new: true });

      // Cascade updates to Collections
      if (data.assetNumber && data.assetNumber !== originalCabinet.serialNumber) {
        await Collections.updateMany({ machineId: cabinetId }, { $set: { serialNumber: data.assetNumber } });
      }
      if (data.installedGame && data.installedGame !== originalCabinet.game) {
        await Collections.updateMany({ machineId: cabinetId }, { $set: { machineName: data.installedGame } });
      }

      return NextResponse.json({ success: true, data: updatedMachine });
    } catch (_id) {
      return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 });
    }
  });
}

/**
 * PATCH /api/cabinets/[cabinetId]
 */
export async function PATCH(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cabinetId = pathname.split('/').pop() || '';

  return withApiAuth(request, async () => {
    try {
      await connectDB();
      const data = await request.json();

      if (data.action === 'restore') {
        const restored = await Machine.findOneAndUpdate({ _id: cabinetId }, { $unset: { deletedAt: 1 }, $set: { updatedAt: new Date() } }, { new: true });
        return NextResponse.json({ success: true, data: restored });
      }

      const updateFields: Record<string, string | number | boolean | Date | object> = { updatedAt: new Date() };
      if (data.collectionMeters) updateFields.collectionMeters = data.collectionMeters;
      if (data.collectionTime) updateFields.collectionTime = data.collectionTime;
      if (data.smibConfig) updateFields.smibConfig = data.smibConfig;
      if (data.smibVersion) updateFields.smibVersion = data.smibVersion;
      if (data.custom?.name) updateFields['custom.name'] = data.custom.name;

      const patched = await Machine.findOneAndUpdate({ _id: cabinetId }, { $set: updateFields }, { new: true });
      return NextResponse.json({ success: true, data: patched });
    } catch (_id) {
       return NextResponse.json({ success: false, error: 'Patch failed' }, { status: 500 });
    }
  });
}

/**
 * DELETE /api/cabinets/[cabinetId]
 */
export async function DELETE(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cabinetId = pathname.split('/').pop() || '';
  const hardDelete = request.nextUrl.searchParams.get('hardDelete') === 'true';

  return withApiAuth(request, async ({ isAdminOrDev }) => {
    try {
      await connectDB();
      if (hardDelete && isAdminOrDev) {
        await Machine.deleteOne({ _id: cabinetId });
      } else {
        await Machine.findOneAndUpdate({ _id: cabinetId }, { $set: { deletedAt: new Date(), updatedAt: new Date() } });
      }
      return NextResponse.json({ success: true, message: 'Deleted' });
    } catch (_id) {
       return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 });
    }
  });
}
