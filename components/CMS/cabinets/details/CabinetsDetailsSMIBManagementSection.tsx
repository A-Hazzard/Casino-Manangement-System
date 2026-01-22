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

import { Button } from '@/components/shared/ui/button';
import { CabinetsDetailsSMIBMeterData as MeterDataSection } from '@/components/CMS/cabinets/smibManagement/CabinetsDetailsSMIBMeterData';
import { CabinetsDetailsSMIBOTAUpdate as OTAUpdateSection } from '@/components/CMS/cabinets/smibManagement/CabinetsDetailsSMIBOTAUpdate';
import { CabinetsDetailsSMIBRestart as RestartSection } from '@/components/CMS/cabinets/smibManagement/CabinetsDetailsSMIBRestart';
import { ChevronDownIcon } from 'lucide-react';
import { Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';
import { formatDateWithOrdinal } from '@/lib/utils/date';

type SSEMessage = {
  type: 'connected' | 'callback_ready' | 'heartbeat' | 'keepalive' | 'config_update' | 'error';
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
    subscribeToMessages: (callback: (message: SSEMessage) => void) => () => void;
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
  smibConfig,
  onToggleExpand,
  onFetchConfig,
  onSaveConfig,
  onUpdateFormData,
  onSetEditingSection,
  onCopyToClipboard,
  onResetFormData,
  onSaveAll,
}: CabinetsDetailsSMIBManagementSectionProps) {
  // Don't render if user doesn't have access to SMIB configuration
  if (!canAccessSmibConfig) return null;

  return (
    <motion.div
      className="mt-4 w-full max-w-full rounded-lg bg-container shadow-md shadow-purple-200 overflow-x-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      {/* Header */}
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 w-full max-w-full min-w-0 overflow-x-hidden">
        <div className="flex flex-wrap items-center gap-3 min-w-0 flex-1">
          <h2 className="text-lg font-semibold sm:text-xl text-gray-900">
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
                  <div className={`h-2.5 w-2.5 rounded-full ${
                    isConnectedToMqtt
                      ? 'animate-pulse bg-green-500'
                      : 'bg-red-500'
                  }`}></div>
                  <span className={`text-sm font-medium ${
                    isConnectedToMqtt ? 'text-green-600' : 'text-red-600'
                  }`}>
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
                    <span className="hidden sm:inline">Get SMIB Configuration</span>
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
        className="px-4 pb-2 sm:px-6 w-full max-w-full min-w-0 overflow-x-hidden"
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
                  {cabinet?.relayId || cabinet?.smibBoard || 'No Value Provided'}
                  {(cabinet?.relayId || cabinet?.smibBoard) && (
                    <button
                      onClick={() => {
                        const smibId = cabinet?.relayId || cabinet?.smibBoard || '';
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
            className="overflow-hidden w-full max-w-full"
          >
            <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 overflow-x-hidden w-full max-w-full min-w-0">
              {/* Network Configuration */}
              <div className="border-t border-gray-100 pt-4 sm:pt-6 w-full max-w-full overflow-x-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4">
                  <div className="flex flex-col gap-1">
                    <h3 className="font-bold text-gray-900 text-sm">Network / WiFi</h3>
                    <div className="text-[10px] text-gray-500">
                      Last configured: {formatDateWithOrdinal(cabinet?.smibConfig?.net?.updatedAt) || 'Unknown'}
                    </div>
                  </div>
                  {editingSection === 'network' ? (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => onSetEditingSection(null)} className="text-xs h-7 px-2">Cancel</Button>
                      <Button size="sm" onClick={() => onSaveConfig()} className="bg-button text-white hover:bg-button/90 text-xs h-7 px-2">Save Network</Button>
                    </div>
                  ) : (
                    <Button 
                      size="sm" 
                      onClick={() => onSetEditingSection('network')} 
                      className="bg-button text-white hover:bg-button/90 text-xs h-7 px-2"
                    >
                      EDIT NETWORK
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-full min-w-0">
                  <div className="min-w-0 w-full space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-grayHighlight">
                        Network Name{isConnectedToMqtt ? ' (live)' : ''}:
                      </label>
                      {editingSection === 'network' ? (
                        <input
                          type="text"
                          value={formData.networkSSID === 'No Value Provided' ? '' : formData.networkSSID}
                          onChange={e => onUpdateFormData('networkSSID', e.target.value)}
                          className="w-full rounded border border-border bg-background p-1.5 text-xs text-foreground"
                          placeholder="Enter network name"
                        />
                      ) : (
                        <div className="truncate text-xs">
                          {formData.networkSSID ||
                            cabinet?.smibConfig?.net?.netStaSSID ||
                            'No Value Provided'}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-grayHighlight">
                        Channel{isConnectedToMqtt ? ' (live)' : ''}:
                      </label>
                      {editingSection === 'network' ? (
                        <input
                          type="number"
                          value={formData.networkChannel === 'No Value Provided' ? '' : formData.networkChannel}
                          onChange={e => onUpdateFormData('networkChannel', e.target.value)}
                          className="w-full rounded border border-border bg-background p-1.5 text-xs text-foreground"
                          placeholder="Enter channel"
                          min="1"
                          max="11"
                        />
                      ) : (
                        <div className="text-xs">
                          {formData.networkChannel ||
                            cabinet?.smibConfig?.net?.netStaChan?.toString() ||
                            'No Value Provided'}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 w-full space-y-1">
                    <label className="text-xs font-medium text-grayHighlight">
                      Password{isConnectedToMqtt ? ' (live)' : ''}:
                    </label>
                    {editingSection === 'network' ? (
                      <input
                        type="password"
                        value={formData.networkPassword === 'No Value Provided' ? '' : formData.networkPassword}
                        onChange={e => onUpdateFormData('networkPassword', e.target.value)}
                        className="w-full rounded border border-border bg-background p-1.5 text-xs text-foreground"
                        placeholder="Enter network password"
                      />
                    ) : (
                      <div className="text-xs">
                        {formData.networkPassword ||
                          cabinet?.smibConfig?.net?.netStaPwd ||
                          'No Value Provided'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* COMS and MQTT Configuration */}
              <div className="border-t border-gray-100 pt-4 sm:pt-6 w-full max-w-full overflow-x-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-full min-w-0">
                  {/* COMS Configuration */}
                  <div className="min-w-0 w-full max-w-full overflow-x-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4">
                      <div className="flex flex-col gap-1">
                        <h3 className="font-bold text-gray-900 text-sm">COMS</h3>
                        <div className="text-[10px] text-gray-500">
                          Last configured: {formatDateWithOrdinal(cabinet?.smibConfig?.coms?.updatedAt) || 'Unknown'}
                        </div>
                      </div>
                      {editingSection === 'coms' ? (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => onSetEditingSection(null)} className="text-xs h-7 px-2">Cancel</Button>
                          <Button size="sm" onClick={() => onSaveConfig()} className="bg-button text-white hover:bg-button/90 text-xs h-7 px-2">Save COMS</Button>
                        </div>
                      ) : (
                        <Button 
                          size="sm" 
                          onClick={() => onSetEditingSection('coms')} 
                          className="bg-button text-white hover:bg-button/90 text-xs h-7 px-2"
                        >
                          EDIT COMS
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-3 w-full max-w-full min-w-0">
                      <div className="min-w-0 w-full space-y-1">
                        <label className="text-xs font-medium text-grayHighlight">Address:</label>
                        {editingSection === 'coms' ? (
                          <input
                            type="text"
                            value={formData.comsAddr === 'No Value Provided' ? '' : formData.comsAddr}
                            onChange={e => onUpdateFormData('comsAddr', e.target.value)}
                            className="w-full rounded border border-border bg-background p-1.5 text-xs text-foreground"
                            placeholder="Enter address"
                          />
                        ) : (
                          <div className="text-xs">
                            {formData.comsAddr ||
                              cabinet?.smibConfig?.coms?.comsAddr?.toString() ||
                              'No Value Provided'}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 w-full space-y-1">
                        <label className="text-xs font-medium text-grayHighlight">Polling Rate:</label>
                        {editingSection === 'coms' ? (
                          <input
                            type="text"
                            value={formData.comsRateMs === 'No Value Provided' ? '' : formData.comsRateMs}
                            onChange={e => onUpdateFormData('comsRateMs', e.target.value)}
                            className="w-full rounded border border-border bg-background p-1.5 text-xs text-foreground"
                            placeholder="Enter polling rate"
                          />
                        ) : (
                          <div className="text-xs">
                            {formData.comsRateMs ||
                              cabinet?.smibConfig?.coms?.comsRateMs?.toString() ||
                              'No Value Provided'}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 w-full space-y-1">
                        <label className="text-xs font-medium text-grayHighlight">RTE:</label>
                        {editingSection === 'coms' ? (
                          <select
                            value={formData.comsRTE || '0'}
                            onChange={e => onUpdateFormData('comsRTE', e.target.value)}
                            className="w-full rounded border border-border bg-background p-1.5 text-xs text-foreground"
                          >
                            <option value="0">Disabled</option>
                            <option value="1">Enabled</option>
                          </select>
                        ) : (
                          <div className="text-xs">
                            {formData.comsRTE === '1' || cabinet?.smibConfig?.coms?.comsRTE === 1
                              ? 'Enabled'
                              : formData.comsRTE === '0' || cabinet?.smibConfig?.coms?.comsRTE === 0
                                ? 'Disabled'
                                : 'No Value Provided'}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 w-full space-y-1">
                        <label className="text-xs font-medium text-grayHighlight">GPC:</label>
                        {editingSection === 'coms' ? (
                          <input
                            type="text"
                            value={formData.comsGPC === 'No Value Provided' ? '' : formData.comsGPC}
                            onChange={e => onUpdateFormData('comsGPC', e.target.value)}
                            className="w-full rounded border border-border bg-background p-1.5 text-xs text-foreground"
                            placeholder="Enter GPC"
                          />
                        ) : (
                          <div className="text-xs">
                            {formData.comsGPC ||
                              cabinet?.smibConfig?.coms?.comsGPC?.toString() ||
                              'No Value Provided'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* MQTT Configuration */}
                  <div className="min-w-0 w-full max-w-full overflow-x-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4">
                      <div className="flex flex-col gap-1">
                        <h3 className="font-bold text-gray-900 text-sm">MQTT</h3>
                        <div className="text-[10px] text-gray-500">
                          Last configured: {formatDateWithOrdinal(cabinet?.smibConfig?.mqtt?.updatedAt) || 'Unknown'}
                        </div>
                      </div>
                      {editingSection === 'mqtt' ? (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => onSetEditingSection(null)} className="text-xs h-7 px-2">Cancel</Button>
                          <Button size="sm" onClick={() => onSaveConfig()} className="bg-button text-white hover:bg-button/90 text-xs h-7 px-2">Save MQTT</Button>
                        </div>
                      ) : (
                        <Button 
                          size="sm" 
                          onClick={() => onSetEditingSection('mqtt')} 
                          className="bg-button text-white hover:bg-button/90 text-xs h-7 px-2"
                        >
                          EDIT MQTT
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 w-full max-w-full min-w-0">
                      <div className="min-w-0 w-full space-y-1">
                        <label className="text-xs font-medium text-grayHighlight">MQTT Public Topic:</label>
                        {editingSection === 'mqtt' ? (
                          <input
                            type="text"
                            value={formData.mqttPubTopic === 'No Value Provided' ? '' : formData.mqttPubTopic}
                            onChange={e => onUpdateFormData('mqttPubTopic', e.target.value)}
                            className="w-full rounded border border-border bg-background p-1.5 text-xs text-foreground"
                            placeholder="Enter MQTT public topic"
                          />
                        ) : (
                          <div className="truncate text-xs">
                            {formData.mqttPubTopic ||
                              cabinet?.smibConfig?.mqtt?.mqttPubTopic ||
                              'No Value Provided'}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 w-full space-y-1">
                        <label className="text-xs font-medium text-grayHighlight">MQTT Config Topic:</label>
                        {editingSection === 'mqtt' ? (
                          <input
                            type="text"
                            value={formData.mqttCfgTopic === 'No Value Provided' ? '' : formData.mqttCfgTopic}
                            onChange={e => onUpdateFormData('mqttCfgTopic', e.target.value)}
                            className="w-full rounded border border-border bg-background p-1.5 text-xs text-foreground"
                            placeholder="Enter MQTT config topic"
                          />
                        ) : (
                          <div className="truncate text-xs">
                            {formData.mqttCfgTopic ||
                              cabinet?.smibConfig?.mqtt?.mqttCfgTopic ||
                              'No Value Provided'}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 w-full space-y-1">
                        <label className="text-xs font-medium text-grayHighlight">QOS:</label>
                        {editingSection === 'mqtt' ? (
                          <select
                            value={formData.mqttTLS || '2'}
                            onChange={e => onUpdateFormData('mqttTLS', e.target.value)}
                            className="w-full rounded border border-border bg-background p-1.5 text-xs text-foreground"
                          >
                            <option value="0">0 - At most once</option>
                            <option value="1">1 - At least once</option>
                            <option value="2">2 - Exactly once</option>
                          </select>
                        ) : (
                          <div className="text-xs">
                            {formData.mqttTLS === '0'
                              ? '0 - At most once'
                              : formData.mqttTLS === '1'
                                ? '1 - At least once'
                                : formData.mqttTLS === '2'
                                  ? '2 - Exactly once'
                                  : cabinet?.smibConfig?.mqtt?.mqttQOS === 0
                                    ? '0 - At most once'
                                    : cabinet?.smibConfig?.mqtt?.mqttQOS === 1
                                      ? '1 - At least once'
                                      : cabinet?.smibConfig?.mqtt?.mqttQOS === 2
                                        ? '2 - Exactly once'
                                        : 'No Value Provided'}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 w-full space-y-1">
                        <label className="text-xs font-medium text-grayHighlight">Idle Timeout (s):</label>
                        {editingSection === 'mqtt' ? (
                          <input
                            type="number"
                            value={formData.mqttIdleTimeout === 'No Value Provided' ? '' : formData.mqttIdleTimeout}
                            onChange={e => onUpdateFormData('mqttIdleTimeout', e.target.value)}
                            className="w-full rounded border border-border bg-background p-1.5 text-xs text-foreground"
                            placeholder="Enter idle timeout"
                          />
                        ) : (
                          <div className="text-xs">
                            {formData.mqttIdleTimeout ||
                              cabinet?.smibConfig?.mqtt?.mqttIdleTimeS?.toString() ||
                              'No Value Provided'}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 min-w-0 w-full space-y-1">
                      <label className="text-xs font-medium text-grayHighlight">MQTT URI:</label>
                      {editingSection === 'mqtt' ? (
                        <input
                          type="text"
                          value={formData.mqttURI === 'No Value Provided' ? '' : formData.mqttURI}
                          onChange={e => onUpdateFormData('mqttURI', e.target.value)}
                          className="w-full rounded border border-border bg-background p-1.5 text-xs text-foreground"
                          placeholder="mqtt://mqtt:mqtt@mq.sas.backoffice.ltd:1883"
                        />
                      ) : (
                        <div className="break-words text-xs">
                          {formData.mqttURI ||
                            cabinet?.smibConfig?.mqtt?.mqttURI ||
                            'No Value Provided'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* SMIB Operations & Management */}
              <div className="border-t border-gray-200 pt-6 sm:pt-8 w-full max-w-full overflow-x-hidden">
                <h3 className="text-xl font-bold text-gray-800 mb-6">SMIB Operations & Management</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 w-full max-w-full min-w-0">
                  <div className="min-w-0 w-full max-w-full overflow-x-hidden">
                    <div className="w-full max-w-full min-w-0">
                      <MeterDataSection 
                        relayId={cabinet.relayId!} 
                        isOnline={isConnectedToMqtt}
                        smibConfig={smibConfig}
                      />
                    </div>
                  </div>
                  <div className="min-w-0 w-full max-w-full overflow-x-hidden">
                    <div className="w-full max-w-full min-w-0">
                      <OTAUpdateSection relayId={cabinet.relayId!} isOnline={isConnectedToMqtt} />
                    </div>
                  </div>
                  <div className="min-w-0 w-full max-w-full overflow-x-hidden">
                    <div className="w-full max-w-full min-w-0">
                      <RestartSection relayId={cabinet.relayId!} isOnline={isConnectedToMqtt} />
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

