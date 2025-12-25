/**
 * useAdministrationLicensees Hook
 *
 * Encapsulates all state and logic for the Licensees section of the Administration page.
 * Handles licensee data fetching, search, pagination, and CRUD operations.
 */

'use client';

import { fetchLicensees } from '@/lib/helpers/clientLicensees';
import { fetchCountries } from '@/lib/helpers/countries';
import { useUserStore } from '@/lib/store/userStore';
import type { Country } from '@/lib/types/country';
import type { Licensee } from '@/lib/types/licensee';
import type { AddLicenseeForm } from '@/lib/types/pages';
import {
  detectChanges,
  filterMeaningfulChanges,
  getChangesSummary,
} from '@/lib/utils/changeDetection';
import { getNext30Days } from '@/lib/utils/licensee';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type UseAdministrationLicenseesProps = {
  activeSection: string;
  loadedSections: Set<string>;
  setLoadedSections: React.Dispatch<React.SetStateAction<Set<string>>>;
};

const licenseesItemsPerPage = 10;
const licenseesItemsPerBatch = 50;
const licenseesPagesPerBatch = licenseesItemsPerBatch / licenseesItemsPerPage; // 5

export function useAdministrationLicensees({
  activeSection,
  loadedSections,
  setLoadedSections,
}: UseAdministrationLicenseesProps) {
  const { user } = useUserStore();

  // ============================================================================
  // State Management
  // ============================================================================
  const [allLicensees, setAllLicensees] = useState<Licensee[]>([]);
  const [isLicenseesLoading, setIsLicenseesLoading] = useState(true);
  const [licenseesLoadedBatches, setLicenseesLoadedBatches] = useState<
    Set<number>
  >(new Set([1]));
  const [licenseesCurrentPage, setLicenseesCurrentPage] = useState(0); // 0-indexed
  const [isAddLicenseeModalOpen, setIsAddLicenseeModalOpen] = useState(false);
  const [isEditLicenseeModalOpen, setIsEditLicenseeModalOpen] = useState(false);
  const [isDeleteLicenseeModalOpen, setIsDeleteLicenseeModalOpen] =
    useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [isCountriesLoading, setIsCountriesLoading] = useState<boolean>(true);
  const [selectedLicensee, setSelectedLicensee] = useState<Licensee | null>(
    null
  );
  const [licenseeForm, setLicenseeForm] = useState<AddLicenseeForm>({});
  const [licenseeSearchValue, setLicenseeSearchValue] = useState('');
  const [isPaymentHistoryModalOpen, setIsPaymentHistoryModalOpen] =
    useState(false);
  const [selectedLicenseeForPayment, setSelectedLicenseeForPayment] =
    useState<Licensee | null>(null);
  const [createdLicensee, setCreatedLicensee] = useState<{
    name: string;
    licenseKey: string;
  } | null>(null);
  const [isLicenseeSuccessModalOpen, setIsLicenseeSuccessModalOpen] =
    useState(false);
  const [isPaymentConfirmModalOpen, setIsPaymentConfirmModalOpen] =
    useState(false);
  const [
    selectedLicenseeForPaymentChange,
    setSelectedLicenseeForPaymentChange,
  ] = useState<Licensee | null>(null);

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

  const calculateLicenseesBatchNumber = useCallback(
    (page: number) => {
      return Math.floor(page / licenseesPagesPerBatch) + 1;
    },
    []
  );

  const licenseesWithCountryNames = useMemo(() => {
    if (!Array.isArray(allLicensees)) {
      console.warn('allLicensees is not an array:', allLicensees);
      return [];
    }
    if (allLicensees.length === 0) return allLicensees;
    return allLicensees.map(licensee => ({
      ...licensee,
      countryName:
        licensee.countryName ||
        getCountryNameById(licensee.country) ||
        licensee.country,
    }));
  }, [allLicensees, getCountryNameById]);

  const filteredLicensees = useMemo(() => {
    if (!licenseeSearchValue) return licenseesWithCountryNames;
    const search = licenseeSearchValue.toLowerCase();
    return licenseesWithCountryNames.filter(licensee =>
      (licensee.name || '').toLowerCase().includes(search)
    );
  }, [licenseesWithCountryNames, licenseeSearchValue]);

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

  // Load licensees only when licensees tab is active and not already loaded
  useEffect(() => {
    if (activeSection === 'licensees' && !loadedSections.has('licensees')) {
      const loadLicensees = async () => {
        setIsLicenseesLoading(true);
        try {
          const result = await fetchLicensees(1, licenseesItemsPerBatch);
          const licenseesArray = Array.isArray(result.licensees)
            ? result.licensees
            : [];
          setAllLicensees(licenseesArray);
          setLicenseesLoadedBatches(new Set([1]));
          setLicenseesCurrentPage(0);
          setLoadedSections(prev => new Set(prev).add('licensees'));
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to fetch licensees:', error);
          }
          setAllLicensees([]);
        }
        setIsLicenseesLoading(false);
      };
      loadLicensees();
    }
  }, [activeSection, loadedSections, setLoadedSections]);

  // Fetch next batch for licensees when crossing batch boundaries
  useEffect(() => {
    if (isLicenseesLoading || activeSection !== 'licensees') return;

    const currentBatch = calculateLicenseesBatchNumber(licenseesCurrentPage);
    const isLastPageOfBatch =
      (licenseesCurrentPage + 1) % licenseesPagesPerBatch === 0;
    const nextBatch = currentBatch + 1;

    if (isLastPageOfBatch && !licenseesLoadedBatches.has(nextBatch)) {
      setLicenseesLoadedBatches(prev => new Set([...prev, nextBatch]));
      fetchLicensees(nextBatch, licenseesItemsPerBatch)
        .then(result => {
          setAllLicensees(prev => {
            const prevArray = Array.isArray(prev) ? prev : [];
            const newLicensees = Array.isArray(result.licensees)
              ? result.licensees
              : [];
            const existingIds = new Set(prevArray.map(item => item._id));
            const newItems = newLicensees.filter(
              item => !existingIds.has(item._id)
            );
            return [...prevArray, ...newItems];
          });
        })
        .catch(error => {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to fetch next licensees batch:', error);
          }
        });
    }

    if (!licenseesLoadedBatches.has(currentBatch)) {
      setLicenseesLoadedBatches(prev => new Set([...prev, currentBatch]));
      fetchLicensees(currentBatch, licenseesItemsPerBatch)
        .then(result => {
          setAllLicensees(prev => {
            const prevArray = Array.isArray(prev) ? prev : [];
            const newLicensees = Array.isArray(result.licensees)
              ? result.licensees
              : [];
            const existingIds = new Set(prevArray.map(item => item._id));
            const newItems = newLicensees.filter(
              item => !existingIds.has(item._id)
            );
            return [...prevArray, ...newItems];
          });
        })
        .catch(error => {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to fetch current licensees batch:', error);
          }
        });
    }
  }, [
    licenseesCurrentPage,
    isLicenseesLoading,
    activeSection,
    licenseesLoadedBatches,
    calculateLicenseesBatchNumber,
  ]);

  // ============================================================================
  // Event Handlers
  // ============================================================================
  const handleOpenAddLicensee = useCallback(() => {
    setLicenseeForm({});
    setIsAddLicenseeModalOpen(true);
  }, []);

  const handleSaveAddLicensee = useCallback(async () => {
    if (!licenseeForm.name || !licenseeForm.country) {
      toast.error('Name and country are required');
      return;
    }

    const licenseeData: {
      name: string;
      description?: string;
      country: string;
      startDate?: Date | string;
      expiryDate?: Date | string;
    } = {
      name: licenseeForm.name,
      country: licenseeForm.country,
    };

    if (licenseeForm.description) {
      licenseeData.description = licenseeForm.description;
    }
    if (licenseeForm.startDate) {
      licenseeData.startDate = licenseeForm.startDate;
    }
    if (licenseeForm.expiryDate) {
      licenseeData.expiryDate = licenseeForm.expiryDate;
    }

    try {
      const response = await fetch('/api/licensees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(licenseeData),
      });

      const createResult = await response.json();

      if (!response.ok) {
        throw new Error(createResult.message || 'Failed to create licensee');
      }

      // Log the creation activity
      if (createResult.licensee) {
        try {
          await fetch('/api/activity-logs', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'create',
              resource: 'licensee',
              resourceId: createResult.licensee._id,
              resourceName: createResult.licensee.name,
              details: `Created new licensee: ${createResult.licensee.name} in ${getCountryNameById(licenseeForm.country)}`,
              userId: user?._id || 'unknown',
              username: getUserDisplayName(),
              userRole: 'user',
              previousData: null,
              newData: createResult.licensee,
              changes: [],
            }),
          });
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to log activity:', error);
          }
        }
      }

      // Show success modal with license key
      if (createResult.licensee && createResult.licensee.licenseKey) {
        setCreatedLicensee({
          name: createResult.licensee.name,
          licenseKey: createResult.licensee.licenseKey,
        });
        setIsLicenseeSuccessModalOpen(true);
      }

      setIsAddLicenseeModalOpen(false);
      setLicenseeForm({});
      setIsLicenseesLoading(true);
      const licenseesResult = await fetchLicensees(1, licenseesItemsPerBatch);
      setAllLicensees(
        Array.isArray(licenseesResult.licensees)
          ? licenseesResult.licensees
          : []
      );
      setLicenseesLoadedBatches(new Set([1]));
      setLicenseesCurrentPage(0);
      setIsLicenseesLoading(false);
      toast.success('Licensee created successfully');
    } catch (err) {
      const error = err as Error & {
        response?: { data?: { message?: string } };
      };
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to add licensee'
      );
    }
  }, [
    licenseeForm,
    user,
    getUserDisplayName,
    getCountryNameById,
    setIsAddLicenseeModalOpen,
    setLicenseeForm,
    setIsLicenseesLoading,
    setAllLicensees,
    setLicenseesLoadedBatches,
    setLicenseesCurrentPage,
    setCreatedLicensee,
    setIsLicenseeSuccessModalOpen,
  ]);

  const handleOpenEditLicensee = useCallback(
    (licensee: Licensee) => {
      setSelectedLicensee(licensee);
      setLicenseeForm({
        _id: licensee._id,
        name: licensee.name,
        description: licensee.description,
        country: licensee.country,
        startDate: licensee.startDate
          ? new Date(licensee.startDate)
          : undefined,
        expiryDate: licensee.expiryDate
          ? new Date(licensee.expiryDate)
          : undefined,
        prevStartDate: licensee.prevStartDate
          ? new Date(licensee.prevStartDate)
          : undefined,
        prevExpiryDate: licensee.prevExpiryDate
          ? new Date(licensee.prevExpiryDate)
          : undefined,
      });
      setIsEditLicenseeModalOpen(true);
    },
    [setSelectedLicensee, setLicenseeForm, setIsEditLicenseeModalOpen]
  );

  const handleSaveEditLicensee = useCallback(async () => {
    try {
      if (!selectedLicensee) return;

      const originalData = {
        name: selectedLicensee.name,
        description: selectedLicensee.description,
        country: selectedLicensee.country,
        startDate: selectedLicensee.startDate,
        expiryDate: selectedLicensee.expiryDate,
        prevStartDate: selectedLicensee.prevStartDate,
        prevExpiryDate: selectedLicensee.prevExpiryDate,
        isPaid: selectedLicensee.isPaid,
      };

      const formDataComparison = {
        name: licenseeForm.name,
        description: licenseeForm.description,
        country: licenseeForm.country,
        startDate: licenseeForm.startDate,
        expiryDate: licenseeForm.expiryDate,
        prevStartDate: licenseeForm.prevStartDate,
        prevExpiryDate: licenseeForm.prevExpiryDate,
        isPaid: selectedLicensee.isPaid,
      };

      const changes = detectChanges(originalData, formDataComparison);
      const meaningfulChanges = filterMeaningfulChanges(changes);

      if (meaningfulChanges.length === 0) {
        toast.info('No changes detected');
        return;
      }

      const updatePayload: Record<string, unknown> = {
        _id: selectedLicensee._id,
      };
      meaningfulChanges.forEach(change => {
        const fieldPath = change.path;
        updatePayload[fieldPath] = change.newValue;
      });

      const response = await fetch('/api/licensees', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      const updateResult = await response.json();

      if (!response.ok) {
        throw new Error(updateResult.message || 'Failed to update licensee');
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
            resource: 'licensee',
            resourceId: selectedLicensee._id,
            resourceName: selectedLicensee.name,
            details: `Updated licensee: ${changesSummary}`,
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

      setIsEditLicenseeModalOpen(false);
      setSelectedLicensee(null);
      setLicenseeForm({});
      setIsLicenseesLoading(true);
      const result = await fetchLicensees(1, licenseesItemsPerBatch);
      setAllLicensees(Array.isArray(result.licensees) ? result.licensees : []);
      setLicenseesLoadedBatches(new Set([1]));
      setLicenseesCurrentPage(0);
      setIsLicenseesLoading(false);
      toast.success(
        `Licensee updated successfully: ${getChangesSummary(meaningfulChanges)}`
      );
    } catch (err) {
      const error = err as Error & {
        response?: { data?: { message?: string } };
      };
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to update licensee'
      );
    }
  }, [
    selectedLicensee,
    licenseeForm,
    user,
    getUserDisplayName,
    setIsEditLicenseeModalOpen,
    setSelectedLicensee,
    setLicenseeForm,
    setIsLicenseesLoading,
    setAllLicensees,
    setLicenseesLoadedBatches,
    setLicenseesCurrentPage,
  ]);

  const handleOpenDeleteLicensee = useCallback(
    (licensee: Licensee) => {
      setSelectedLicensee(licensee);
      setIsDeleteLicenseeModalOpen(true);
    },
    [setSelectedLicensee, setIsDeleteLicenseeModalOpen]
  );

  const handleDeleteLicensee = useCallback(async () => {
    if (!selectedLicensee) return;

    const licenseeData = { ...selectedLicensee };

    try {
      const response = await fetch('/api/licensees', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ _id: selectedLicensee._id }),
      });

      const deleteResult = await response.json();

      if (!response.ok) {
        throw new Error(deleteResult.message || 'Failed to delete licensee');
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
            resource: 'licensee',
            resourceId: selectedLicensee._id,
            resourceName: selectedLicensee.name,
            details: `Deleted licensee: ${selectedLicensee.name} from ${
              selectedLicensee.countryName ||
              getCountryNameById(selectedLicensee.country)
            }`,
            userId: user?._id || 'unknown',
            username: getUserDisplayName(),
            userRole: 'user',
            previousData: licenseeData,
            newData: null,
            changes: [],
          }),
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to log activity:', error);
        }
      }

      setIsDeleteLicenseeModalOpen(false);
      setSelectedLicensee(null);
      setIsLicenseesLoading(true);
      const deleteLicenseesResult = await fetchLicensees(
        1,
        licenseesItemsPerBatch
      );
      setAllLicensees(
        Array.isArray(deleteLicenseesResult.licensees)
          ? deleteLicenseesResult.licensees
          : []
      );
      setLicenseesLoadedBatches(new Set([1]));
      setLicenseesCurrentPage(0);
      setIsLicenseesLoading(false);
      toast.success('Licensee deleted successfully');
    } catch (err) {
      const error = err as Error & {
        response?: { data?: { message?: string } };
      };
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to delete licensee'
      );
    }
  }, [
    selectedLicensee,
    user,
    getUserDisplayName,
    getCountryNameById,
    setIsDeleteLicenseeModalOpen,
    setSelectedLicensee,
    setIsLicenseesLoading,
    setAllLicensees,
    setLicenseesLoadedBatches,
    setLicenseesCurrentPage,
  ]);

  const handlePaymentHistory = useCallback(
    (licensee: Licensee) => {
      setSelectedLicenseeForPayment(licensee);
      setIsPaymentHistoryModalOpen(true);
    },
    [setSelectedLicenseeForPayment, setIsPaymentHistoryModalOpen]
  );

  const handleTogglePaymentStatus = useCallback(
    (licensee: Licensee) => {
      setSelectedLicenseeForPaymentChange(licensee);
      setIsPaymentConfirmModalOpen(true);
    },
    [setSelectedLicenseeForPaymentChange, setIsPaymentConfirmModalOpen]
  );

  const handleConfirmPaymentStatusChange = useCallback(async () => {
    if (!selectedLicenseeForPaymentChange) return;

    try {
      const currentIsPaid =
        selectedLicenseeForPaymentChange.isPaid !== undefined
          ? selectedLicenseeForPaymentChange.isPaid
          : selectedLicenseeForPaymentChange.expiryDate
            ? new Date(selectedLicenseeForPaymentChange.expiryDate) > new Date()
            : false;

      const newIsPaid = !currentIsPaid;

      const updateData: {
        _id: string;
        isPaid: boolean;
        expiryDate?: Date;
        prevExpiryDate?: Date;
      } = {
        _id: selectedLicenseeForPaymentChange._id,
        isPaid: newIsPaid,
      };

      if (!currentIsPaid && newIsPaid) {
        updateData.prevExpiryDate = selectedLicenseeForPaymentChange.expiryDate
          ? new Date(selectedLicenseeForPaymentChange.expiryDate)
          : undefined;
        updateData.expiryDate = getNext30Days();
      }

      await axios.put('/api/licensees', updateData);

      // Log the payment status change activity
      try {
        await fetch('/api/activity-logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'update',
            resource: 'licensee',
            resourceId: selectedLicenseeForPaymentChange._id,
            resourceName: selectedLicenseeForPaymentChange.name,
            details: `Changed payment status for ${
              selectedLicenseeForPaymentChange.name
            } from ${currentIsPaid ? 'Paid' : 'Unpaid'} to ${
              newIsPaid ? 'Paid' : 'Unpaid'
            }`,
            userId: user?._id || 'unknown',
            username: getUserDisplayName(),
            userRole: 'user',
            previousData: selectedLicenseeForPaymentChange,
            newData: updateData,
            changes: [],
          }),
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to log activity:', error);
        }
      }

      // Refresh licensees list
      setIsLicenseesLoading(true);
      const paymentLicenseesResult = await fetchLicensees(
        1,
        licenseesItemsPerBatch
      );
      setAllLicensees(
        Array.isArray(paymentLicenseesResult.licensees)
          ? paymentLicenseesResult.licensees
          : []
      );
      setLicenseesLoadedBatches(new Set([1]));
      setLicenseesCurrentPage(0);
      setIsLicenseesLoading(false);

      setIsPaymentConfirmModalOpen(false);
      setSelectedLicenseeForPaymentChange(null);
      toast.success('Licensee payment status updated successfully');
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to update payment status:', error);
      }
      toast.error('Failed to update payment status');
    }
  }, [
    selectedLicenseeForPaymentChange,
    user,
    getUserDisplayName,
    setIsLicenseesLoading,
    setAllLicensees,
    setLicenseesLoadedBatches,
    setLicenseesCurrentPage,
    setIsPaymentConfirmModalOpen,
    setSelectedLicenseeForPaymentChange,
  ]);

  const refreshLicensees = useCallback(async () => {
    setIsLicenseesLoading(true);
    try {
      const result = await fetchLicensees(1, licenseesItemsPerBatch);
      setAllLicensees(
        Array.isArray(result.licensees) ? result.licensees : []
      );
      setLicenseesLoadedBatches(new Set([1]));
      setLicenseesCurrentPage(0);
    } catch (error) {
      console.error('Failed to refresh licensees:', error);
    } finally {
      setIsLicenseesLoading(false);
    }
  }, []);

  return {
    // State
    allLicensees,
    isLicenseesLoading,
    licenseesCurrentPage,
    isAddLicenseeModalOpen,
    isEditLicenseeModalOpen,
    isDeleteLicenseeModalOpen,
    countries,
    isCountriesLoading,
    selectedLicensee,
    licenseeForm,
    licenseeSearchValue,
    isPaymentHistoryModalOpen,
    selectedLicenseeForPayment,
    createdLicensee,
    isLicenseeSuccessModalOpen,
    isPaymentConfirmModalOpen,
    selectedLicenseeForPaymentChange,
    filteredLicensees,
    // Setters
    setLicenseesCurrentPage,
    setIsAddLicenseeModalOpen,
    setIsEditLicenseeModalOpen,
    setIsDeleteLicenseeModalOpen,
    setSelectedLicensee,
    setLicenseeForm,
    setLicenseeSearchValue,
    setIsPaymentHistoryModalOpen,
    setSelectedLicenseeForPayment,
    setCreatedLicensee,
    setIsLicenseeSuccessModalOpen,
    setIsPaymentConfirmModalOpen,
    setSelectedLicenseeForPaymentChange,
    // Handlers
    handleOpenAddLicensee,
    handleSaveAddLicensee,
    handleOpenEditLicensee,
    handleSaveEditLicensee,
    handleOpenDeleteLicensee,
    handleDeleteLicensee,
    handlePaymentHistory,
    handleTogglePaymentStatus,
    handleConfirmPaymentStatusChange,
    refreshLicensees,
    getCountryNameById,
  };
}

