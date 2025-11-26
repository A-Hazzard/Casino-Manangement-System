/**
 * Exchange Rates API Route
 *
 * This route handles fetching current exchange rates and currency information.
 * It supports:
 * - Exchange rates retrieval
 * - Available currencies list
 * - Optional currency metadata (names, symbols)
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

/**
 * Main GET handler for fetching exchange rates
 *
 * Flow:
 * 1. Parse query parameters (includeMetadata)
 * 2. Fetch exchange rates and available currencies
 * 3. Build response with optional metadata
 * 4. Return rates and currency information
 */
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
