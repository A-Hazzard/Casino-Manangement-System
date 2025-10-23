import { NextRequest, NextResponse } from "next/server";
import { getExchangeRates, getAvailableCurrencies, getCurrencyName, getCurrencySymbol } from "@/lib/helpers/rates";
import type { CurrencyCode } from "@/shared/types/currency";

/**
 * GET /api/rates
 * Returns current exchange rates and currency information
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeMetadata = searchParams.get('includeMetadata') === 'true';

    const exchangeRates = getExchangeRates();
    const availableCurrencies = getAvailableCurrencies();
    
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
            symbol: getCurrencySymbol(currency)
          }))
        })
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch exchange rates",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
