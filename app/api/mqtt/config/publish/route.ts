import { mqttService } from '@/lib/services/mqttService';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/mqtt/config/publish
 * Publish configuration updates to SMIB
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { relayId, config } = body;

    console.warn(`📡 [API] Received publish request for relayId: ${relayId}`);
    console.warn(`📡 [API] Config:`, config);

    if (!relayId) {
      return NextResponse.json(
        { success: false, error: 'relayId is required' },
        { status: 400 }
      );
    }

    if (!config) {
      return NextResponse.json(
        { success: false, error: 'config object is required' },
        { status: 400 }
      );
    }

    // Validate config structure
    if (!config.typ || !config.comp) {
      return NextResponse.json(
        {
          success: false,
          error: "config must include 'typ' and 'comp' fields",
        },
        { status: 400 }
      );
    }

    // Publish config update to SMIB via MQTT
    console.warn(`📡 [API] Publishing config update to MQTT service...`);
    await mqttService.publishConfig(relayId, config);
    console.warn(`📡 [API] Config update published successfully`);

    return NextResponse.json({
      success: true,
      message: `Config update published for ${config.comp} to relayId: ${relayId}`,
      relayId,
      config,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error publishing MQTT config:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
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
          mqttURI: 'mqtt://mqtt:mqtt@mq.sas.backoffice.ltd:1883',
          mqttSubTopic: 'sas/relay/',
          mqttPubTopic: 'sas/gy/server',
          mqttCfgTopic: 'smib/config',
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
        mqttURI: 'mqtt://mqtt:mqtt@mq.sas.backoffice.ltd:1883',
        mqttSubTopic: 'sas/relay/',
        mqttPubTopic: 'sas/gy/server',
        mqttCfgTopic: 'smib/config',
        mqttIdleTimeS: 30,
      },
    },
  });
}
