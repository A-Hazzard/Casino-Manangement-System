/**
 * Countries API Route
 *
 * This route handles fetching all available countries.
 * It supports:
 * - Fetching all countries sorted alphabetically
 *
 * @module app/api/countries/route
 */

import { Countries } from '@/app/api/lib/models/countries';
import { connectDB } from '@/app/api/lib/middleware/db';
import { NextResponse } from 'next/server';

/**
 * Main GET handler for fetching countries
 *
 * Flow:
 * 1. Connect to database
 * 2. Fetch all countries sorted alphabetically
 * 3. Return countries list
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Fetch all countries sorted alphabetically
    // ============================================================================
    const countries = await Countries.find({}).sort({ name: 1 }).lean();

    // ============================================================================
    // STEP 3: Return countries list
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 500) {
      console.warn(`[Countries API] Completed in ${duration}ms`);
    }

    return NextResponse.json({
      success: true,
      countries: countries,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch countries';
    console.error(`[Countries API] Error after ${duration}ms:`, errorMessage);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
