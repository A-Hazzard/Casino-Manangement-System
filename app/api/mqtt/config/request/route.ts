import { NextRequest, NextResponse } from 'next/server';
import { mqttService } from '@/lib/services/mqttService';

/**
 * POST /api/mqtt/config/request
 * Request current configuration from SMIB
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { relayId, component } = body;

    if (!relayId) {
      return NextResponse.json(
        { success: false, error: 'relayId is required' },
        { status: 400 }
      );
    }

    if (!component) {
      return NextResponse.json(
        { success: false, error: 'component is required' },
        { status: 400 }
      );
    }

    // Request config from SMIB via MQTT
    // Note: The callback will be handled by the SSE endpoint
    await mqttService.requestConfig(relayId, component);

    return NextResponse.json({
      success: true,
      message: `Config request sent for ${component} to relayId: ${relayId}`,
      relayId,
      component,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ [API] Error requesting MQTT config:', error);
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
