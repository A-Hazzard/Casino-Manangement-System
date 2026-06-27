/**
 * useSmibConfigState Hook
 *
 * Manages SMIB configuration state including form data, original data,
 * connection status, and UI state for the SMIB configuration panel.
 *
 * @module lib/hooks/cabinets/useSmibConfigState
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { GamingMachine as CabinetDetail } from '@/shared/types/entities';

export type MqttConfigData = {
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

export type FormData = {
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
  comsMode: string;
  comsAddr: string;
  comsRateMs: string;
  comsRTE: string;
  comsGPC: string;
  mqttPubTopic: string;
  mqttCfgTopic: string;
  mqttURI: string;
};

export type OriginalData = {
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
  comsMode: string;
  comsAddr: string;
  comsRateMs: string;
  comsRTE: string;
  comsGPC: string;
  mqttPubTopic: string;
  mqttCfgTopic: string;
  mqttURI: string;
};

export type UseSmibConfigStateReturn = {
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
  formData: FormData;
  originalData: OriginalData;
  isSSEConnected: boolean;
  setSmibConfigExpanded: (expanded: boolean) => void;
  setCommunicationMode: (mode: string) => void;
  setFirmwareVersion: (version: string) => void;
  setIsEditMode: (edit: boolean) => void;
  setMqttConfigData: (data: MqttConfigData | null) => void;
  setIsLoadingMqttConfig: (loading: boolean) => void;
  setIsConnectedToMqtt: (connected: boolean) => void;
  setHasReceivedRealSmibData: (received: boolean) => void;
  setIsManuallyFetching: (fetching: boolean) => void;
  setHasConfigBeenFetched: (fetched: boolean) => void;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  setOriginalData: React.Dispatch<React.SetStateAction<OriginalData>>;
  setIsSSEConnected: (connected: boolean) => void;
  updateFormData: (field: string, value: string) => void;
  resetFormData: () => void;
  setCommunicationModeFromData: (data: CabinetDetail) => void;
  setFirmwareVersionFromData: (data: CabinetDetail) => void;
  isConnectedToMqttRef: React.MutableRefObject<boolean>;
  hasReceivedRealSmibDataRef: React.MutableRefObject<boolean>;
};

const DEFAULT_FORM_DATA: FormData = {
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
  comsMode: 'No Value Provided',
  comsAddr: 'No Value Provided',
  comsRateMs: 'No Value Provided',
  comsRTE: 'No Value Provided',
  comsGPC: 'No Value Provided',
  mqttPubTopic: 'No Value Provided',
  mqttCfgTopic: 'No Value Provided',
  mqttURI: 'No Value Provided',
};

export function useSmibConfigState(
  initialExpanded = false
): UseSmibConfigStateReturn {
  // ============================================================================
  // State
  // ============================================================================
  const [smibConfigExpanded, setSmibConfigExpanded] = useState(initialExpanded);
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
  const [isManuallyFetching, setIsManuallyFetching] = useState(false);
  const [hasConfigBeenFetched, setHasConfigBeenFetched] = useState(false);
  const [isSSEConnected, setIsSSEConnected] = useState(false);

  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);
  const [originalData, setOriginalData] = useState<OriginalData>(
    DEFAULT_FORM_DATA
  );

  const isConnectedToMqttRef = useRef<boolean>(false);
  const hasReceivedRealSmibDataRef = useRef<boolean>(false);

  // Sync refs with state
  useEffect(() => {
    isConnectedToMqttRef.current = isConnectedToMqtt;
  }, [isConnectedToMqtt]);

  useEffect(() => {
    hasReceivedRealSmibDataRef.current = hasReceivedRealSmibData;
  }, [hasReceivedRealSmibData]);

  // ============================================================================
  // Handlers
  // ============================================================================
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
        const modeString =
          mode === 0 ? 'sas' : mode === 1 ? 'non sas' : 'IGT';
        setCommunicationMode(modeString);
        setFormData(prev => ({ ...prev, communicationMode: modeString }));
        setOriginalData(prev => ({
          ...prev,
          communicationMode: modeString,
        }));
      }
    }
  }, []);

  const setFirmwareVersionFromData = useCallback((data: CabinetDetail) => {
    // If SMIB is currently online with live data, don't overwrite with machine data
    if (
      isConnectedToMqttRef.current &&
      hasReceivedRealSmibDataRef.current
    ) {
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
        const mqttData = {
          mqttHost: mqttConfig.mqttURI || 'No Value Provided',
          mqttPort: 'No Value Provided',
          mqttTLS: mqttConfig.mqttSecure?.toString() || 'No Value Provided',
          mqttIdleTimeout:
            mqttConfig.mqttIdleTimeS?.toString() || 'No Value Provided',
          mqttUsername: mqttConfig.mqttUsername || 'No Value Provided',
          mqttPassword: mqttConfig.mqttPassword || 'No Value Provided',
          mqttPubTopic:
            mqttConfig.mqttPubTopic?.toString() || 'No Value Provided',
          mqttCfgTopic:
            mqttConfig.mqttCfgTopic?.toString() || 'No Value Provided',
          mqttURI: mqttConfig.mqttURI?.toString() || 'No Value Provided',
        };

        setFormData(prev => ({ ...prev, ...mqttData }));
        setOriginalData(prev => ({ ...prev, ...mqttData }));
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
        const comsData = {
          comsMode: comsConfig.comsMode?.toString() || 'No Value Provided',
          comsAddr: comsConfig.comsAddr?.toString() || 'No Value Provided',
          comsRateMs:
            comsConfig.comsRateMs?.toString() || 'No Value Provided',
          comsRTE: comsConfig.comsRTE?.toString() || 'No Value Provided',
          comsGPC: comsConfig.comsGPC?.toString() || 'No Value Provided',
        };

        setFormData(prev => ({ ...prev, ...comsData }));
        setOriginalData(prev => ({ ...prev, ...comsData }));
      }
    }
  }, []);

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
    isSSEConnected,
    setSmibConfigExpanded,
    setCommunicationMode,
    setFirmwareVersion,
    setIsEditMode,
    setMqttConfigData,
    setIsLoadingMqttConfig,
    setIsConnectedToMqtt,
    setHasReceivedRealSmibData,
    setIsManuallyFetching,
    setHasConfigBeenFetched,
    setFormData,
    setOriginalData,
    setIsSSEConnected,
    updateFormData,
    resetFormData,
    setCommunicationModeFromData,
    setFirmwareVersionFromData,
    isConnectedToMqttRef,
    hasReceivedRealSmibDataRef,
  };
}