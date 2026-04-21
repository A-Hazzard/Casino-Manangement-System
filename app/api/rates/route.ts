/**
 * GET /api/rates
 *
 * Returns the current in-memory exchange rate table and list of supported
 * currency codes. Called by the currency conversion utilities and any UI
 * that needs to display amounts in non-base currencies. No authentication
 * required. Rates are sourced from static configuration, not a live feed.
 *
 * Query parameters:
 * @param includeMetadata {boolean} Optional. When 'true', the response includes a
 *   'currencyInfo' array with the full name and symbol for each available currency
 *   code (e.g. { code: 'TTD', name: 'Trinidad and Tobago Dollar', symbol: 'TT$' }).
 *
 * @module app/api/rates/route
 */

import {
  getAvailableCurrencies,
  getCurrencyName,
  getCurrencySymbol,
  getExchangeRates,
} from '@/lib/helpers/rates';
import type { CurrencyCode } from '@/shared/types/currency';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const includeMetadata = searchParams.get('includeMetadata') === 'true';

    // ============================================================================
    // STEP 2: Fetch exchange rates and available currencies
    // ============================================================================
    const exchangeRates = getExchangeRates();
    const availableCurrencies = getAvailableCurrencies();

    // ============================================================================
    // STEP 3: Build response with optional metadata
    // ============================================================================
    const response = {
      success: true,
      data: {
        rates: exchangeRates,
        baseCurrency: 'USD' as CurrencyCode,
        availableCurrencies,
        timestamp: new Date().toISOString(),
        ...(includeMetadata && {
          currencyInfo: availableCurrencies.map(currency => ({
            code: currency,
            name: getCurrencyName(currency),
            symbol: getCurrencySymbol(currency),
          })),
        }),
      },
    };

    // ============================================================================
    // STEP 4: Return rates and currency information
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 500) {
      console.warn(`[Rates API] Completed in ${duration}ms`);
    }

    return NextResponse.json(response);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Rates API] Error after ${duration}ms:`, errorMessage);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch exchange rates',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

