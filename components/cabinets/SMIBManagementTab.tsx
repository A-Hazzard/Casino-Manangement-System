'use client';

import { Button } from '@/components/ui/button';
import { SMIBManagementSkeleton } from '@/components/ui/skeletons/SMIBManagementSkeleton';
import { SMIBSearchSelect } from '@/components/ui/smib/SMIBSearchSelect';
import { useSMIBDiscovery } from '@/lib/hooks/data/useSMIBDiscovery';
import { useSmibConfiguration } from '@/lib/hooks/data/useSmibConfiguration';
import type { GamingMachine } from '@/shared/types/entities';
import axios from 'axios';
import { RefreshCw } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ComsConfigSection } from './smibManagement/ComsConfigSection';
import { MqttTopicsSection } from './smibManagement/MqttTopicsSection';
import { NetworkConfigSection } from './smibManagement/NetworkConfigSection';

export default function SMIBManagementTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { availableSmibs, loading, error, refreshSmibs } = useSMIBDiscovery();
  const [selectedRelayId, setSelectedRelayId] = useState<string>('');
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const smibConfig = useSmibConfiguration();

  const [networkEditMode, setNetworkEditMode] = useState(false);
  const [mqttEditMode, setMqttEditMode] = useState(false);
  const [comsEditMode, setComsEditMode] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [machineData, setMachineData] = useState<GamingMachine | null>(null);

  // Initialize selected SMIB from URL on mount
  useEffect(() => {
    const smibFromUrl = searchParams?.get('smib');
    if (smibFromUrl && !selectedRelayId) {
      setSelectedRelayId(smibFromUrl);
    }
  }, [searchParams, selectedRelayId]);

  // Update URL when SMIB selection changes
  const handleSmibSelection = (relayId: string) => {
    setSelectedRelayId(relayId);

    // Update URL with smib parameter
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (relayId) {
      params.set('smib', relayId);
    } else {
      params.delete('smib');
    }

    // Update URL without scroll
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // When a SMIB is selected, connect to its config stream
  useEffect(() => {
    if (selectedRelayId) {
      console.log(
        `🔗 [SMIB MANAGEMENT] Connecting to config stream for ${selectedRelayId}`
      );

      // Set loading state - will persist until we receive actual data
      setIsInitialLoading(true);

      smibConfig.connectToConfigStream(selectedRelayId);

      // Request initial config
      Promise.all([
        smibConfig.requestLiveConfig(selectedRelayId, 'mqtt'),
        smibConfig.requestLiveConfig(selectedRelayId, 'net'),
        smibConfig.requestLiveConfig(selectedRelayId, 'coms'),
      ]).catch(err => {
        console.error('Failed to request initial config:', err);
        // If request fails, stop loading after 5 seconds
        setTimeout(() => {
          setIsInitialLoading(false);
        }, 5000);
      });

      // Find machine ID for this relayId
      const smib = availableSmibs.find(s => s.relayId === selectedRelayId);
      if (smib) {
        setSelectedMachineId(smib.machineId);
      }

      return () => {
        smibConfig.disconnectFromConfigStream();
        setIsInitialLoading(false);
      };
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRelayId, availableSmibs]);

  // Stop loading skeleton when we receive actual config data
  useEffect(() => {
    if (
      isInitialLoading &&
      (smibConfig.formData.networkSSID ||
        smibConfig.formData.comsMode ||
        smibConfig.formData.mqttPubTopic)
    ) {
      console.log(
        '📦 [SMIB MANAGEMENT] Received config data, stopping skeleton loader'
      );
      setIsInitialLoading(false);
    }
  }, [
    isInitialLoading,
    smibConfig.formData.networkSSID,
    smibConfig.formData.comsMode,
    smibConfig.formData.mqttPubTopic,
  ]);

  // Fetch machine data from database to show as fallback when SMIB is offline
  useEffect(() => {
    if (selectedRelayId && selectedMachineId) {
      // Fetch full machine data from database with smibConfig
      axios
        .get(`/api/machines/by-id?id=${selectedMachineId}`)
        .then(response => {
          console.log(
            '📦 [SMIB MANAGEMENT] Fetched full machine data from DB:',
            response.data
          );
          if (response.data && response.data.data) {
            const machine = response.data.data;
            setMachineData(machine);
            console.log(
              '📦 [SMIB MANAGEMENT] Machine smibConfig:',
              machine.smibConfig
            );
            console.log(
              '📦 [SMIB MANAGEMENT] Network config:',
              machine.smibConfig?.net
            );
            console.log(
              '📦 [SMIB MANAGEMENT] COMS config:',
              machine.smibConfig?.coms
            );
            console.log(
              '📦 [SMIB MANAGEMENT] MQTT config:',
              machine.smibConfig?.mqtt
            );
            // Also fetch MQTT config to populate formData
            smibConfig.fetchMqttConfig(selectedMachineId);
          }
        })
        .catch(err => {
          console.error('Failed to fetch machine data from DB:', err);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRelayId, selectedMachineId]);

  // Handle network config update
  const handleNetworkUpdate = async (data: {
    networkSSID?: string;
    networkPassword?: string;
    networkChannel?: string;
  }) => {
    if (!selectedRelayId || !selectedMachineId) return;

    try {
      const netConfig = {
        netStaSSID: data.networkSSID,
        netStaPwd: data.networkPassword,
        netStaChan: data.networkChannel
          ? parseInt(data.networkChannel, 10)
          : undefined,
      };

      // If SMIB is online, send MQTT command
      if (smibConfig.isConnectedToMqtt) {
        console.log('📡 [SMIB MANAGEMENT] SMIB is online, sending MQTT update');
        await smibConfig.updateNetworkConfig(selectedRelayId, netConfig);
      } else {
        console.log(
          '💾 [SMIB MANAGEMENT] SMIB is offline, updating database only'
        );
      }

      // Always update database (whether SMIB is online or offline)
      await axios.post('/api/mqtt/update-machine-config', {
        relayId: selectedRelayId,
        smibConfig: {
          net: netConfig,
        },
      });

      toast.success(
        smibConfig.isConnectedToMqtt
          ? 'Network configuration sent to SMIB and saved to database'
          : 'Network configuration saved to database (SMIB offline)'
      );
    } catch (error) {
      console.error('Failed to update network config:', error);
      toast.error('Failed to update network configuration');
      throw error;
    }
  };

  // Handle MQTT topics update
  const handleMqttUpdate = async (data: {
    mqttPubTopic?: string;
    mqttCfgTopic?: string;
    mqttURI?: string;
  }) => {
    if (!selectedRelayId || !selectedMachineId) return;

    try {
      const mqttConfigData = {
        mqttPubTopic: data.mqttPubTopic,
        mqttCfgTopic: data.mqttCfgTopic,
        mqttURI: data.mqttURI,
      };

      // If SMIB is online, send MQTT command
      if (smibConfig.isConnectedToMqtt) {
        console.log('📡 [SMIB MANAGEMENT] SMIB is online, sending MQTT update');
        await smibConfig.updateMqttConfig(selectedRelayId, mqttConfigData);
      } else {
        console.log(
          '💾 [SMIB MANAGEMENT] SMIB is offline, updating database only'
        );
      }

      // Always update database (whether SMIB is online or offline)
      await axios.post('/api/mqtt/update-machine-config', {
        relayId: selectedRelayId,
        smibConfig: {
          mqtt: mqttConfigData,
        },
      });

      toast.success(
        smibConfig.isConnectedToMqtt
          ? 'MQTT configuration sent to SMIB and saved to database'
          : 'MQTT configuration saved to database (SMIB offline)'
      );
    } catch (error) {
      console.error('Failed to update MQTT topics:', error);
      toast.error('Failed to update MQTT topics');
      throw error;
    }
  };

  // Handle COMS config update
  const handleComsUpdate = async (data: {
    comsMode?: string;
    comsAddr?: string;
    comsRateMs?: string;
    comsRTE?: string;
    comsGPC?: string;
  }) => {
    if (!selectedRelayId || !selectedMachineId) return;

    try {
      const comsConfigData = {
        comsMode: data.comsMode ? parseInt(data.comsMode, 10) : undefined,
        comsAddr: data.comsAddr ? parseInt(data.comsAddr, 10) : undefined,
        comsRateMs: data.comsRateMs ? parseInt(data.comsRateMs, 10) : undefined,
        comsRTE: data.comsRTE ? parseInt(data.comsRTE, 10) : undefined,
        comsGPC: data.comsGPC ? parseInt(data.comsGPC, 10) : undefined,
      };

      // If SMIB is online, send MQTT command
      if (smibConfig.isConnectedToMqtt) {
        console.log('📡 [SMIB MANAGEMENT] SMIB is online, sending MQTT update');
        await smibConfig.updateComsConfig(selectedRelayId, comsConfigData);
      } else {
        console.log(
          '💾 [SMIB MANAGEMENT] SMIB is offline, updating database only'
        );
      }

      // Always update database (whether SMIB is online or offline)
      await axios.post('/api/mqtt/update-machine-config', {
        relayId: selectedRelayId,
        smibConfig: {
          coms: comsConfigData,
        },
      });

      toast.success(
        smibConfig.isConnectedToMqtt
          ? 'COMS configuration sent to SMIB and saved to database'
          : 'COMS configuration saved to database (SMIB offline)'
      );
    } catch (error) {
      console.error('Failed to update COMS config:', error);
      toast.error('Failed to update COMS configuration');
      throw error;
    }
  };

  if (loading) {
    return <SMIBManagementSkeleton />;
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-destructive">Error: {error}</p>
        <Button onClick={refreshSmibs} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  const selectedSmib = availableSmibs.find(s => s.relayId === selectedRelayId);

  return (
    <div className="flex min-h-[80vh] w-full max-w-full flex-col gap-6">
      {/* Header with Search/Select */}
      <div className="flex flex-col gap-4 rounded-lg bg-buttonActive p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            Select SMIB Device
          </h2>
          <Button
            onClick={refreshSmibs}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <SMIBSearchSelect
          value={selectedRelayId}
          onValueChange={handleSmibSelection}
          smibs={availableSmibs}
          placeholder="Search for SMIB by relay ID, serial number, or location..."
          emptyMessage="No SMIBs found"
          className="w-full"
        />

        {selectedSmib && (
          <div className="space-y-2">
            <div className="rounded-md bg-white/10 p-3 text-sm text-white">
              <div className="opacity-90">
                <div className="mb-2 font-semibold">{selectedSmib.relayId}</div>
                {selectedSmib.serialNumber && (
                  <div>Serial: {selectedSmib.serialNumber}</div>
                )}
                {selectedSmib.game && <div>Game: {selectedSmib.game}</div>}
                {selectedSmib.locationName && (
                  <div>Location: {selectedSmib.locationName}</div>
                )}
              </div>
            </div>
            {/* Subtle info message */}
            {!smibConfig.isConnectedToMqtt && (
              <div className="rounded-md border border-amber-400/30 bg-amber-100/90 px-3 py-2 text-xs text-amber-800">
                ℹ️ SMIB is offline. Updates will be saved to database only.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Configuration Sections */}
      {selectedRelayId ? (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left Column */}
            <div className="flex flex-col gap-6">
              {/* Network Config */}
              <NetworkConfigSection
                networkSSID={
                  smibConfig.formData.networkSSID !== 'No Value Provided'
                    ? smibConfig.formData.networkSSID
                    : machineData?.smibConfig?.net?.netStaSSID || ''
                }
                networkPassword={
                  smibConfig.formData.networkPassword !== 'No Value Provided'
                    ? smibConfig.formData.networkPassword
                    : machineData?.smibConfig?.net?.netStaPwd || ''
                }
                networkChannel={
                  smibConfig.formData.networkChannel !== 'No Value Provided'
                    ? smibConfig.formData.networkChannel
                    : machineData?.smibConfig?.net?.netStaChan?.toString() || ''
                }
                networkMode={machineData?.smibConfig?.net?.netMode}
                isEditMode={networkEditMode}
                onToggleEdit={() => setNetworkEditMode(!networkEditMode)}
                onUpdate={handleNetworkUpdate}
                isLoading={isInitialLoading}
                isConnectedToMqtt={smibConfig.isConnectedToMqtt}
              />

              {/* COMS Config */}
              <ComsConfigSection
                comsMode={
                  smibConfig.formData.comsMode !== 'No Value Provided'
                    ? smibConfig.formData.comsMode
                    : machineData?.smibConfig?.coms?.comsMode?.toString() || ''
                }
                comsAddr={
                  smibConfig.formData.comsAddr !== 'No Value Provided'
                    ? smibConfig.formData.comsAddr
                    : machineData?.smibConfig?.coms?.comsAddr?.toString() || ''
                }
                comsRateMs={
                  smibConfig.formData.comsRateMs !== 'No Value Provided'
                    ? smibConfig.formData.comsRateMs
                    : machineData?.smibConfig?.coms?.comsRateMs?.toString() ||
                      ''
                }
                comsRTE={
                  smibConfig.formData.comsRTE !== 'No Value Provided'
                    ? smibConfig.formData.comsRTE
                    : machineData?.smibConfig?.coms?.comsRTE?.toString() || ''
                }
                comsGPC={
                  smibConfig.formData.comsGPC !== 'No Value Provided'
                    ? smibConfig.formData.comsGPC
                    : machineData?.smibConfig?.coms?.comsGPC?.toString() || ''
                }
                isEditMode={comsEditMode}
                onToggleEdit={() => setComsEditMode(!comsEditMode)}
                onUpdate={handleComsUpdate}
                isLoading={isInitialLoading}
              />
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-6">
              {/* MQTT Topics */}
              <MqttTopicsSection
                mqttPubTopic={
                  smibConfig.formData.mqttPubTopic !== 'No Value Provided'
                    ? smibConfig.formData.mqttPubTopic
                    : machineData?.smibConfig?.mqtt?.mqttPubTopic || ''
                }
                mqttCfgTopic={
                  smibConfig.formData.mqttCfgTopic !== 'No Value Provided'
                    ? smibConfig.formData.mqttCfgTopic
                    : machineData?.smibConfig?.mqtt?.mqttCfgTopic || ''
                }
                mqttSubTopic={
                  smibConfig.mqttConfigData?.mqttSubTopic ||
                  machineData?.smibConfig?.mqtt?.mqttSubTopic ||
                  ''
                }
                mqttURI={
                  smibConfig.formData.mqttURI !== 'No Value Provided'
                    ? smibConfig.formData.mqttURI
                    : machineData?.smibConfig?.mqtt?.mqttURI || ''
                }
                mqttHost={
                  smibConfig.formData.mqttHost !== 'No Value Provided'
                    ? smibConfig.formData.mqttHost
                    : ''
                }
                mqttPort={
                  smibConfig.formData.mqttPort !== 'No Value Provided'
                    ? smibConfig.formData.mqttPort
                    : ''
                }
                mqttTLS={
                  smibConfig.formData.mqttTLS !== 'No Value Provided'
                    ? smibConfig.formData.mqttTLS
                    : machineData?.smibConfig?.mqtt?.mqttSecure?.toString() ||
                      ''
                }
                mqttUsername={
                  smibConfig.formData.mqttUsername !== 'No Value Provided'
                    ? smibConfig.formData.mqttUsername
                    : machineData?.smibConfig?.mqtt?.mqttUsername || ''
                }
                mqttPassword={
                  smibConfig.formData.mqttPassword !== 'No Value Provided'
                    ? smibConfig.formData.mqttPassword
                    : machineData?.smibConfig?.mqtt?.mqttPassword || ''
                }
                mqttIdleTimeout={
                  smibConfig.formData.mqttIdleTimeout !== 'No Value Provided'
                    ? smibConfig.formData.mqttIdleTimeout
                    : machineData?.smibConfig?.mqtt?.mqttIdleTimeS?.toString() ||
                      ''
                }
                isEditMode={mqttEditMode}
                onToggleEdit={() => setMqttEditMode(!mqttEditMode)}
                onUpdate={handleMqttUpdate}
                isLoading={isInitialLoading}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-12 text-center">
          <p className="text-lg font-medium text-gray-600">No SMIB Selected</p>
          <p className="mt-2 text-sm text-gray-500">
            Select a SMIB device from the dropdown above to view and edit its
            configuration
          </p>
        </div>
      )}
    </div>
  );
}
