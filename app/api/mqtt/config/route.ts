import { Machine } from '@/app/api/lib/models/machines';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../lib/middleware/db';

// Helper functions to extract values from MQTT URI
function extractHostFromUri(uri?: string): string | null {
  if (!uri) return null;
  const match = uri.match(/@(.+):/);
  return match?.[1] || null;
}

function extractPortFromUri(uri?: string): string | null {
  if (!uri) return null;
  const match = uri.match(/:(\d+)/);
  return match?.[1] || null;
}

/**
 * GET /api/mqtt/config
 * Fetch MQTT configuration values for a specific cabinet
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const cabinetId = searchParams.get('cabinetId');

    if (!cabinetId) {
      return NextResponse.json(
        { success: false, error: 'Cabinet ID is required' },
        { status: 400 }
      );
    }

    // Find the cabinet
    const cabinet = await Machine.findById(cabinetId);
    if (!cabinet) {
      return NextResponse.json(
        { success: false, error: 'Cabinet not found' },
        { status: 404 }
      );
    }

    // Extract MQTT configuration values from cabinet data
    const mqttConfig = {
      // SMIB Identification
      smibId: cabinet.relayId || cabinet.smibBoard || 'No Value Provided',

      // Network Configuration
      netMode:
        cabinet.smibConfig?.net?.netMode?.toString() || 'No Value Provided',
      networkSSID: cabinet.smibConfig?.net?.netStaSSID || 'No Value Provided',
      networkPassword:
        cabinet.smibConfig?.net?.netStaPwd || 'No Value Provided',
      networkChannel:
        cabinet.smibConfig?.net?.netStaChan?.toString() || 'No Value Provided',

      // Communication Mode
      communicationMode:
        cabinet.smibConfig?.coms?.comsMode !== undefined
          ? cabinet.smibConfig.coms.comsMode === 0
            ? 'sas'
            : cabinet.smibConfig.coms.comsMode === 1
              ? 'non sas'
              : cabinet.smibConfig.coms.comsMode === 2
                ? 'IGT'
                : 'No Value Provided'
          : 'No Value Provided',

      // COMS Configuration - Individual fields
      comsMode:
        cabinet.smibConfig?.coms?.comsMode?.toString() || 'No Value Provided',
      comsAddr:
        cabinet.smibConfig?.coms?.comsAddr?.toString() || 'No Value Provided',
      comsRateMs:
        cabinet.smibConfig?.coms?.comsRateMs?.toString() || 'No Value Provided',
      comsRTE:
        cabinet.smibConfig?.coms?.comsRTE?.toString() || 'No Value Provided',
      comsGPC:
        cabinet.smibConfig?.coms?.comsGPC?.toString() || 'No Value Provided',

      // Firmware Version
      firmwareVersion: cabinet.smibVersion?.firmware || 'No Value Provided',

      // MQTT Configuration - Use machine data from database
      mqttHost:
        extractHostFromUri(cabinet.smibConfig?.mqtt?.mqttURI) ||
        'No Value Provided',
      mqttPort:
        extractPortFromUri(cabinet.smibConfig?.mqtt?.mqttURI) ||
        'No Value Provided',
      mqttTLS:
        cabinet.smibConfig?.mqtt?.mqttSecure?.toString() || 'No Value Provided',
      mqttQOS:
        cabinet.smibConfig?.mqtt?.mqttQOS?.toString() || 'No Value Provided',
      mqttIdleTimeout:
        cabinet.smibConfig?.mqtt?.mqttIdleTimeS?.toString() ||
        'No Value Provided',
      mqttUsername:
        cabinet.smibConfig?.mqtt?.mqttUsername || 'No Value Provided',
      mqttPassword:
        cabinet.smibConfig?.mqtt?.mqttPassword || 'No Value Provided',

      // MQTT Topics - Use machine data from database
      mqttPubTopic:
        cabinet.smibConfig?.mqtt?.mqttPubTopic || 'No Value Provided',
      mqttCfgTopic:
        cabinet.smibConfig?.mqtt?.mqttCfgTopic || 'No Value Provided',
      mqttSubTopic:
        cabinet.smibConfig?.mqtt?.mqttSubTopic || 'No Value Provided',
      mqttURI: cabinet.smibConfig?.mqtt?.mqttURI || 'No Value Provided',

      // Server Topic (from machine data)
      serverTopic:
        cabinet.smibConfig?.mqtt?.mqttPubTopic || 'No Value Provided',

      // OTA Configuration
      otaURL: cabinet.smibConfig?.ota?.otaURL || 'No Value Provided',
    };

    return NextResponse.json({
      success: true,
      data: mqttConfig,
    });
  } catch (error) {
    console.error('Error fetching MQTT configuration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch MQTT configuration' },
      { status: 500 }
    );
  }
}
