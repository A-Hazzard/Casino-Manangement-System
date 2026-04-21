/**
 * Cabinet SMIB Config API Route
 *
 * This route handles SMIB configuration operations for a cabinet.
 * It supports:
 * - Updating SMIB configuration
 * - Sending configuration via MQTT
 * - Handling machine control commands
 * - Fetching current SMIB configuration
 *
 * @module app/api/cabinets/[cabinetId]/smib-config/route
 */

import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Machine } from '@/app/api/lib/models/machines';
import { connectDB } from '@/app/api/lib/middleware/db';
import { mqttService } from '@/app/api/lib/services/mqttService';
import type { SmibConfig } from '@/shared/types/entities';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/cabinets/[cabinetId]/smib-config
 *
 * Updates the SMIB configuration stored on the machine document, then pushes
 * the new config and/or a machine control command to the SMIB via MQTT. Called
 * when an operator saves SMIB settings or sends a control command from the cabinet panel.
 *
 * URL params:
 * @param cabinetId {string} Required (path). The cabinet (machine) ID to configure.
 *
 * Body fields:
 * @param smibConfig     {object} Optional. SMIB config sections to persist and push via MQTT.
 *   @param smibConfig.mqtt {object} Optional. MQTT broker connection settings.
 *   @param smibConfig.net  {object} Optional. Network / Wi-Fi settings.
 *   @param smibConfig.coms {object} Optional. Serial communication settings.
 *   @param smibConfig.ota  {object} Optional. OTA update settings.
 * @param smibVersion    {object} Optional. Version metadata to store on the machine record.
 * @param machineControl {object} Optional. Machine control command payload sent via MQTT.
 */
export async function POST(
  request: NextRequest
) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse route parameters and request body
    // ============================================================================
    const { pathname } = request.nextUrl;
    const cabinetId = pathname.split('/')[3];
    const data = await request.json();

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 3: Find cabinet and verify location exists
    // ============================================================================

    // CRITICAL: Use findOne with _id instead of findById (repo rule)
    const cabinet = await Machine.findOne({ _id: cabinetId });
    if (!cabinet) {
      return NextResponse.json(
        { success: false, error: 'Cabinet not found' },
        { status: 404 }
      );
    }

    // CRITICAL: Use findOne with _id instead of findById (repo rule)
    const location = await GamingLocations.findOne({ _id: cabinet.gamingLocation });
    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 4: Build update fields for SMIB config
    // ============================================================================
    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.smibConfig !== undefined) {
      const now = new Date();
      const smibConfig = { ...data.smibConfig };

      // Add updatedAt timestamp to each section that's being updated
      if (smibConfig.mqtt !== undefined) {
        smibConfig.mqtt = { ...smibConfig.mqtt, updatedAt: now };
      }
      if (smibConfig.net !== undefined) {
        smibConfig.net = { ...smibConfig.net, updatedAt: now };
      }
      if (smibConfig.coms !== undefined) {
        smibConfig.coms = { ...smibConfig.coms, updatedAt: now };
      }
      if (smibConfig.ota !== undefined) {
        smibConfig.ota = { ...smibConfig.ota, updatedAt: now };
      }

      updateFields.smibConfig = smibConfig;
    }
    if (data.smibVersion !== undefined) {
      updateFields.smibVersion = data.smibVersion;
    }

    // ============================================================================
    // STEP 5: Update machine in database
    // ============================================================================
    // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
    const updatedMachine = await Machine.findOneAndUpdate(
      { _id: cabinetId },
      updateFields,
      { new: true, runValidators: true }
    );

    if (!updatedMachine) {
      return NextResponse.json(
        { success: false, error: 'Machine not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 6: Send SMIB configuration via MQTT if provided
    // ============================================================================
    const relayId = cabinet.relayId || cabinet.smibBoard;
    if (data.smibConfig && relayId) {
      try {
        await mqttService.sendSMIBConfigUpdate(
          relayId,
          data.smibConfig as SmibConfig
        );
      } catch (mqttError) {
        console.error('Failed to send SMIB config via MQTT:', mqttError);
      }
    }

    // ============================================================================
    // STEP 7: Handle machine control commands if provided
    // ============================================================================
    if (data.machineControl && relayId) {
      try {
        await mqttService.sendMachineControlCommand(
          relayId,
          data.machineControl
        );
      } catch (mqttError) {
        console.error('Failed to send machine control command:', mqttError);
      }
    }

    // ============================================================================
    // STEP 8: Return updated machine data
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Cabinet SMIB Config POST API] Completed in ${duration}ms`);
    }
    return NextResponse.json({
      success: true,
      data: updatedMachine,
      mqttSent: !!(data.smibConfig || data.machineControl),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to update SMIB configuration';
    console.error(
      `[Cabinet SMIB Config API POST] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cabinets/[cabinetId]/smib-config
 *
 * Returns the current SMIB configuration, version metadata, and relay ID for a
 * cabinet. Called when the SMIB config panel opens to pre-populate form fields.
 *
 * URL params:
 * @param cabinetId {string} Required (path). The cabinet (machine) ID to fetch config for.
 */
export async function GET(
  request: NextRequest
) {
  const startTime = Date.now();
  const { pathname } = request.nextUrl;
  const cabinetId = pathname.split('/')[3];

  try {

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 3: Find cabinet by ID
    // ============================================================================

    // CRITICAL: Use findOne with _id instead of findById (repo rule)
    const cabinet = await Machine.findOne({ _id: cabinetId });
    if (!cabinet) {
      return NextResponse.json(
        { success: false, error: 'Cabinet not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 4: Return SMIB configuration and version
    // ============================================================================
    const relayId = cabinet.relayId || cabinet.smibBoard || '';

    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Cabinet SMIB Config GET API] Completed in ${duration}ms`);
    }
    return NextResponse.json({
      success: true,
      data: {
        smibConfig: cabinet.smibConfig || {},
        smibVersion: cabinet.smibVersion || {},
        relayId,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to fetch SMIB configuration';
    console.error(
      `[Cabinet SMIB Config API GET] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
