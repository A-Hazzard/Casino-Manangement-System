'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SMIBManagementSkeleton } from '@/components/ui/skeletons/SMIBManagementSkeleton';
import { SMIBSearchSelect } from '@/components/ui/smib/SMIBSearchSelect';
import { useSMIBDiscovery } from '@/lib/hooks/data/useSMIBDiscovery';
import { useSmibConfiguration } from '@/lib/hooks/data/useSmibConfiguration';
import type { GamingMachine } from '@/shared/types/entities';
import axios from 'axios';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ComsConfigSection } from './smibManagement/ComsConfigSection';
import { MeterDataSection } from './smibManagement/MeterDataSection';
import { MqttTopicsSection } from './smibManagement/MqttTopicsSection';
import { NetworkConfigSection } from './smibManagement/NetworkConfigSection';
import { OTAUpdateSection } from './smibManagement/OTAUpdateSection';
import { RestartSection } from './smibManagement/RestartSection';

export default function SMIBManagementTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { availableSmibs, loading, error, refreshSmibs } = useSMIBDiscovery();
  const [selectedRelayId, setSelectedRelayId] = useState<string>('');
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [showRestartAllDialog, setShowRestartAllDialog] = useState(false);
  const [isRestartingAll, setIsRestartingAll] = useState(false);
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

  // Refresh SMIB data (re-request config and reload machine data)
  const handleRefreshSmibData = async () => {
    if (!selectedRelayId) return;

    console.log('🔄 [SMIB MANAGEMENT] Refreshing SMIB data...');
    setIsInitialLoading(true);

    // Refresh SMIB list
    await refreshSmibs();

    // Re-request config data
    try {
      await Promise.all([
        smibConfig.requestLiveConfig(selectedRelayId, 'mqtt'),
        smibConfig.requestLiveConfig(selectedRelayId, 'net'),
        smibConfig.requestLiveConfig(selectedRelayId, 'coms'),
      ]);
    } catch (err) {
      console.error('Failed to request config:', err);
    }

    // Reload machine data
    if (selectedMachineId) {
      try {
        const response = await axios.get(
          `/api/machines/by-id?id=${selectedMachineId}`
        );
        setMachineData(response.data);
      } catch (err) {
        console.error('Failed to reload machine data:', err);
      }
    }

    // Loading will automatically stop when config data arrives
  };

  // Get unique locations from available SMIBs (including unassigned)
  const uniqueLocations = useMemo(() => {
    const locationMap = new Map<string, string>();
    availableSmibs.forEach(smib => {
      // Include all locations, even unassigned ones
      if (smib.locationId) {
        locationMap.set(
          smib.locationId,
          smib.locationName || 'No Location Assigned'
        );
      }
    });
    return Array.from(locationMap.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [availableSmibs]);

  // Filter SMIBs by selected location
  const filteredSmibs = useMemo(() => {
    if (selectedLocationId === 'all') {
      return availableSmibs;
    }
    return availableSmibs.filter(
      smib => smib.locationId === selectedLocationId
    );
  }, [availableSmibs, selectedLocationId]);

  // Get selected location name for restart all dialog
  const selectedLocationName = useMemo(() => {
    return (
      uniqueLocations.find(loc => loc.id === selectedLocationId)?.name || ''
    );
  }, [uniqueLocations, selectedLocationId]);

  // Handle restart all SMIBs for selected location
  const handleRestartAllSmibs = async () => {
    if (selectedLocationId === 'all' || !selectedLocationId) {
      toast.error('Please select a specific location');
      return;
    }

    console.log(
      '🔄 [SMIB MANAGEMENT] Restarting all SMIBs at location:',
      selectedLocationId
    );
    console.log('🔄 [SMIB MANAGEMENT] Location name:', selectedLocationName);
    console.log(
      '🔄 [SMIB MANAGEMENT] Filtered SMIBs count:',
      filteredSmibs.length
    );

    // Extract unique relayIds from filtered SMIBs (from MQTT discovery)
    const relayIds = Array.from(
      new Set(filteredSmibs.map(smib => smib.relayId).filter(Boolean))
    );

    console.log('🔄 [SMIB MANAGEMENT] Unique relay IDs to restart:', relayIds);

    if (relayIds.length === 0) {
      toast.error('No SMIBs found at this location');
      setShowRestartAllDialog(false);
      return;
    }

    setIsRestartingAll(true);
    try {
      const url = `/api/locations/${selectedLocationId}/smib-restart`;
      console.log('📡 [SMIB MANAGEMENT] Calling POST:', url);
      console.log('📡 [SMIB MANAGEMENT] Payload:', { relayIds });

      const response = await axios.post(url, { relayIds });

      console.log('✅ [SMIB MANAGEMENT] Restart all response:', response.data);

      if (response.data.successful > 0) {
        toast.success(
          `Restart command sent to ${response.data.successful} SMIB(s) at ${selectedLocationName}`
        );
      }

      if (response.data.failed > 0) {
        toast.warning(
          `Failed to restart ${response.data.failed} SMIB(s). Check console for details.`
        );
        console.error('Failed SMIBs:', response.data.errors);
      }
    } catch (error) {
      console.error('❌ [SMIB MANAGEMENT] Failed to restart all SMIBs:', error);

      if (axios.isAxiosError(error) && error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);

        if (error.response.status === 404) {
          toast.error(
            error.response.data.error || 'No SMIBs found at this location'
          );
        } else {
          toast.error('Failed to send restart command to SMIBs');
        }
      } else {
        toast.error('Failed to send restart command to SMIBs');
      }
    } finally {
      setIsRestartingAll(false);
      setShowRestartAllDialog(false);
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

        {/* Search Bar and Location Filter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex-1">
            <SMIBSearchSelect
              value={selectedRelayId}
              onValueChange={handleSmibSelection}
              smibs={filteredSmibs}
              placeholder="Search for SMIB by relay ID, serial number, or location..."
              emptyMessage="No SMIBs found"
              className="w-full"
            />
          </div>

          {/* Location Filter */}
          <div className="w-full sm:w-64">
            <Select
              value={selectedLocationId}
              onValueChange={setSelectedLocationId}
            >
              <SelectTrigger className="w-full border-white/20 bg-white/10 text-white hover:bg-white/20">
                <SelectValue placeholder="Filter by location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {uniqueLocations.map(location => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Restart All SMIBs Button - Only shown when specific location selected */}
        {selectedLocationId !== 'all' && (
          <Button
            onClick={() => setShowRestartAllDialog(true)}
            variant="destructive"
            size="sm"
            disabled={isRestartingAll || filteredSmibs.length === 0}
            className="w-full bg-red-600 text-white hover:bg-red-700 sm:w-auto"
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Restart All SMIBs ({filteredSmibs.length})
          </Button>
        )}

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
                updatedAt={machineData?.smibConfig?.net?.updatedAt}
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
                updatedAt={machineData?.smibConfig?.coms?.updatedAt}
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
                updatedAt={machineData?.smibConfig?.mqtt?.updatedAt}
                isEditMode={mqttEditMode}
                onToggleEdit={() => setMqttEditMode(!mqttEditMode)}
                onUpdate={handleMqttUpdate}
                isLoading={isInitialLoading}
              />
            </div>
          </div>

          {/* Additional SMIB Management Features */}
          <div className="mt-8 space-y-6">
            <h2 className="text-xl font-bold text-gray-800">
              SMIB Operations & Management
            </h2>

            {/* Operations Grid - Only visible when SMIB is selected */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Left Column */}
              <div className="space-y-6">
                <RestartSection
                  relayId={selectedRelayId}
                  isOnline={smibConfig.isConnectedToMqtt}
                  onRefreshData={handleRefreshSmibData}
                />
                <MeterDataSection
                  relayId={selectedRelayId}
                  isOnline={smibConfig.isConnectedToMqtt}
                />
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <OTAUpdateSection
                  relayId={selectedRelayId}
                  isOnline={smibConfig.isConnectedToMqtt}
                  firmwareUpdatedAt={
                    machineData?.smibConfig?.ota?.firmwareUpdatedAt
                  }
                  onUpdateComplete={handleRefreshSmibData}
                />
              </div>
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

      {/* Restart All SMIBs Confirmation Dialog */}
      <AlertDialog
        open={showRestartAllDialog}
        onOpenChange={setShowRestartAllDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Restart All SMIBs at {selectedLocationName}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will send a restart command to{' '}
                <strong>{filteredSmibs.length} SMIB(s)</strong> at{' '}
                <strong>{selectedLocationName}</strong>.
              </p>
              <p className="text-amber-600">
                ⚠️ All affected machines will temporarily disconnect during the
                restart process.
              </p>
              <p>Are you sure you want to continue?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRestartingAll}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestartAllSmibs}
              disabled={isRestartingAll}
              className="bg-red-600 hover:bg-red-700"
            >
              {isRestartingAll ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Restarting...
                </>
              ) : (
                <>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Restart All
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
