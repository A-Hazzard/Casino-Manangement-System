/**
 * useAddUserModal Hook
 *
 * Encapsulates state and logic for the Add User Modal.
 * Handles user creation, role assignments, and permission management.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import type { Licensee } from '@/lib/types/licensee';
import { fetchLicensees } from '@/lib/helpers/clientLicensees';
import type { MultiSelectOption } from '@/components/ui/common/MultiSelectDropdown';
import type { AggregatedLocation } from '@/shared/types/entities';

type UseAddUserModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function useAddUserModal({ open, onClose, onSuccess }: UseAddUserModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<{
    username: string;
    emailAddress: string;
    password?: string;
    roles: string[];
    profile: {
      firstName: string;
      lastName: string;
    };
  }>({
    username: '',
    emailAddress: '',
    password: '',
    roles: [],
    profile: {
      firstName: '',
      lastName: '',
    },
  });

  const [licensees, setLicensees] = useState<Licensee[]>([]);
  const [licenseesLoading, setLicenseesLoading] = useState(false);
  const [selectedLicenseeIds, setSelectedLicenseeIds] = useState<string[]>([]);
  const [allLicenseesSelected, setAllLicenseesSelected] = useState(false);

  const [locations, setLocations] = useState<AggregatedLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [allLocationsSelected, setAllLocationsSelected] = useState(false);

  // Load licensees and locations
  useEffect(() => {
    if (open) {
      setLicenseesLoading(true);
      fetchLicensees().then(data => {
        if (data && 'licensees' in data) {
          setLicensees((data as { licensees: Licensee[] }).licensees);
        } else {
          setLicensees(Array.isArray(data) ? data : []);
        }
      }).finally(() => setLicenseesLoading(false));

      setLocationsLoading(true);
      axios.get('/api/gaming-locations').then(res => setLocations(res.data)).finally(() => setLocationsLoading(false));
    }
  }, [open]);

  const licenseeOptions: MultiSelectOption[] = useMemo(() => 
    licensees.map(l => ({ id: String(l._id), label: l.name })), 
  [licensees]);

  const availableLocations = useMemo(() => {
    if (allLicenseesSelected) return locations;
    return locations.filter(loc => {
      const locLicenseeId = (loc as AggregatedLocation & { licenseeId?: string }).licenseeId;
      return locLicenseeId && selectedLicenseeIds.includes(String(locLicenseeId));
    });
  }, [locations, allLicenseesSelected, selectedLicenseeIds]);

  const locationOptions: MultiSelectOption[] = useMemo(() => 
    availableLocations.map(l => ({ id: String(l._id), label: l.locationName })), 
  [availableLocations]);

  const handleSave = async () => {
    if (!formData.username || !formData.emailAddress || !formData.password) {
      toast.error('Please fill in required fields.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        ...formData,
        rel: {
          licencee: allLicenseesSelected ? 'all' : selectedLicenseeIds,
        },
        resourcePermissions: {
          'gaming-locations': {
            resources: allLocationsSelected ? 'all' : selectedLocationIds,
          },
        },
      };

      await axios.post('/api/users', payload);
      toast.success('User created successfully!');
      onSuccess();
      onClose();
    } catch {
      toast.error('Failed to create user.');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    formData,
    setFormData,
    isLoading,
    licensees,
    licenseesLoading,
    licenseeOptions,
    selectedLicenseeIds,
    setSelectedLicenseeIds,
    allLicenseesSelected,
    setAllLicenseesSelected,
    locations,
    locationsLoading,
    locationOptions,
    selectedLocationIds,
    setSelectedLocationIds,
    allLocationsSelected,
    setAllLocationsSelected,
    availableLocations,
    handleSave,
  };
}

