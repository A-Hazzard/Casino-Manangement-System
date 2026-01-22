/**
 * MQTT Configuration API Route
 *
 * This route handles fetching MQTT configuration for a specific cabinet.
 * It supports:
 * - Extracting MQTT configuration from machine document
 * - Formatting configuration values for display
 *
 * @module app/api/mqtt/config/route
 */

import { extractMQTTConfig } from '@/app/api/lib/helpers/mqtt';
import { Machine } from '@/app/api/lib/models/machines';
import { connectDB } from '@/app/api/lib/middleware/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching MQTT configuration
 *
 * Flow:
 * 1. Parse and validate request parameters
 * 2. Connect to database
 * 3. Find cabinet by ID
 * 4. Extract MQTT configuration
 * 5. Return MQTT configuration
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse and validate request parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const cabinetId = searchParams.get('cabinetId');

    if (!cabinetId) {
      return NextResponse.json(
        { success: false, error: 'Cabinet ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 3: Find cabinet by ID
    // ============================================================================
    const cabinet = await Machine.findOne({ _id: cabinetId });
    if (!cabinet) {
      return NextResponse.json(
        { success: false, error: 'Cabinet not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 4: Extract MQTT configuration
    // ============================================================================
    const mqttConfig = extractMQTTConfig(cabinet);

    // ============================================================================
    // STEP 5: Return MQTT configuration
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[MQTT Config API] Completed in ${duration}ms`);
    }
    return NextResponse.json({
      success: true,
      data: mqttConfig,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to fetch MQTT configuration';
    console.error(
      `[MQTT Config GET API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

