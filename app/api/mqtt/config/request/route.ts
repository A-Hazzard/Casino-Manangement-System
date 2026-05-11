/**
 * MQTT Config Request API Route
 *
 * This route handles requesting current configuration from SMIB devices via MQTT.
 * It supports:
 * - Validating config request body
 * - Requesting config from SMIB via MQTT service
 * - Note: The callback will be handled by the SSE endpoint
 *
 * @module app/api/mqtt/config/request/route
 */

import { validateMQTTConfigRequest } from '@/app/api/lib/helpers/mqtt';
import { mqttService } from '@/app/api/lib/services/mqttService';
import {
  logRouteFetch,
  logRouteCreate,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main POST handler for requesting MQTT config
 *
 * @body {string} relayId - REQUIRED. The unique relay ID to request from.
 * @body {string} component - REQUIRED. The component code to request config for.
 *
 * Flow:
 * 1. Parse request body
 * 2. Validate request body
 * 3. Request config from SMIB via MQTT
 * 4. Return success response
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/mqtt/config/request';
  const user = extractUserFromRequest(request);

  try {
    // ============================================================================
    // STEP 1: Parse request body
    // ============================================================================
    const body = await request.json();
    const { relayId, component } = body as {
      relayId?: string;
      component?: string;
    };

    // ============================================================================
    // STEP 2: Validate request body
    // ============================================================================
    const validationError = validateMQTTConfigRequest(body);
    if (validationError) {
      logRouteError(
        functionName,
        'POST',
        '/api/mqtt/config/request',
        validationError,
        user
      );
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Request config from SMIB via MQTT
    // ============================================================================
    await mqttService.requestConfig(relayId!, component!);

    // ============================================================================
    // STEP 4: Return success response
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[MQTT Config Request API] Completed in ${duration}ms`);
    }
    logRouteCreate(
      functionName,
      'POST',
      '/api/mqtt/config/request',
      1,
      user,
      duration
    );
    return NextResponse.json({
      success: true,
      message: `Config request sent for ${component} to relayId: ${relayId}`,
      relayId,
      component,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logRouteError(
      functionName,
      'POST',
      '/api/mqtt/config/request',
      errorMessage,
      user
    );
    console.error(
      `[MQTT Config Request API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/mqtt/config/request
 * Get information about the request endpoint
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/mqtt/config/request';
  const user = extractUserFromRequest(request);

  const duration = Date.now() - startTime;
  logRouteFetch(
    functionName,
    'GET',
    '/api/mqtt/config/request',
    1,
    user,
    duration
  );
  return NextResponse.json({
    success: true,
    message: 'MQTT Config Request API',
    usage: {
      request:
        'POST /api/mqtt/config/request with { "relayId": "string", "component": "string" }',
      components: ['mqtt', 'ota', 'coms', 'net', 'app'],
    },
    example: {
      relayId: 'e831cdfa8384',
      component: 'mqtt',
    },
  });
}
