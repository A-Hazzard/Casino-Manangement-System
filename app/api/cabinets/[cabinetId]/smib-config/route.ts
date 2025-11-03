import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Machine } from '@/app/api/lib/models/machines';
import { mqttService } from '@/lib/services/mqttService';
import type { SmibConfig } from '@/shared/types/entities';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../lib/middleware/db';

/**
 * POST /api/cabinets/[cabinetId]/smib-config
 * Update SMIB configuration and send via MQTT
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cabinetId: string }> }
) {
  try {
    const { cabinetId } = await params;
    await connectDB();

    // Parse the request data
    const data = await request.json();
    console.warn('🔧 SMIB Config Update Request:', {
      cabinetId,
      smibConfig: data.smibConfig,
      smibVersion: data.smibVersion,
      machineControl: data.machineControl,
    });

    // Find the cabinet
    const cabinet = await Machine.findById(cabinetId);
    if (!cabinet) {
      return NextResponse.json(
        { success: false, error: 'Cabinet not found' },
        { status: 404 }
      );
    }

    // Verify location exists
    const location = await GamingLocations.findById(cabinet.gamingLocation);
    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      );
    }

    // Get original cabinet data for change tracking
    const originalCabinet = await Machine.findById(cabinetId);
    if (!originalCabinet) {
      return NextResponse.json(
        { success: false, error: 'Machine not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Handle SMIB configuration updates
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

    // Update the machine
    const updatedMachine = await Machine.findByIdAndUpdate(
      cabinetId,
      updateFields,
      { new: true, runValidators: true }
    );

    if (!updatedMachine) {
      return NextResponse.json(
        { success: false, error: 'Machine not found' },
        { status: 404 }
      );
    }

    // Send SMIB configuration via MQTT if smibConfig is provided
    const relayId = cabinet.relayId || cabinet.smibBoard;
    if (data.smibConfig && relayId) {
      try {
        console.warn('📡 Sending SMIB config via MQTT to:', relayId);
        await mqttService.sendSMIBConfigUpdate(
          relayId,
          data.smibConfig as SmibConfig
        );
        console.warn('✅ SMIB config sent successfully via MQTT');
      } catch (mqttError) {
        console.error('❌ Failed to send SMIB config via MQTT:', mqttError);
        // Don't fail the entire operation if MQTT fails
      }
    }

    // Handle machine control commands
    if (data.machineControl && relayId) {
      try {
        console.warn(
          '🎮 Sending machine control command:',
          data.machineControl
        );
        await mqttService.sendMachineControlCommand(
          relayId,
          data.machineControl
        );
        console.warn('✅ Machine control command sent successfully');
      } catch (mqttError) {
        console.error('❌ Failed to send machine control command:', mqttError);
        // Don't fail the entire operation if MQTT fails
      }
    }

    // Activity logging is handled by the frontend to ensure user context is available

    // Debug logging for troubleshooting
    console.warn('[SMIB CONFIG API] Update successful:', {
      cabinetId,
      updatedFields: Object.keys(updateFields),
      serialNumber: updatedMachine.serialNumber,
      mqttSent: !!(data.smibConfig || data.machineControl),
    });

    return NextResponse.json({
      success: true,
      data: updatedMachine,
      mqttSent: !!(data.smibConfig || data.machineControl),
    });
  } catch (error) {
    console.error('Error updating SMIB configuration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update SMIB configuration' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cabinets/[cabinetId]/smib-config
 * Get current SMIB configuration
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cabinetId: string }> }
) {
  try {
    const { cabinetId } = await params;
    await connectDB();

    // Find the cabinet
    const cabinet = await Machine.findById(cabinetId);
    if (!cabinet) {
      return NextResponse.json(
        { success: false, error: 'Cabinet not found' },
        { status: 404 }
      );
    }

    const relayId = cabinet.relayId || cabinet.smibBoard || '';

    return NextResponse.json({
      success: true,
      data: {
        smibConfig: cabinet.smibConfig || {},
        smibVersion: cabinet.smibVersion || {},
        relayId,
      },
    });
  } catch (error) {
    console.error('Error fetching SMIB configuration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch SMIB configuration' },
      { status: 500 }
    );
  }
}
