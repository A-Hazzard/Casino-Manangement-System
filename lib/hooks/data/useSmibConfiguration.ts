/**
 * Custom hook for managing SMIB configuration state and logic
 * Extracts complex SMIB configuration logic from the Cabinet Details page
 */

import {
  GamingMachine as CabinetDetail,
  SmibConfig,
} from '@/shared/types/entities';
import { useCallback, useEffect, useRef, useState } from 'react';

type SSEMessage = {
  type:
    | 'connected'
    | 'callback_ready'
    | 'heartbeat'
    | 'keepalive'
    | 'config_update'
    | 'error';
  relayId?: string;
  timestamp?: string;
  message?: string;
  component?: string;
  data?: Record<string, unknown>;
  error?: string;
};

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
  hasReceivedRealSmibData: boolean;
  isManuallyFetching: boolean;
  hasConfigBeenFetched: boolean;
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
  subscribeToMessages: (callback: (message: SSEMessage) => void) => () => void;
  isSSEConnected: boolean;
  requestLiveConfig: (relayId: string, component: string) => Promise<void>;
  publishConfigUpdate: (relayId: string, config: object) => Promise<void>;
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
  _updateOtaConfig: (
    relayId: string,
    otaData: {
      otaURL?: string;
    }
  ) => Promise<void>;
  _updateAppConfig: (
    relayId: string,
    appData: Record<string, unknown>
  ) => Promise<void>;
  fetchSmibConfiguration: (relayId: string) => Promise<void>;
};

export function useSmibConfiguration(): UseSmibConfigurationReturn {
  // ============================================================================
  // State
  // ============================================================================
  const [smibConfigExpanded, setSmibConfigExpanded] = useState(false);
  const [communicationMode, setCommunicationMode] =
    useState<string>('No Value Provided');
  const [firmwareVersion, setFirmwareVersion] =
    useState<string>('No Value Provided');
  const [isEditMode, setIsEditMode] = useState(false);
  const [mqttConfigData, setMqttConfigData] = useState<MqttConfigData | null>(
    null
  );
  const [isLoadingMqttConfig, setIsLoadingMqttConfig] = useState(false);
  const [isConnectedToMqtt, setIsConnectedToMqtt] = useState(false);
  const [hasReceivedRealSmibData, setHasReceivedRealSmibData] = useState(false);
  const lastHeartbeatRef = useRef<number>(Date.now());
  const heartbeatCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectedToMqttRef = useRef<boolean>(false);
  const hasReceivedRealSmibDataRef = useRef<boolean>(false);

  // Sync refs with state
  useEffect(() => {
    isConnectedToMqttRef.current = isConnectedToMqtt;
  }, [isConnectedToMqtt]);

  useEffect(() => {
    hasReceivedRealSmibDataRef.current = hasReceivedRealSmibData;
  }, [hasReceivedRealSmibData]);
  const [isManuallyFetching, setIsManuallyFetching] = useState(false);
  const [hasConfigBeenFetched, setHasConfigBeenFetched] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const currentRelayIdRef = useRef<string | null>(null);
  // Message subscribers - allows multiple components to listen to SSE messages
  const messageSubscribersRef = useRef<Set<(message: SSEMessage) => void>>(
    new Set()
  );
  const [isSSEConnected, setIsSSEConnected] = useState(false);

  const [formData, setFormData] = useState({
    communicationMode: 'No Value Provided',
    firmwareVersion: 'No Value Provided',
    networkSSID: 'No Value Provided',
    networkPassword: 'No Value Provided',
    networkChannel: 'No Value Provided',
    mqttHost: 'No Value Provided',
    mqttPort: 'No Value Provided',
    mqttTLS: 'No Value Provided',
    mqttIdleTimeout: 'No Value Provided',
    mqttUsername: 'No Value Provided',
    mqttPassword: 'No Value Provided',
    // COMS fields
    comsMode: 'No Value Provided',
    comsAddr: 'No Value Provided',
    comsRateMs: 'No Value Provided',
    comsRTE: 'No Value Provided',
    comsGPC: 'No Value Provided',
    // MQTT Topics fields
    mqttPubTopic: 'No Value Provided',
    mqttCfgTopic: 'No Value Provided',
    mqttURI: 'No Value Provided',
  });

  const [originalData, setOriginalData] = useState({
    communicationMode: 'No Value Provided',
    firmwareVersion: 'No Value Provided',
    networkSSID: 'No Value Provided',
    networkPassword: 'No Value Provided',
    networkChannel: 'No Value Provided',
    mqttHost: 'No Value Provided',
    mqttPort: 'No Value Provided',
    mqttTLS: 'No Value Provided',
    mqttIdleTimeout: 'No Value Provided',
    mqttUsername: 'No Value Provided',
    mqttPassword: 'No Value Provided',
    // COMS fields
    comsMode: 'No Value Provided',
    comsAddr: 'No Value Provided',
    comsRateMs: 'No Value Provided',
    comsRTE: 'No Value Provided',
    comsGPC: 'No Value Provided',
    // MQTT Topics fields
    mqttPubTopic: 'No Value Provided',
    mqttCfgTopic: 'No Value Provided',
    mqttURI: 'No Value Provided',
  });

  const toggleSmibConfig = useCallback(() => {
    setSmibConfigExpanded(!smibConfigExpanded);
  }, [smibConfigExpanded]);

  const setEditMode = useCallback(
    (edit: boolean) => {
      console.warn('🔍 [HOOK] setEditMode called with:', edit);
      setIsEditMode(edit);
      if (!edit) {
        // Reset form data to original when exiting edit mode
        console.warn(
          '🔍 [HOOK] Resetting formData to originalData:',
          originalData
        );
        setFormData(originalData);
      }
    },
    [originalData]
  );

  const updateFormData = useCallback((field: string, value: string) => {
    setFormData(prev => ({
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

      // If SMIB is currently online with live data, don't overwrite with API data
      if (isConnectedToMqttRef.current && hasReceivedRealSmibDataRef.current) {
        console.warn(
          '🔍 [HOOK] Skipping fetchMqttConfig - SMIB is online with live data'
        );
        return;
      }

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
              // COMS fields - use API response values only
              comsMode: config.comsMode || 'No Value Provided',
              comsAddr: config.comsAddr || 'No Value Provided',
              comsRateMs: config.comsRateMs || 'No Value Provided',
              comsRTE: config.comsRTE || 'No Value Provided',
              comsGPC: config.comsGPC || 'No Value Provided',
              // MQTT Topics fields - use API response values only
              mqttPubTopic: config.mqttPubTopic || 'No Value Provided',
              mqttCfgTopic: config.mqttCfgTopic || 'No Value Provided',
              mqttURI: config.mqttURI || 'No Value Provided',
            };

            setFormData(newFormData);
            setOriginalData(newFormData);
            setCommunicationMode(config.communicationMode);
            setFirmwareVersion(config.firmwareVersion);
          }
        } else {
          console.error(
            '❌ [HOOK] Failed to fetch MQTT configuration, status:',
            response.status
          );
        }
      } catch (error) {
        console.error('❌ [HOOK] Error fetching MQTT configuration:', error);
      } finally {
        setIsLoadingMqttConfig(false);
      }
    },
    []
  );

  const setCommunicationModeFromData = useCallback((data: CabinetDetail) => {
    if (
      typeof data === 'object' &&
      data !== null &&
      data.smibConfig &&
      typeof data.smibConfig === 'object' &&
      'coms' in data.smibConfig
    ) {
      const mode = data.smibConfig.coms?.comsMode;
      if (mode !== undefined) {
        const modeString = mode === 0 ? 'sas' : mode === 1 ? 'non sas' : 'IGT';
        setCommunicationMode(modeString);
        setFormData(prev => ({ ...prev, communicationMode: modeString }));
        setOriginalData(prev => ({ ...prev, communicationMode: modeString }));
      }
    }
  }, []);

  const setFirmwareVersionFromData = useCallback((data: CabinetDetail) => {
    console.warn(
      '🔍 [HOOK] setFirmwareVersionFromData called with data:',
      data
    );

    // If SMIB is currently online with live data, don't overwrite with machine data
    console.warn('🔍 [HOOK] Connection status check:', {
      isConnectedToMqtt: isConnectedToMqttRef.current,
      hasReceivedRealSmibData: hasReceivedRealSmibDataRef.current,
      shouldSkip:
        isConnectedToMqttRef.current && hasReceivedRealSmibDataRef.current,
    });

    if (isConnectedToMqttRef.current && hasReceivedRealSmibDataRef.current) {
      console.warn(
        '🔍 [HOOK] Skipping setFirmwareVersionFromData - SMIB is online with live data'
      );
      return;
    }

    if (
      typeof data === 'object' &&
      data !== null &&
      data.smibVersion &&
      typeof data.smibVersion === 'object' &&
      'firmware' in data.smibVersion
    ) {
      const firmware = data.smibVersion.firmware;
      if (typeof firmware === 'string') {
        const versionString = firmware;
        // Keep the actual firmware version from the data

        setFirmwareVersion(versionString);
        setFormData(prev => ({ ...prev, firmwareVersion: versionString }));
        setOriginalData(prev => ({
          ...prev,
          firmwareVersion: versionString,
        }));
      }
    }

    // Also update network configuration
    if (
      typeof data === 'object' &&
      data !== null &&
      data.smibConfig &&
      typeof data.smibConfig === 'object' &&
      'net' in data.smibConfig
    ) {
      const netConfig = data.smibConfig.net;
      if (netConfig) {
        const networkData = {
          networkSSID: netConfig.netStaSSID || 'No Value Provided',
          networkPassword: netConfig.netStaPwd || 'No Value Provided',
          networkChannel:
            netConfig.netStaChan?.toString() || 'No Value Provided',
        };

        setFormData(prev => ({ ...prev, ...networkData }));
        setOriginalData(prev => ({ ...prev, ...networkData }));
      }
    }

    // Also update MQTT configuration
    if (
      typeof data === 'object' &&
      data !== null &&
      data.smibConfig &&
      typeof data.smibConfig === 'object' &&
      'mqtt' in data.smibConfig
    ) {
      const mqttConfig = data.smibConfig.mqtt;
      if (mqttConfig) {
        console.warn('🔍 [HOOK] MQTT Config:', mqttConfig);
        console.warn('🔍 [HOOK] MQTT Config values:', {
          mqttPubTopic: mqttConfig.mqttPubTopic,
          mqttCfgTopic: mqttConfig.mqttCfgTopic,
          mqttURI: mqttConfig.mqttURI,
          mqttSecure: mqttConfig.mqttSecure,
          mqttIdleTimeS: mqttConfig.mqttIdleTimeS,
          mqttUsername: mqttConfig.mqttUsername,
          mqttPassword: mqttConfig.mqttPassword,
        });
        const mqttData = {
          mqttHost: mqttConfig.mqttURI || 'No Value Provided',
          mqttPort: 'No Value Provided', // mqttPort doesn't exist in the schema
          mqttTLS: mqttConfig.mqttSecure?.toString() || 'No Value Provided',
          mqttIdleTimeout:
            mqttConfig.mqttIdleTimeS?.toString() || 'No Value Provided',
          mqttUsername: mqttConfig.mqttUsername || 'No Value Provided',
          mqttPassword: mqttConfig.mqttPassword || 'No Value Provided',
          // MQTT Topics fields
          mqttPubTopic:
            mqttConfig.mqttPubTopic?.toString() || 'No Value Provided',
          mqttCfgTopic:
            mqttConfig.mqttCfgTopic?.toString() || 'No Value Provided',
          mqttURI: mqttConfig.mqttURI?.toString() || 'No Value Provided',
        };
        console.warn('🔍 [HOOK] MQTT Data to set:', mqttData);

        console.warn('🔍 [HOOK] Setting formData with MQTT data:', mqttData);
        setFormData(prev => {
          const newData = { ...prev, ...mqttData };
          console.warn('🔍 [HOOK] New formData after setting MQTT:', newData);
          console.warn('🔍 [HOOK] MQTT Topics in new formData:', {
            mqttPubTopic: newData.mqttPubTopic,
            mqttCfgTopic: newData.mqttCfgTopic,
            mqttURI: newData.mqttURI,
          });
          return newData;
        });
        setOriginalData(prev => {
          const newOriginalData = { ...prev, ...mqttData };
          console.warn(
            '🔍 [HOOK] Setting originalData with MQTT data:',
            mqttData
          );
          console.warn(
            '🔍 [HOOK] New originalData after setting MQTT:',
            newOriginalData
          );
          return newOriginalData;
        });
      } else {
        console.warn('🔍 [HOOK] No MQTT config found in data');
      }
    }

    // Also update COMS configuration
    if (
      typeof data === 'object' &&
      data !== null &&
      data.smibConfig &&
      typeof data.smibConfig === 'object' &&
      'coms' in data.smibConfig
    ) {
      const comsConfig = data.smibConfig.coms;
      if (comsConfig) {
        console.warn('🔍 [HOOK] COMS Config:', comsConfig);
        console.warn('🔍 [HOOK] COMS Config values:', {
          comsMode: comsConfig.comsMode,
          comsAddr: comsConfig.comsAddr,
          comsRateMs: comsConfig.comsRateMs,
          comsRTE: comsConfig.comsRTE,
          comsGPC: comsConfig.comsGPC,
        });
        const comsData = {
          comsMode: comsConfig.comsMode?.toString() || 'No Value Provided',
          comsAddr: comsConfig.comsAddr?.toString() || 'No Value Provided',
          comsRateMs: comsConfig.comsRateMs?.toString() || 'No Value Provided',
          comsRTE: comsConfig.comsRTE?.toString() || 'No Value Provided',
          comsGPC: comsConfig.comsGPC?.toString() || 'No Value Provided',
        };
        console.warn('🔍 [HOOK] COMS Data to set:', comsData);

        setFormData(prev => {
          const newData = { ...prev, ...comsData };
          console.warn('🔍 [HOOK] New formData after setting COMS:', newData);
          return newData;
        });
        setOriginalData(prev => {
          const newOriginalData = { ...prev, ...comsData };
          console.warn(
            '🔍 [HOOK] Setting originalData with COMS data:',
            comsData
          );
          console.warn(
            '🔍 [HOOK] New originalData after setting COMS:',
            newOriginalData
          );
          return newOriginalData;
        });
      } else {
        console.warn('🔍 [HOOK] No COMS config found in data');
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
        const requestBody: { smibConfig: SmibConfig; machineControl?: string } =
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
    [formData]
  );

  // Establish SSE connection for live updates
  const connectToConfigStream = useCallback((relayId: string) => {
    console.warn(
      `🔗 [HOOK] connectToConfigStream called with relayId: ${relayId}`
    );

    // 🔧 FIX: Only close existing EventSource if relayId is different
    // This prevents unregistering callbacks when the same relayId is requested multiple times
    if (eventSourceRef.current) {
      const currentRelayId = currentRelayIdRef.current;
      if (currentRelayId === relayId) {
        console.warn(
          `🔗 [HOOK] EventSource already exists for relayId ${relayId}, reusing connection`
        );
        return; // Already connected to this relayId, don't recreate
      }
      console.warn(
        `🔗 [HOOK] Closing existing EventSource (switching from ${currentRelayId} to ${relayId})`
      );
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    currentRelayIdRef.current = relayId;

    // 🔧 FIX: Fetch initial online status from MQTT broker when connecting
    // This prevents the bug where dropdown shows "Online" but detail shows "Offline"
    (async () => {
      try {
        console.log(
          `🔍 [SMIB FIX] Fetching initial status for relay ${relayId}`
        );
        const response = await fetch('/api/mqtt/discover-smibs');
        const data = await response.json();

        if (data.smibs && Array.isArray(data.smibs)) {
          const smib = data.smibs.find(
            (s: { relayId: string; online?: boolean }) => s.relayId === relayId
          );
          if (smib) {
            const brokerStatus = Boolean(smib.online);
            console.log(
              `✅ [SMIB FIX] Broker reports ${relayId} as ${brokerStatus ? 'ONLINE' : 'OFFLINE'}`
            );

            // Set initial connection status based on broker status
            // This will be updated later by config responses and heartbeat monitoring
            setIsConnectedToMqtt(brokerStatus);

            // Update heartbeat ref so monitoring doesn't immediately mark it offline
            if (brokerStatus) {
              lastHeartbeatRef.current = Date.now();
            }
          } else {
            console.warn(
              `⚠️ [SMIB FIX] SMIB ${relayId} not found in broker list`
            );
          }
        }
      } catch (error) {
        console.error('❌ [SMIB FIX] Error fetching initial status:', error);
        // Don't change status on error - let config responses handle it
      }
    })();

    const sseUrl = `/api/mqtt/config/subscribe?relayId=${relayId}`;

    const eventSource = new EventSource(sseUrl);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      // Don't set isConnectedToMqtt(true) here - wait for actual SMIB data
    };

    eventSource.onmessage = event => {
      // Update heartbeat for ANY message received (including ping/heartbeat)
      lastHeartbeatRef.current = Date.now();

      try {
        const message = JSON.parse(event.data);

        // Notify all subscribers of the message
        messageSubscribersRef.current.forEach(callback => {
          try {
            callback(message);
          } catch (error) {
            console.error('Error in message subscriber callback:', error);
          }
        });

        // Handle callback_ready message - SSE is ready for meter requests
        if (message.type === 'callback_ready') {
          setIsSSEConnected(true);
        }

        // Handle heartbeat/keepalive messages
        if (message.type === 'heartbeat' || message.type === 'keepalive') {
          // Heartbeats are from the SSE server, not the SMIB device
          // Don't set isConnectedToMqtt here - only actual SMIB responses should do that
          // The heartbeat just keeps the SSE connection alive
          return;
        }

        if (message.type === 'config_update' && message.data) {
          // Update form data with live MQTT data
          const configData = message.data;

          // ANY message from SMIB indicates it's alive (rsp, err, exp, etc.)
          // If we previously had real data and went offline, mark as back online
          if (!isConnectedToMqtt && hasReceivedRealSmibData) {
            setIsConnectedToMqtt(true);
          }

          // For non-config messages (rsp, err, exp), just update heartbeat and return
          if (!configData || !configData.comp) {
            return;
          }

          // Skip processing if this is just a connection message without actual data
          if (message.type === 'connected' || message.type === 'ping') {
            return;
          }

          // Check if this is actual SMIB data (not just connection messages)
          const hasRealData =
            (configData.comp === 'net' &&
              configData.netStaSSID &&
              configData.netStaSSID !== 'No Value Provided') ||
            (configData.comp === 'coms' &&
              configData.comsMode !== undefined &&
              configData.comsMode !== null) ||
            (configData.comp === 'mqtt' &&
              configData.mqttURI &&
              configData.mqttURI !== 'No Value Provided');

          console.warn(`🔍 [HOOK] hasRealData check:`, {
            comp: configData.comp,
            hasRealData,
            netStaSSID: configData.netStaSSID,
            comsMode: configData.comsMode,
            mqttURI: configData.mqttURI,
          });

          if (!hasRealData) {
            console.warn(
              `🔍 [HOOK] Skipping SSE update - no real data from SMIB (still offline)`
            );
            return;
          }

          console.warn(
            `🔍 [HOOK] SMIB is now ONLINE - processing live data for component: ${configData.comp}`
          );
          console.warn(`🔍 [HOOK] Config data received:`, configData);

          if (configData.comp === 'mqtt') {
            console.warn(`🔍 [HOOK] Processing MQTT data:`, configData);

            // Only update if we have actual data from the SMIB (not just empty responses)
            // Check if we have real values that are not empty strings, null, undefined, or "No Value Provided"
            const hasActualData =
              (configData.mqttURI &&
                configData.mqttURI !== 'No Value Provided' &&
                configData.mqttURI !== '' &&
                configData.mqttURI !== null &&
                configData.mqttURI !== undefined &&
                configData.mqttURI.length > 0) ||
              (configData.mqttPubTopic &&
                configData.mqttPubTopic !== 'No Value Provided' &&
                configData.mqttPubTopic !== '' &&
                configData.mqttPubTopic !== null &&
                configData.mqttPubTopic !== undefined &&
                configData.mqttPubTopic.length > 0) ||
              (configData.mqttCfgTopic &&
                configData.mqttCfgTopic !== 'No Value Provided' &&
                configData.mqttCfgTopic !== '' &&
                configData.mqttCfgTopic !== null &&
                configData.mqttCfgTopic !== undefined &&
                configData.mqttCfgTopic.length > 0);

            if (hasActualData) {
              // Use SMIB data, but fallback to existing machine values if SMIB returns "No Value Provided"
              setFormData(prev => {
                const newFormData = {
                  ...prev, // Keep all existing values
                  mqttHost: configData.mqttURI || prev.mqttHost,
                  mqttTLS: configData.mqttSecure?.toString() || prev.mqttTLS,
                  mqttIdleTimeout:
                    configData.mqttIdleTimeS?.toString() ||
                    prev.mqttIdleTimeout,
                  mqttUsername: configData.mqttUsername || prev.mqttUsername,
                  mqttPassword: configData.mqttPassword || prev.mqttPassword,
                  // MQTT Topics fields - use SMIB data or fallback to existing machine values
                  mqttPubTopic: configData.mqttPubTopic || prev.mqttPubTopic,
                  mqttCfgTopic: configData.mqttCfgTopic || prev.mqttCfgTopic,
                  mqttURI: configData.mqttURI || prev.mqttURI,
                };

                console.warn(
                  `🔍 [HOOK] Updating form data with MQTT (SMIB connected):`,
                  newFormData
                );
                console.warn(
                  '🔍 [HOOK] SSE updating formData with:',
                  newFormData
                );
                console.warn('🔍 [HOOK] SSE result formData:', newFormData);
                return newFormData;
              });
              setIsConnectedToMqtt(true); // SMIB is actually connected and responding
              setHasReceivedRealSmibData(true); // Mark that we've received real data from SMIB
              lastHeartbeatRef.current = Date.now(); // Update heartbeat timestamp

              // Also update mqttConfig state for the MQTT Topics section
              const newMqttConfig = {
                mqttSecure: configData.mqttSecure || 0,
                mqttQOS: configData.mqttQOS || 0,
                mqttURI: configData.mqttURI || '',
                mqttSubTopic: configData.mqttSubTopic || '',
                mqttPubTopic: configData.mqttPubTopic || '',
                mqttCfgTopic: configData.mqttCfgTopic || '',
                mqttIdleTimeS: configData.mqttIdleTimeS || 0,
              };

              console.warn(
                `🔍 [HOOK] Updating mqttConfig with:`,
                newMqttConfig
              );
            } else {
              console.warn(
                `🔍 [HOOK] Skipping MQTT update - no actual data from SMIB (SMIB likely disconnected)`
              );
              console.warn(
                `🔍 [HOOK] Config data that was rejected:`,
                configData
              );
              console.warn(
                `🔍 [HOOK] Preserving initial machine data for MQTT Topics`
              );
            }
          } else if (configData.comp === 'coms') {
            // Only update if we have actual data from the SMIB
            const hasActualData =
              (configData.comsMode !== undefined &&
                configData.comsMode !== null) ||
              (configData.comsAddr !== undefined &&
                configData.comsAddr !== null);

            if (hasActualData) {
              const modeString =
                configData.comsMode === 0
                  ? 'sas'
                  : configData.comsMode === 1
                    ? 'non sas'
                    : 'IGT';
              // Use SMIB data, but fallback to existing machine values if SMIB returns "No Value Provided"
              setFormData(prev => {
                const newFormData = {
                  ...prev, // Keep all existing values
                  communicationMode: modeString,
                  comsMode: configData.comsMode?.toString() || prev.comsMode,
                  comsAddr: configData.comsAddr?.toString() || prev.comsAddr,
                  comsRateMs:
                    configData.comsRateMs?.toString() || prev.comsRateMs,
                  comsRTE: configData.comsRTE?.toString() || prev.comsRTE,
                  comsGPC: configData.comsGPC?.toString() || prev.comsGPC,
                };
                console.warn(
                  `🔍 [HOOK] Updating COMS data (SMIB connected):`,
                  newFormData
                );
                return newFormData;
              });
              setCommunicationMode(modeString);
              setIsConnectedToMqtt(true); // SMIB is actually connected and responding
              setHasReceivedRealSmibData(true); // Mark that we've received real data from SMIB
              lastHeartbeatRef.current = Date.now(); // Update heartbeat timestamp
            } else {
              console.warn(
                `🔍 [HOOK] Skipping COMS update - no actual data from SMIB (SMIB likely disconnected)`
              );
            }
          } else if (configData.comp === 'net') {
            // Only update if we have actual data from the SMIB
            const hasActualData =
              (configData.netStaSSID &&
                configData.netStaSSID !== 'No Value Provided') ||
              (configData.netStaPwd &&
                configData.netStaPwd !== 'No Value Provided') ||
              (configData.netStaChan && configData.netStaChan !== null);

            if (hasActualData) {
              // Use SMIB data, but fallback to existing machine values if SMIB returns "No Value Provided"
              setFormData(prev => {
                const newFormData = {
                  ...prev, // Keep all existing values
                  networkSSID: configData.netStaSSID || prev.networkSSID,
                  networkPassword: configData.netStaPwd || prev.networkPassword,
                  networkChannel:
                    configData.netStaChan?.toString() || prev.networkChannel,
                };
                console.warn(
                  `🔍 [HOOK] Updating Network data (SMIB connected):`,
                  newFormData
                );
                return newFormData;
              });
              setIsConnectedToMqtt(true); // SMIB is actually connected and responding
              setHasReceivedRealSmibData(true); // Mark that we've received real data from SMIB
              lastHeartbeatRef.current = Date.now(); // Update heartbeat timestamp
            } else {
              console.warn(
                `🔍 [HOOK] Skipping Network update - no actual data from SMIB (SMIB likely disconnected)`
              );
            }
          }
        } else if (message.type === 'error') {
          console.error('❌ [HOOK] MQTT config stream error:', message.error);
          setIsConnectedToMqtt(false);
        }
      } catch (error) {
        console.error('❌ [HOOK] Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = error => {
      console.error('❌ [HOOK] EventSource error:', error);
      setIsConnectedToMqtt(false);
    };
  }, [setFormData, setIsConnectedToMqtt, setHasReceivedRealSmibData, setCommunicationMode, setIsSSEConnected, lastHeartbeatRef, messageSubscribersRef, hasReceivedRealSmibData, isConnectedToMqtt]);

  // Subscribe to SSE messages - allows multiple components to listen
  const subscribeToMessages = useCallback(
    (callback: (message: SSEMessage) => void) => {
      messageSubscribersRef.current.add(callback);

      // Return unsubscribe function
      return () => {
        messageSubscribersRef.current.delete(callback);
      };
    },
    []
  );

  // Disconnect from SSE stream
  const disconnectFromConfigStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    currentRelayIdRef.current = null;
    setIsSSEConnected(false);
    setIsConnectedToMqtt(false);
    setHasReceivedRealSmibData(false);
  }, []);

  // Request current config via MQTT
  const requestLiveConfig = useCallback(
    async (relayId: string, component: string): Promise<void> => {
      try {
        const response = await fetch('/api/mqtt/config/request', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ relayId, component }),
        });

        if (!response.ok) {
          throw new Error(`Failed to request config: ${response.statusText}`);
        }

        await response.json();
      } catch (error) {
        console.error('❌ [HOOK] Error requesting live config:', error);
        throw error;
      }
    },
    []
  );

  // Manually fetch SMIB configuration
  const fetchSmibConfiguration = useCallback(
    async (relayId: string) => {
      console.warn(
        `🔍 [HOOK] Manually fetching SMIB configuration for relayId: ${relayId}`
      );
      setIsManuallyFetching(true);
      setHasReceivedRealSmibData(false);

      try {
        // Connect to SSE stream first
        connectToConfigStream(relayId);

        // Wait a bit for connection to establish
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Request all configuration components
        const components = ['net', 'coms', 'mqtt'];
        const requestPromises = components.map(comp =>
          requestLiveConfig(relayId, comp)
        );

        await Promise.all(requestPromises);

        // Wait for responses (with timeout)
        let attempts = 0;
        const maxAttempts = 10; // 5 seconds total

        while (attempts < maxAttempts && !hasReceivedRealSmibData) {
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
        }

        if (!hasReceivedRealSmibData) {
          console.warn(
            `🔍 [HOOK] No response from SMIB after ${maxAttempts * 500}ms, using machine data`
          );
          // Show the configuration section even if no SMIB response
          setSmibConfigExpanded(true);
        } else {
          console.warn(
            `🔍 [HOOK] SMIB responded with data, showing configuration`
          );
          setSmibConfigExpanded(true);
        }

        // Mark that config has been fetched
        setHasConfigBeenFetched(true);
      } catch (error) {
        console.error('❌ [HOOK] Error fetching SMIB configuration:', error);
        // Still show the configuration section with machine data
        setSmibConfigExpanded(true);
        setHasConfigBeenFetched(true);
      } finally {
        setIsManuallyFetching(false);
      }
    },
    [connectToConfigStream, requestLiveConfig, hasReceivedRealSmibData]
  );

  // Publish config update via MQTT
  const publishConfigUpdate = useCallback(
    async (relayId: string, config: object): Promise<void> => {
      try {
        const response = await fetch('/api/mqtt/config/publish', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ relayId, config }),
        });

        if (!response.ok) {
          throw new Error(`Failed to publish config: ${response.statusText}`);
        }

        await response.json();
      } catch (error) {
        console.error('Error publishing config update:', error);
        throw error;
      }
    },
    []
  );

  // Update network configuration
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

  // Update MQTT configuration
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

  // Update COMS configuration
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

  // Update OTA configuration
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

  // Update App configuration
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

  // Debug formData changes (reduced logging)
  useEffect(() => {
    // Only log when MQTT Topics change from good values to "No Value Provided"
    if (
      formData.mqttPubTopic === 'No Value Provided' ||
      formData.mqttCfgTopic === 'No Value Provided' ||
      formData.mqttURI === 'No Value Provided'
    ) {
      console.warn(
        '⚠️ [HOOK] MQTT Topics were overwritten to "No Value Provided"!'
      );
    }
  }, [formData]);

  // Silent background polling - query SMIB config every 5-10 seconds to detect online/offline
  useEffect(() => {
    if (!currentRelayIdRef.current) return;

    const scheduleNextPoll = () => {
      // Random interval between 5-10 seconds
      const randomInterval = Math.floor(Math.random() * 5000) + 5000;

      return setTimeout(async () => {
        const relayId = currentRelayIdRef.current;
        if (!relayId) return;

        // Silent query - no loading states
        try {
          await Promise.all([
            requestLiveConfig(relayId, 'mqtt'),
            requestLiveConfig(relayId, 'net'),
            requestLiveConfig(relayId, 'coms'),
          ]);
        } catch (error) {
          console.error('❌ [HOOK] Error requesting live config:', error);
          setIsConnectedToMqtt(false);
          setHasReceivedRealSmibData(false);
          return;
        }

        // Schedule next poll
        if (currentRelayIdRef.current === relayId) {
          heartbeatCheckIntervalRef.current = scheduleNextPoll();
        }
      }, randomInterval);
    };

    // Start first poll
    heartbeatCheckIntervalRef.current = scheduleNextPoll();

    return () => {
      if (heartbeatCheckIntervalRef.current) {
        clearTimeout(heartbeatCheckIntervalRef.current);
        heartbeatCheckIntervalRef.current = null;
      }
    };
  }, [requestLiveConfig]);

  // Heartbeat check - monitor SMIB connection status continuously
  useEffect(() => {
    // Start heartbeat check interval (runs whether connected or not to detect reconnection)
    const checkInterval = setInterval(() => {
      const timeSinceLastHeartbeat = Date.now() - lastHeartbeatRef.current;
      const timeoutMs = 7000; // 7 seconds timeout (faster detection)

      if (timeSinceLastHeartbeat > timeoutMs && isConnectedToMqtt) {
        // SMIB went offline
        console.warn(
          `⚠️ [HOOK] SMIB connection timeout - no data received for ${timeSinceLastHeartbeat}ms`
        );
        setIsConnectedToMqtt(false);
        setHasReceivedRealSmibData(false);
      } else if (
        timeSinceLastHeartbeat <= timeoutMs &&
        !isConnectedToMqtt &&
        hasReceivedRealSmibData
      ) {
        // SMIB came back online
        console.warn(
          `✅ [HOOK] SMIB connection restored - data received within timeout`
        );
        setIsConnectedToMqtt(true);
      }
    }, 1000); // Check every 1 second (faster detection)

    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [isConnectedToMqtt, hasReceivedRealSmibData]);

  // Cleanup on unmount only - don't disconnect on re-renders
  useEffect(() => {
    return () => {
      // Only disconnect when component actually unmounts
      if (eventSourceRef.current) {
        disconnectFromConfigStream();
      }
      if (heartbeatCheckIntervalRef.current) {
        clearInterval(heartbeatCheckIntervalRef.current);
        heartbeatCheckIntervalRef.current = null;
      }
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
    hasReceivedRealSmibData,
    isManuallyFetching,
    hasConfigBeenFetched,
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
    subscribeToMessages,
    isSSEConnected,
    requestLiveConfig,
    publishConfigUpdate,
    updateNetworkConfig,
    updateMqttConfig,
    updateComsConfig,
    updateOtaConfig,
    updateAppConfig,
    _updateOtaConfig: updateOtaConfig,
    _updateAppConfig: updateAppConfig,
    fetchSmibConfiguration,
  };
}
