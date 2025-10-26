'use client';

import { Button } from '@/components/ui/button';
import { SMIBManagementSkeleton } from '@/components/ui/skeletons/SMIBManagementSkeleton';
import { SMIBSearchSelect } from '@/components/ui/smib/SMIBSearchSelect';
import { useSMIBDiscovery } from '@/lib/hooks/data/useSMIBDiscovery';
import { useSmibConfiguration } from '@/lib/hooks/data/useSmibConfiguration';
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
  const { availableSmibs, loading, error, refreshSmibs } =
    useSMIBDiscovery();
  const [selectedRelayId, setSelectedRelayId] = useState<string>('');
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const smibConfig = useSmibConfiguration();

  const [networkEditMode, setNetworkEditMode] = useState(false);
  const [mqttEditMode, setMqttEditMode] = useState(false);
  const [comsEditMode, setComsEditMode] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);

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
      
      // Set loading state
      setIsInitialLoading(true);
      
      smibConfig.connectToConfigStream(selectedRelayId);

      // Request initial config
      Promise.all([
        smibConfig.requestLiveConfig(selectedRelayId, 'mqtt'),
        smibConfig.requestLiveConfig(selectedRelayId, 'net'),
        smibConfig.requestLiveConfig(selectedRelayId, 'coms'),
      ])
        .catch(err => {
          console.error('Failed to request initial config:', err);
        })
        .finally(() => {
          // Stop showing skeleton after 3 seconds (enough time for initial response)
          setTimeout(() => {
            setIsInitialLoading(false);
          }, 3000);
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

  // Handle network config update
  const handleNetworkUpdate = async (data: {
    networkSSID?: string;
    networkPassword?: string;
    networkChannel?: string;
  }) => {
    if (!selectedRelayId) return;

    try {
      // Update via MQTT
      await smibConfig.updateNetworkConfig(selectedRelayId, {
        netStaSSID: data.networkSSID,
        netStaPwd: data.networkPassword,
        netStaChan: data.networkChannel
          ? parseInt(data.networkChannel, 10)
          : undefined,
      });

      // Update database
      if (selectedMachineId) {
        await axios.post('/api/mqtt/update-machine-config', {
          relayId: selectedRelayId,
          smibConfig: {
            net: {
              netStaSSID: data.networkSSID,
              netStaPwd: data.networkPassword,
              netStaChan: data.networkChannel
                ? parseInt(data.networkChannel, 10)
                : undefined,
            },
          },
        });
      }

      toast.success('Network configuration updated successfully');
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
    if (!selectedRelayId) return;

    try {
      // Update via MQTT
      await smibConfig.updateMqttConfig(selectedRelayId, {
        mqttPubTopic: data.mqttPubTopic,
        mqttCfgTopic: data.mqttCfgTopic,
        mqttURI: data.mqttURI,
      });

      // Update database
      if (selectedMachineId) {
        await axios.post('/api/mqtt/update-machine-config', {
          relayId: selectedRelayId,
          smibConfig: {
            mqtt: {
              mqttPubTopic: data.mqttPubTopic,
              mqttCfgTopic: data.mqttCfgTopic,
              mqttURI: data.mqttURI,
            },
          },
        });
      }

      toast.success('MQTT topics updated successfully');
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
    if (!selectedRelayId) return;

    try {
      // Update via MQTT
      await smibConfig.updateComsConfig(selectedRelayId, {
        comsMode: data.comsMode ? parseInt(data.comsMode, 10) : undefined,
        comsAddr: data.comsAddr ? parseInt(data.comsAddr, 10) : undefined,
        comsRateMs: data.comsRateMs
          ? parseInt(data.comsRateMs, 10)
          : undefined,
        comsRTE: data.comsRTE ? parseInt(data.comsRTE, 10) : undefined,
        comsGPC: data.comsGPC ? parseInt(data.comsGPC, 10) : undefined,
      });

      // Update database
      if (selectedMachineId) {
        await axios.post('/api/mqtt/update-machine-config', {
          relayId: selectedRelayId,
          smibConfig: {
            coms: {
              comsMode: data.comsMode ? parseInt(data.comsMode, 10) : undefined,
              comsAddr: data.comsAddr ? parseInt(data.comsAddr, 10) : undefined,
              comsRateMs: data.comsRateMs
                ? parseInt(data.comsRateMs, 10)
                : undefined,
              comsRTE: data.comsRTE ? parseInt(data.comsRTE, 10) : undefined,
              comsGPC: data.comsGPC ? parseInt(data.comsGPC, 10) : undefined,
            },
          },
        });
      }

      toast.success('COMS configuration updated successfully');
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
                  networkSSID={smibConfig.formData.networkSSID}
                  networkPassword={smibConfig.formData.networkPassword}
                  networkChannel={smibConfig.formData.networkChannel}
                  networkMode={
                    smibConfig.formData.networkSSID ? 1 : 0 // If SSID is set, assume WiFi mode
                  }
                  isEditMode={networkEditMode}
                  onToggleEdit={() => setNetworkEditMode(!networkEditMode)}
                  onUpdate={handleNetworkUpdate}
                  isLoading={isInitialLoading}
                />

                {/* COMS Config */}
                <ComsConfigSection
                  comsMode={smibConfig.formData.comsMode}
                  comsAddr={smibConfig.formData.comsAddr}
                  comsRateMs={smibConfig.formData.comsRateMs}
                  comsRTE={smibConfig.formData.comsRTE}
                  comsGPC={smibConfig.formData.comsGPC}
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
                  mqttPubTopic={smibConfig.formData.mqttPubTopic}
                  mqttCfgTopic={smibConfig.formData.mqttCfgTopic}
                  mqttSubTopic={smibConfig.mqttConfigData?.mqttSubTopic}
                  mqttURI={smibConfig.formData.mqttURI}
                  mqttHost={smibConfig.formData.mqttHost}
                  mqttPort={smibConfig.formData.mqttPort}
                  mqttTLS={smibConfig.formData.mqttTLS}
                  mqttUsername={smibConfig.formData.mqttUsername}
                  mqttPassword={smibConfig.formData.mqttPassword}
                  mqttIdleTimeout={smibConfig.formData.mqttIdleTimeout}
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
          <p className="text-lg font-medium text-gray-600">
            No SMIB Selected
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Select a SMIB device from the dropdown above to view and edit its
            configuration
          </p>
        </div>
      )}
    </div>
  );
}

