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
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching MQTT configuration
 *
 * @param {string} cabinetId - REQUIRED. Query param: The MongoDB ID of the cabinet
 *
 * Flow:
 * 1. Parse and validate request parameters
 * 2. Find cabinet by ID
 * 3. Extract MQTT configuration
 * 4. Return MQTT configuration
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/mqtt/config';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async () => {
    try {
      // ============================================================================
      // STEP 1: Parse and validate request parameters
      // ============================================================================
      const { searchParams } = new URL(request.url);
      const cabinetId = searchParams.get('cabinetId');

      if (!cabinetId) {
        logRouteError(
          functionName,
          'GET',
          '/api/mqtt/config',
          'Cabinet ID is required',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Cabinet ID is required' },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 2: Find cabinet by ID
      // ============================================================================
      const cabinet = await Machine.findOne({ _id: cabinetId });
      if (!cabinet) {
        logRouteError(
          functionName,
          'GET',
          '/api/mqtt/config',
          'Cabinet not found',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Cabinet not found' },
          { status: 404 }
        );
      }

      // ============================================================================
      // STEP 3: Extract MQTT configuration
      // ============================================================================
      const mqttConfig = extractMQTTConfig(cabinet);

      // ============================================================================
      // STEP 4: Return MQTT configuration
      // ============================================================================
      const duration = Date.now() - startTime;
      logRouteFetch(functionName, 'GET', '/api/mqtt/config', 1, user, duration);
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
      logRouteError(functionName, 'GET', '/api/mqtt/config', errorMessage, user);
      console.error(
        `[MQTT Config GET API] Error after ${duration}ms:`,
        errorMessage
      );
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      );
    }
  });
}
