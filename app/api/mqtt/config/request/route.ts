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
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main POST handler for requesting MQTT config
 *
 * Flow:
 * 1. Parse request body
 * 2. Validate request body
 * 3. Request config from SMIB via MQTT
 * 4. Return success response
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

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
export async function GET() {
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

