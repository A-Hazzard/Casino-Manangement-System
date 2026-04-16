/**
 * Cabinets Details SMIB Management Section Component
 *
 * Handles SMIB device management, configurations, and maintenance.
 *
 * Features:
 * - SMIB connection status monitoring
 * - Live configuration fetching and editing
 * - Network, COMS, and MQTT settings management
 * - OTA (Over-the-Air) firmware updates
 * - Device restart controls
 */

'use client';

import { CabinetsDetailsSMIBComsConfig } from '@/components/CMS/cabinets/smibManagement/CabinetsDetailsSMIBComsConfig';
import { CabinetsDetailsSMIBMeterData as MeterDataSection } from '@/components/CMS/cabinets/smibManagement/CabinetsDetailsSMIBMeterData';
import { CabinetsDetailsSMIBMqttTopics } from '@/components/CMS/cabinets/smibManagement/CabinetsDetailsSMIBMqttTopics';
import { CabinetsDetailsSMIBNetworkConfig } from '@/components/CMS/cabinets/smibManagement/CabinetsDetailsSMIBNetworkConfig';
import { CabinetsDetailsSMIBOTAUpdate as OTAUpdateSection } from '@/components/CMS/cabinets/smibManagement/CabinetsDetailsSMIBOTAUpdate';
import { CabinetsDetailsSMIBRestart as RestartSection } from '@/components/CMS/cabinets/smibManagement/CabinetsDetailsSMIBRestart';
import { Button } from '@/components/shared/ui/button';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDownIcon, Copy } from 'lucide-react';

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
  mqttSubTopic: string;
  serverTopic: string;
};

type SmibFormData = {
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

type CabinetsDetailsSMIBManagementSectionProps = {
  cabinet: Cabinet;
  canAccessSmibConfig: boolean;
  smibConfigExpanded: boolean;
  mqttConfigData: MqttConfigData | null;
  isConnectedToMqtt: boolean;
  hasConfigBeenFetched: boolean;
  formData: SmibFormData;
  isManuallyFetching: boolean;
  isEditMode?: boolean;
  editingSection: string | null;
  smibConfig?: {
    subscribeToMessages: (
      callback: (message: SSEMessage) => void
    ) => () => void;
    isSSEConnected: boolean;
  };
  onToggleExpand: () => void;
  onFetchConfig: (relayId: string) => void;
  onSaveConfig: (command?: string) => Promise<void>;
  onUpdateFormData: (key: string, value: string) => void;
  onSetEditingSection: (section: string | null) => void;
  onCopyToClipboard: (text: string, label: string) => void;
  onResetFormData?: () => void;
  onSaveAll?: () => Promise<void>;
  smibHook?: {
    updateNetworkConfig?: (
      relayId: string,
      data: Record<string, unknown>
    ) => Promise<void>;
    updateComsConfig?: (
      relayId: string,
      data: Record<string, unknown>
    ) => Promise<void>;
    updateMqttConfig?: (
      relayId: string,
      data: Record<string, unknown>
    ) => Promise<void>;
    requestLiveConfig?: (relayId: string, section: string) => Promise<void>;
    subscribeToMessages: (
      callback: (message: SSEMessage) => void
    ) => () => void;
    isSSEConnected: boolean;
  };
};

export default function CabinetsDetailsSMIBManagementSection({
  cabinet,
  canAccessSmibConfig,
  smibConfigExpanded,
  mqttConfigData,
  isConnectedToMqtt,
  hasConfigBeenFetched,
  formData,
  isManuallyFetching,
  isEditMode = false,
  editingSection,
  onToggleExpand,
  onFetchConfig,
  onSetEditingSection,
  onCopyToClipboard,
  onResetFormData,
  onSaveAll,
  smibHook,
}: CabinetsDetailsSMIBManagementSectionProps) {
  // Don't render if user doesn't have access to SMIB configuration
  if (!canAccessSmibConfig) return null;

  return (
    <motion.div
      className="mt-4 w-full max-w-full overflow-x-hidden rounded-lg bg-container shadow-md shadow-purple-200"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      {/* Header */}
      <div className="flex w-full min-w-0 max-w-full flex-col gap-3 overflow-x-hidden px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">
            SMIB Configuration
          </h2>

          {/* Connection Status - Show only after config has been fetched */}
          {hasConfigBeenFetched && (
            <>
              {/* Show loading skeleton while fetching config */}
              {isManuallyFetching ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-20 animate-pulse rounded bg-gray-200"></div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      isConnectedToMqtt
                        ? 'animate-pulse bg-green-500'
                        : 'bg-red-500'
                    }`}
                  ></div>
                  <span
                    className={`text-sm font-medium ${
                      isConnectedToMqtt ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {isConnectedToMqtt ? 'SMIB Online' : 'SMIB Offline'}
                  </span>
                </div>
              )}
            </>
          )}

          {/* Edit Mode Buttons - Show only when section is expanded and in edit mode */}
          {smibConfigExpanded && isEditMode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="flex gap-2"
            >
              <Button
                onClick={onResetFormData}
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={onSaveAll}
                variant="outline"
                size="sm"
                className="h-8 bg-button px-3 text-xs text-container hover:bg-buttonActive"
              >
                Save All
              </Button>
            </motion.div>
          )}
        </div>

        {/* Right Side: Get Config Button or Toggle */}
        <div className="flex w-full items-center justify-end sm:w-auto">
          {hasConfigBeenFetched ? (
            <motion.div
              className="cursor-pointer"
              animate={{ rotate: smibConfigExpanded ? 180 : 0 }}
              transition={{ duration: 0.3 }}
              onClick={onToggleExpand}
            >
              <ChevronDownIcon className="h-5 w-5 text-gray-500" />
            </motion.div>
          ) : (
            canAccessSmibConfig && (
              <Button
                onClick={() => cabinet && onFetchConfig(cabinet.relayId!)}
                disabled={isManuallyFetching}
                className="w-full rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-4 sm:text-sm"
              >
                {isManuallyFetching ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                    <span className="hidden sm:inline">Fetching...</span>
                    <span className="sm:hidden">Fetching...</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">
                      Get SMIB Configuration
                    </span>
                    <span className="sm:hidden">Get SMIB Config</span>
                  </>
                )}
              </Button>
            )
          )}
        </div>
      </div>

      {/* SMIB Details Summary */}
      <motion.div
        className="w-full min-w-0 max-w-full overflow-x-hidden px-4 pb-2 sm:px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {isManuallyFetching ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4">
            <div className="space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200"></div>
            </div>
            <div className="space-y-2 sm:text-right">
              <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 sm:ml-auto"></div>
              <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200 sm:ml-auto"></div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4">
            <div>
              <p className="text-xs text-grayHighlight sm:text-sm">
                <span className="font-medium">SMIB ID:</span>{' '}
                <span className="flex items-center gap-1">
                  {cabinet?.relayId ||
                    cabinet?.smibBoard ||
                    'No Value Provided'}
                  {(cabinet?.relayId || cabinet?.smibBoard) && (
                    <button
                      onClick={() => {
                        const smibId =
                          cabinet?.relayId || cabinet?.smibBoard || '';
                        onCopyToClipboard(smibId, 'SMIB ID');
                      }}
                      className="rounded p-0.5 transition-colors hover:bg-gray-100"
                      title="Copy SMIB ID to clipboard"
                    >
                      <Copy className="h-3 w-3 text-gray-500 hover:text-blue-600" />
                    </button>
                  )}
                </span>
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs text-grayHighlight sm:text-sm">
                <span className="font-medium">Communication Mode:</span>{' '}
                {cabinet?.smibConfig?.coms?.comsMode ?? 'undefined'}
              </p>
              <p className="mt-1 text-xs text-grayHighlight sm:mt-0 sm:text-sm">
                <span className="font-medium">Running firmware:</span>{' '}
                {mqttConfigData?.firmwareVersion || 'No Value Provided'}
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Expanded Content */}
      <AnimatePresence>
        {smibConfigExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="w-full max-w-full overflow-hidden"
          >
            <div className="w-full min-w-0 max-w-full space-y-6 overflow-x-hidden p-4 sm:space-y-8 sm:p-6">
              {/* Network, COMS, and MQTT Configuration exactly like /cabinets?smib */}
              <div className="grid w-full min-w-0 max-w-full grid-cols-1 gap-6 border-t border-gray-100 pt-4 sm:pt-6 lg:grid-cols-2">
                {/* Left Column */}
                <div className="flex w-full min-w-0 flex-col gap-6">
                  {/* Network Config */}
                  <CabinetsDetailsSMIBNetworkConfig
                    networkSSID={
                      formData.networkSSID !== 'No Value Provided'
                        ? formData.networkSSID
                        : cabinet?.smibConfig?.net?.netStaSSID || ''
                    }
                    networkChannel={
                      formData.networkChannel !== 'No Value Provided'
                        ? formData.networkChannel
                        : cabinet?.smibConfig?.net?.netStaChan?.toString() || ''
                    }
                    networkPassword={
                      formData.networkPassword !== 'No Value Provided'
                        ? formData.networkPassword
                        : cabinet?.smibConfig?.net?.netStaPwd || ''
                    }
                    updatedAt={cabinet?.smibConfig?.net?.updatedAt}
                    isEditMode={editingSection === 'network'}
                    onToggleEdit={() =>
                      onSetEditingSection(
                        editingSection === 'network' ? null : 'network'
                      )
                    }
                    onUpdate={async data => {
                      const networkData = {
                        netStaSSID: data.networkSSID || undefined,
                        netStaPwd: data.networkPassword || undefined,
                        netStaChan: data.networkChannel
                          ? parseInt(data.networkChannel, 10)
                          : undefined,
                      };
                      const relayId = cabinet.relayId || cabinet.smibBoard;
                      if (!relayId) return;

                      if (isConnectedToMqtt && smibHook?.updateNetworkConfig) {
                        await smibHook.updateNetworkConfig(
                          relayId,
                          networkData
                        );
                      }

                      await fetch('/api/mqtt/update-machine-config', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          relayId,
                          smibConfig: { net: networkData },
                        }),
                      });

                      const { toast } = await import('sonner');
                      toast.success(
                        isConnectedToMqtt
                          ? 'Network configuration sent to SMIB and saved to database'
                          : 'Network configuration saved to database (SMIB offline)'
                      );

                      setTimeout(async () => {
                        if (smibHook?.requestLiveConfig) {
                          await smibHook.requestLiveConfig(relayId, 'net');
                        }
                      }, 3000);

                      onSetEditingSection(null);
                    }}
                    isConnectedToMqtt={isConnectedToMqtt}
                    isLoading={isManuallyFetching}
                  />

                  {/* COMS Configuration */}
                  <CabinetsDetailsSMIBComsConfig
                    comsMode={
                      formData.comsMode !== 'No Value Provided'
                        ? formData.comsMode
                        : cabinet?.smibConfig?.coms?.comsMode?.toString() || ''
                    }
                    comsAddr={
                      formData.comsAddr !== 'No Value Provided'
                        ? formData.comsAddr
                        : cabinet?.smibConfig?.coms?.comsAddr?.toString() || ''
                    }
                    comsRateMs={
                      formData.comsRateMs !== 'No Value Provided'
                        ? formData.comsRateMs
                        : cabinet?.smibConfig?.coms?.comsRateMs?.toString() ||
                          ''
                    }
                    comsRTE={
                      formData.comsRTE !== 'No Value Provided'
                        ? formData.comsRTE
                        : cabinet?.smibConfig?.coms?.comsRTE?.toString() || ''
                    }
                    comsGPC={
                      formData.comsGPC !== 'No Value Provided'
                        ? formData.comsGPC
                        : cabinet?.smibConfig?.coms?.comsGPC?.toString() || ''
                    }
                    updatedAt={cabinet?.smibConfig?.coms?.updatedAt}
                    isEditMode={editingSection === 'coms'}
                    onToggleEdit={() =>
                      onSetEditingSection(
                        editingSection === 'coms' ? null : 'coms'
                      )
                    }
                    onUpdate={async data => {
                      const comsConfigData = {
                        comsMode: data.comsMode
                          ? parseInt(data.comsMode, 10)
                          : undefined,
                        comsAddr: data.comsAddr
                          ? parseInt(data.comsAddr, 10)
                          : undefined,
                        comsRateMs: data.comsRateMs
                          ? parseInt(data.comsRateMs, 10)
                          : undefined,
                        comsRTE: data.comsRTE
                          ? parseInt(data.comsRTE, 10)
                          : undefined,
                        comsGPC: data.comsGPC
                          ? parseInt(data.comsGPC, 10)
                          : undefined,
                      };
                      const relayId = cabinet.relayId || cabinet.smibBoard;
                      if (!relayId) return;

                      if (isConnectedToMqtt && smibHook?.updateComsConfig) {
                        await smibHook.updateComsConfig(
                          relayId,
                          comsConfigData
                        );
                      }

                      await fetch('/api/mqtt/update-machine-config', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          relayId,
                          smibConfig: { coms: comsConfigData },
                        }),
                      });

                      const { toast } = await import('sonner');
                      toast.success(
                        isConnectedToMqtt
                          ? 'COMS configuration sent to SMIB and saved to database'
                          : 'COMS configuration saved to database (SMIB offline)'
                      );

                      setTimeout(async () => {
                        if (smibHook?.requestLiveConfig) {
                          await smibHook.requestLiveConfig(relayId, 'coms');
                        }
                      }, 3000);

                      onSetEditingSection(null);
                    }}
                    isLoading={isManuallyFetching}
                  />
                </div>

                {/* Right Column */}
                <div className="flex w-full min-w-0 flex-col gap-6">
                  {/* MQTT Topics */}
                  <CabinetsDetailsSMIBMqttTopics
                    mqttPubTopic={
                      formData.mqttPubTopic !== 'No Value Provided'
                        ? formData.mqttPubTopic
                        : cabinet?.smibConfig?.mqtt?.mqttPubTopic || ''
                    }
                    mqttCfgTopic={
                      formData.mqttCfgTopic !== 'No Value Provided'
                        ? formData.mqttCfgTopic
                        : cabinet?.smibConfig?.mqtt?.mqttCfgTopic || ''
                    }
                    mqttURI={
                      formData.mqttURI !== 'No Value Provided'
                        ? formData.mqttURI
                        : cabinet?.smibConfig?.mqtt?.mqttURI || ''
                    }
                    mqttTLS={
                      formData.mqttTLS !== 'No Value Provided'
                        ? formData.mqttTLS
                        : cabinet?.smibConfig?.mqtt?.mqttQOS?.toString() || ''
                    }
                    mqttIdleTimeout={
                      formData.mqttIdleTimeout !== 'No Value Provided'
                        ? formData.mqttIdleTimeout
                        : cabinet?.smibConfig?.mqtt?.mqttIdleTimeS?.toString() ||
                          ''
                    }
                    updatedAt={cabinet?.smibConfig?.mqtt?.updatedAt}
                    isEditMode={editingSection === 'mqtt'}
                    onToggleEdit={() =>
                      onSetEditingSection(
                        editingSection === 'mqtt' ? null : 'mqtt'
                      )
                    }
                    onUpdate={async data => {
                      const mqttConfigData = {
                        mqttPubTopic: data.mqttPubTopic || undefined,
                        mqttCfgTopic: data.mqttCfgTopic || undefined,
                        mqttURI: data.mqttURI || undefined,
                      };
                      const relayId = cabinet.relayId || cabinet.smibBoard;
                      if (!relayId) return;

                      if (isConnectedToMqtt && smibHook?.updateMqttConfig) {
                        await smibHook.updateMqttConfig(
                          relayId,
                          mqttConfigData
                        );
                      }

                      await fetch('/api/mqtt/update-machine-config', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          relayId,
                          smibConfig: { mqtt: mqttConfigData },
                        }),
                      });

                      const { toast } = await import('sonner');
                      toast.success(
                        isConnectedToMqtt
                          ? 'MQTT configuration sent to SMIB and saved to database'
                          : 'MQTT configuration saved to database (SMIB offline)'
                      );

                      setTimeout(async () => {
                        if (smibHook?.requestLiveConfig) {
                          await smibHook.requestLiveConfig(relayId, 'mqtt');
                        }
                      }, 3000);

                      onSetEditingSection(null);
                    }}
                    isLoading={isManuallyFetching}
                  />
                </div>
              </div>

              {/* SMIB Operations & Management */}
              <div className="w-full max-w-full overflow-x-hidden border-t border-gray-200 pt-6 sm:pt-8">
                <h3 className="mb-6 text-xl font-bold text-gray-800">
                  SMIB Operations & Management
                </h3>
                <div className="grid w-full min-w-0 max-w-full grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
                  <div className="w-full min-w-0 max-w-full overflow-x-hidden">
                    <div className="w-full min-w-0 max-w-full">
                      <MeterDataSection
                        relayId={cabinet.relayId!}
                        isOnline={isConnectedToMqtt}
                        smibConfig={{
                          subscribeToMessages:
                            smibHook?.subscribeToMessages ?? (() => () => {}),
                          isSSEConnected: smibHook?.isSSEConnected ?? false,
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-full min-w-0 max-w-full overflow-x-hidden">
                    <div className="w-full min-w-0 max-w-full">
                      <OTAUpdateSection
                        relayId={cabinet.relayId!}
                        isOnline={isConnectedToMqtt}
                      />
                    </div>
                  </div>
                  <div className="w-full min-w-0 max-w-full overflow-x-hidden">
                    <div className="w-full min-w-0 max-w-full">
                      <RestartSection
                        relayId={cabinet.relayId!}
                        isOnline={isConnectedToMqtt}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
