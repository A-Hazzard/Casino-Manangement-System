/**
 * Cabinets SMIB Management Tab Component
 *
 * Handles discovery, configuration, and management of SMIB devices.
 * Features network, MQTT, and COMS settings, as well as operations like restart and OTA updates.
 *
 * @module components/cabinets/CabinetsSMIBManagementTab
 */

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
import LocationMultiSelect from '@/components/ui/common/LocationMultiSelect';
import { SMIBManagementSkeleton } from '@/components/ui/skeletons/SMIBManagementSkeleton';
import { SMIBSearchSelect } from '@/components/ui/smib/SMIBSearchSelect';
import { useSMIBDiscovery } from '@/lib/hooks/data/useSMIBDiscovery';
import { useSmibConfiguration } from '@/lib/hooks/data/useSmibConfiguration';
import type { GamingMachine } from '@/shared/types/entities';
import axios from 'axios';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CabinetsDetailsSMIBComsConfig } from './smibManagement/CabinetsDetailsSMIBComsConfig';
import { CabinetsDetailsSMIBMeterData } from './smibManagement/CabinetsDetailsSMIBMeterData';
import { CabinetsDetailsSMIBMqttTopics } from './smibManagement/CabinetsDetailsSMIBMqttTopics';
import { CabinetsDetailsSMIBNetworkConfig } from './smibManagement/CabinetsDetailsSMIBNetworkConfig';
import { CabinetsDetailsSMIBOTAUpdate } from './smibManagement/CabinetsDetailsSMIBOTAUpdate';
import { CabinetsDetailsSMIBRestart } from './smibManagement/CabinetsDetailsSMIBRestart';

export type CabinetsSMIBManagementTabProps = {
  refreshTrigger?: number;
};

export default function CabinetsSMIBManagementTab({
  refreshTrigger = 0,
}: CabinetsSMIBManagementTabProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { availableSmibs, loading, error, refreshSmibs } = useSMIBDiscovery();
  const [selectedRelayId, setSelectedRelayId] = useState<string>('');
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [showRestartAllDialog, setShowRestartAllDialog] = useState(false);
  const [isRestartingAll, setIsRestartingAll] = useState(false);
  const smibConfig = useSmibConfiguration();

  const [networkEditMode, setNetworkEditMode] = useState(false);
  const [mqttEditMode, setMqttEditMode] = useState(false);
  const [comsEditMode, setComsEditMode] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [machineData, setMachineData] = useState<GamingMachine | null>(null);

  // Track if we've initialized from URL to prevent infinite loops
  const hasInitializedFromUrl = useRef(false);

  // Initialize selected SMIB from URL on mount (only once)
  useEffect(() => {
    if (hasInitializedFromUrl.current) return;

    const smibFromUrl = searchParams?.get('smib');
    if (smibFromUrl && smibFromUrl !== selectedRelayId) {
      setSelectedRelayId(smibFromUrl);
      hasInitializedFromUrl.current = true;
    } else if (!smibFromUrl) {
      // Mark as initialized even if no SMIB in URL
      hasInitializedFromUrl.current = true;
    }
  }, [searchParams, selectedRelayId]);

  // Update URL when SMIB selection changes (but only if different from URL)
  const handleSmibSelection = useCallback(
    (relayId: string) => {
      const currentSmibInUrl = searchParams?.get('smib');

      // Only update if the relayId is different from what's in the URL
      if (relayId !== currentSmibInUrl) {
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
      } else if (relayId !== selectedRelayId) {
        // If URL matches but state doesn't, just sync state
        setSelectedRelayId(relayId);
      }
    },
    [searchParams, router, selectedRelayId]
  );

  // Store smibConfig functions in refs to avoid dependency issues
  const connectToConfigStreamRef = useRef(smibConfig.connectToConfigStream);
  const requestLiveConfigRef = useRef(smibConfig.requestLiveConfig);

  useEffect(() => {
    connectToConfigStreamRef.current = smibConfig.connectToConfigStream;
    requestLiveConfigRef.current = smibConfig.requestLiveConfig;
  }, [smibConfig.connectToConfigStream, smibConfig.requestLiveConfig]);

  // Track last selectedRelayId to prevent re-running when availableSmibs changes
  const lastSelectedRelayIdRef = useRef<string | null>(null);

  // When a SMIB is selected, connect to its config stream
  useEffect(() => {
    if (!selectedRelayId) {
      lastSelectedRelayIdRef.current = null;
      return;
    }

    // Only run if selectedRelayId actually changed
    if (lastSelectedRelayIdRef.current === selectedRelayId) {
      // If relayId hasn't changed, only update machineId if availableSmibs changed
      const smib = availableSmibs.find(s => s.relayId === selectedRelayId);
      if (smib && smib.machineId !== selectedMachineId) {
        setSelectedMachineId(smib.machineId);
      }
      return;
    }

    lastSelectedRelayIdRef.current = selectedRelayId;

    // Set loading state - will persist until we receive actual data
    setIsInitialLoading(true);

    connectToConfigStreamRef.current(selectedRelayId);

    // Request initial config
    Promise.all([
      requestLiveConfigRef.current(selectedRelayId, 'mqtt'),
      requestLiveConfigRef.current(selectedRelayId, 'net'),
      requestLiveConfigRef.current(selectedRelayId, 'coms'),
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
      // Only disconnect if selectedRelayId is actually changing
      setIsInitialLoading(false);
    };
  }, [
    selectedRelayId,
    availableSmibs,
    selectedMachineId,
    setSelectedMachineId,
  ]);

  // Stop loading skeleton when we receive actual config data
  // Use refs to track formData to avoid dependency issues
  const formDataRef = useRef(smibConfig.formData);
  useEffect(() => {
    formDataRef.current = smibConfig.formData;
  }, [smibConfig.formData]);

  useEffect(() => {
    if (
      isInitialLoading &&
      (formDataRef.current.networkSSID ||
        formDataRef.current.comsMode ||
        formDataRef.current.mqttPubTopic)
    ) {
      setIsInitialLoading(false);
    }
  }, [isInitialLoading]);

  // Store fetchMqttConfig in ref to avoid dependency issues
  const fetchMqttConfigRef = useRef(smibConfig.fetchMqttConfig);
  useEffect(() => {
    fetchMqttConfigRef.current = smibConfig.fetchMqttConfig;
  }, [smibConfig.fetchMqttConfig]);

  // Fetch machine data from database to show as fallback when SMIB is offline
  useEffect(() => {
    if (!selectedRelayId || !selectedMachineId) {
      return;
    }

    // Fetch full machine data from database with smibConfig
    axios
      .get(`/api/machines/by-id?id=${selectedMachineId}`)
      .then(response => {
        if (response.data && response.data.data) {
          const machine = response.data.data;
          setMachineData(machine);
          // Also fetch MQTT config to populate formData
          fetchMqttConfigRef.current(selectedMachineId);
        }
      })
      .catch(err => {
        console.error('Failed to fetch machine data from DB:', err);
      });
  }, [selectedRelayId, selectedMachineId, setMachineData]);

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
        console.log('✅ [SMIB MANAGEMENT] SMIB is online, sending MQTT update');
        await smibConfig.updateNetworkConfig(selectedRelayId, netConfig);
      } else {
        console.log(
          'ℹ️ [SMIB MANAGEMENT] SMIB is offline, updating database only'
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
        console.log('✅ [SMIB MANAGEMENT] SMIB is online, sending MQTT update');
        await smibConfig.updateMqttConfig(selectedRelayId, mqttConfigData);
      } else {
        console.log(
          'ℹ️ [SMIB MANAGEMENT] SMIB is offline, updating database only'
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
        console.log('✅ [SMIB MANAGEMENT] SMIB is online, sending MQTT update');
        await smibConfig.updateComsConfig(selectedRelayId, comsConfigData);
      } else {
        console.log(
          'ℹ️ [SMIB MANAGEMENT] SMIB is offline, updating database only'
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

  // Store requestLiveConfig in ref to avoid dependency issues
  const requestLiveConfigForRefreshRef = useRef(smibConfig.requestLiveConfig);
  useEffect(() => {
    requestLiveConfigForRefreshRef.current = smibConfig.requestLiveConfig;
  }, [smibConfig.requestLiveConfig]);

  // Refresh SMIB data (re-request config and reload machine data)
  const handleRefreshSmibData = useCallback(async () => {
    if (!selectedRelayId) return;

    setIsInitialLoading(true);

    // Refresh SMIB list
    await refreshSmibs();

    // Re-request config data
    try {
      await Promise.all([
        requestLiveConfigForRefreshRef.current(selectedRelayId, 'mqtt'),
        requestLiveConfigForRefreshRef.current(selectedRelayId, 'net'),
        requestLiveConfigForRefreshRef.current(selectedRelayId, 'coms'),
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
        setMachineData(response.data.data || response.data);
      } catch (err) {
        console.error('Failed to reload machine data:', err);
      }
    }
  }, [
    selectedRelayId,
    selectedMachineId,
    refreshSmibs,
    setIsInitialLoading,
    setMachineData,
  ]);

  // Refresh when trigger changes from parent
  useEffect(() => {
    if (refreshTrigger > 0) {
      handleRefreshSmibData();
    }
  }, [refreshTrigger, handleRefreshSmibData]);

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

  // Filter SMIBs by selected locations
  const filteredSmibs = useMemo(() => {
    if (selectedLocationIds.length === 0) {
      return availableSmibs;
    }
    return availableSmibs.filter(
      smib => smib.locationId && selectedLocationIds.includes(smib.locationId)
    );
  }, [availableSmibs, selectedLocationIds]);

  const dropdownStatusOverrides = useMemo(() => {
    if (!selectedRelayId) {
      return undefined;
    }

    return {
      [selectedRelayId]: smibConfig.isConnectedToMqtt ? 'online' : 'offline',
    } as const;
  }, [selectedRelayId, smibConfig.isConnectedToMqtt]);

  // Get selected location names for restart all dialog
  const selectedLocationNames = useMemo(() => {
    if (selectedLocationIds.length === 0) return '';
    if (selectedLocationIds.length === 1) {
      return (
        uniqueLocations.find(loc => loc.id === selectedLocationIds[0])?.name ||
        ''
      );
    }
    return `${selectedLocationIds.length} locations`;
  }, [uniqueLocations, selectedLocationIds]);

  // Handle restart all SMIBs for selected locations
  const handleRestartAllSmibs = async () => {
    if (selectedLocationIds.length === 0) {
      toast.error('Please select at least one location');
      return;
    }

    // Extract unique relayIds from filtered SMIBs (from MQTT discovery)
    const relayIds = Array.from(
      new Set(filteredSmibs.map(smib => smib.relayId).filter(Boolean))
    );

    if (relayIds.length === 0) {
      toast.error('No SMIBs found at selected locations');
      setShowRestartAllDialog(false);
      return;
    }

    setIsRestartingAll(true);
    try {
      // For multiple locations, call the API for each location
      const restartPromises = selectedLocationIds.map(async locationId => {
        const locationSmibs = availableSmibs.filter(
          smib => smib.locationId === locationId
        );
        const locationRelayIds = locationSmibs
          .map(smib => smib.relayId)
          .filter(Boolean);

        if (locationRelayIds.length === 0) {
          return { successful: 0, failed: 0 };
        }

        const response = await axios.post(
          `/api/locations/${locationId}/smib-restart`,
          {
            relayIds: locationRelayIds,
          }
        );
        return response.data;
      });

      const results = await Promise.all(restartPromises);
      const totalSuccessful = results.reduce(
        (sum, r) => sum + (r.successful || 0),
        0
      );
      const totalFailed = results.reduce((sum, r) => sum + (r.failed || 0), 0);

      if (totalSuccessful > 0) {
        toast.success(
          `Restart command sent to ${totalSuccessful} SMIB(s) at ${selectedLocationNames}`
        );
      }

      if (totalFailed > 0) {
        toast.warning(
          `Failed to restart ${totalFailed} SMIB(s). Check console for details.`
        );
      }
    } catch (error) {
      console.error('❌ [SMIB MANAGEMENT] Failed to restart all SMIBs:', error);

      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 404) {
          toast.error(
            error.response.data.error || 'No SMIBs found at selected locations'
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
              statusOverrides={dropdownStatusOverrides}
            />
          </div>

          {/* Location Filter */}
          <div className="w-full sm:w-64">
            <div className="[&_button]:border-white/20 [&_button]:bg-white/10 [&_button]:text-white [&_button]:hover:bg-white/20">
              <LocationMultiSelect
                locations={uniqueLocations}
                selectedLocations={selectedLocationIds}
                onSelectionChange={setSelectedLocationIds}
                placeholder="Filter by location"
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Restart All SMIBs Button - Only shown when locations are selected */}
        {selectedLocationIds.length > 0 && (
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
              <CabinetsDetailsSMIBNetworkConfig
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
              <CabinetsDetailsSMIBComsConfig
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
              <CabinetsDetailsSMIBMqttTopics
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
                isConnectedToMqtt={smibConfig.isConnectedToMqtt}
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
                <CabinetsDetailsSMIBRestart
                  relayId={selectedRelayId}
                  isOnline={smibConfig.isConnectedToMqtt}
                  onRefreshData={handleRefreshSmibData}
                />
                <CabinetsDetailsSMIBMeterData
                  relayId={selectedRelayId}
                  isOnline={smibConfig.isConnectedToMqtt}
                  smibConfig={smibConfig}
                />
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <CabinetsDetailsSMIBOTAUpdate
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
              Restart All SMIBs at {selectedLocationNames}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will send a restart command to{' '}
                <strong>{filteredSmibs.length} SMIB(s)</strong> at{' '}
                <strong>{selectedLocationNames}</strong>.
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
