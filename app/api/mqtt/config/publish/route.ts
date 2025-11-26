/**
 * MQTT Config Publish API Route
 *
 * This route handles publishing configuration updates to SMIB devices via MQTT.
 * It supports:
 * - Validating config publish requests
 * - Publishing config updates via MQTT service
 *
 * @module app/api/mqtt/config/publish/route
 */

import { validateMQTTConfigPublish } from '@/app/api/lib/helpers/mqtt';
import { mqttService } from '@/app/api/lib/services/mqttService';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main POST handler for publishing MQTT config
 *
 * Flow:
 * 1. Parse request body
 * 2. Validate request body
 * 3. Publish config update via MQTT
 * 4. Return success response
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse request body
    // ============================================================================
    const body = await request.json();
    const { relayId, config } = body as {
      relayId?: string;
      config?: Record<string, unknown>;
    };

    // ============================================================================
    // STEP 2: Validate request body
    // ============================================================================
    const validationError = validateMQTTConfigPublish(body);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Publish config update via MQTT
    // ============================================================================
    await mqttService.publishConfig(relayId!, config!);

    // ============================================================================
    // STEP 4: Return success response
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[MQTT Config Publish API] Completed in ${duration}ms`);
    }
    return NextResponse.json({
      success: true,
      message: `Config update published for ${config!.comp} to relayId: ${relayId}`,
      relayId,
      config,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[MQTT Config Publish API] Error after ${duration}ms:`,
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
 * GET /api/mqtt/config/publish
 * Get information about the publish endpoint
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'MQTT Config Publish API',
    usage: {
      publish:
        'POST /api/mqtt/config/publish with { "relayId": "string", "config": { "typ": "cfg", "comp": "string", ... } }',
      configTypes: {
        mqtt: {
          typ: 'cfg',
          comp: 'mqtt',
          mqttSecure: 0,
          mqttQOS: 2,
          mqttURI: process.env.MQTT_URI,
          mqttSubTopic: process.env.MQTT_SUB_TOPIC,
          mqttPubTopic: process.env.MQTT_PUB_TOPIC,
          mqttCfgTopic: process.env.MQTT_CFG_TOPIC,
          mqttIdleTimeS: 30,
        },
        ota: {
          typ: 'cfg',
          comp: 'ota',
          otaURL: 'http://api.sas.backoffice.ltd/firmwares/',
        },
        coms: {
          typ: 'cfg',
          comp: 'coms',
          comsMode: 1,
          comsAddr: 1,
          comsRateMs: 200,
          comsRTE: 0,
          comsGPC: 0,
        },
      },
    },
    example: {
      relayId: 'e831cdfa8384',
      config: {
        typ: 'cfg',
        comp: 'mqtt',
        mqttSecure: 0,
        mqttQOS: 2,
        mqttURI: process.env.MQTT_URI,
        mqttSubTopic: process.env.MQTT_SUB_TOPIC,
        mqttPubTopic: process.env.MQTT_PUB_TOPIC,
        mqttCfgTopic: process.env.MQTT_CFG_TOPIC,
        mqttIdleTimeS: 30,
      },
    },
  });
}
