/**
 * Custom hook for managing SMIB configuration state and logic
 * Extracts complex SMIB configuration logic from the Cabinet Details page
 */

import { useState, useCallback, useEffect, useRef } from "react";
import {
  GamingMachine as CabinetDetail,
  SmibConfig,
} from "@/shared/types/entities";

type MqttConfigData = {
  smibId: string;
  networkSSID: string;
  networkPassword: string;
  networkChannel: string;
  communicationMode: string;
  firmwareVersion: string;
  mqttHost: string;
  mqttPort: string;
  mqttTLS: string;
  mqttIdleTimeout: string;
  mqttUsername: string;
  mqttPassword: string;
  mqttPubTopic: string;
  mqttCfgTopic: string;
  mqttSubTopic: string;
  serverTopic: string;
};

type UseSmibConfigurationReturn = {
  smibConfigExpanded: boolean;
  communicationMode: string;
  firmwareVersion: string;
  isEditMode: boolean;
  mqttConfigData: MqttConfigData | null;
  isLoadingMqttConfig: boolean;
  isConnectedToMqtt: boolean;
  formData: {
    communicationMode: string;
    firmwareVersion: string;
    networkSSID: string;
    networkPassword: string;
    networkChannel: string;
    mqttHost: string;
    mqttPort: string;
    mqttTLS: string;
    mqttIdleTimeout: string;
    mqttUsername: string;
    mqttPassword: string;
    // COMS fields
    comsMode: string;
    comsAddr: string;
    comsRateMs: string;
    comsRTE: string;
    comsGPC: string;
    // MQTT Topics fields
    mqttPubTopic: string;
    mqttCfgTopic: string;
    mqttURI: string;
  };
  originalData: {
    communicationMode: string;
    firmwareVersion: string;
    networkSSID: string;
    networkPassword: string;
    networkChannel: string;
    mqttHost: string;
    mqttPort: string;
    mqttTLS: string;
    mqttIdleTimeout: string;
    mqttUsername: string;
    mqttPassword: string;
    // COMS fields
    comsMode: string;
    comsAddr: string;
    comsRateMs: string;
    comsRTE: string;
    comsGPC: string;
    // MQTT Topics fields
    mqttPubTopic: string;
    mqttCfgTopic: string;
    mqttURI: string;
  };
  toggleSmibConfig: () => void;
  setEditMode: (edit: boolean) => void;
  setCommunicationModeFromData: (data: CabinetDetail) => void;
  setFirmwareVersionFromData: (data: CabinetDetail) => void;
  updateFormData: (field: string, value: string) => void;
  resetFormData: () => void;
  saveConfiguration: (
    cabinetId: string,
    machineControl?: string
  ) => Promise<boolean>;
  fetchMqttConfig: (cabinetId: string) => Promise<void>;
  connectToConfigStream: (relayId: string) => void;
  disconnectFromConfigStream: () => void;
  requestLiveConfig: (relayId: string, component: string) => Promise<void>;
  publishConfigUpdate: (relayId: string, config: object) => Promise<void>;
};

export function useSmibConfiguration(): UseSmibConfigurationReturn {
  const [smibConfigExpanded, setSmibConfigExpanded] = useState(false);
  const [communicationMode, setCommunicationMode] =
    useState<string>("No Value Provided");
  const [firmwareVersion, setFirmwareVersion] =
    useState<string>("No Value Provided");
  const [isEditMode, setIsEditMode] = useState(false);
  const [mqttConfigData, setMqttConfigData] = useState<MqttConfigData | null>(
    null
  );
  const [isLoadingMqttConfig, setIsLoadingMqttConfig] = useState(false);
  const [isConnectedToMqtt, setIsConnectedToMqtt] = useState(false);
  const [_mqttConfig, setMqttConfig] = useState<{
    mqttSecure: number;
    mqttQOS: number;
    mqttURI: string;
    mqttSubTopic: string;
    mqttPubTopic: string;
    mqttCfgTopic: string;
    mqttIdleTimeS: number;
  } | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const currentRelayIdRef = useRef<string | null>(null);

  const [formData, setFormData] = useState({
    communicationMode: "No Value Provided",
    firmwareVersion: "No Value Provided",
    networkSSID: "No Value Provided",
    networkPassword: "No Value Provided",
    networkChannel: "No Value Provided",
    mqttHost: "No Value Provided",
    mqttPort: "No Value Provided",
    mqttTLS: "No Value Provided",
    mqttIdleTimeout: "No Value Provided",
    mqttUsername: "No Value Provided",
    mqttPassword: "No Value Provided",
    // COMS fields
    comsMode: "No Value Provided",
    comsAddr: "No Value Provided",
    comsRateMs: "No Value Provided",
    comsRTE: "No Value Provided",
    comsGPC: "No Value Provided",
    // MQTT Topics fields
    mqttPubTopic: "No Value Provided",
    mqttCfgTopic: "No Value Provided",
    mqttURI: "No Value Provided",
  });

  const [originalData, setOriginalData] = useState({
    communicationMode: "No Value Provided",
    firmwareVersion: "No Value Provided",
    networkSSID: "No Value Provided",
    networkPassword: "No Value Provided",
    networkChannel: "No Value Provided",
    mqttHost: "No Value Provided",
    mqttPort: "No Value Provided",
    mqttTLS: "No Value Provided",
    mqttIdleTimeout: "No Value Provided",
    mqttUsername: "No Value Provided",
    mqttPassword: "No Value Provided",
    // COMS fields
    comsMode: "No Value Provided",
    comsAddr: "No Value Provided",
    comsRateMs: "No Value Provided",
    comsRTE: "No Value Provided",
    comsGPC: "No Value Provided",
    // MQTT Topics fields
    mqttPubTopic: "No Value Provided",
    mqttCfgTopic: "No Value Provided",
    mqttURI: "No Value Provided",
  });

  const toggleSmibConfig = useCallback(() => {
    setSmibConfigExpanded(!smibConfigExpanded);
  }, [smibConfigExpanded]);

  const setEditMode = useCallback(
    (edit: boolean) => {
      setIsEditMode(edit);
      if (!edit) {
        // Reset form data to original when exiting edit mode
        setFormData(originalData);
      }
    },
    [originalData]
  );

  const updateFormData = useCallback((field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const resetFormData = useCallback(() => {
    setFormData(originalData);
    setIsEditMode(false);
  }, [originalData]);

  // Fetch MQTT configuration from API
  const fetchMqttConfig = useCallback(
    async (cabinetId: string): Promise<void> => {
      if (!cabinetId) return;

      setIsLoadingMqttConfig(true);
      try {
        const response = await fetch(`/api/mqtt/config?cabinetId=${cabinetId}`);

        if (response.ok) {
          const result = await response.json();

          if (result.success && result.data) {
            const config = result.data;
            setMqttConfigData(config);

            // Update form data with fetched values
            const newFormData = {
              communicationMode: config.communicationMode,
              firmwareVersion: config.firmwareVersion,
              networkSSID: config.networkSSID,
              networkPassword: config.networkPassword,
              networkChannel: config.networkChannel,
              mqttHost: config.mqttHost,
              mqttPort: config.mqttPort,
              mqttTLS: config.mqttTLS,
              mqttIdleTimeout: config.mqttIdleTimeout,
              mqttUsername: config.mqttUsername,
              mqttPassword: config.mqttPassword,
              // COMS fields
              comsMode: "No Value Provided",
              comsAddr: "No Value Provided",
              comsRateMs: "No Value Provided",
              comsRTE: "No Value Provided",
              comsGPC: "No Value Provided",
              // MQTT Topics fields
              mqttPubTopic: "No Value Provided",
              mqttCfgTopic: "No Value Provided",
              mqttURI: "No Value Provided",
            };

            setFormData(newFormData);
            setOriginalData(newFormData);
            setCommunicationMode(config.communicationMode);
            setFirmwareVersion(config.firmwareVersion);
          }
        } else {
          console.error(
            "❌ [HOOK] Failed to fetch MQTT configuration, status:",
            response.status
          );
        }
      } catch (error) {
        console.error("❌ [HOOK] Error fetching MQTT configuration:", error);
      } finally {
        setIsLoadingMqttConfig(false);
      }
    },
    []
  );

  const setCommunicationModeFromData = useCallback((data: CabinetDetail) => {
    if (
      typeof data === "object" &&
      data !== null &&
      data.smibConfig &&
      typeof data.smibConfig === "object" &&
      "coms" in data.smibConfig
    ) {
      const mode = data.smibConfig.coms?.comsMode;
      if (mode !== undefined) {
        const modeString = mode === 0 ? "sas" : mode === 1 ? "non sas" : "IGT";
        setCommunicationMode(modeString);
        setFormData((prev) => ({ ...prev, communicationMode: modeString }));
        setOriginalData((prev) => ({ ...prev, communicationMode: modeString }));
      }
    }
  }, []);

  const setFirmwareVersionFromData = useCallback((data: CabinetDetail) => {
    if (
      typeof data === "object" &&
      data !== null &&
      data.smibVersion &&
      typeof data.smibVersion === "object" &&
      "firmware" in data.smibVersion
    ) {
      const firmware = data.smibVersion.firmware;
      if (typeof firmware === "string") {
        const versionString = firmware;
        // Keep the actual firmware version from the data

        setFirmwareVersion(versionString);
        setFormData((prev) => ({ ...prev, firmwareVersion: versionString }));
        setOriginalData((prev) => ({
          ...prev,
          firmwareVersion: versionString,
        }));
      }
    }

    // Also update network configuration
    if (
      typeof data === "object" &&
      data !== null &&
      data.smibConfig &&
      typeof data.smibConfig === "object" &&
      "net" in data.smibConfig
    ) {
      const netConfig = data.smibConfig.net;
      if (netConfig) {
        const networkData = {
          networkSSID: netConfig.netStaSSID || "No Value Provided",
          networkPassword: netConfig.netStaPwd || "No Value Provided",
          networkChannel:
            netConfig.netStaChan?.toString() || "No Value Provided",
        };

        setFormData((prev) => ({ ...prev, ...networkData }));
        setOriginalData((prev) => ({ ...prev, ...networkData }));
      }
    }

    // Also update MQTT configuration
    if (
      typeof data === "object" &&
      data !== null &&
      data.smibConfig &&
      typeof data.smibConfig === "object" &&
      "mqtt" in data.smibConfig
    ) {
      const mqttConfig = data.smibConfig.mqtt;
      if (mqttConfig) {
        console.warn("🔍 [HOOK] MQTT Config:", mqttConfig);
        const mqttData = {
          mqttHost: mqttConfig.mqttURI || "No Value Provided",
          mqttPort: "No Value Provided", // mqttPort doesn't exist in the schema
          mqttTLS: mqttConfig.mqttSecure?.toString() || "No Value Provided",
          mqttIdleTimeout:
            mqttConfig.mqttIdleTimeS?.toString() || "No Value Provided",
          mqttUsername: mqttConfig.mqttUsername || "No Value Provided",
          mqttPassword: mqttConfig.mqttPassword || "No Value Provided",
          // MQTT Topics fields
          mqttPubTopic:
            mqttConfig.mqttPubTopic?.toString() || "No Value Provided",
          mqttCfgTopic:
            mqttConfig.mqttCfgTopic?.toString() || "No Value Provided",
          mqttURI: mqttConfig.mqttURI?.toString() || "No Value Provided",
        };

        setFormData((prev) => ({ ...prev, ...mqttData }));
        setOriginalData((prev) => ({ ...prev, ...mqttData }));
      }
    }
  }, []);

  const saveConfiguration = useCallback(
    async (cabinetId: string, machineControl?: string): Promise<boolean> => {
      try {
        // Convert form data to SMIB config format
        const smibConfig: SmibConfig = {
          coms: {
            comsMode:
              formData.communicationMode === "sas"
                ? 0
                : formData.communicationMode === "non sas"
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
            mqttSubTopic: "smib/commands",
            mqttPubTopic: "smib/events",
            mqttCfgTopic: "smib/config",
            mqttIdleTimeS: parseInt(formData.mqttIdleTimeout),
            mqttUsername: formData.mqttUsername,
            mqttPassword: formData.mqttPassword,
          },
        };

        // Prepare request body
        const requestBody: { smibConfig: SmibConfig; machineControl?: string } =
          { smibConfig };
        if (machineControl) {
          requestBody.machineControl = machineControl;
        }

        // Update via API
        const response = await fetch(`/api/cabinets/${cabinetId}/smib-config`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          const result = await response.json();
          console.warn("✅ SMIB configuration updated successfully:", result);

          // Update original data to reflect saved state
          setOriginalData(formData);
          setIsEditMode(false);

          return true;
        } else {
          const errorData = await response.json();
          console.error("Failed to update SMIB configuration:", errorData);
          return false;
        }
      } catch (error) {
        console.error("Error updating SMIB configuration:", error);
        return false;
      }
    },
    [formData]
  );

  // Establish SSE connection for live updates
  const connectToConfigStream = useCallback((relayId: string) => {
    console.warn(
      `🔗 [HOOK] connectToConfigStream called with relayId: ${relayId}`
    );

    if (eventSourceRef.current) {
      console.warn(`🔗 [HOOK] Closing existing EventSource`);
      eventSourceRef.current.close();
    }

    currentRelayIdRef.current = relayId;

    const sseUrl = `/api/mqtt/config/subscribe?relayId=${relayId}`;
    console.warn(`🔗 [HOOK] Creating EventSource with URL: ${sseUrl}`);

    const eventSource = new EventSource(sseUrl);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.warn(
        `✅ [HOOK] EventSource connection opened for relayId: ${relayId}`
      );
      setIsConnectedToMqtt(true);
    };

    eventSource.onmessage = (event) => {
      console.warn(`📨 [HOOK] EventSource message received:`, event.data);
      try {
        const message = JSON.parse(event.data);

        if (message.type === "config_update" && message.data) {
          // Update form data with live MQTT data
          const configData = message.data;

          if (configData.comp === "mqtt") {
            console.warn(`🔍 [HOOK] Processing MQTT data:`, configData);
            const newFormData = {
              mqttHost: configData.mqttURI || "No Value Provided",
              mqttPort: "No Value Provided", // Extract from URI if needed
              mqttTLS: configData.mqttSecure?.toString() || "No Value Provided",
              mqttIdleTimeout:
                configData.mqttIdleTimeS?.toString() || "No Value Provided",
              mqttUsername: configData.mqttUsername || "No Value Provided",
              mqttPassword: configData.mqttPassword || "No Value Provided",
              // MQTT Topics fields
              mqttPubTopic: configData.mqttPubTopic || "No Value Provided",
              mqttCfgTopic: configData.mqttCfgTopic || "No Value Provided",
              mqttURI: configData.mqttURI || "No Value Provided",
            };

            console.warn(
              `🔍 [HOOK] Updating form data with MQTT:`,
              newFormData
            );
            setFormData((prev) => ({ ...prev, ...newFormData }));

            // Also update mqttConfig state for the MQTT Topics section
            const newMqttConfig = {
              mqttSecure: configData.mqttSecure || 0,
              mqttQOS: configData.mqttQOS || 0,
              mqttURI: configData.mqttURI || "",
              mqttSubTopic: configData.mqttSubTopic || "",
              mqttPubTopic: configData.mqttPubTopic || "",
              mqttCfgTopic: configData.mqttCfgTopic || "",
              mqttIdleTimeS: configData.mqttIdleTimeS || 0,
            };

            console.warn(`🔍 [HOOK] Updating mqttConfig with:`, newMqttConfig);
            setMqttConfig(newMqttConfig);
          } else if (configData.comp === "coms") {
            const modeString =
              configData.comsMode === 0
                ? "sas"
                : configData.comsMode === 1
                ? "non sas"
                : "IGT";
            const newFormData = {
              communicationMode: modeString,
              comsMode: configData.comsMode?.toString() || "No Value Provided",
              comsAddr: configData.comsAddr?.toString() || "No Value Provided",
              comsRateMs:
                configData.comsRateMs?.toString() || "No Value Provided",
              comsRTE: configData.comsRTE?.toString() || "No Value Provided",
              comsGPC: configData.comsGPC?.toString() || "No Value Provided",
            };
            setFormData((prev) => ({ ...prev, ...newFormData }));
            setCommunicationMode(modeString);
          } else if (configData.comp === "net") {
            const newFormData = {
              networkSSID: configData.netStaSSID || "No Value Provided",
              networkPassword: configData.netStaPwd || "No Value Provided",
              networkChannel:
                configData.netStaChan?.toString() || "No Value Provided",
            };
            setFormData((prev) => ({ ...prev, ...newFormData }));
          } else if (configData.comp === "mqtt") {
            console.warn(`🔍 [HOOK] Processing MQTT data:`, configData);
            const newFormData = {
              mqttPubTopic: configData.mqttPubTopic || "No Value Provided",
              mqttCfgTopic: configData.mqttCfgTopic || "No Value Provided",
              mqttURI: configData.mqttURI || "No Value Provided",
            };
            console.warn(
              `🔍 [HOOK] Updating form data with MQTT:`,
              newFormData
            );
            setFormData((prev) => ({ ...prev, ...newFormData }));
          }
        } else if (message.type === "error") {
          console.error("❌ [HOOK] MQTT config stream error:", message.error);
          setIsConnectedToMqtt(false);
        }
      } catch (error) {
        console.error("❌ [HOOK] Error parsing SSE message:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("❌ [HOOK] EventSource error:", error);
      setIsConnectedToMqtt(false);
    };
  }, []);

  // Disconnect from SSE stream
  const disconnectFromConfigStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    currentRelayIdRef.current = null;
    setIsConnectedToMqtt(false);
  }, []);

  // Request current config via MQTT
  const requestLiveConfig = useCallback(
    async (relayId: string, component: string): Promise<void> => {
      try {
        const response = await fetch("/api/mqtt/config/request", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ relayId, component }),
        });

        if (!response.ok) {
          throw new Error(`Failed to request config: ${response.statusText}`);
        }

        await response.json();
      } catch (error) {
        console.error("❌ [HOOK] Error requesting live config:", error);
        throw error;
      }
    },
    []
  );

  // Publish config update via MQTT
  const publishConfigUpdate = useCallback(
    async (relayId: string, config: object): Promise<void> => {
      try {
        const response = await fetch("/api/mqtt/config/publish", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ relayId, config }),
        });

        if (!response.ok) {
          throw new Error(`Failed to publish config: ${response.statusText}`);
        }

        await response.json();
      } catch (error) {
        console.error("Error publishing config update:", error);
        throw error;
      }
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectFromConfigStream();
    };
  }, [disconnectFromConfigStream]);

  return {
    smibConfigExpanded,
    communicationMode,
    firmwareVersion,
    isEditMode,
    mqttConfigData,
    isLoadingMqttConfig,
    isConnectedToMqtt,
    formData,
    originalData,
    toggleSmibConfig,
    setEditMode,
    setCommunicationModeFromData,
    setFirmwareVersionFromData,
    updateFormData,
    resetFormData,
    saveConfiguration,
    fetchMqttConfig,
    connectToConfigStream,
    disconnectFromConfigStream,
    requestLiveConfig,
    publishConfigUpdate,
  };
}
