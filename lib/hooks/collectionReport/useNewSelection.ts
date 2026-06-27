/**
 * useNewSelection Hook
 *
 * Manages location and machine selection state for the New Collection Modal.
 * Handles location loading, machine fetching, and search/filtering.
 */

'use client';

// ============================================================================
// External Dependencies
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { calculateDefaultCollectionTime } from '@/lib/utils/collection';
import type { CollectionReportLocationWithMachines, CollectionReportMachineSummary } from '@/lib/types/api';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sorts machines alphabetically with numeric awareness
 */
export function sortMachinesAlphabetically(
  machines: CollectionReportMachineSummary[]
): CollectionReportMachineSummary[] {
  return [...machines].sort((machineA, machineB) => {
    const nameA = (machineA.name || machineA.serialNumber || '').toString();
    const nameB = (machineB.name || machineB.serialNumber || '').toString();
    const matchA = nameA.match(/^(.+?)(\d+)?$/);
    const matchB = nameB.match(/^(.+?)(\d+)?$/);
    if (!matchA || !matchB) return nameA.localeCompare(nameB);
    const [, baseA, numA] = matchA;
    const [, baseB, numB] = matchB;
    const baseCompare = baseA.localeCompare(baseB);
    if (baseCompare !== 0) return baseCompare;
    const numAInt = numA ? parseInt(numA, 10) : 0;
    const numBInt = numB ? parseInt(numB, 10) : 0;
    return numAInt - numBInt;
  });
}

/**
 * Resolve a location id from a collection's `location` field.
 */
function getLocationIdFromCollection(
  locationIdentifier: string,
  locations: CollectionReportLocationWithMachines[]
): string | null {
  const found = locations.find(
    (location) =>
      String(location._id) === locationIdentifier || location.name === locationIdentifier
  );
  return found ? String(found._id) : null;
}

// ============================================================================
// Type Definitions
// ============================================================================

type UseNewSelectionProps = {
  locations: CollectionReportLocationWithMachines[];
  selectedLocationId: string | undefined;
  lockedLocationId: string | undefined;
  setSelectedLocation: (id: string, name: string) => void;
  setLockedLocation: (id: string | undefined) => void;
  setCurrentCollectionTime: (time: Date) => void;
};

// ============================================================================
// Main Hook
// ============================================================================

export function useNewSelection({
  locations: propLocations,
  selectedLocationId,
  lockedLocationId,
  setSelectedLocation,
  setCurrentCollectionTime,
}: UseNewSelectionProps) {
  // Local State
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [isLoadingMachines, setIsLoadingMachines] = useState(false);
  const [machinesOfSelectedLocation, setMachinesOfSelectedLocation] = useState<CollectionReportMachineSummary[]>([]);
  const [machineSearchTerm, setMachineSearchTermState] = useState('');
  const [internalLocations, setInternalLocations] = useState<CollectionReportLocationWithMachines[]>([]);

  const locations = internalLocations.length > 0 ? internalLocations : propLocations;

  const hasFetchedOnOpenRef = useRef(false);

  // Computed
  const selectedLocation = useMemo(() => {
    const locationIdToUse = lockedLocationId || selectedLocationId;
    return locations.find((location) => String(location._id) === locationIdToUse);
  }, [locations, selectedLocationId, lockedLocationId]);

  const filteredMachines = useMemo(() => {
    let result = machinesOfSelectedLocation;
    if (machineSearchTerm.trim()) {
      const searchLower = machineSearchTerm.toLowerCase();
      result = machinesOfSelectedLocation.filter(
        (machine) =>
          (machine.name && machine.name.toLowerCase().includes(searchLower)) ||
          (machine.serialNumber && machine.serialNumber.toLowerCase().includes(searchLower)) ||
          (machine.custom?.name && machine.custom.name.toLowerCase().includes(searchLower)) ||
          (machine.game && machine.game.toLowerCase().includes(searchLower))
      );
    }
    return sortMachinesAlphabetically(result);
  }, [machinesOfSelectedLocation, machineSearchTerm]);

  // Effects
  useEffect(() => {}, []);

  useEffect(() => {
    const locationIdToUse = lockedLocationId || selectedLocationId;
    if (locationIdToUse) {
      const fetchMachinesForLocation = async () => {
        setIsLoadingMachines(true);
        try {
          const response = await axios.get(`/api/cabinets?locationId=${locationIdToUse}&_t=${Date.now()}`);
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
    } else {
      setMachinesOfSelectedLocation([]);
      setMachineSearchTermState('');
    }
  }, [selectedLocationId, lockedLocationId, setMachinesOfSelectedLocation]);

  useEffect(() => {
    const locationIdToUse = lockedLocationId || selectedLocationId;
    if (locationIdToUse) {
      const location = locations.find((location) => String(location._id) === locationIdToUse);
      if (location?.gameDayOffset !== undefined) {
        const defaultTime = calculateDefaultCollectionTime(location.gameDayOffset);
        setCurrentCollectionTime(defaultTime);
      }
    }
  }, [selectedLocationId, lockedLocationId, locations, setCurrentCollectionTime]);

  // Handlers
  const handleLocationChange = useCallback(
    (value: string) => {
      const location = locations.find((location) => String(location._id) === value);
      setSelectedLocation(value, location?.name || '');
      if (location) {
        if (location.gameDayOffset !== undefined) {
          const defaultTime = calculateDefaultCollectionTime(location.gameDayOffset);
          setCurrentCollectionTime(defaultTime);
        }
      }
    },
    [locations, setSelectedLocation, setCurrentCollectionTime]
  );

  const handleMachineSearchChange = useCallback(
    (term: string) => {
      setMachineSearchTermState(term);
    },
    []
  );

  return {
    locations,
    internalLocations,
    setInternalLocations,
    isLoadingLocations,
    setIsLoadingLocations,
    isLoadingMachines,
    machinesOfSelectedLocation,
    machineSearchTerm,
    setMachineSearchTerm: handleMachineSearchChange,
    filteredMachines,
    selectedLocation,
    selectedLocationId,
    lockedLocationId,
    locationCollectionBalance: selectedLocation?.collectionBalance ?? 0,
    locationProfitShare: selectedLocation?.profitShare ?? 50,
    handleLocationChange,
    getLocationIdFromCollection: (identifier: string) => getLocationIdFromCollection(identifier, locations),
    hasFetchedOnOpenRef,
  };
}