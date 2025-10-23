import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../../lib/middleware/db";
import { Machine } from "@/app/api/lib/models/machines";

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

function extractUsernameFromUri(uri?: string): string | null {
  if (!uri) return null;
  const match = uri.match(/:\/\/([^:]+):/);
  return match?.[1] || null;
}

function extractPasswordFromUri(uri?: string): string | null {
  if (!uri) return null;
  const match = uri.match(/:[^:]+:([^@]+)@/);
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
    const cabinetId = searchParams.get("cabinetId");

    if (!cabinetId) {
      return NextResponse.json(
        { success: false, error: "Cabinet ID is required" },
        { status: 400 }
      );
    }

    // Find the cabinet
    const cabinet = await Machine.findById(cabinetId);
    if (!cabinet) {
      return NextResponse.json(
        { success: false, error: "Cabinet not found" },
        { status: 404 }
      );
    }

    // Extract MQTT configuration values from cabinet data
    const mqttConfig = {
      // SMIB Identification
      smibId: cabinet.relayId || cabinet.smibBoard || "No Value Provided",

      // Network Configuration
      networkSSID: cabinet.smibConfig?.net?.netStaSSID || "No Value Provided",
      networkPassword:
        cabinet.smibConfig?.net?.netStaPwd || "No Value Provided",
      networkChannel:
        cabinet.smibConfig?.net?.netStaChan?.toString() || "No Value Provided",

      // Communication Mode
      communicationMode:
        cabinet.smibConfig?.coms?.comsMode !== undefined
          ? cabinet.smibConfig.coms.comsMode === 0
            ? "sas"
            : cabinet.smibConfig.coms.comsMode === 1
            ? "non sas"
            : cabinet.smibConfig.coms.comsMode === 2
            ? "IGT"
            : "No Value Provided"
          : "No Value Provided",

      // Firmware Version
      firmwareVersion: cabinet.smibVersion?.firmware || "No Value Provided",

      // MQTT Configuration - Extract from environment variables
      mqttHost:
        extractHostFromUri(process.env.MQTT_URI) || "mq.sas.backoffice.ltd",
      mqttPort: extractPortFromUri(process.env.MQTT_URI) || "1883",
      mqttTLS: cabinet.smibConfig?.mqtt?.mqttSecure?.toString() || "0",
      mqttIdleTimeout:
        cabinet.smibConfig?.mqtt?.mqttIdleTimeS?.toString() || "30",
      mqttUsername: extractUsernameFromUri(process.env.MQTT_URI) || "mqtt",
      mqttPassword: extractPasswordFromUri(process.env.MQTT_URI) || "mqtt",

      // MQTT Topics - Use environment variables
      mqttPubTopic: process.env.MQTT_PUB_TOPIC || "sas/relay/",
      mqttCfgTopic: process.env.MQTT_CFG_TOPIC || "smib/config",
      mqttSubTopic: process.env.MQTT_GLI_TOPIC || "sas/gli/server/",

      // Server Topic (from environment)
      serverTopic: process.env.MQTT_PUB_TOPIC || "sas/relay/",
    };

    return NextResponse.json({
      success: true,
      data: mqttConfig,
    });
  } catch (error) {
    console.error("Error fetching MQTT configuration:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch MQTT configuration" },
      { status: 500 }
    );
  }
}
