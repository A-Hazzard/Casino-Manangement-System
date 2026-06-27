/**
 * useEditSelection Hook
 *
 * Handles location and machine selection logic for the Edit Collection Modal.
 * Manages location fetching, machine filtering, and selection state synchronization.
 *
 * @module lib/hooks/collectionReport/useEditSelection
 */

'use client';

// ============================================================================
// External Dependencies
// ============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { calculateDefaultCollectionTime } from '@/lib/utils/collection';
import { isWowMachine } from '@/shared/utils/wowMachine';
import type { CollectionReportLocationWithMachines } from '@/lib/types/api';
import type { CollectionReportMachineSummary } from '@/lib/types/api';
import { sortMachinesAlphabetically } from '@/lib/helpers/collectionReport/editCollectionModalHelpers';

// ============================================================================
// Type Definitions
// ============================================================================

type UseEditSelectionProps = {
  show: boolean;
  locations: CollectionReportLocationWithMachines[];
  reportId: string;
  selectedLocationId: string;
  setSelectedLocationId: (id: string) => void;
  selectedLocationName: string;
  setSelectedLocationName: (name: string) => void;
  selectedMachineId: string;
  setSelectedMachineId: (id: string) => void;
  currentCollectionTime: Date;
  setCurrentCollectionTime: (val: Date) => void;
  sasStartTime: Date | null;
  sasEndTime: Date | null;
  setIsFirstCollection: (val: boolean) => void;
  setHasSetCollectionTimeFromReport: (val: boolean) => void;
  setIsLoadingMachines: (val: boolean) => void;
  setIsLoadingLocations: (val: boolean) => void;
  setMachinesOfSelectedLocation: (
    machines: CollectionReportMachineSummary[]
  ) => void;
  setInternalLocations: (locs: CollectionReportLocationWithMachines[]) => void;
};

// ============================================================================
// Main Hook
// ============================================================================

export function useEditSelection({
  show,
  locations: propLocations,
  selectedLocationId,
  selectedMachineId,
  setCurrentCollectionTime,
  sasStartTime,
  sasEndTime,
  setIsFirstCollection,
  setIsLoadingMachines,
  setIsLoadingLocations,
  setMachinesOfSelectedLocation,
  setInternalLocations,
}: UseEditSelectionProps) {
  // ==========================================================================
  // Internal State
  // ==========================================================================

  const [internalLocations, setInternalLocationsState] = useState<
    CollectionReportLocationWithMachines[]
  >([]);
  const [machineSearchTerm, setMachineSearchTerm] = useState('');

  // Use internal locations if available, fallback to prop
  const locations =
    internalLocations.length > 0 ? internalLocations : propLocations;

  const locationsRef = useRef(locations);
  useEffect(() => {
    locationsRef.current = locations;
  }, [locations]);

  // ==========================================================================
  // Computed Values
  // ==========================================================================

  /**
   * Selected location object from locations array
   */
  const selectedLocation = useMemo(
    () =>
      locations.find(location => String(location._id) === selectedLocationId),
    [locations, selectedLocationId]
  );

  /**
   * Machine being edited or added
   */
  const machineForDataEntry = useMemo(() => {
    let found = locations[0]?.machines?.find(
      m => String(m._id) === selectedMachineId
    );

    if (!found && selectedMachineId) {
      // Fallback: search in all locations' machines
      for (const loc of locations) {
        const machine = loc.machines?.find(
          m => String(m._id) === selectedMachineId
        );
        if (machine) {
          found = machine;
          break;
        }
      }
    }

    return found;
  }, [locations, selectedMachineId]);

  /**
   * Whether the active entry is a WOW machine (synced, read-only meters)
   */
  const isWowSelected = isWowMachine(machineForDataEntry);

  /**
   * Filter machines based on search term
   */
  const filteredMachines = useMemo(() => {
    const machines = selectedLocation?.machines ?? [];
    let result = machines;

    if (machineSearchTerm.trim()) {
      const searchLower = machineSearchTerm.toLowerCase();
      result = machines.filter(
        machine =>
          (machine.name && machine.name.toLowerCase().includes(searchLower)) ||
          (machine.serialNumber &&
            machine.serialNumber.toLowerCase().includes(searchLower)) ||
          (machine.custom?.name &&
            machine.custom.name.toLowerCase().includes(searchLower)) ||
          (machine.game && machine.game.toLowerCase().includes(searchLower))
      );
    }

    return sortMachinesAlphabetically(result);
  }, [selectedLocation?.machines, machineSearchTerm]);

  // ==========================================================================
  // Effects
  // ==========================================================================

  /**
   * Fetch rich metadata when modal opens
   */
  useEffect(() => {
    if (show) {
      setIsLoadingLocations(true);
      import('@/lib/helpers/collectionReport/fetching').then(
        ({ getLocationsWithMachines }) => {
          getLocationsWithMachines(undefined, false)
            .then(locs => {
              setInternalLocationsState(locs);
              setInternalLocations(locs);
            })
            .catch(err => {
              console.error('Error fetching collection metadata:', err);
            })
            .finally(() => setIsLoadingLocations(false));
        }
      );
    } else {
      setIsLoadingLocations(false);
    }
  }, [show, setInternalLocations, setIsLoadingLocations]);

  /**
   * Update collection time when location changes
   */
  useEffect(() => {
    if (show && selectedLocationId && !hasSetCollectionTimeFromReport.current) {
      const location = locationsRef.current.find(
        location => String(location._id) === selectedLocationId
      );
      if (location?.gameDayOffset !== undefined) {
        const defaultTime = calculateDefaultCollectionTime(
          location.gameDayOffset
        );
        setCurrentCollectionTime(defaultTime);
      }
    }
  }, [show, selectedLocationId, setCurrentCollectionTime]);

  const hasSetCollectionTimeFromReport = useRef(false);

  /**
   * Fetch machines when location changes
   */
  useEffect(() => {
    if (show && selectedLocationId) {
      const fetchMachinesForLocation = async () => {
        setIsLoadingMachines(true);
        try {
          const response = await axios.get(
            `/api/cabinets?locationId=${selectedLocationId}&_t=${Date.now()}`
          );
          if (response.data?.success && response.data?.data) {
            setMachinesOfSelectedLocation(response.data.data);
          } else {
            setMachinesOfSelectedLocation([]);
          }
        } catch (error) {
          console.error('Error fetching machines for location:', error);
          setMachinesOfSelectedLocation([]);
        } finally {
          setIsLoadingMachines(false);
        }
      };

      fetchMachinesForLocation();
    } else if (!show) {
      setMachinesOfSelectedLocation([]);
      setIsLoadingMachines(false);
    }
  }, [show, selectedLocationId, setIsLoadingMachines, setMachinesOfSelectedLocation]);

  /**
   * Check if machine is first collection
   */
  useEffect(() => {
    if (show && selectedMachineId) {
      axios
        .get(
          `/api/collection-reports/collections/check-first-collection?machineId=${selectedMachineId}`
        )
        .then(response => {
          setIsFirstCollection(response.data.isFirstCollection);
        })
        .catch(error => {
          console.error('Error checking first collection:', error);
          setIsFirstCollection(false);
        });
    } else if (!show) {
      setIsFirstCollection(false);
    }
  }, [show, selectedMachineId, setIsFirstCollection]);

  /**
   * WOW machines: meters are synced (WOW_SYNC) and shown read-only.
   * Mirror the create flow — fetch the synced current reading + prev baseline
   * whenever a WOW machine becomes the active entry or its time window changes.
   */
  useEffect(() => {
    if (!show || !selectedMachineId || !isWowSelected) return;

    const startIso = sasStartTime ? sasStartTime.toISOString() : '';
    const endIso = (sasEndTime ?? new Date()).toISOString();
    let cancelled = false;

    axios
      .get(
        `/api/collection-reports/collections/wow-meters?machineId=${selectedMachineId}` +
          (startIso ? `&startTime=${startIso}` : '') +
          `&endTime=${endIso}`
      )
      .then(res => {
        if (cancelled) return;
        const wow = res.data?.data;
        if (!wow) return;
        // Note: setters for meters/prevIn/prevOut/jackpot are handled by parent hook
        // This effect just documents the WOW sync behavior
      })
      .catch(wowErr => {
        console.error(
          '[useEditSelection] WOW meters fetch failed:',
          wowErr instanceof Error ? wowErr.message : 'Unknown error'
        );
      });

    return () => {
      cancelled = true;
    };
  }, [show, selectedMachineId, isWowSelected, sasStartTime, sasEndTime]);

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // State
    internalLocations,
    setInternalLocations: setInternalLocationsState,
    machineSearchTerm,
    setMachineSearchTerm,

    // Computed
    selectedLocation,
    machineForDataEntry,
    filteredMachines,
    isWowSelected,
    locations,
  };
}