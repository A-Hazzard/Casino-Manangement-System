'use client';

import { useDebounce } from '@/lib/utils/hooks';
import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/shared/ui/button';
import LocationMultiSelect from '@/components/shared/ui/common/LocationMultiSelect';
import { Input } from '@/components/shared/ui/input';
import PaginationControls from '@/components/shared/ui/PaginationControls';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/shared/ui/select';
import { useMembersActionsStore } from '@/lib/store/memberActionsStore';
import { useUserStore } from '@/lib/store/userStore';
import type { CasinoMember as Member } from '@/shared/types/entities';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { ArrowUpDown, Calendar, Users } from 'lucide-react';
type MemberSortOption =
  | 'name'
  | 'playerId'
  | 'points'
  | 'sessions'
  | 'totalHandle'
  | 'totalWon'
  | 'totalLost'
  | 'lastSession'
  | 'status'
  | 'locationName'
  | 'winLoss'
  | 'lastLogin';

// Import SVG icons for pre-rendering

import MembersMemberCard from '@/components/CMS/members/common/MembersMemberCard';
import MembersMemberSkeleton from '@/components/CMS/members/common/MembersMemberSkeleton';
import { useMembersHandlers } from '@/components/CMS/members/context/MembersHandlersContext';
import MembersDeleteMemberModal from '@/components/CMS/members/modals/MembersDeleteMemberModal';
import MembersEditMemberModal from '@/components/CMS/members/modals/MembersEditMemberModal';
import MembersNewMemberModal from '@/components/CMS/members/modals/MembersNewMemberModal';
import MembersMemberTable from '@/components/CMS/members/tabs/MembersMemberTable';
import MembersMemberTableSkeleton from '@/components/CMS/members/tabs/MembersMemberTableSkeleton';

type MembersListTabProps = {
  forcedLocationId?: string;
};

export default function MembersListTab({
  forcedLocationId,
}: MembersListTabProps) {
  const {
    selectedMember,
    isEditModalOpen,
    isDeleteModalOpen,
    openEditModal,
    openDeleteModal,
    closeEditModal,
    closeDeleteModal,
  } = useMembersActionsStore();
  const {
    setOnRefresh,
    setOnNewMember,
    setRefreshing: setRefreshingContext,
  } = useMembersHandlers();

  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUserStore();

  // Check if user can edit members (only admin and developer)
  const canEditMembers = useMemo(() => {
    if (!user || !user.roles) return false;
    return user.roles.some(role => role === 'admin' || role === 'developer');
  }, [user]);

  // State management
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  // Default: Sort by joined date (createdAt) - most recent first
  const [sortOption, setSortOption] = useState<MemberSortOption>('lastSession');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(0);
  const [loadedBatches, setLoadedBatches] = useState<Set<number>>(new Set([1]));
  const [isNewMemberModalOpen, setIsNewMemberModalOpen] = useState(false);
  const [locationFilter, setLocationFilter] = useState<string[]>([]);
  const [locations, setLocations] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [summaryStats, setSummaryStats] = useState<{
    totalMembers: number;
    totalLocations: number;
    activeMembers: number;
  } | null>(null);

  const itemsPerPage = 10;
  const itemsPerBatch = 50;
  const pagesPerBatch = itemsPerBatch / itemsPerPage; // 5

  // Calculate which batch we need based on current page
  const calculateBatchNumber = useCallback(
    (page: number) => {
      return Math.floor(page / pagesPerBatch) + 1;
    },
    [pagesPerBatch]
  );

  // Fetch members data with backend pagination
  const fetchMembers = useCallback(
    async (
      batch: number = 1,
      search: string = '',
      sortBy: string = 'name',
      sortOrder: 'asc' | 'desc' = 'asc',
      locFilter: string | string[] = forcedLocationId ? [forcedLocationId] : locationFilter
    ) => {
      try {
        setLoading(true);

        const params = new URLSearchParams({
          page: batch.toString(),
          limit: itemsPerBatch.toString(),
          search: search,
          sortBy: sortBy,
          sortOrder: sortOrder,
          locationFilter: Array.isArray(locFilter) ? locFilter.join(',') : (locFilter !== 'all' ? locFilter : ''),
        });

        const response = await axios.get(`/api/members?${params}`);
        const result = response.data;

        if (result.success && result.data) {
          const newMembers = result.data.members || [];
          // Merge new members into allMembers, avoiding duplicates
          setAllMembers(prev => {
            const existingIds = new Set(prev.map(m => m._id));
            const uniqueNewMembers = newMembers.filter(
              (m: Member) => !existingIds.has(m._id)
            );
            return [...prev, ...uniqueNewMembers];
          });
        } else {
          console.error('Invalid response format:', result);
          setAllMembers([]);
        }
      } catch (error) {
        console.error('Error fetching members:', error);
        setAllMembers([]);
      } finally {
        setLoading(false);
      }
    },
    [itemsPerBatch, forcedLocationId, locationFilter]
  );

  // Fetch locations for the filter dropdown (membership-enabled only)
  const fetchLocations = useCallback(async () => {
    try {
      const response = await axios.get(
        '/api/machines/locations?membershipOnly=true'
      );
      const data = response.data;
      if (data.locations && Array.isArray(data.locations)) {
        setLocations(
          data.locations.map((loc: { _id: string; name: string }) => ({
            id: loc._id,
            name: loc.name || '',
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  }, []);

  // Fetch summary stats
  const fetchSummaryStats = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '1',
        dateFilter: 'all',
      });

      // Add location filter if forcedLocationId is provided
      if (forcedLocationId) {
        params.append('location', forcedLocationId);
      }

      const response = await axios.get(
        `/api/members/summary?${params.toString()}`
      );
      const data = response.data;
      if (data.data?.summary) {
        setSummaryStats(data.data.summary);
      }
    } catch (error) {
      console.error('Error fetching summary stats:', error);
    }
  }, [forcedLocationId]);

  // Fetch locations on mount
  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Load initial batch on mount and when filters change
  useEffect(() => {
    setAllMembers([]);
    setLoadedBatches(new Set([1]));
    setCurrentPage(0);
    fetchMembers(
      1,
      debouncedSearchTerm,
      sortOption,
      sortOrder,
      forcedLocationId || locationFilter
    );
  }, [
    debouncedSearchTerm,
    sortOption,
    sortOrder,
    setAllMembers,
    setLoadedBatches,
    setCurrentPage,
    fetchMembers,
    forcedLocationId,
    locationFilter,
  ]);

  // Fetch summary stats on mount
  useEffect(() => {
    fetchSummaryStats();
  }, [fetchSummaryStats]);

  // Check for newMember parameter and open modal (only once)
  useEffect(() => {
    const newMember = searchParams?.get('newMember');
    if (newMember === 'true' && !isNewMemberModalOpen) {
      // Remove the parameter from URL first to prevent re-triggering
      const params = new URLSearchParams(searchParams?.toString() || '');
      params.delete('newMember');
      const newUrl = params.toString() ? `?${params.toString()}` : '';
      router.replace(`/members${newUrl}`, { scroll: false });
      // Then open the modal
      setIsNewMemberModalOpen(true);
    }
  }, [searchParams, router, isNewMemberModalOpen]);

  // Frontend search is handled in filteredMembers useMemo

  // Fetch next batch when crossing batch boundaries
  useEffect(() => {
    if (loading) return;

    const currentBatch = calculateBatchNumber(currentPage);
    const isLastPageOfBatch = (currentPage + 1) % pagesPerBatch === 0;
    const nextBatch = currentBatch + 1;

    // Fetch next batch if we're on the last page of current batch and haven't loaded it yet
    if (isLastPageOfBatch && !loadedBatches.has(nextBatch)) {
      setLoadedBatches(prev => new Set([...prev, nextBatch]));
      fetchMembers(
        nextBatch,
        searchTerm,
        sortOption,
        sortOrder,
        forcedLocationId || locationFilter
      );
    }

    // Also ensure current batch is loaded
    if (!loadedBatches.has(currentBatch)) {
      setLoadedBatches(prev => new Set([...prev, currentBatch]));
      fetchMembers(
        currentBatch,
        searchTerm,
        sortOption,
        sortOrder,
        forcedLocationId || locationFilter
      );
    }
  }, [
    currentPage,
    loading,
    fetchMembers,
    itemsPerBatch,
    pagesPerBatch,
    loadedBatches,
    calculateBatchNumber,
    searchTerm,
    sortOption,
    sortOrder,
    forcedLocationId,
    locationFilter,
  ]);

  // Sorting functionality - now handled by backend
  const handleSort = useCallback(
    (column: MemberSortOption) => {
      const newSortOrder =
        sortOption === column && sortOrder === 'asc' ? 'desc' : 'asc';
      setSortOption(column);
      setSortOrder(newSortOrder);
      // fetchMembers will be called via useEffect
    },
    [sortOption, sortOrder]
  );

  // Filter by location and search term (frontend filtering)
  const filteredMembers = useMemo(() => {
    let filtered = allMembers;

    // Apply location filter
    if (locationFilter.length > 0 && !locationFilter.includes('all')) {
      filtered = filtered.filter(member => {
        const memberLocationId = member.gamingLocation || '';
        return locationFilter.includes(memberLocationId);
      });
    }

    // Apply frontend search filter
    if (debouncedSearchTerm && debouncedSearchTerm.trim()) {
      const lowerSearchValue = debouncedSearchTerm.toLowerCase().trim();
      filtered = filtered.filter(member => {
        const fullName =
          `${member.profile?.firstName || ''} ${member.profile?.lastName || ''}`.toLowerCase();
        const phoneNumber = (member.phoneNumber || '').toLowerCase();
        const locationName = (member.locationName || '').toLowerCase();
        const memberId = String(member._id || '').toLowerCase();

        return (
          fullName.includes(lowerSearchValue) ||
          phoneNumber.includes(lowerSearchValue) ||
          locationName.includes(lowerSearchValue) ||
          memberId.includes(lowerSearchValue)
        );
      });
    }

    return filtered;
  }, [allMembers, locationFilter, forcedLocationId, debouncedSearchTerm]);

  // Sort members (backend already sorts, but we keep this for consistency)
  const sortedMembers = useMemo(() => {
    const sorted = [...filteredMembers].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortOption) {
        case 'name':
          aValue = `${a.profile.firstName} ${a.profile.lastName}`.toLowerCase();
          bValue = `${b.profile.firstName} ${b.profile.lastName}`.toLowerCase();
          break;
        case 'playerId':
          aValue = a._id;
          bValue = b._id;
          break;
        case 'lastSession':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'locationName':
          aValue = (a.locationName || '').toLowerCase();
          bValue = (b.locationName || '').toLowerCase();
          break;
        case 'winLoss':
          aValue = a.winLoss || 0;
          bValue = b.winLoss || 0;
          break;
        case 'lastLogin':
          aValue = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
          bValue = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
          break;
        default:
          aValue = a._id;
          bValue = b._id;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortOrder === 'asc'
        ? aValue < bValue
          ? -1
          : 1
        : bValue < aValue
          ? -1
          : 1;
    });

    return sorted;
  }, [filteredMembers, sortOption, sortOrder]);

  // Pagination
  const paginatedMembers = useMemo(() => {
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedMembers.slice(startIndex, endIndex);
  }, [sortedMembers, currentPage, itemsPerPage]);

  const handleMemberClick = (memberId: string) => {
    router.push(`/members/${memberId}`);
  };

  const handleLocationClick = (locationId?: string) => {
    if (!locationId) return;
    router.push(`/locations/${locationId}`);
  };

  const handleEdit = (member: Member) => {
    openEditModal(member);
  };

  const handleDelete = (member: Member) => {
    openDeleteModal(member);
  };

  const handleTableAction = (action: 'edit' | 'delete', member: Member) => {
    if (action === 'edit') {
      handleEdit(member);
    } else if (action === 'delete') {
      handleDelete(member);
    }
  };

  const handleNewMember = useCallback(() => {
    setIsNewMemberModalOpen(true);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshingContext(true);
    setLoading(true);
    setAllMembers([]);
    setLoadedBatches(new Set([1]));
    setCurrentPage(0);
    try {
      await fetchMembers(
        1,
        debouncedSearchTerm,
        sortOption,
        sortOrder,
        forcedLocationId || locationFilter
      );
      await fetchSummaryStats();
    } finally {
      setLoading(false);
      setRefreshingContext(false);
    }
  }, [
    debouncedSearchTerm,
    sortOption,
    sortOrder,
    fetchMembers,
    fetchSummaryStats,
    setRefreshingContext,
    forcedLocationId,
    locationFilter,
  ]);

  // Register handlers with context
  useEffect(() => {
    setOnRefresh(handleRefresh);
    setOnNewMember(handleNewMember);
    return () => {
      setOnRefresh(undefined);
      setOnNewMember(undefined);
    };
  }, [handleRefresh, handleNewMember, setOnRefresh, setOnNewMember]);

  const handleCloseNewMemberModal = () => {
    setIsNewMemberModalOpen(false);
  };

  const handleMemberCreated = useCallback(async () => {
    // Reset state and refetch all members (like page load)
    // This ensures the new member appears in the list
    setAllMembers([]);
    setLoadedBatches(new Set([1]));
    setCurrentPage(0);
    setLoading(true);
    try {
      // Fetch from page 1 with current filters (like page load)
      await fetchMembers(1, debouncedSearchTerm, sortOption, sortOrder);
      await fetchSummaryStats();
    } finally {
      setLoading(false);
    }
  }, [
    debouncedSearchTerm,
    sortOption,
    sortOrder,
    fetchMembers,
    fetchSummaryStats,
  ]);

  const handleMemberUpdated = useCallback(async () => {
    // Reset state and refetch all members (like page load)
    // This ensures the updated member data is fresh
    setAllMembers([]);
    setLoadedBatches(new Set([1]));
    setCurrentPage(0);
    setLoading(true);
    try {
      // Fetch from page 1 with current filters (like page load)
      await fetchMembers(1, debouncedSearchTerm, sortOption, sortOrder);
      await fetchSummaryStats();
    } finally {
      setLoading(false);
    }
  }, [
    debouncedSearchTerm,
    sortOption,
    sortOrder,
    fetchMembers,
    fetchSummaryStats,
  ]);

  // Date formatting helpers were used for exports only; keep here if needed in future.

  // Render summary cards (similar to summary report)
  const renderSummaryCards = () => {
    if (!summaryStats) return null;

    const isLocalhost =
      typeof window !== 'undefined' && window.location.hostname === 'localhost';

    return (
      <div
        className={`mb-6 grid grid-cols-1 gap-4 ${
          isLocalhost ? 'md:grid-cols-2' : 'md:grid-cols-1'
        }`}
      >
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center">
            <div className="rounded-lg bg-blue-100 p-2">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Members</p>
              <p className="text-2xl font-bold text-gray-900">
                {summaryStats.totalMembers}
              </p>
            </div>
          </div>
        </div>

        {isLocalhost && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center">
              <div className="rounded-lg bg-orange-100 p-2">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Active Members
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {summaryStats.activeMembers}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile: Search */}
      {/* Mobile: Search and Sort */}
      <div className="mt-4 flex flex-col gap-3 lg:hidden">
        <div className="relative w-full">
          <Input
            type="text"
            placeholder="Search members..."
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-4 pr-10 text-sm text-gray-700 placeholder-gray-400 shadow-sm focus:border-buttonActive focus:ring-buttonActive"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Select
              value={sortOption}
              onValueChange={v => setSortOption(v as MemberSortOption)}
            >
              <SelectTrigger className="h-10 w-full text-sm">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="playerId">Member ID</SelectItem>
                <SelectItem value="points">Points</SelectItem>
                <SelectItem value="lastSession">Last Session</SelectItem>
                <SelectItem value="lastLogin">Last Login</SelectItem>
                <SelectItem value="winLoss">Win/Loss</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            className="h-10 w-10 shrink-0 p-0"
            onClick={() =>
              setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
            }
            aria-label="Toggle sort order"
          >
            <ArrowUpDown
              className={`h-4 w-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`}
            />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {renderSummaryCards()}

      {/* Search Row - Purple box */}
      <div className="mt-4 hidden items-center gap-4 rounded-b-none rounded-t-lg bg-buttonActive p-4 lg:flex">
        <div className="relative min-w-0 max-w-md flex-1">
          <Input
            type="text"
            placeholder="Search members..."
            className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 pr-10 text-sm text-gray-700 placeholder-gray-400 focus:border-buttonActive focus:ring-buttonActive"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
        {!forcedLocationId && locations.length > 0 && (
          <LocationMultiSelect
            locations={locations}
            selectedLocations={locationFilter}
            onSelectionChange={setLocationFilter}
            placeholder="Filter locations"
            className="w-48"
          />
        )}
      </div>

      {/* Content Section */}
      {/* Content Section */}
      <div className="w-full flex-1">
        {/* Mobile View */}
        <div className="mt-4 space-y-4 pb-24 lg:hidden">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <MembersMemberSkeleton key={i} />
            ))
          ) : paginatedMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 py-12 text-center">
              <Users className="mb-3 h-10 w-10 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900">
                No members found
              </h3>
              <p className="text-sm text-gray-500">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            paginatedMembers.map(member => (
              <MembersMemberCard
                key={member._id}
                member={member}
                onMemberClick={handleMemberClick}
                onLocationClick={handleLocationClick}
                onEdit={handleEdit}
                onDelete={handleDelete}
                hideLocation={!!forcedLocationId}
                canEdit={canEditMembers}
              />
            ))
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden lg:block">
          {loading ? (
            <MembersMemberTableSkeleton
              hideLocationColumn={!!forcedLocationId}
            />
          ) : paginatedMembers.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <span className="text-lg text-gray-500">No members found.</span>
            </div>
          ) : (
            <MembersMemberTable
              members={paginatedMembers}
              sortOption={sortOption}
              sortOrder={sortOrder}
              onSort={handleSort}
              onMemberClick={handleMemberClick}
              onLocationClick={handleLocationClick}
              onAction={handleTableAction}
              hideLocationColumn={!!forcedLocationId}
              canEdit={canEditMembers}
            />
          )}
        </div>
      </div>

      {/* Pagination - Mobile Responsive */}
      {(() => {
        const totalPages = Math.ceil(allMembers.length / itemsPerPage);
        return totalPages > 1 ? (
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            setCurrentPage={setCurrentPage}
          />
        ) : null;
      })()}

      {/* Modals */}
      <MembersEditMemberModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        member={selectedMember._id ? (selectedMember as Member) : null}
        onMemberUpdated={handleMemberUpdated}
      />
      <MembersDeleteMemberModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        member={selectedMember._id ? (selectedMember as Member) : null}
        onDelete={fetchMembers}
      />
      <MembersNewMemberModal
        isOpen={isNewMemberModalOpen}
        onClose={handleCloseNewMemberModal}
        onMemberCreated={handleMemberCreated}
      />
    </>
  );
}

