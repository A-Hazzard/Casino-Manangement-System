'use client';
import DeleteUserModal from '@/components/administration/DeleteUserModal';
import LicenseeCardSkeleton from '@/components/administration/LicenseeCardSkeleton';
import LicenseeTableSkeleton from '@/components/administration/LicenseeTableSkeleton';
import SearchFilterBar from '@/components/administration/SearchFilterBar';
import UserCard from '@/components/administration/UserCard';
import UserCardSkeleton from '@/components/administration/UserCardSkeleton';
import UserTable from '@/components/administration/UserTable';
import UserTableSkeleton from '@/components/administration/UserTableSkeleton';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import PageLayout from '@/components/layout/PageLayout';

import AdministrationNavigation from '@/components/administration/AdministrationNavigation';
import { Button } from '@/components/ui/button';
import PaginationControls from '@/components/ui/PaginationControls';
import type { AdministrationSection } from '@/lib/constants/administration';
import { ADMINISTRATION_TABS_CONFIG } from '@/lib/constants/administration';
// Activity logging removed - handled via API calls
import ActivityLogsTable from '@/components/administration/ActivityLogsTable';
import AddLicenseeModal from '@/components/administration/AddLicenseeModal';
import AddUserModal from '@/components/administration/AddUserModal';
import DeleteLicenseeModal from '@/components/administration/DeleteLicenseeModal';
import EditLicenseeModal from '@/components/administration/EditLicenseeModal';
import FeedbackManagement from '@/components/administration/FeedbackManagement';
import LicenseeCard from '@/components/administration/LicenseeCard';
import LicenseeSearchBar from '@/components/administration/LicenseeSearchBar';
import LicenseeSuccessModal from '@/components/administration/LicenseeSuccessModal';
import LicenseeTable from '@/components/administration/LicenseeTable';
import PaymentHistoryModal from '@/components/administration/PaymentHistoryModal';
import PaymentStatusConfirmModal from '@/components/administration/PaymentStatusConfirmModal';
import UserModal from '@/components/administration/UserModal';
import { IMAGES } from '@/lib/constants/images';
import { fetchUsers, updateUser } from '@/lib/helpers/administration';
import { administrationUtils } from '@/lib/helpers/administrationPage';
import { fetchLicensees } from '@/lib/helpers/clientLicensees';
import { fetchCountries } from '@/lib/helpers/countries';
import { useAdministrationNavigation } from '@/lib/hooks/navigation';
import { useUserStore } from '@/lib/store/userStore';
import type {
  ResourcePermissions,
  SortKey,
  User,
} from '@/lib/types/administration';
import type { Country } from '@/lib/types/country';
import type { Licensee } from '@/lib/types/licensee';
import {
  detectChanges,
  filterMeaningfulChanges,
  getChangesSummary,
} from '@/lib/utils/changeDetection';
import { getNext30Days } from '@/lib/utils/licensee';
import { PlusCircle, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
// import { useUrlProtection } from '@/lib/hooks/useUrlProtection';

import { useDashBoardStore } from '@/lib/store/dashboardStore';
import type { AddLicenseeForm, AddUserForm } from '@/lib/types/pages';
import { hasTabAccess } from '@/lib/utils/permissions';
import axios from 'axios';

function AdministrationPageContent() {
  const { selectedLicencee, setSelectedLicencee } = useDashBoardStore();
  const { user } = useUserStore();
  const { activeSection, handleSectionChange } = useAdministrationNavigation();

  // Helper function to get proper user display name for activity logging
  const getUserDisplayName = useCallback(() => {
    if (!user) return 'Unknown User';

    // Check if user has profile with firstName and lastName
    if (user.profile?.firstName && user.profile?.lastName) {
      return `${user.profile.firstName} ${user.profile.lastName}`;
    }

    // If only firstName exists, use it
    if (user.profile?.firstName && !user.profile?.lastName) {
      return user.profile.firstName;
    }

    // If only lastName exists, use it
    if (!user.profile?.firstName && user.profile?.lastName) {
      return user.profile.lastName;
    }

    // If neither firstName nor lastName exist, use username
    if (user.username && user.username.trim() !== '') {
      return user.username;
    }

    // If username doesn't exist or is blank, use email
    if (user.emailAddress && user.emailAddress.trim() !== '') {
      return user.emailAddress;
    }

    // Fallback
    return 'Unknown User';
  }, [user]);

  // Prevent hydration mismatch by rendering content only on client
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Initialize selectedLicencee if not set
  useEffect(() => {
    if (!selectedLicencee) {
      setSelectedLicencee('');
    }
  }, [selectedLicencee, setSelectedLicencee]);

  const [allUsers, setAllUsers] = useState<User[]>([]);
  // Store all loaded users for frontend search
  const [allLoadedUsers, setAllLoadedUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Separate loading state for backend search (doesn't show full skeleton)
  const [isSearching, setIsSearching] = useState(false);

  // Batch-based pagination state
  const [loadedBatches, setLoadedBatches] = useState<Set<number>>(new Set([1]));
  const [currentPage, setCurrentPage] = useState(0); // 0-indexed
  const itemsPerPage = 10;
  const itemsPerBatch = 50;
  const pagesPerBatch = itemsPerBatch / itemsPerPage; // 5
  const [searchValue, setSearchValue] = useState('');
  // Debounced search value for backend search
  const [debouncedSearchValue, setDebouncedSearchValue] = useState('');
  // Track if we're using backend search results
  const [usingBackendSearch, setUsingBackendSearch] = useState(false);
  // Store pagination metadata from API (used for search results)
  const [paginationMetadata, setPaginationMetadata] = useState<{
    total: number;
    totalPages: number;
  } | null>(null);

  // URL protection for administration tabs - temporarily disabled for debugging
  // useUrlProtection({
  //   page: 'administration',
  //   allowedTabs: ['users', 'licensees', 'activity-logs'],
  //   defaultTab: 'users',
  //   redirectPath: '/unauthorized',
  // });
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: 'ascending' | 'descending';
  } | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUserToDelete, setSelectedUserToDelete] = useState<User | null>(
    null
  );
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [addUserForm, setAddUserForm] = useState<AddUserForm>({
    roles: [],
    allowedLocations: [],
    licenseeIds: [],
  });
  const [allLicensees, setAllLicensees] = useState<Licensee[]>([]);
  const [isLicenseesLoading, setIsLicenseesLoading] = useState(true);

  // Batch-based pagination state for licensees
  const [licenseesLoadedBatches, setLicenseesLoadedBatches] = useState<
    Set<number>
  >(new Set([1]));
  const [licenseesCurrentPage, setLicenseesCurrentPage] = useState(0); // 0-indexed
  const licenseesItemsPerPage = 10;
  const licenseesItemsPerBatch = 50;
  const licenseesPagesPerBatch = licenseesItemsPerBatch / licenseesItemsPerPage; // 5

  // Calculate which batch corresponds to the current page for licensees
  const calculateLicenseesBatchNumber = useCallback(
    (page: number) => {
      return Math.floor(page / licenseesPagesPerBatch) + 1;
    },
    [licenseesPagesPerBatch]
  );
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

  // Track which sections have been loaded
  const [loadedSections, setLoadedSections] = useState<
    Set<AdministrationSection>
  >(new Set());

  // Track tab transition loading state
  const [isTabTransitioning, setIsTabTransitioning] = useState(false);

  // Calculate which batch corresponds to the current page
  const calculateBatchNumber = useCallback(
    (page: number) => {
      return Math.floor(page / pagesPerBatch) + 1;
    },
    [pagesPerBatch]
  );

  useEffect(() => {
    if (!mounted) return;

    setAllUsers([]);
    setLoadedBatches(new Set([1]));
    setCurrentPage(0);
    setLoadedSections(prev => {
      if (!prev.has('users')) {
        return prev;
      }

      const updated = new Set(prev);
      updated.delete('users');
      return updated;
    });
  }, [selectedLicencee, mounted]);

  // Debounce search value
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchValue(searchValue);
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchValue]);

  // Reset backend search state when search is cleared
  useEffect(() => {
    if (!debouncedSearchValue || !debouncedSearchValue.trim()) {
      setUsingBackendSearch(false);
      setPaginationMetadata(null);
      setIsSearching(false);
      // Restore frontend data when search is cleared
      setAllUsers(allLoadedUsers);
      setCurrentPage(0);
    }
  }, [debouncedSearchValue, allLoadedUsers]);

  // Frontend search - search through loaded users first
  useEffect(() => {
    if (activeSection !== 'users') return;
    if (!debouncedSearchValue || !debouncedSearchValue.trim()) {
      setUsingBackendSearch(false);
      return;
    }

    // Try frontend search first
    const lowerSearchValue = debouncedSearchValue.toLowerCase().trim();
    const frontendResults = allLoadedUsers.filter(user => {
      // Search by username, email, and _id simultaneously
      const username = (user.username || '').toLowerCase();
      const email = (user.email || user.emailAddress || '').toLowerCase();
      const userId = String(user._id || '').toLowerCase();

      return (
        username.includes(lowerSearchValue) ||
        email.includes(lowerSearchValue) ||
        userId.includes(lowerSearchValue)
      );
    });

    if (frontendResults.length > 0) {
      // Found results in frontend, use them
      setAllUsers(frontendResults);
      setUsingBackendSearch(false);
      setPaginationMetadata(null);
      setCurrentPage(0);
    } else {
      // No results in frontend, do backend search
      setUsingBackendSearch(true);
      setIsSearching(true);
      const loadBackendSearch = async () => {
        try {
          const result = await fetchUsers(
            selectedLicencee,
            1,
            itemsPerBatch,
            debouncedSearchValue,
            'all' // Search all fields
          );
          setAllUsers(result.users || []);
          setPaginationMetadata({
            total: result.pagination.total,
            totalPages: result.pagination.totalPages,
          });
          setCurrentPage(0);
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to fetch search results:', error);
          }
          setAllUsers([]);
        } finally {
          setIsSearching(false);
        }
      };
      loadBackendSearch();
    }
  }, [
    debouncedSearchValue,
    allLoadedUsers,
    activeSection,
    selectedLicencee,
    itemsPerBatch,
  ]);

  // Handle pagination for backend search results
  useEffect(() => {
    if (isLoading || activeSection !== 'users') return;
    if (
      !usingBackendSearch ||
      !debouncedSearchValue ||
      !debouncedSearchValue.trim()
    )
      return;

    // When using backend search, fetch the current page from backend
    const currentPage1Indexed = currentPage + 1;
    const loadSearchPage = async () => {
      setIsSearching(true);
      try {
        const result = await fetchUsers(
          selectedLicencee,
          currentPage1Indexed,
          itemsPerBatch,
          debouncedSearchValue,
          'all' // Search all fields
        );
        setAllUsers(result.users || []);
        setPaginationMetadata({
          total: result.pagination.total,
          totalPages: result.pagination.totalPages,
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to fetch search results:', error);
        }
        setAllUsers([]);
      } finally {
        setIsSearching(false);
      }
    };

    loadSearchPage();
  }, [
    currentPage,
    usingBackendSearch,
    debouncedSearchValue,
    selectedLicencee,
    itemsPerBatch,
    isLoading,
    activeSection,
  ]);

  // Load users only when users tab is active and not already loaded (initial batch)
  useEffect(() => {
    if (activeSection === 'users' && !loadedSections.has('users')) {
      const loadUsers = async () => {
        setIsLoading(true);
        try {
          // Use backend search if searchValue is provided
          const result = await fetchUsers(selectedLicencee, 1, itemsPerBatch);
          setAllUsers(result.users || []);
          setAllLoadedUsers(result.users || []);
          setLoadedBatches(new Set([1]));
          setLoadedSections(prev => new Set(prev).add('users'));
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to fetch users:', error);
          }
          setAllUsers([]);
        }
        setIsLoading(false);
        setIsTabTransitioning(false);
      };
      loadUsers();
    }
  }, [activeSection, selectedLicencee, loadedSections, itemsPerBatch]);

  // Fetch next batch when crossing batch boundaries
  useEffect(() => {
    if (isLoading || activeSection !== 'users') return;

    // If searching, don't use batch loading - search results are already filtered on backend
    if (debouncedSearchValue && debouncedSearchValue.trim()) {
      return;
    }

    const currentBatch = calculateBatchNumber(currentPage);

    // Check if we're on the last page of the current batch (page 4, 0-indexed = page 5, 1-indexed)
    // We should fetch the next batch proactively so it's ready when user navigates
    const isLastPageOfBatch = (currentPage + 1) % pagesPerBatch === 0;
    const nextBatch = currentBatch + 1;

    // Fetch next batch if we're on the last page of current batch and haven't loaded it yet
    // This ensures the next batch is ready when user navigates to page 6
    if (isLastPageOfBatch && !loadedBatches.has(nextBatch)) {
      setLoadedBatches(prev => new Set([...prev, nextBatch]));
      fetchUsers(selectedLicencee, nextBatch, itemsPerBatch)
        .then(result => {
          setAllUsers(prev => {
            // Merge new data, avoiding duplicates
            const existingIds = new Set(prev.map(item => item._id));
            const newItems = result.users.filter(
              item => !existingIds.has(item._id)
            );
            const updated = [...prev, ...newItems];
            setAllLoadedUsers(updated);
            return updated;
          });
        })
        .catch(error => {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to fetch next batch:', error);
          }
        });
    }

    // Also ensure current batch is loaded
    if (!loadedBatches.has(currentBatch)) {
      setLoadedBatches(prev => new Set([...prev, currentBatch]));
      fetchUsers(selectedLicencee, currentBatch, itemsPerBatch)
        .then(result => {
          setAllUsers(prev => {
            const existingIds = new Set(prev.map(item => item._id));
            const newItems = result.users.filter(
              item => !existingIds.has(item._id)
            );
            const updated = [...prev, ...newItems];
            setAllLoadedUsers(updated);
            return updated;
          });
        })
        .catch(error => {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to fetch current batch:', error);
          }
        });
    }
  }, [
    currentPage,
    isLoading,
    activeSection,
    loadedBatches,
    selectedLicencee,
    itemsPerBatch,
    pagesPerBatch,
    calculateBatchNumber,
    searchValue,
    debouncedSearchValue,
  ]);

  // Load licensees only when licensees tab is active and not already loaded (initial batch)
  useEffect(() => {
    if (activeSection === 'licensees' && !loadedSections.has('licensees')) {
      const loadLicensees = async () => {
        setIsLicenseesLoading(true);
        try {
          const result = await fetchLicensees(1, licenseesItemsPerBatch);
          // Ensure we always set an array
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
        setIsTabTransitioning(false);
      };
      loadLicensees();
    }
  }, [activeSection, selectedLicencee, loadedSections, licenseesItemsPerBatch]);

  // Fetch next batch for licensees when crossing batch boundaries
  useEffect(() => {
    if (isLicenseesLoading || activeSection !== 'licensees') return;

    const currentBatch = calculateLicenseesBatchNumber(licenseesCurrentPage);

    // Check if we're on the last page of the current batch
    const isLastPageOfBatch =
      (licenseesCurrentPage + 1) % licenseesPagesPerBatch === 0;
    const nextBatch = currentBatch + 1;

    // Fetch next batch if we're on the last page of current batch and haven't loaded it yet
    if (isLastPageOfBatch && !licenseesLoadedBatches.has(nextBatch)) {
      setLicenseesLoadedBatches(prev => new Set([...prev, nextBatch]));
      fetchLicensees(nextBatch, licenseesItemsPerBatch)
        .then(result => {
          setAllLicensees(prev => {
            // Ensure prev is an array
            const prevArray = Array.isArray(prev) ? prev : [];
            // Ensure result.licensees is an array
            const newLicensees = Array.isArray(result.licensees)
              ? result.licensees
              : [];
            // Merge new data, avoiding duplicates
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

    // Also ensure current batch is loaded
    if (!licenseesLoadedBatches.has(currentBatch)) {
      setLicenseesLoadedBatches(prev => new Set([...prev, currentBatch]));
      fetchLicensees(currentBatch, licenseesItemsPerBatch)
        .then(result => {
          setAllLicensees(prev => {
            // Ensure prev is an array
            const prevArray = Array.isArray(prev) ? prev : [];
            // Ensure result.licensees is an array
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
    licenseesItemsPerBatch,
    licenseesPagesPerBatch,
    calculateLicenseesBatchNumber,
  ]);

  // Check if current user is a developer
  const isDeveloper = useMemo(() => {
    const userRoles = user?.roles || [];
    return userRoles.some(
      role => typeof role === 'string' && role.toLowerCase() === 'developer'
    );
  }, [user?.roles]);

  // Get items for current page from the current batch
  const paginatedUsers = useMemo(() => {
    // Calculate position within current batch (0-4 for pages 0-4, 0-4 for pages 5-9, etc.)
    const positionInBatch = (currentPage % pagesPerBatch) * itemsPerPage;
    const startIndex = positionInBatch;
    const endIndex = startIndex + itemsPerPage;

    return allUsers.slice(startIndex, endIndex);
  }, [allUsers, currentPage, itemsPerPage, pagesPerBatch]);

  // Calculate total pages based on all loaded batches or search results
  const totalPages = useMemo(() => {
    // When using backend search, use pagination metadata from API
    if (usingBackendSearch && paginationMetadata) {
      return paginationMetadata.totalPages > 0
        ? paginationMetadata.totalPages
        : 1;
    }

    // Otherwise, calculate total pages from all loaded batches
    const totalItems = allUsers.length;
    const totalPagesFromItems = Math.ceil(totalItems / itemsPerPage);

    // If we have items, return the calculated pages (based on all loaded data)
    // This will dynamically increase as more batches are loaded
    return totalPagesFromItems > 0 ? totalPagesFromItems : 1;
  }, [allUsers.length, itemsPerPage, usingBackendSearch, paginationMetadata]);

  const processedUsers = useMemo(() => {
    // When using backend search, backend already filters, so we only need to sort and filter test users
    // Pass empty searchValue to skip client-side search filtering
    const effectiveSearchValue = usingBackendSearch ? '' : searchValue;
    return administrationUtils.processUsers(
      paginatedUsers,
      effectiveSearchValue,
      'username', // Not used when effectiveSearchValue is empty
      sortConfig,
      isDeveloper
    );
  }, [
    paginatedUsers,
    searchValue,
    usingBackendSearch,
    sortConfig,
    isDeveloper,
  ]);

  const requestSort = administrationUtils.createSortHandler(
    sortConfig,
    setSortConfig
  );

  const handleEditUser = async (user: User) => {
    // Set loading state and open modal first
    setIsUserModalOpen(true);
    setSelectedUser(null); // Set to null initially to trigger loading state

    try {
      // Fetch detailed user information
      const response = await axios.get(`/api/users/${user._id}`);
      if (response.data.success) {
        setSelectedUser(response.data.user);
      } else {
        toast.error('Failed to load user details');
        setIsUserModalOpen(false);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch user details:', error);
      }
      toast.error('Failed to load user details');
      setIsUserModalOpen(false);
    }
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const handleSaveUser = async (
    updated: Partial<User> & {
      password?: string;
      resourcePermissions: ResourcePermissions;
    }
  ) => {
    if (!selectedUser) return;

    // Validate that we have at least one field to update
    const hasUpdates =
      updated.username !== undefined ||
      updated.email !== undefined ||
      updated.emailAddress !== undefined ||
      updated.roles !== undefined ||
      updated.profile !== undefined ||
      updated.profilePicture !== undefined ||
      updated.password !== undefined ||
      updated.rel !== undefined ||
      updated.resourcePermissions !== undefined;

    if (!hasUpdates) {
      toast.error('No changes detected. Please update at least one field.');
      return;
    }

    // Build comparison objects with ONLY editable fields
    const normalizedOriginalEmail = (
      selectedUser.email ||
      selectedUser.emailAddress ||
      ''
    ).trim();
    const normalizedUpdatedEmail = (
      updated.email ||
      updated.emailAddress ||
      ''
    ).trim();

    const originalData = {
      username: selectedUser.username,
      email: normalizedOriginalEmail,
      emailAddress: (
        selectedUser.emailAddress ||
        selectedUser.email ||
        ''
      ).trim(),
      profile: selectedUser.profile,
      roles: selectedUser.roles,
      resourcePermissions: selectedUser.resourcePermissions,
      profilePicture: selectedUser.profilePicture,
      rel: selectedUser.rel,
    };

    const formDataComparison = {
      username: updated.username,
      email: normalizedUpdatedEmail,
      emailAddress: normalizedUpdatedEmail,
      profile: updated.profile,
      roles: updated.roles,
      resourcePermissions: updated.resourcePermissions,
      profilePicture: updated.profilePicture,
      password: updated.password, // Include if changing password
      rel: updated.rel,
    };

    // Detect changes by comparing ONLY editable fields
    const changes = detectChanges(originalData, formDataComparison);
    const meaningfulChanges = filterMeaningfulChanges(changes);

    console.log('[Administration] handleSaveUser - Change Detection:');
    console.log('  Original rel:', originalData.rel);
    console.log('  Updated rel:', formDataComparison.rel);
    console.log('  Meaningful changes:', meaningfulChanges);
    console.log(
      '  Changes summary:',
      meaningfulChanges.map(
        c =>
          `${c.path}: ${JSON.stringify(c.oldValue)} → ${JSON.stringify(c.newValue)}`
      )
    );

    // Only proceed if there are actual changes
    if (meaningfulChanges.length === 0) {
      console.error('[Administration] ❌ No changes detected - blocking save');
      toast.info('No changes detected');
      return;
    }

    console.log('[Administration] ✅ Changes detected, proceeding with save');

    // Check if permission-related fields changed (roles, resourcePermissions, rel)
    console.log('[Administration] Checking for permission field changes...');
    console.log(
      '[Administration] All changed paths:',
      meaningfulChanges.map(c => c.path)
    );

    const permissionFieldsChanged = meaningfulChanges.some(change => {
      const fieldPath = change.path;
      const isPermissionField =
        fieldPath === 'roles' ||
        fieldPath.startsWith('resourcePermissions') ||
        fieldPath.startsWith('rel');

      if (isPermissionField) {
        console.log(
          '[Administration] Found permission field change:',
          fieldPath
        );
      }

      return isPermissionField;
    });

    console.log(
      '[Administration] Permission fields changed:',
      permissionFieldsChanged
    );

    // Build update payload with only changed fields + required _id
    const updatePayload: Record<string, unknown> = { _id: selectedUser._id };

    // For MongoDB, we can use dot notation directly for nested fields
    // This allows MongoDB to update only the specific nested field without replacing the entire parent object
    meaningfulChanges.forEach(change => {
      if (change.newValue !== undefined) {
        // Use dot notation for nested paths (MongoDB supports this in $set)
        // For paths with hyphens like "resourcePermissions.gaming-locations.resources",
        // MongoDB dot notation works correctly
        updatePayload[change.path] = change.newValue;
      }
    });

    // Debug logging for location permission updates
    if (permissionFieldsChanged) {
      const locationChanges = meaningfulChanges.filter(c =>
        c.path.startsWith('resourcePermissions.gaming-locations.resources')
      );
      if (locationChanges.length > 0) {
        console.log('[Administration] Location permission update:', {
          path: locationChanges[0].path,
          oldValue: locationChanges[0].oldValue,
          newValue: locationChanges[0].newValue,
          updatePayloadKey: Object.keys(updatePayload).find(k =>
            k.includes('resourcePermissions')
          ),
        });
      }
    }

    // If permission-related fields changed, increment sessionVersion to invalidate existing JWT
    if (permissionFieldsChanged) {
      updatePayload.$inc = { sessionVersion: 1 };
      console.log(
        '[Administration] 🔒 Permission fields changed - incrementing sessionVersion to invalidate user session'
      );
    }

    console.log('[Administration] Update payload:', updatePayload);
    console.log('[Administration] Update payload rel:', updatePayload.rel);

    try {
      await updateUser(updatePayload as never);

      // Log the update activity with proper change tracking
      try {
        const changesSummary = getChangesSummary(meaningfulChanges);
        await fetch('/api/activity-logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'update',
            resource: 'user',
            resourceId: selectedUser._id,
            resourceName: selectedUser.username,
            details: `Updated user: ${changesSummary}`,
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

      // Only close modal and refresh data on success
      setIsUserModalOpen(false);
      setSelectedUser(null);

      // If location permissions were updated, warn user about JWT refresh
      if (permissionFieldsChanged) {
        const locationChanges = meaningfulChanges.filter(c =>
          c.path.startsWith('resourcePermissions.gaming-locations.resources')
        );
        if (locationChanges.length > 0) {
          toast.success(
            `User updated successfully. Note: The user may need to log out and log back in for location permission changes to take effect.`
          );
        } else {
          toast.success(
            `User updated successfully: ${getChangesSummary(meaningfulChanges)}`
          );
        }
      } else {
        toast.success(
          `User updated successfully: ${getChangesSummary(meaningfulChanges)}`
        );
      }

      // Refresh users with licensee filter
      setRefreshing(true);
      const result = await fetchUsers(selectedLicencee, 1, itemsPerBatch);
      setAllUsers(result.users);
      setLoadedBatches(new Set([1]));
      setCurrentPage(0);
      setRefreshing(false);
    } catch (error) {
      console.error('Failed to update user:', error);

      // Extract detailed error message from axios error
      let errorMessage = 'Failed to update user';

      // Handle axios errors (from updateUser helper)
      if (error && typeof error === 'object') {
        const axiosError = error as {
          response?: {
            data?: { message?: string; error?: string };
            status?: number;
          };
          message?: string;
        };

        // Prioritize server error message from response.data
        if (axiosError.response?.data) {
          errorMessage =
            axiosError.response.data.message ||
            axiosError.response.data.error ||
            errorMessage;
        } else if (axiosError.message) {
          // Only use axios message if we don't have response data
          errorMessage = axiosError.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
      // Don't close modal on error - let user try again
    }
  };

  // Add User modal handlers
  const openAddUserModal = () => {
    setAddUserForm({ roles: [], allowedLocations: [], licenseeIds: [] });
    setIsAddUserModalOpen(true);
  };
  const closeAddUserModal = async () => {
    setIsAddUserModalOpen(false);
    // Refresh users data when modal is closed
    try {
      const result = await fetchUsers(selectedLicencee, 1, itemsPerBatch);
      setAllUsers(result.users);
      setLoadedBatches(new Set([1]));
      setCurrentPage(0);
    } catch (error) {
      console.error('Failed to refresh users data:', error);
    }
  };
  const handleAddUserFormChange = (data: Partial<AddUserForm>) =>
    setAddUserForm(prev => ({ ...prev, ...data }));
  const handleSaveAddUser = async () => {
    await administrationUtils.userManagement.createNewUser(
      addUserForm,
      setIsAddUserModalOpen,
      async () => {
        const result = await fetchUsers(selectedLicencee, 1, itemsPerBatch);
        setAllUsers(result.users);
        setLoadedBatches(new Set([1]));
        setCurrentPage(0);
      }
    );
  };

  const handleOpenAddLicensee = () => {
    setLicenseeForm({});
    setIsAddLicenseeModalOpen(true);
  };
  const handleSaveAddLicensee = async () => {
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

    // Only add optional fields if they have values
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
              changes: [], // Will be calculated by the API
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
  };
  const handleOpenEditLicensee = (licensee: Licensee) => {
    setSelectedLicensee(licensee);
    setLicenseeForm({
      _id: licensee._id,
      name: licensee.name,
      description: licensee.description,
      country: licensee.country,
      startDate: licensee.startDate ? new Date(licensee.startDate) : undefined,
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
  };
  const handleSaveEditLicensee = async () => {
    try {
      if (!selectedLicensee) return;

      // Build comparison objects with ONLY editable fields
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
        isPaid: selectedLicensee.isPaid, // Preserve current payment status
      };

      // Detect changes by comparing ONLY editable fields
      const changes = detectChanges(originalData, formDataComparison);
      const meaningfulChanges = filterMeaningfulChanges(changes);

      // Only proceed if there are actual changes
      if (meaningfulChanges.length === 0) {
        toast.info('No changes detected');
        return;
      }

      // Build update payload with only changed fields + required _id
      const updatePayload: Record<string, unknown> = {
        _id: selectedLicensee._id,
      };
      meaningfulChanges.forEach(change => {
        const fieldPath = change.path; // Use full path for nested fields
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

      // Log the update activity with proper change tracking
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

      // Only close modal and refresh data on success
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
      // Don't close modal on error - let user try again
    }
  };
  const handleOpenDeleteLicensee = (licensee: Licensee) => {
    setSelectedLicensee(licensee);
    setIsDeleteLicenseeModalOpen(true);
  };
  const handleDeleteLicensee = async () => {
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
            changes: [], // Will be calculated by the API
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
  };

  const licenseesWithCountryNames = useMemo(() => {
    // Safety check: ensure allLicensees is always an array
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

  const handlePaymentHistory = (licensee: Licensee) => {
    setSelectedLicenseeForPayment(licensee);
    setIsPaymentHistoryModalOpen(true);
  };

  const handleTogglePaymentStatus = (licensee: Licensee) => {
    setSelectedLicenseeForPaymentChange(licensee);
    setIsPaymentConfirmModalOpen(true);
  };

  const handleConfirmPaymentStatusChange = async () => {
    if (!selectedLicenseeForPaymentChange) return;

    try {
      // Determine current payment status
      const currentIsPaid =
        selectedLicenseeForPaymentChange.isPaid !== undefined
          ? selectedLicenseeForPaymentChange.isPaid
          : selectedLicenseeForPaymentChange.expiryDate
            ? new Date(selectedLicenseeForPaymentChange.expiryDate) > new Date()
            : false;

      const newIsPaid = !currentIsPaid;

      // Prepare update data
      const updateData: {
        _id: string;
        isPaid: boolean;
        expiryDate?: Date;
        prevExpiryDate?: Date;
      } = {
        _id: selectedLicenseeForPaymentChange._id,
        isPaid: newIsPaid,
      };

      // If changing from unpaid to paid, extend expiry date by 30 days
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
            changes: [], // Will be calculated by the API
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

      // Close modal
      setIsPaymentConfirmModalOpen(false);
      setSelectedLicenseeForPaymentChange(null);
      toast.success('Licensee payment status updated successfully');
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to update payment status:', error);
      }
      toast.error('Failed to update payment status');
    }
  };

  const renderSectionContent = useCallback(() => {
    const userRoles = user?.roles || [];

    // Check access for each section
    if (activeSection === 'activity-logs') {
      if (!hasTabAccess(userRoles, 'administration', 'activity-logs')) {
        return (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <h2 className="mb-2 text-xl font-semibold text-gray-900">
                Access Restricted
              </h2>
              <p className="text-gray-600">
                You don&apos;t have permission to access Activity Logs. Please
                contact your administrator for access.
              </p>
            </div>
          </div>
        );
      }
      return <ActivityLogsTable />;
    }

    if (activeSection === 'feedback') {
      if (!hasTabAccess(userRoles, 'administration', 'feedback')) {
        return (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <h2 className="mb-2 text-xl font-semibold text-gray-900">
                Access Restricted
              </h2>
              <p className="text-gray-600">
                You don&apos;t have permission to access Feedback. Please
                contact your administrator for access.
              </p>
            </div>
          </div>
        );
      }
      return <FeedbackManagement />;
    }

    if (activeSection === 'licensees') {
      if (!hasTabAccess(userRoles, 'administration', 'licensees')) {
        return (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <h2 className="mb-2 text-xl font-semibold text-gray-900">
                Access Restricted
              </h2>
              <p className="text-gray-600">
                You don&apos;t have permission to access Licensees. Please
                contact your administrator for access.
              </p>
            </div>
          </div>
        );
      }
      if (isLicenseesLoading) {
        return (
          <>
            <div className="block xl:hidden">
              <LicenseeCardSkeleton />
            </div>
            <div className="hidden xl:block">
              <LicenseeTableSkeleton />
            </div>
          </>
        );
      }
      return (
        <>
          <LicenseeSearchBar
            searchValue={licenseeSearchValue}
            setSearchValue={setLicenseeSearchValue}
          />
          {!isCountriesLoading && countries.length === 0 && (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              No countries are available. Please add countries first before
              creating or updating licensees.
            </p>
          )}
          <div className="block xl:hidden">
            {filteredLicensees.length > 0 ? (
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                {filteredLicensees.map(licensee => (
                  <LicenseeCard
                    key={licensee._id}
                    licensee={licensee}
                    onEdit={handleOpenEditLicensee}
                    onDelete={handleOpenDeleteLicensee}
                    onPaymentHistory={handlePaymentHistory}
                    onTogglePaymentStatus={handleTogglePaymentStatus}
                  />
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-gray-500">
                No licensees found.
              </p>
            )}
          </div>
          <div className="hidden xl:block">
            <LicenseeTable
              licensees={filteredLicensees}
              onEdit={handleOpenEditLicensee}
              onDelete={handleOpenDeleteLicensee}
              onPaymentHistory={handlePaymentHistory}
              onTogglePaymentStatus={handleTogglePaymentStatus}
            />
          </div>
          <AddLicenseeModal
            open={isAddLicenseeModalOpen}
            onClose={async () => {
              setIsAddLicenseeModalOpen(false);
              // Refresh licensees data when modal is closed
              try {
                const result = await fetchLicensees(1, licenseesItemsPerBatch);
                setAllLicensees(
                  Array.isArray(result.licensees) ? result.licensees : []
                );
                setLicenseesLoadedBatches(new Set([1]));
                setLicenseesCurrentPage(0);
              } catch (error) {
                console.error('Failed to refresh licensees data:', error);
              }
            }}
            onSave={handleSaveAddLicensee}
            formState={licenseeForm}
            setFormState={data =>
              setLicenseeForm(prev => ({ ...prev, ...data }))
            }
            countries={countries}
            countriesLoading={isCountriesLoading}
          />
          <EditLicenseeModal
            open={isEditLicenseeModalOpen}
            onClose={async () => {
              setIsEditLicenseeModalOpen(false);
              // Refresh licensees data when modal is closed
              try {
                const result = await fetchLicensees(1, licenseesItemsPerBatch);
                setAllLicensees(
                  Array.isArray(result.licensees) ? result.licensees : []
                );
                setLicenseesLoadedBatches(new Set([1]));
                setLicenseesCurrentPage(0);
              } catch (error) {
                console.error('Failed to refresh licensees data:', error);
              }
            }}
            onSave={handleSaveEditLicensee}
            formState={licenseeForm}
            setFormState={data =>
              setLicenseeForm(prev => ({ ...prev, ...data }))
            }
            countries={countries}
            countriesLoading={isCountriesLoading}
          />
          <DeleteLicenseeModal
            open={isDeleteLicenseeModalOpen}
            onClose={() => setIsDeleteLicenseeModalOpen(false)}
            onDelete={handleDeleteLicensee}
            licensee={selectedLicensee}
          />
          <PaymentHistoryModal
            open={isPaymentHistoryModalOpen}
            onClose={() => {
              setIsPaymentHistoryModalOpen(false);
              setSelectedLicenseeForPayment(null);
            }}
            licensee={selectedLicenseeForPayment}
          />
          <LicenseeSuccessModal
            open={isLicenseeSuccessModalOpen}
            onClose={() => {
              setIsLicenseeSuccessModalOpen(false);
              setCreatedLicensee(null);
            }}
            licensee={createdLicensee}
          />
          <PaymentStatusConfirmModal
            open={isPaymentConfirmModalOpen}
            onClose={() => {
              setIsPaymentConfirmModalOpen(false);
              setSelectedLicenseeForPaymentChange(null);
            }}
            onConfirm={handleConfirmPaymentStatusChange}
            currentStatus={
              selectedLicenseeForPaymentChange?.isPaid !== undefined
                ? selectedLicenseeForPaymentChange.isPaid
                : selectedLicenseeForPaymentChange?.expiryDate
                  ? new Date(selectedLicenseeForPaymentChange.expiryDate) >
                    new Date()
                  : false
            }
            licenseeName={selectedLicenseeForPaymentChange?.name || ''}
            currentExpiryDate={selectedLicenseeForPaymentChange?.expiryDate}
          />
        </>
      );
    }

    // Default to users section
    if (!hasTabAccess(userRoles, 'administration', 'users')) {
      return (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              Access Restricted
            </h2>
            <p className="text-gray-600">
              You don&apos;t have permission to access Users. Please contact
              your administrator for access.
            </p>
          </div>
        </div>
      );
    }

    if (isLoading) {
      return (
        <>
          <div className="block xl:hidden">
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <UserCardSkeleton />
              <UserCardSkeleton />
              <UserCardSkeleton />
              <UserCardSkeleton />
            </div>
          </div>
          <div className="hidden xl:block">
            <UserTableSkeleton />
          </div>
        </>
      );
    }

    return (
      <>
        <SearchFilterBar
          searchValue={searchValue}
          setSearchValue={setSearchValue}
        />
        <div className="block md:block xl:hidden">
          {isSearching ? (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <UserCardSkeleton />
              <UserCardSkeleton />
              <UserCardSkeleton />
              <UserCardSkeleton />
            </div>
          ) : processedUsers.length > 0 ? (
            <>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                {processedUsers.map(user => (
                  <UserCard
                    key={user.username}
                    user={user}
                    onEdit={handleEditUser}
                    onDelete={handleDeleteUser}
                  />
                ))}
              </div>
              {/* Pagination Controls */}
              {!isLoading && totalPages > 1 && (
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  setCurrentPage={setCurrentPage}
                />
              )}
            </>
          ) : (
            <p className="py-4 text-center text-gray-500">
              No users found matching your criteria.
            </p>
          )}
        </div>
        <div className="hidden xl:block">
          {isSearching ? (
            <UserTableSkeleton />
          ) : processedUsers.length > 0 ? (
            <>
              <UserTable
                users={processedUsers}
                sortConfig={sortConfig}
                requestSort={requestSort}
                onEdit={handleEditUser}
                onDelete={handleDeleteUser}
              />
              {/* Pagination Controls */}
              {!isLoading && totalPages > 1 && (
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  setCurrentPage={setCurrentPage}
                />
              )}
            </>
          ) : (
            <p className="py-10 text-center text-gray-500">
              No users found matching your criteria.
            </p>
          )}
        </div>
        <UserModal
          open={isUserModalOpen}
          user={selectedUser}
          onClose={async () => {
            setIsUserModalOpen(false);
            setSelectedUser(null);
            // Refresh users data when modal is closed
            try {
              const result = await fetchUsers(
                selectedLicencee,
                1,
                itemsPerBatch
              );
              setAllUsers(result.users);
              setLoadedBatches(new Set([1]));
              setCurrentPage(0);
            } catch (error) {
              console.error('Failed to refresh users data:', error);
            }
          }}
          onSave={handleSaveUser}
        />
        <DeleteUserModal
          open={isDeleteModalOpen}
          user={selectedUserToDelete}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedUserToDelete(null);
          }}
          onDelete={async () => {
            if (!selectedUserToDelete) return;

            const userData = { ...selectedUserToDelete };

            try {
              await axios.delete('/api/users', {
                data: { _id: selectedUserToDelete._id },
              });

              // Log the deletion activity
              try {
                await fetch('/api/activity-logs', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    action: 'delete',
                    resource: 'user',
                    resourceId: selectedUserToDelete._id,
                    resourceName: selectedUserToDelete.username,
                    details: `Deleted user: ${
                      selectedUserToDelete.username
                    } with roles: ${userData.roles?.join(', ') || 'N/A'}`,
                    userId: user?._id || 'unknown',
                    username: getUserDisplayName(),
                    userRole: 'user',
                    previousData: userData,
                    newData: null,
                    changes: [], // Will be calculated by the API
                  }),
                });
              } catch (error) {
                if (process.env.NODE_ENV === 'development') {
                  console.error('Failed to log activity:', error);
                }
              }

              // Refresh users
              const result = await fetchUsers(
                selectedLicencee,
                1,
                itemsPerBatch
              );
              setAllUsers(result.users);
              setLoadedBatches(new Set([1]));
              setCurrentPage(0);
              toast.success('User deleted successfully');
            } catch (error) {
              if (process.env.NODE_ENV === 'development') {
                console.error('Failed to delete user:', error);
              }
              toast.error('Failed to delete user');
            }
            setIsDeleteModalOpen(false);
            setSelectedUserToDelete(null);
          }}
        />
        <AddUserModal
          open={isAddUserModalOpen}
          onClose={closeAddUserModal}
          onSave={handleSaveAddUser}
          formState={addUserForm}
          setFormState={handleAddUserFormChange}
        />
      </>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeSection,
    isLicenseesLoading,
    isLoading,
    filteredLicensees,
    processedUsers,
    sortConfig,
    licenseeSearchValue,
    allUsers,
    searchValue,
    handleOpenEditLicensee,
    handleOpenDeleteLicensee,
    handlePaymentHistory,
    handleTogglePaymentStatus,
    handleEditUser,
    handleDeleteUser,
    requestSort,
    isAddLicenseeModalOpen,
    isEditLicenseeModalOpen,
    isDeleteLicenseeModalOpen,
    isPaymentHistoryModalOpen,
    isPaymentConfirmModalOpen,
    isLicenseeSuccessModalOpen,
    licenseeForm,
    setLicenseeForm,
    handleSaveAddLicensee,
    handleSaveEditLicensee,
    handleDeleteLicensee,
    handleConfirmPaymentStatusChange,
    selectedLicensee,
    selectedLicenseeForPayment,
    selectedLicenseeForPaymentChange,
    fetchLicensees,
    fetchUsers,
  ]);

  if (!mounted) return null;
  return (
    <PageLayout
      mainClassName="flex flex-col flex-1 p-4 lg:p-6 w-full max-w-full"
      showToaster={false}
      hideCurrencyFilter
    >
      {/* <MaintenanceBanner /> */}
      {/* Header Section: Admin icon, title, refresh icon, and action buttons */}
      <div className="mt-4 flex w-full max-w-full items-center justify-between md:mt-6">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-800 sm:text-2xl md:text-3xl">
            Administration
            <Image
              src={IMAGES.adminIcon}
              alt="Admin Icon"
              width={32}
              height={32}
              className="h-5 w-5 flex-shrink-0 sm:h-6 sm:w-6 md:h-8 md:w-8"
            />
          </h1>
          {/* Mobile: Refresh icon */}
          <button
            onClick={async () => {
              setRefreshing(true);
              if (activeSection === 'users') {
                const result = await fetchUsers(
                  selectedLicencee,
                  1,
                  itemsPerBatch
                );
                setAllUsers(result.users);
                setLoadedBatches(new Set([1]));
                setCurrentPage(0);
              } else if (activeSection === 'licensees') {
                const result = await fetchLicensees(1, licenseesItemsPerBatch);
                setAllLicensees(
                  Array.isArray(result.licensees) ? result.licensees : []
                );
                setLicenseesLoadedBatches(new Set([1]));
                setLicenseesCurrentPage(0);
              } else if (activeSection === 'feedback') {
                // Feedback section refreshes itself via FeedbackManagement component
                // Dispatch a custom event that FeedbackManagement can listen to
                window.dispatchEvent(new CustomEvent('refreshFeedback'));
              }
              setRefreshing(false);
            }}
            disabled={refreshing}
            className="ml-auto flex-shrink-0 p-1.5 text-gray-600 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 md:hidden"
            aria-label="Refresh"
          >
            <RefreshCw
              className={`h-4 w-4 sm:h-5 sm:w-5 ${refreshing ? 'animate-spin' : ''}`}
            />
          </button>
        </div>

        {/* Desktop: Refresh icon and Create button - Desktop full button, Mobile icon only */}
        <div className="hidden flex-shrink-0 items-center gap-2 md:flex">
          {/* Refresh icon */}
          <button
            onClick={async () => {
              setRefreshing(true);
              if (activeSection === 'users') {
                const result = await fetchUsers(
                  selectedLicencee,
                  1,
                  itemsPerBatch
                );
                setAllUsers(result.users);
                setLoadedBatches(new Set([1]));
                setCurrentPage(0);
              } else if (activeSection === 'licensees') {
                const result = await fetchLicensees(1, licenseesItemsPerBatch);
                setAllLicensees(
                  Array.isArray(result.licensees) ? result.licensees : []
                );
                setLicenseesLoadedBatches(new Set([1]));
                setLicenseesCurrentPage(0);
              } else if (activeSection === 'feedback') {
                // Feedback section refreshes itself via FeedbackManagement component
                // Dispatch a custom event that FeedbackManagement can listen to
                window.dispatchEvent(new CustomEvent('refreshFeedback'));
              }
              setRefreshing(false);
            }}
            disabled={refreshing}
            className="flex-shrink-0 p-2 text-gray-600 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw
              className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`}
            />
          </button>
          {activeSection === 'users' ? (
            <Button
              onClick={openAddUserModal}
              className="flex items-center gap-2 rounded-md bg-button px-6 py-2 text-lg font-semibold text-white"
            >
              <PlusCircle className="h-4 w-4" />
              Add User
            </Button>
          ) : activeSection === 'licensees' ? (
            <Button
              onClick={handleOpenAddLicensee}
              disabled={isCountriesLoading || countries.length === 0}
              className="flex items-center gap-2 rounded-md bg-button px-6 py-2 text-lg font-semibold text-white"
            >
              <PlusCircle className="h-4 w-4" />
              Add Licensee
            </Button>
          ) : null}
        </div>

        {/* Mobile: Create button - Icon only */}
        <div className="flex flex-shrink-0 items-center gap-2 md:hidden">
          {activeSection === 'users' ? (
            <button
              onClick={openAddUserModal}
              disabled={refreshing}
              className="flex-shrink-0 p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Add User"
            >
              <PlusCircle className="h-5 w-5 text-green-600 hover:text-green-700" />
            </button>
          ) : activeSection === 'licensees' ? (
            <button
              onClick={handleOpenAddLicensee}
              disabled={
                refreshing || isCountriesLoading || countries.length === 0
              }
              className="flex-shrink-0 p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Add Licensee"
            >
              <PlusCircle className="h-5 w-5 text-green-600 hover:text-green-700" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Navigation Section: Tab navigation for different administration sections */}
      <div className="mb-6 mt-8">
        <AdministrationNavigation
          tabs={ADMINISTRATION_TABS_CONFIG}
          activeSection={activeSection}
          onChange={handleSectionChange}
          isLoading={isLoading || isLicenseesLoading || isTabTransitioning}
        />
      </div>

      {/* Content Section: Main administration content with smooth transitions */}
      <div
        data-section-content
        className="transition-all duration-300 ease-in-out"
      >
        {isTabTransitioning ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center space-y-4">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-button"></div>
              <p className="text-gray-600">Loading {activeSection}...</p>
            </div>
          </div>
        ) : (
          renderSectionContent()
        )}
      </div>
    </PageLayout>
  );
}

export default function AdministrationPage() {
  return (
    <ProtectedRoute requiredPage="administration">
      <Suspense fallback={<UserTableSkeleton />}>
        <AdministrationPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}
