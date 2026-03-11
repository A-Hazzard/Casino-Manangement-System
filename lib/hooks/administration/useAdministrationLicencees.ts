/**
 * useAdministrationLicencees Hook
 *
 * Encapsulates all state and logic for the Licencees section of the Administration page.
 * Handles licencee data fetching, search, pagination, and CRUD operations.
 */

'use client';

import { fetchLicencees } from '@/lib/helpers/client';
import { fetchCountries } from '@/lib/helpers/countries';
import { useUserStore } from '@/lib/store/userStore';
import type { Country, Licencee } from '@/lib/types/common';
import type { AddLicenceeForm } from '@/lib/types/pages';
import {
  detectChanges,
  filterMeaningfulChanges,
  getChangesSummary,
} from '@/lib/utils/changeDetection';
import { getNext30Days } from '@/lib/utils/licencee';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type UseAdministrationLicenceesProps = {
  activeSection: string;
  loadedSections: Set<string>;
  setLoadedSections: React.Dispatch<React.SetStateAction<Set<string>>>;
};

const licenceesItemsPerPage = 10;
const licenceesItemsPerBatch = 50;
const licenceesPagesPerBatch = licenceesItemsPerBatch / licenceesItemsPerPage; // 5

export function useAdministrationLicencees({
  activeSection,
  loadedSections,
  setLoadedSections,
}: UseAdministrationLicenceesProps) {
  const { user } = useUserStore();

  // ============================================================================
  // State Management
  // ============================================================================
  const [allLicencees, setAllLicencees] = useState<Licencee[]>([]);
  const [isLicenceesLoading, setIsLicenceesLoading] = useState(true);
  const [licenceesLoadedBatches, setLicenceesLoadedBatches] = useState<
    Set<number>
  >(new Set([1]));
  const [licenceesCurrentPage, setLicenceesCurrentPage] = useState(0); // 0-indexed
  const [isAddLicenceeModalOpen, setIsAddLicenceeModalOpen] = useState(false);
  const [isEditLicenceeModalOpen, setIsEditLicenceeModalOpen] = useState(false);
  const [isDeleteLicenceeModalOpen, setIsDeleteLicenceeModalOpen] =
    useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [isCountriesLoading, setIsCountriesLoading] = useState<boolean>(true);
  const [selectedLicencee, setSelectedLicencee] = useState<Licencee | null>(
    null
  );
  const [licenceeForm, setLicenceeForm] = useState<AddLicenceeForm>({});
  const [licenceeSearchValue, setLicenceeSearchValue] = useState('');
  const [isPaymentHistoryModalOpen, setIsPaymentHistoryModalOpen] =
    useState(false);
  const [selectedLicenceeForPayment, setSelectedLicenceeForPayment] =
    useState<Licencee | null>(null);
  const [createdLicencee, setCreatedLicencee] = useState<{
    name: string;
    licenceKey: string;
  } | null>(null);
  const [isLicenceeSuccessModalOpen, setIsLicenceeSuccessModalOpen] =
    useState(false);
  const [isPaymentConfirmModalOpen, setIsPaymentConfirmModalOpen] =
    useState(false);
  const [
    selectedLicenceeForPaymentChange,
    setSelectedLicenceeForPaymentChange,
  ] = useState<Licencee | null>(null);

  // ============================================================================
  // Computed Values
  // ============================================================================
  const countryNameById = useMemo(() => {
    const map = new Map<string, string>();
    countries.forEach(country => {
      map.set(country._id, country.name);
    });
    return map;
  }, [countries]);

  const getCountryNameById = useCallback(
    (countryId?: string) => {
      if (!countryId) return '';
      return countryNameById.get(countryId) || countryId;
    },
    [countryNameById]
  );

  const calculateLicenceesBatchNumber = useCallback(
    (page: number) => {
      return Math.floor(page / licenceesPagesPerBatch) + 1;
    },
    []
  );

  const licenceesWithCountryNames = useMemo(() => {
    if (!Array.isArray(allLicencees)) {
      console.warn('allLicencees is not an array:', allLicencees);
      return [];
    }
    if (allLicencees.length === 0) return allLicencees;
    return allLicencees.map(licencee => ({
      ...licencee,
      countryName:
        licencee.countryName ||
        getCountryNameById(licencee.country) ||
        licencee.country,
    }));
  }, [allLicencees, getCountryNameById]);

  const filteredLicencees = useMemo(() => {
    if (!licenceeSearchValue) return licenceesWithCountryNames;
    const searchLower = licenceeSearchValue.toLowerCase().trim();
    const filtered = licenceesWithCountryNames.filter(licencee =>
      (licencee.name || '').toLowerCase().includes(searchLower)
    );

    return filtered.sort((a, b) => {
      const aName = (a.name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();

      const aStarts = aName.startsWith(searchLower) ? 1 : 0;
      const bStarts = bName.startsWith(searchLower) ? 1 : 0;

      if (aStarts !== bStarts) return bStarts - aStarts;
      return aName.localeCompare(bName);
    });
  }, [licenceesWithCountryNames, licenceeSearchValue]);

  const getUserDisplayName = useCallback(() => {
    if (!user) return 'Unknown User';
    if (user.profile?.firstName && user.profile?.lastName) {
      return `${user.profile.firstName} ${user.profile.lastName}`;
    }
    if (user.profile?.firstName && !user.profile?.lastName) {
      return user.profile.firstName;
    }
    if (!user.profile?.firstName && user.profile?.lastName) {
      return user.profile.lastName;
    }
    if (user.username && user.username.trim() !== '') {
      return user.username;
    }
    if (user.emailAddress && user.emailAddress.trim() !== '') {
      return user.emailAddress;
    }
    return 'Unknown User';
  }, [user]);

  // ============================================================================
  // Effects
  // ============================================================================
  // Load countries on mount
  useEffect(() => {
    let isMounted = true;

    const loadCountries = async () => {
      if (isMounted) {
        setIsCountriesLoading(true);
      }
      try {
        const data = await fetchCountries();
        if (isMounted) {
          setCountries(data || []);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to fetch countries:', error);
        }
        if (isMounted) {
          setCountries([]);
          toast.error('Failed to load countries');
        }
      } finally {
        if (isMounted) {
          setIsCountriesLoading(false);
        }
      }
    };

    void loadCountries();

    return () => {
      isMounted = false;
    };
  }, []);

  // Load licencees only when licencees tab is active and not already loaded
  useEffect(() => {
    if (activeSection === 'licencees' && !loadedSections.has('licencees')) {
      const loadLicencees = async () => {
        setIsLicenceesLoading(true);
        try {
          const result = await fetchLicencees(1, licenceesItemsPerBatch);
          const licenceesArray = Array.isArray(result.licencees)
            ? result.licencees
            : [];
          setAllLicencees(licenceesArray);
          setLicenceesLoadedBatches(new Set([1]));
          setLicenceesCurrentPage(0);
          setLoadedSections(prev => new Set(prev).add('licencees'));
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to fetch licencees:', error);
          }
          setAllLicencees([]);
        }
        setIsLicenceesLoading(false);
      };
      loadLicencees();
    }
  }, [activeSection, loadedSections, setLoadedSections]);

  // Fetch next batch for licencees when crossing batch boundaries
  useEffect(() => {
    if (isLicenceesLoading || activeSection !== 'licencees') return;

    const currentBatch = calculateLicenceesBatchNumber(licenceesCurrentPage);
    const isLastPageOfBatch =
      (licenceesCurrentPage + 1) % licenceesPagesPerBatch === 0;
    const nextBatch = currentBatch + 1;

    if (isLastPageOfBatch && !licenceesLoadedBatches.has(nextBatch)) {
      setLicenceesLoadedBatches(prev => new Set([...prev, nextBatch]));
      fetchLicencees(nextBatch, licenceesItemsPerBatch)
        .then(result => {
          setAllLicencees(prev => {
            const prevArray = Array.isArray(prev) ? prev : [];
            const newLicencees = Array.isArray(result.licencees)
              ? result.licencees
              : [];
            const existingIds = new Set(prevArray.map(item => item._id));
            const newItems = newLicencees.filter(
              item => !existingIds.has(item._id)
            );
            return [...prevArray, ...newItems];
          });
        })
        .catch(error => {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to fetch next licencees batch:', error);
          }
        });
    }

    if (!licenceesLoadedBatches.has(currentBatch)) {
      setLicenceesLoadedBatches(prev => new Set([...prev, currentBatch]));
      fetchLicencees(currentBatch, licenceesItemsPerBatch)
        .then(result => {
          setAllLicencees(prev => {
            const prevArray = Array.isArray(prev) ? prev : [];
            const newLicencees = Array.isArray(result.licencees)
              ? result.licencees
              : [];
            const existingIds = new Set(prevArray.map(item => item._id));
            const newItems = newLicencees.filter(
              item => !existingIds.has(item._id)
            );
            return [...prevArray, ...newItems];
          });
        })
        .catch(error => {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to fetch current licencees batch:', error);
          }
        });
    }
  }, [
    licenceesCurrentPage,
    isLicenceesLoading,
    activeSection,
    licenceesLoadedBatches,
    calculateLicenceesBatchNumber,
  ]);

  // ============================================================================
  // Event Handlers
  // ============================================================================
  const handleOpenAddLicencee = useCallback(() => {
    setLicenceeForm({});
    setIsAddLicenceeModalOpen(true);
  }, []);

  const handleSaveAddLicencee = useCallback(async () => {
    if (!licenceeForm.name || !licenceeForm.country) {
      toast.error('Name and country are required');
      return;
    }

    const licenceeData: {
      name: string;
      country: string;
      startDate?: Date | string;
      expiryDate?: Date | string;
    } = {
      name: licenceeForm.name,
      country: licenceeForm.country,
    };

    if (licenceeForm.startDate) {
      licenceeData.startDate = licenceeForm.startDate;
    }
    if (licenceeForm.expiryDate) {
      licenceeData.expiryDate = licenceeForm.expiryDate;
    }

    try {
      const response = await fetch('/api/licencees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(licenceeData),
      });

      const createResult = await response.json();

      if (!response.ok) {
        throw new Error(createResult.message || 'Failed to create licencee');
      }

      // Log the creation activity
      if (createResult.licencee) {
        try {
          await fetch('/api/activity-logs', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'create',
              resource: 'licencee',
              resourceId: createResult.licencee._id,
              resourceName: createResult.licencee.name,
              details: `Created new licencee: ${createResult.licencee.name} in ${getCountryNameById(licenceeForm.country)}`,
              userId: user?._id || 'unknown',
              username: getUserDisplayName(),
              userRole: 'user',
              previousData: null,
              newData: createResult.licencee,
              changes: [],
            }),
          });
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to log activity:', error);
          }
        }
      }

      // Show success modal with licence key
      if (createResult.licencee && createResult.licencee.licenceKey) {
        setCreatedLicencee({
          name: createResult.licencee.name,
          licenceKey: createResult.licencee.licenceKey,
        });
        setIsLicenceeSuccessModalOpen(true);
      }

      setIsAddLicenceeModalOpen(false);
      setLicenceeForm({});
      setIsLicenceesLoading(true);
      const licenceesResult = await fetchLicencees(1, licenceesItemsPerBatch);
      setAllLicencees(
        Array.isArray(licenceesResult.licencees)
          ? licenceesResult.licencees
          : []
      );
      setLicenceesLoadedBatches(new Set([1]));
      setLicenceesCurrentPage(0);
      setIsLicenceesLoading(false);
      toast.success('Licencee created successfully');
    } catch (err) {
      const error = err as Error & {
        response?: { data?: { message?: string } };
      };
      toast.error(
        error?.response?.data?.message ||
        error?.message ||
        'Failed to add licencee'
      );
    }
  }, [
    licenceeForm,
    user,
    getUserDisplayName,
    getCountryNameById,
    setIsAddLicenceeModalOpen,
    setLicenceeForm,
    setIsLicenceesLoading,
    setAllLicencees,
    setLicenceesLoadedBatches,
    setLicenceesCurrentPage,
    setCreatedLicencee,
    setIsLicenceeSuccessModalOpen,
  ]);

  const handleOpenEditLicencee = useCallback(
    (licencee: Licencee) => {
      setSelectedLicencee(licencee);
      setLicenceeForm({
        _id: licencee._id,
        name: licencee.name,
        country: licencee.country,
        startDate: licencee.startDate
          ? new Date(licencee.startDate)
          : undefined,
        expiryDate: licencee.expiryDate
          ? new Date(licencee.expiryDate)
          : undefined,
        prevStartDate: licencee.prevStartDate
          ? new Date(licencee.prevStartDate)
          : undefined,
        prevExpiryDate: licencee.prevExpiryDate
          ? new Date(licencee.prevExpiryDate)
          : undefined,
      });
      setIsEditLicenceeModalOpen(true);
    },
    [setSelectedLicencee, setLicenceeForm, setIsEditLicenceeModalOpen]
  );

  const handleSaveEditLicencee = useCallback(async () => {
    try {
      if (!selectedLicencee) return;

      const originalData = {
        name: selectedLicencee.name,
        country: selectedLicencee.country,
        startDate: selectedLicencee.startDate,
        expiryDate: selectedLicencee.expiryDate,
        prevStartDate: selectedLicencee.prevStartDate,
        prevExpiryDate: selectedLicencee.prevExpiryDate,
        isPaid: selectedLicencee.isPaid,
      };

      const formDataComparison = {
        name: licenceeForm.name,
        country: licenceeForm.country,
        startDate: licenceeForm.startDate,
        expiryDate: licenceeForm.expiryDate,
        prevStartDate: licenceeForm.prevStartDate,
        prevExpiryDate: licenceeForm.prevExpiryDate,
        isPaid: selectedLicencee.isPaid,
      };

      const changes = detectChanges(originalData, formDataComparison);
      const meaningfulChanges = filterMeaningfulChanges(changes);

      if (meaningfulChanges.length === 0) {
        toast.info('No changes detected');
        return;
      }

      const updatePayload: Record<string, unknown> = {
        _id: selectedLicencee._id,
      };
      meaningfulChanges.forEach(change => {
        const fieldPath = change.path;
        updatePayload[fieldPath] = change.newValue;
      });

      const response = await fetch('/api/licencees', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      const updateResult = await response.json();

      if (!response.ok) {
        throw new Error(updateResult.message || 'Failed to update licencee');
      }

      // Log the update activity
      try {
        const changesSummary = getChangesSummary(meaningfulChanges);
        await fetch('/api/activity-logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'update',
            resource: 'licencee',
            resourceId: selectedLicencee._id,
            resourceName: selectedLicencee.name,
            details: `Updated licencee: ${changesSummary}`,
            userId: user?._id || 'unknown',
            username: getUserDisplayName(),
            userRole: 'user',
            previousData: originalData,
            newData: updatePayload,
            changes: meaningfulChanges.map(change => ({
              field: change.field,
              oldValue: change.oldValue,
              newValue: change.newValue,
            })),
          }),
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to log activity:', error);
        }
      }

      setIsEditLicenceeModalOpen(false);
      setSelectedLicencee(null);
      setLicenceeForm({});
      setIsLicenceesLoading(true);
      const result = await fetchLicencees(1, licenceesItemsPerBatch);
      setAllLicencees(Array.isArray(result.licencees) ? result.licencees : []);
      setLicenceesLoadedBatches(new Set([1]));
      setLicenceesCurrentPage(0);
      setIsLicenceesLoading(false);
      toast.success(
        `Licencee updated successfully: ${getChangesSummary(meaningfulChanges)}`
      );
    } catch (err) {
      const error = err as Error & {
        response?: { data?: { message?: string } };
      };
      toast.error(
        error?.response?.data?.message ||
        error?.message ||
        'Failed to update licencee'
      );
    }
  }, [
    selectedLicencee,
    licenceeForm,
    user,
    getUserDisplayName,
    setIsEditLicenceeModalOpen,
    setSelectedLicencee,
    setLicenceeForm,
    setIsLicenceesLoading,
    setAllLicencees,
    setLicenceesLoadedBatches,
    setLicenceesCurrentPage,
  ]);

  const handleOpenDeleteLicencee = useCallback(
    (licencee: Licencee) => {
      setSelectedLicencee(licencee);
      setIsDeleteLicenceeModalOpen(true);
    },
    [setSelectedLicencee, setIsDeleteLicenceeModalOpen]
  );

  const handleDeleteLicencee = useCallback(async () => {
    if (!selectedLicencee) return;

    const licenceeData = { ...selectedLicencee };

    try {
      const response = await fetch('/api/licencees', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ _id: selectedLicencee._id }),
      });

      const deleteResult = await response.json();

      if (!response.ok) {
        throw new Error(deleteResult.message || 'Failed to delete licencee');
      }

      // Log the deletion activity
      try {
        await fetch('/api/activity-logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'delete',
            resource: 'licencee',
            resourceId: selectedLicencee._id,
            resourceName: selectedLicencee.name,
            details: `Deleted licencee: ${selectedLicencee.name} from ${selectedLicencee.countryName ||
              getCountryNameById(selectedLicencee.country)
              }`,
            userId: user?._id || 'unknown',
            username: getUserDisplayName(),
            userRole: 'user',
            previousData: licenceeData,
            newData: null,
            changes: [],
          }),
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to log activity:', error);
        }
      }

      setIsDeleteLicenceeModalOpen(false);
      setSelectedLicencee(null);
      setIsLicenceesLoading(true);
      const deleteLicenceesResult = await fetchLicencees(
        1,
        licenceesItemsPerBatch
      );
      setAllLicencees(
        Array.isArray(deleteLicenceesResult.licencees)
          ? deleteLicenceesResult.licencees
          : []
      );
      setLicenceesLoadedBatches(new Set([1]));
      setLicenceesCurrentPage(0);
      setIsLicenceesLoading(false);
      toast.success('Licencee deleted successfully');
    } catch (err) {
      const error = err as Error & {
        response?: { data?: { message?: string } };
      };
      toast.error(
        error?.response?.data?.message ||
        error?.message ||
        'Failed to delete licencee'
      );
    }
  }, [
    selectedLicencee,
    user,
    getUserDisplayName,
    getCountryNameById,
    setIsDeleteLicenceeModalOpen,
    setSelectedLicencee,
    setIsLicenceesLoading,
    setAllLicencees,
    setLicenceesLoadedBatches,
    setLicenceesCurrentPage,
  ]);

  const handlePaymentHistory = useCallback(
    (licencee: Licencee) => {
      setSelectedLicenceeForPayment(licencee);
      setIsPaymentHistoryModalOpen(true);
    },
    [setSelectedLicenceeForPayment, setIsPaymentHistoryModalOpen]
  );

  const handleTogglePaymentStatus = useCallback(
    (licencee: Licencee) => {
      setSelectedLicenceeForPaymentChange(licencee);
      setIsPaymentConfirmModalOpen(true);
    },
    [setSelectedLicenceeForPaymentChange, setIsPaymentConfirmModalOpen]
  );

  const handleConfirmPaymentStatusChange = useCallback(async () => {
    if (!selectedLicenceeForPaymentChange) return;

    try {
      const currentIsPaid =
        selectedLicenceeForPaymentChange.isPaid !== undefined
          ? selectedLicenceeForPaymentChange.isPaid
          : selectedLicenceeForPaymentChange.expiryDate
            ? new Date(selectedLicenceeForPaymentChange.expiryDate) > new Date()
            : false;

      const newIsPaid = !currentIsPaid;

      const updateData: {
        _id: string;
        isPaid: boolean;
        expiryDate?: Date;
        prevExpiryDate?: Date;
      } = {
        _id: selectedLicenceeForPaymentChange._id,
        isPaid: newIsPaid,
      };

      if (!currentIsPaid && newIsPaid) {
        updateData.prevExpiryDate = selectedLicenceeForPaymentChange.expiryDate
          ? new Date(selectedLicenceeForPaymentChange.expiryDate)
          : undefined;
        updateData.expiryDate = getNext30Days();
      }

      await axios.put('/api/licencees', updateData);

      // Log the payment status change activity
      try {
        await fetch('/api/activity-logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'update',
            resource: 'licencee',
            resourceId: selectedLicenceeForPaymentChange._id,
            resourceName: selectedLicenceeForPaymentChange.name,
            details: `Changed payment status for ${selectedLicenceeForPaymentChange.name
              } from ${currentIsPaid ? 'Paid' : 'Unpaid'} to ${newIsPaid ? 'Paid' : 'Unpaid'
              }`,
            userId: user?._id || 'unknown',
            username: getUserDisplayName(),
            userRole: 'user',
            previousData: selectedLicenceeForPaymentChange,
            newData: updateData,
            changes: [],
          }),
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to log activity:', error);
        }
      }

      // Refresh licencees list
      setIsLicenceesLoading(true);
      const paymentLicenceesResult = await fetchLicencees(
        1,
        licenceesItemsPerBatch
      );
      setAllLicencees(
        Array.isArray(paymentLicenceesResult.licencees)
          ? paymentLicenceesResult.licencees
          : []
      );
      setLicenceesLoadedBatches(new Set([1]));
      setLicenceesCurrentPage(0);
      setIsLicenceesLoading(false);

      setIsPaymentConfirmModalOpen(false);
      setSelectedLicenceeForPaymentChange(null);
      toast.success('Licencee payment status updated successfully');
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to update payment status:', error);
      }
      toast.error('Failed to update payment status');
    }
  }, [
    selectedLicenceeForPaymentChange,
    user,
    getUserDisplayName,
    setIsLicenceesLoading,
    setAllLicencees,
    setLicenceesLoadedBatches,
    setLicenceesCurrentPage,
    setIsPaymentConfirmModalOpen,
    setSelectedLicenceeForPaymentChange,
  ]);

  const refreshLicencees = useCallback(async () => {
    setIsLicenceesLoading(true);
    try {
      const result = await fetchLicencees(1, licenceesItemsPerBatch);
      setAllLicencees(
        Array.isArray(result.licencees) ? result.licencees : []
      );
      setLicenceesLoadedBatches(new Set([1]));
      setLicenceesCurrentPage(0);
    } catch (error) {
      console.error('Failed to refresh licencees:', error);
    } finally {
      setIsLicenceesLoading(false);
    }
  }, []);

  return {
    // State
    allLicencees,
    isLicenceesLoading,
    licenceesCurrentPage,
    isAddLicenceeModalOpen,
    isEditLicenceeModalOpen,
    isDeleteLicenceeModalOpen,
    countries,
    isCountriesLoading,
    selectedLicencee,
    licenceeForm,
    licenceeSearchValue,
    isPaymentHistoryModalOpen,
    selectedLicenceeForPayment,
    createdLicencee,
    isLicenceeSuccessModalOpen,
    isPaymentConfirmModalOpen,
    selectedLicenceeForPaymentChange,
    filteredLicencees,
    // Setters
    setLicenceesCurrentPage,
    setIsAddLicenceeModalOpen,
    setIsEditLicenceeModalOpen,
    setIsDeleteLicenceeModalOpen,
    setSelectedLicencee,
    setLicenceeForm,
    setLicenceeSearchValue,
    setIsPaymentHistoryModalOpen,
    setSelectedLicenceeForPayment,
    setCreatedLicencee,
    setIsLicenceeSuccessModalOpen,
    setIsPaymentConfirmModalOpen,
    setSelectedLicenceeForPaymentChange,
    // Handlers
    handleOpenAddLicencee,
    handleSaveAddLicencee,
    handleOpenEditLicencee,
    handleSaveEditLicencee,
    handleOpenDeleteLicencee,
    handleDeleteLicencee,
    handlePaymentHistory,
    handleTogglePaymentStatus,
    handleConfirmPaymentStatusChange,
    refreshLicencees,
    getCountryNameById,
  };
}


