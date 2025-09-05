import { NextRequest, NextResponse } from "next/server";
import { getExchangeRates } from "@/lib/helpers/rates";
import type { ExchangeRates } from "@/shared/types";

/**
 * GET /api/rates
 * Returns current exchange rates for currency conversion
 * No authentication required - rates are public information
 */
export async function GET(_request: NextRequest) {
  try {
    const rates = await getExchangeRates();

    // Return rates without sensitive information
    const publicRates: Omit<ExchangeRates, "lastUpdated"> & {
      lastUpdated: string;
      cacheExpiry: string;
    } = {
      baseCurrency: rates.baseCurrency,
      rates: rates.rates,
      lastUpdated: rates.lastUpdated.toISOString(),
      cacheExpiry: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
    };

    return NextResponse.json({
      success: true,
      data: publicRates,
      message: "Exchange rates retrieved successfully",
    });
  } catch (error) {
    console.error("Failed to fetch exchange rates:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch exchange rates",
        message: "Unable to retrieve current exchange rates",
      },
      { status: 500 }
    );
  }
}
