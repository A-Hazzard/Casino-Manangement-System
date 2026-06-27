/**
 * useSmibMqtt Hook
 *
 * Manages MQTT/SSE communication for SMIB devices including connection handling,
 * message subscription, real-time config updates, and heartbeat monitoring.
 *
 * @module lib/hooks/cabinets/useSmibMqtt
 */

import { useCallback, useEffect, useRef } from 'react';

import type { UseSmibConfigStateReturn } from './useSmibConfigState';

export type SSEMessage = {
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

export type UseSmibMqttReturn = {
  connectToConfigStream: (relayId: string) => void;
  disconnectFromConfigStream: () => void;
  subscribeToMessages: (callback: (message: SSEMessage) => void) => () => void;
  requestLiveConfig: (relayId: string, component: string) => Promise<void>;
  publishConfigUpdate: (relayId: string, config: object) => Promise<void>;
  fetchMqttConfig: (cabinetId: string) => Promise<void>;
  fetchSmibConfiguration: (relayId: string) => Promise<void>;
  isConnectedToMqtt: boolean;
  hasReceivedRealSmibData: boolean;
  isManuallyFetching: boolean;
  hasConfigBeenFetched: boolean;
  isSSEConnected: boolean;
};

export function useSmibMqtt(
  configState: UseSmibConfigStateReturn
): UseSmibMqttReturn {
  // ============================================================================
  // State & Refs
  // ============================================================================
  const eventSourceRef = useRef<EventSource | null>(null);
  const currentRelayIdRef = useRef<string | null>(null);
  const messageSubscribersRef = useRef<Set<(message: SSEMessage) => void>>(
    new Set()
  );
  const heartbeatCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastHeartbeatRef = useRef<number>(Date.now());

  const {
    setMqttConfigData,
    setIsLoadingMqttConfig,
    setIsConnectedToMqtt,
    setHasReceivedRealSmibData,
    setIsManuallyFetching,
    setHasConfigBeenFetched,
    setSmibConfigExpanded,
    setFormData,
    setOriginalData,
    setCommunicationMode,
    setIsSSEConnected,
    isConnectedToMqtt,
    hasReceivedRealSmibData,
    isManuallyFetching,
    hasConfigBeenFetched,
    isSSEConnected,
    isConnectedToMqttRef,
    hasReceivedRealSmibDataRef,
  } = configState;

  // ============================================================================
  // Handlers
  // ============================================================================
  const fetchMqttConfig = useCallback(
    async (cabinetId: string): Promise<void> => {
      if (!cabinetId) return;

      // If SMIB is currently online with live data, don't overwrite with API data
      if (
        isConnectedToMqttRef.current &&
        hasReceivedRealSmibDataRef.current
      ) {
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
              comsMode: config.comsMode || 'No Value Provided',
              comsAddr: config.comsAddr || 'No Value Provided',
              comsRateMs: config.comsRateMs || 'No Value Provided',
              comsRTE: config.comsRTE || 'No Value Provided',
              comsGPC: config.comsGPC || 'No Value Provided',
              mqttPubTopic: config.mqttPubTopic || 'No Value Provided',
              mqttCfgTopic: config.mqttCfgTopic || 'No Value Provided',
              mqttURI: config.mqttURI || 'No Value Provided',
            };

            setFormData(newFormData);
            setOriginalData(newFormData);
            configState.setCommunicationMode(config.communicationMode);
            configState.setFirmwareVersion(config.firmwareVersion);
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
    [
      isConnectedToMqttRef,
      hasReceivedRealSmibDataRef,
      setMqttConfigData,
      setIsLoadingMqttConfig,
      setFormData,
      setOriginalData,
      configState.setCommunicationMode,
      configState.setFirmwareVersion,
    ]
  );

  const connectToConfigStream = useCallback(
    (relayId: string) => {
      console.warn(
        `🔗 [HOOK] connectToConfigStream called with relayId: ${relayId}`
      );

      if (eventSourceRef.current) {
        const currentRelayId = currentRelayIdRef.current;
        if (currentRelayId === relayId) {
          console.warn(
            `🔗 [HOOK] EventSource already exists for relayId ${relayId}, reusing connection`
          );
          return;
        }
        console.warn(
          `🔗 [HOOK] Closing existing EventSource (switching from ${currentRelayId} to ${relayId})`
        );
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      currentRelayIdRef.current = relayId;

      // Fetch initial online status from MQTT broker when connecting
      (async () => {
        try {
          console.log(
            `🔍 [SMIB FIX] Fetching initial status for relay ${relayId}`
          );
          const response = await fetch('/api/mqtt/discover-smibs');
          const data = await response.json();

          if (data.smibs && Array.isArray(data.smibs)) {
            const smib = data.smibs.find(
              (s: { relayId: string; online?: boolean }) =>
                s.relayId === relayId
            );
            if (smib) {
              const brokerStatus = Boolean(smib.online);
              console.log(
                `✅ [SMIB FIX] Broker reports ${relayId} as ${brokerStatus ? 'ONLINE' : 'OFFLINE'}`
              );

              setIsConnectedToMqtt(brokerStatus);

              if (brokerStatus) {
                lastHeartbeatRef.current = Date.now();
              }
            } else {
              console.warn(
                `⚠ [SMIB FIX] SMIB ${relayId} not found in broker list`
              );
            }
          }
        } catch (error) {
          console.error('❌ [SMIB FIX] Error fetching initial status:', error);
        }
      })();

      const sseUrl = `/api/mqtt/config/subscribe?relayId=${relayId}`;

      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        // Don't set isConnectedToMqtt(true) here - wait for actual SMIB data
      };

      eventSource.onmessage = event => {
        lastHeartbeatRef.current = Date.now();

        try {
          const message = JSON.parse(event.data);

          messageSubscribersRef.current.forEach(callback => {
            try {
              callback(message);
            } catch (error) {
              console.error('Error in message subscriber callback:', error);
            }
          });

          if (message.type === 'callback_ready') {
            setIsSSEConnected(true);
          }

          if (message.type === 'heartbeat' || message.type === 'keepalive') {
            return;
          }

          if (message.type === 'config_update' && message.data) {
            const configData = message.data;

            if (
              !isConnectedToMqttRef.current &&
              hasReceivedRealSmibDataRef.current
            ) {
              setIsConnectedToMqtt(true);
            }

            if (!configData || !configData.comp) {
              return;
            }

            if (
              message.type === 'connected' ||
              message.type === 'ping'
            ) {
              return;
            }

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
                setFormData(prev => {
                  const newFormData = {
                    ...prev,
                    mqttHost: configData.mqttURI || prev.mqttHost,
                    mqttTLS: configData.mqttSecure?.toString() || prev.mqttTLS,
                    mqttIdleTimeout:
                      configData.mqttIdleTimeS?.toString() ||
                      prev.mqttIdleTimeout,
                    mqttUsername:
                      configData.mqttUsername || prev.mqttUsername,
                    mqttPassword:
                      configData.mqttPassword || prev.mqttPassword,
                    mqttPubTopic:
                      configData.mqttPubTopic || prev.mqttPubTopic,
                    mqttCfgTopic:
                      configData.mqttCfgTopic || prev.mqttCfgTopic,
                    mqttURI: configData.mqttURI || prev.mqttURI,
                  };

                  console.warn(
                    `🔍 [HOOK] Updating form data with MQTT (SMIB connected):`,
                    newFormData
                  );
                  return newFormData;
                });
                setIsConnectedToMqtt(true);
                setHasReceivedRealSmibData(true);
                lastHeartbeatRef.current = Date.now();

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
                setFormData(prev => {
                  const newFormData = {
                    ...prev,
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
                setIsConnectedToMqtt(true);
                setHasReceivedRealSmibData(true);
                lastHeartbeatRef.current = Date.now();
              } else {
                console.warn(
                  `🔍 [HOOK] Skipping COMS update - no actual data from SMIB (SMIB likely disconnected)`
                );
              }
            } else if (configData.comp === 'net') {
              const hasActualData =
                (configData.netStaSSID &&
                  configData.netStaSSID !== 'No Value Provided') ||
                (configData.netStaPwd &&
                  configData.netStaPwd !== 'No Value Provided') ||
                (configData.netStaChan && configData.netStaChan !== null);

              if (hasActualData) {
                setFormData(prev => {
                  const newFormData = {
                    ...prev,
                    networkSSID: configData.netStaSSID || prev.networkSSID,
                    networkPassword:
                      configData.netStaPwd || prev.networkPassword,
                    networkChannel:
                      configData.netStaChan?.toString() ||
                      prev.networkChannel,
                  };
                  console.warn(
                    `🔍 [HOOK] Updating Network data (SMIB connected):`,
                    newFormData
                  );
                  return newFormData;
                });
                setIsConnectedToMqtt(true);
                setHasReceivedRealSmibData(true);
                lastHeartbeatRef.current = Date.now();
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
    },
    [
      isConnectedToMqttRef,
      hasReceivedRealSmibDataRef,
      setIsConnectedToMqtt,
      setHasReceivedRealSmibData,
      setCommunicationMode,
      setFormData,
      setIsSSEConnected,
      lastHeartbeatRef,
      messageSubscribersRef,
    ]
  );

  const subscribeToMessages = useCallback(
    (callback: (message: SSEMessage) => void) => {
      messageSubscribersRef.current.add(callback);

      return () => {
        messageSubscribersRef.current.delete(callback);
      };
    },
    []
  );

  const disconnectFromConfigStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    currentRelayIdRef.current = null;
    setIsSSEConnected(false);
    setIsConnectedToMqtt(false);
    setHasReceivedRealSmibData(false);
  }, [setIsSSEConnected, setIsConnectedToMqtt, setHasReceivedRealSmibData]);

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

  const fetchSmibConfiguration = useCallback(
    async (relayId: string) => {
      console.warn(
        `🔍 [HOOK] Manually fetching SMIB configuration for relayId: ${relayId}`
      );
      setIsManuallyFetching(true);
      setHasReceivedRealSmibData(false);

      try {
        connectToConfigStream(relayId);

        await new Promise(resolve => setTimeout(resolve, 1000));

        const components = ['net', 'coms', 'mqtt'];
        const requestPromises = components.map(comp =>
          requestLiveConfig(relayId, comp)
        );

        await Promise.all(requestPromises);

        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts && !hasReceivedRealSmibData) {
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
        }

        if (!hasReceivedRealSmibData) {
          console.warn(
            `🔍 [HOOK] No response from SMIB after ${maxAttempts * 500}ms, using machine data`
          );
          setSmibConfigExpanded(true);
        } else {
          console.warn(
            `🔍 [HOOK] SMIB responded with data, showing configuration`
          );
          setSmibConfigExpanded(true);
        }

        setHasConfigBeenFetched(true);
      } catch (error) {
        console.error('❌ [HOOK] Error fetching SMIB configuration:', error);
        setSmibConfigExpanded(true);
        setHasConfigBeenFetched(true);
      } finally {
        setIsManuallyFetching(false);
      }
    },
    [
      connectToConfigStream,
      requestLiveConfig,
      hasReceivedRealSmibData,
      setIsManuallyFetching,
      setHasReceivedRealSmibData,
      setSmibConfigExpanded,
      setHasConfigBeenFetched,
    ]
  );

  // ============================================================================
  // Effects
  // ============================================================================

  // Silent background polling
  useEffect(() => {
    if (!currentRelayIdRef.current) return;

    const scheduleNextPoll = () => {
      const randomInterval = Math.floor(Math.random() * 5000) + 5000;

      return setTimeout(async () => {
        const relayId = currentRelayIdRef.current;
        if (!relayId) return;

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

        if (currentRelayIdRef.current === relayId) {
          heartbeatCheckIntervalRef.current = scheduleNextPoll();
        }
      }, randomInterval);
    };

    heartbeatCheckIntervalRef.current = scheduleNextPoll();

    return () => {
      if (heartbeatCheckIntervalRef.current) {
        clearTimeout(heartbeatCheckIntervalRef.current);
        heartbeatCheckIntervalRef.current = null;
      }
    };
  }, [requestLiveConfig, setIsConnectedToMqtt, setHasReceivedRealSmibData]);

  // Heartbeat check
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const timeSinceLastHeartbeat = Date.now() - lastHeartbeatRef.current;
      const timeoutMs = 7000;

      if (timeSinceLastHeartbeat > timeoutMs && isConnectedToMqtt) {
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
        console.warn(
          `✅ [HOOK] SMIB connection restored - data received within timeout`
        );
        setIsConnectedToMqtt(true);
      }
    }, 1000);

    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [isConnectedToMqtt, hasReceivedRealSmibData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
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
    connectToConfigStream,
    disconnectFromConfigStream,
    subscribeToMessages,
    requestLiveConfig,
    publishConfigUpdate,
    fetchMqttConfig,
    fetchSmibConfiguration,
    isConnectedToMqtt,
    hasReceivedRealSmibData,
    isManuallyFetching,
    hasConfigBeenFetched,
    isSSEConnected,
  };
}