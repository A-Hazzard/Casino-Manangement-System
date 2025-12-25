/**
 * Members Summary Tab Component
 *
 * Provides a comprehensive overview of member activity, demographics, and trends.
 *
 * @module components/members/tabs/MembersSummaryTab
 */

'use client';

import { useMembersSummaryData } from '@/lib/hooks/members/useMembersSummaryData';
import MembersKPICards from '../summary/MembersKPICards';
import MembersKPICardsSkeleton from '../summary/MembersKPICardsSkeleton';
import MembersTable from '../summary/MembersTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PaginationControls from '@/components/ui/PaginationControls';
import LocationSingleSelect from '@/components/ui/common/LocationSingleSelect';
import { useDebounce } from '@/lib/utils/hooks';
import { Download, RefreshCw } from 'lucide-react';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import axios from 'axios';

type MembersSummaryTabProps = {
  selectedLicencee: string;
  forcedLocationId?: string;
};

export default function MembersSummaryTab({
  selectedLicencee,
  forcedLocationId,
}: MembersSummaryTabProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [locationFilter, setLocationFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(0);
  const [locations, setLocations] = useState<
    Array<{ id: string; name: string }>
  >([]);

  const itemsPerPage = 50;

  const {
    isLoading,
    summaryData,
    refreshData,
  } = useMembersSummaryData({
    selectedLicencee,
    search: debouncedSearchTerm,
    locationFilter: forcedLocationId || locationFilter,
    page: currentPage + 1,
    limit: itemsPerPage,
  });

  // Fetch locations for the filter dropdown (membership-enabled only)
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await axios.get(
          '/api/machines/locations?membershipOnly=true'
        );
        const data = response.data;
        if (data.locations && Array.isArray(data.locations)) {
          setLocations(
            data.locations.map((loc: { _id: string; name: string }) => ({
              id: loc._id,
              name: loc.name,
            }))
          );
        }
      } catch (error) {
        console.error('Error fetching locations:', error);
      }
    };

    if (!forcedLocationId) {
      fetchLocations();
    }
  }, [forcedLocationId]);

  const handleRefresh = () => {
    void refreshData();
  };

  const handleViewMember = (member: { _id: string }) => {
    router.push(`/members/${member._id}`);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Reset to first page when search or location filter changes
  useEffect(() => {
    setCurrentPage(0);
  }, [debouncedSearchTerm, locationFilter]);

  const totalPages =
    summaryData?.pagination?.totalPages || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Members Summary</h2>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => {}} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Export Report
          </Button>
        </div>
      </div>

      {isLoading ? (
        <MembersKPICardsSkeleton />
      ) : (
        <MembersKPICards summaryStats={summaryData?.stats || null} />
      )}

      {/* Mobile: Search */}
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
        {!forcedLocationId && locations.length > 0 && (
          <LocationSingleSelect
            locations={locations}
            selectedLocation={locationFilter}
            onSelectionChange={setLocationFilter}
            includeAllOption={true}
            allOptionLabel="All Locations"
            showSasBadge={false}
            showFilterIcon={true}
            className="w-auto"
          />
        )}
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
        {!forcedLocationId && locations.length > 0 && (
          <LocationSingleSelect
            locations={locations}
            selectedLocation={locationFilter}
            onSelectionChange={setLocationFilter}
            includeAllOption={true}
            allOptionLabel="All Locations"
            showSasBadge={false}
            showFilterIcon={true}
            className="w-auto"
          />
        )}
      </div>

      <MembersTable
        members={summaryData?.members || []}
        loading={isLoading}
        sortBy="fullName"
        sortOrder="asc"
        onSort={() => {}}
        onViewMember={handleViewMember}
        forcedLocationId={forcedLocationId}
      />

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            setCurrentPage={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}
