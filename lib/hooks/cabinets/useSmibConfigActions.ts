/**
 * useSmibConfigActions Hook
 *
 * Manages SMIB configuration update actions including network, MQTT, COMS,
 * OTA, and App configuration updates via MQTT publishing.
 *
 * @module lib/hooks/cabinets/useSmibConfigActions
 */

import { useCallback } from 'react';
import { useSmibConfigState } from './useSmibConfigState';
import { useSmibMqtt } from './useSmibMqtt';

export type UseSmibConfigActionsReturn = {
  saveConfiguration: (
    cabinetId: string,
    machineControl?: string
  ) => Promise<boolean>;
  updateNetworkConfig: (
    relayId: string,
    networkData: {
      netStaSSID?: string;
      netStaPwd?: string;
      netStaChan?: number;
    }
  ) => Promise<void>;
  updateMqttConfig: (
    relayId: string,
    mqttData: {
      mqttSecure?: number;
      mqttQOS?: number;
      mqttURI?: string;
      mqttSubTopic?: string;
      mqttPubTopic?: string;
      mqttCfgTopic?: string;
      mqttIdleTimeS?: number;
      mqttUsername?: string;
      mqttPassword?: string;
    }
  ) => Promise<void>;
  updateComsConfig: (
    relayId: string,
    comsData: {
      comsMode?: number;
      comsAddr?: number;
      comsRateMs?: number;
      comsRTE?: number;
      comsGPC?: number;
    }
  ) => Promise<void>;
  updateOtaConfig: (
    relayId: string,
    otaData: {
      otaURL?: string;
    }
  ) => Promise<void>;
  updateAppConfig: (
    relayId: string,
    appData: Record<string, unknown>
  ) => Promise<void>;
};

export function useSmibConfigActions(
  configState: ReturnType<typeof useSmibConfigState>,
  mqttHook: ReturnType<typeof useSmibMqtt>
): UseSmibConfigActionsReturn {
  const { formData, setOriginalData, setIsEditMode } = configState;
  const { publishConfigUpdate } = mqttHook;

  // ============================================================================
  // Configuration Update Actions
  // ============================================================================

  const saveConfiguration = useCallback(
    async (cabinetId: string, machineControl?: string): Promise<boolean> => {
      try {
        // Convert form data to SMIB config format
        const smibConfig = {
          coms: {
            comsMode:
              formData.communicationMode === 'sas'
                ? 0
                : formData.communicationMode === 'non sas'
                  ? 1
                  : 2,
          },
          net: {
            netMode: 1, // WiFi mode
            netStaSSID: formData.networkSSID,
            netStaPwd: formData.networkPassword,
            netStaChan: parseInt(formData.networkChannel),
          },
          mqtt: {
            mqttSecure: parseInt(formData.mqttTLS),
            mqttQOS: 1,
            mqttURI: formData.mqttHost,
            mqttSubTopic: 'smib/commands',
            mqttPubTopic: 'smib/events',
            mqttCfgTopic: 'smib/config',
            mqttIdleTimeS: parseInt(formData.mqttIdleTimeout),
            mqttUsername: formData.mqttUsername,
            mqttPassword: formData.mqttPassword,
          },
        };

        // Prepare request body
        const requestBody: { smibConfig: typeof smibConfig; machineControl?: string } =
          { smibConfig };
        if (machineControl) {
          requestBody.machineControl = machineControl;
        }

        // Update via API
        const response = await fetch(`/api/cabinets/${cabinetId}/smib-config`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          const result = await response.json();
          console.warn('✅ SMIB configuration updated successfully:', result);

          // Update original data to reflect saved state
          setOriginalData(formData);
          setIsEditMode(false);

          return true;
        } else {
          const errorData = await response.json();
          console.error('Failed to update SMIB configuration:', errorData);
          return false;
        }
      } catch (error) {
        console.error('Error updating SMIB configuration:', error);
        return false;
      }
    },
    [formData, setOriginalData, setIsEditMode]
  );

  const updateNetworkConfig = useCallback(
    async (
      relayId: string,
      networkData: {
        netStaSSID?: string;
        netStaPwd?: string;
        netStaChan?: number;
      }
    ): Promise<void> => {
      const config = {
        typ: 'cfg',
        comp: 'net',
        ...networkData,
      };

      console.warn(`📡 [HOOK] Updating network config for relayId: ${relayId}`);
      console.warn(`📡 [HOOK] Network data:`, networkData);
      console.warn(`📡 [HOOK] Final config:`, config);
      await publishConfigUpdate(relayId, config);
    },
    [publishConfigUpdate]
  );

  const updateMqttConfig = useCallback(
    async (
      relayId: string,
      mqttData: {
        mqttSecure?: number;
        mqttQOS?: number;
        mqttURI?: string;
        mqttSubTopic?: string;
        mqttPubTopic?: string;
        mqttCfgTopic?: string;
        mqttIdleTimeS?: number;
        mqttUsername?: string;
        mqttPassword?: string;
      }
    ): Promise<void> => {
      const config = {
        typ: 'cfg',
        comp: 'mqtt',
        ...mqttData,
      };

      console.warn(`📡 [HOOK] Updating MQTT config:`, config);
      await publishConfigUpdate(relayId, config);
    },
    [publishConfigUpdate]
  );

  const updateComsConfig = useCallback(
    async (
      relayId: string,
      comsData: {
        comsMode?: number;
        comsAddr?: number;
        comsRateMs?: number;
        comsRTE?: number;
        comsGPC?: number;
      }
    ): Promise<void> => {
      const config = {
        typ: 'cfg',
        comp: 'coms',
        ...comsData,
      };

      console.warn(`📡 [HOOK] Updating COMS config:`, config);
      await publishConfigUpdate(relayId, config);
    },
    [publishConfigUpdate]
  );

  const updateOtaConfig = useCallback(
    async (
      relayId: string,
      otaData: {
        otaURL?: string;
      }
    ): Promise<void> => {
      const config = {
        typ: 'cfg',
        comp: 'ota',
        ...otaData,
      };

      console.warn(`📡 [HOOK] Updating OTA config:`, config);
      await publishConfigUpdate(relayId, config);
    },
    [publishConfigUpdate]
  );

  const updateAppConfig = useCallback(
    async (
      relayId: string,
      appData: Record<string, unknown>
    ): Promise<void> => {
      const config = {
        typ: 'cfg',
        comp: 'app',
        ...appData,
      };

      console.warn(`📡 [HOOK] Updating App config:`, config);
      await publishConfigUpdate(relayId, config);
    },
    [publishConfigUpdate]
  );

  return {
    saveConfiguration,
    updateNetworkConfig,
    updateMqttConfig,
    updateComsConfig,
    updateOtaConfig,
    updateAppConfig,
  };
}