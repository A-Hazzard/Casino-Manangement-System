'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

import { useMemberActionsStore } from '@/lib/store/memberActionsStore';
import type { CasinoMember as Member } from '@/shared/types/entities';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MagnifyingGlassIcon,
} from '@radix-ui/react-icons';
import { PlusCircle, RefreshCw, ArrowUpDown } from 'lucide-react';
import { Toaster } from 'sonner';
import Image from 'next/image';
import PaginationControls from '@/components/ui/PaginationControls';

// Import SVG icons for pre-rendering
import membersIcon from '@/public/membersIcon.svg';

import MemberCard from '@/components/ui/members/MemberCard';
import MemberTable from '@/components/ui/members/MemberTable';
import MemberSkeleton from '@/components/ui/members/MemberSkeleton';
import MemberTableSkeleton from '@/components/ui/members/MemberTableSkeleton';
import EditMemberModal from '@/components/ui/members/EditMemberModal';
import DeleteMemberModal from '@/components/ui/members/DeleteMemberModal';
import NewMemberModal from '@/components/ui/members/NewMemberModal';

export default function MembersListTab() {
  const {
    selectedMember,
    isEditModalOpen,
    isDeleteModalOpen,
    openEditModal,
    openDeleteModal,
    closeEditModal,
    closeDeleteModal,
  } = useMemberActionsStore();

  const router = useRouter();

  // State management
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<MemberSortOption>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(0);
  const [loadedBatches, setLoadedBatches] = useState<Set<number>>(new Set([1]));
  const [isNewMemberModalOpen, setIsNewMemberModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const itemsPerPage = 10;
  const itemsPerBatch = 50;
  const pagesPerBatch = itemsPerBatch / itemsPerPage; // 5

  // Calculate which batch we need based on current page
  const calculateBatchNumber = useCallback((page: number) => {
    return Math.floor(page / pagesPerBatch) + 1;
  }, [pagesPerBatch]);

  // Fetch members data with backend pagination
  const fetchMembers = useCallback(
    async (
      batch: number = 1,
      search: string = '',
      sortBy: string = 'name',
      sortOrder: 'asc' | 'desc' = 'asc'
    ) => {
      try {
        setLoading(true);

        const params = new URLSearchParams({
          page: batch.toString(),
          limit: itemsPerBatch.toString(),
          search: search,
          sortBy: sortBy,
          sortOrder: sortOrder,
        });

        const response = await axios.get(`/api/members?${params}`);
        const result = response.data;

        if (result.success && result.data) {
          const newMembers = result.data.members || [];
          // Merge new members into allMembers, avoiding duplicates
          setAllMembers(prev => {
            const existingIds = new Set(prev.map(m => m._id));
            const uniqueNewMembers = newMembers.filter((m: Member) => !existingIds.has(m._id));
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
    [itemsPerBatch]
  );

  // Load initial batch on mount and when filters change
  useEffect(() => {
    setAllMembers([]);
    setLoadedBatches(new Set([1]));
    setCurrentPage(0);
    fetchMembers(1, searchTerm, sortOption, sortOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, sortOption, sortOrder]);

  // Fetch next batch when crossing batch boundaries
  useEffect(() => {
    if (loading) return;

    const currentBatch = calculateBatchNumber(currentPage);
    const isLastPageOfBatch = (currentPage + 1) % pagesPerBatch === 0;
    const nextBatch = currentBatch + 1;

    // Fetch next batch if we're on the last page of current batch and haven't loaded it yet
    if (isLastPageOfBatch && !loadedBatches.has(nextBatch)) {
      setLoadedBatches(prev => new Set([...prev, nextBatch]));
      fetchMembers(nextBatch, searchTerm, sortOption, sortOrder);
    }

    // Also ensure current batch is loaded
    if (!loadedBatches.has(currentBatch)) {
      setLoadedBatches(prev => new Set([...prev, currentBatch]));
      fetchMembers(currentBatch, searchTerm, sortOption, sortOrder);
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

  // Sort members (backend already sorts, but we keep this for consistency)
  const sortedMembers = useMemo(() => {
    const sorted = [...allMembers].sort((a, b) => {
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
  }, [allMembers, sortOption, sortOrder]);

  // Pagination
  const paginatedMembers = useMemo(() => {
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedMembers.slice(startIndex, endIndex);
  }, [sortedMembers, currentPage, itemsPerPage]);

  const handleMemberClick = (memberId: string) => {
    router.push(`/members/${memberId}`);
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


  const handleNewMember = () => {
    setIsNewMemberModalOpen(true);
  };

  const handleCloseNewMemberModal = () => {
    setIsNewMemberModalOpen(false);
  };

  const handleMemberCreated = () => {
    setAllMembers([]);
    setLoadedBatches(new Set([1]));
    setCurrentPage(0);
    fetchMembers(1, searchTerm, sortOption, sortOrder);
  };

  return (
    <>
      {/* Title Row */}
      <div className="mt-4 w-full max-w-full">
        {/* Mobile Layout - All on same line */}
        <div className="flex items-center gap-2 md:hidden">
          <h1 className="text-lg sm:text-xl font-bold text-gray-800 flex-1 min-w-0 truncate flex items-center gap-2">
            Members List
            <Image
              src={membersIcon}
              alt="Members Icon"
              width={32}
              height={32}
              className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
            />
          </h1>
          {/* Mobile: Refresh icon */}
          <button
            onClick={async () => {
              setRefreshing(true);
              await fetchMembers(1, searchTerm, sortOption, sortOrder);
              setAllMembers([]);
              setLoadedBatches(new Set([1]));
              setCurrentPage(0);
              setRefreshing(false);
            }}
            disabled={refreshing}
            className="p-1.5 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            aria-label="Refresh"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
          {/* Create icon */}
          <button
            onClick={handleNewMember}
            disabled={refreshing}
            className="p-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            aria-label="New Member"
          >
            <PlusCircle className="h-5 w-5 text-green-600 hover:text-green-700" />
          </button>
        </div>

        {/* Desktop Layout - Title on left, actions on right */}
        <div className="hidden md:flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center gap-2">
            Members List
            <Image
              src={membersIcon}
              alt="Members Icon"
              width={32}
              height={32}
              className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0"
            />
          </h1>
          {/* Desktop: Refresh icon and Create button onido far right */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          {/* Refresh icon */}
          <button
            onClick={async () => {
              setRefreshing(true);
              await fetchMembers(1, searchTerm, sortOption, sortOrder);
              setAllMembers([]);
              setLoadedBatches(new Set([1]));
              setCurrentPage(0);
              setRefreshing(false);
            }}
            disabled={refreshing}
            className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            aria-label="Refresh"
          >
            <RefreshCw
              className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
            {/* Create button */}
            <Button
              onClick={handleNewMember}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-md bg-button px-4 py-2 text-white hover:bg-buttonActive disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusCircle className="h-4 w-4" />
              New Member
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile: Search */}
      <div className="mt-4 flex flex-col gap-4 lg:hidden">
        <div className="relative w-full">
          <Input
            type="text"
            placeholder="Search members..."
            className="h-11 w-full rounded-full border border-gray-300 bg-white px-4 pr-10 text-base text-gray-700 placeholder-gray-400 shadow-sm focus:border-buttonActive focus:ring-buttonActive"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        </div>

        {/* Mobile: Sort controls */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Select
              value={sortOption}
              onValueChange={v => setSortOption(v as MemberSortOption)}
            >
              <SelectTrigger className="h-10 w-full">
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
            className="h-10 w-10 p-0"
            onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
            aria-label="Toggle sort order"
          >
            <ArrowUpDown className={`h-4 w-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </div>

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
      </div>

      {/* Content Section */}
      <div className="w-full flex-1">
        {loading ? (
          <>
            {/* Mobile: show 3 card skeletons */}
            <div className="block lg:hidden">
              <div className="grid grid-cols-1 gap-4">
                {[...Array(3)].map((_, i) => (
                  <MemberSkeleton key={i} />
                ))}
              </div>
            </div>
            {/* Desktop: show 1 table skeleton */}
            <div className="hidden lg:block">
              <MemberTableSkeleton />
            </div>
          </>
        ) : paginatedMembers.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-lg text-gray-500">No members found.</span>
          </div>
        ) : (
          <>
            {/* Mobile: show cards */}
            <div className="block lg:hidden">
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {paginatedMembers.map(member => (
                  <MemberCard
                    key={member._id}
                    member={member}
                    onMemberClick={handleMemberClick}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
            {/* Desktop: show table */}
            <div className="hidden lg:block">
              <MemberTable
                members={paginatedMembers}
                sortOption={sortOption}
                sortOrder={sortOrder}
                onSort={handleSort}
                onMemberClick={handleMemberClick}
                onAction={handleTableAction}
              />
            </div>
          </>
        )}
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
      <EditMemberModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        member={selectedMember._id ? (selectedMember as Member) : null}
        onMemberUpdated={fetchMembers}
      />
      <DeleteMemberModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        member={selectedMember._id ? (selectedMember as Member) : null}
        onDelete={fetchMembers}
      />
      <NewMemberModal
        isOpen={isNewMemberModalOpen}
        onClose={handleCloseNewMemberModal}
        onMemberCreated={handleMemberCreated}
      />

      <Toaster richColors />
    </>
  );
}
