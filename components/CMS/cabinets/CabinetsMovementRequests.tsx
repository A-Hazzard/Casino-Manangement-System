/**
 * Cabinets Movement Requests Component
 *
 * Handles the display and management of cabinet movement requests.
 * Features both desktop table view and mobile card view.
 *
 * @module components/cabinets/CabinetsMovementRequests
 */

import { Button } from '@/components/shared/ui/button';
import MultiSelectDropdown from '@/components/shared/ui/common/MultiSelectDropdown';
import { Input } from '@/components/shared/ui/input';
import DeleteMovementRequestModal from '@/components/shared/ui/movements/DeleteMovementRequestModal';
import EditMovementRequestModal from '@/components/shared/ui/movements/EditMovementRequestModal';
import MovementRequestCard from '@/components/shared/ui/movements/MovementRequestCard';
import {
    MovementRequestCardSkeleton,
    MovementRequestsTableSkeleton,
} from '@/components/shared/ui/movements/MovementRequestsSkeleton';
import MovementRequestsTable from '@/components/shared/ui/movements/MovementRequestsTable';
import PaginationControls from '@/components/shared/ui/PaginationControls';
import { fetchAllGamingLocations } from '@/lib/helpers/locations';
import { fetchMovementRequests } from '@/lib/helpers/movementRequests';
import { useMovementRequestActionsStore } from '@/lib/store/movementRequestActionsStore';
import { MovementRequest } from '@/lib/types/movement';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { useCallback, useEffect, useState } from 'react';

const ITEMS_PER_PAGE = 10;

type CabinetsMovementRequestsProps = {
  locations: { _id: string; name: string }[];
  refreshTrigger?: number;
};

export default function CabinetsMovementRequests({
  locations,
  refreshTrigger = 0,
}: CabinetsMovementRequestsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [currentPage, setCurrentPage] = useState(0);
  const [requests, setRequests] = useState<MovementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationsMap, setLocationsMap] = useState<{ [id: string]: string }>(
    {}
  );
  const { openEditModal, openDeleteModal } = useMovementRequestActionsStore();

  // Fetch all locations and build a map for lookups
  useEffect(() => {
    async function loadLocationsMap() {
      const allLocations = await fetchAllGamingLocations();
      const map: { [id: string]: string } = {};
      allLocations.forEach(loc => {
        map[loc.id] = loc.name;
      });
      setLocationsMap(map);
    }
    loadLocationsMap();
  }, []);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMovementRequests();
      setRequests(data);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Refresh when trigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      loadRequests();
    }
  }, [refreshTrigger, loadRequests]);

  const filteredRequests = requests.filter(req => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      req.createdBy.toLowerCase().includes(searchLower) ||
      req.locationFrom.toLowerCase().includes(searchLower) ||
      req.locationTo.toLowerCase().includes(searchLower) ||
      req.cabinetIn.toLowerCase().includes(searchLower) ||
      req.status.toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    
    const matchesLocation =
      selectedLocations.length === 0 ||
      selectedLocations.some(locId => {
        const locationData = locations.find(l => l._id === locId);
        return req.locationFrom === locationData?.name || req.locationTo === locationData?.name;
      });
      
    return matchesSearch && matchesStatus && matchesLocation;
  });

  const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);
  const paginatedRequests = filteredRequests.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  const handleEdit = (req: MovementRequest) => {
    openEditModal(req);
  };
  const handleDelete = (req: MovementRequest) => {
    openDeleteModal(req);
  };

  return (
    <div className="flex w-full max-w-full flex-col p-1">
      <EditMovementRequestModal onSaved={loadRequests} />
      <DeleteMovementRequestModal onDeleted={loadRequests} />

      {/* Control Bar: Search and Filters */}
      <div className="mb-6 flex flex-col gap-4 rounded-xl bg-buttonActive p-5 shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Input
              placeholder="Search by creator, machine, location, or status..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="h-12 w-full border-none bg-white/95 px-5 pr-12 text-sm text-gray-800 shadow-inner focus:ring-2 focus:ring-white/20"
            />
            <MagnifyingGlassIcon className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          </div>

          {/* Location Filter */}
          <div className="w-full lg:w-64 relative z-50">
            <MultiSelectDropdown
              options={locations.map(loc => ({ id: loc._id, label: loc.name }))}
              selectedIds={selectedLocations}
              onChange={setSelectedLocations}
              placeholder="All Locations"
              searchPlaceholder="Search locations..."
            />
          </div>
        </div>

        {/* Status Filtering Buttons */}
        <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
          <span className="mr-2 text-xs font-bold uppercase tracking-wider text-white/70">Filter Status:</span>
          <Button
            variant={statusFilter === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('all')}
            className={`h-8 rounded-full px-4 text-xs font-bold transition-all ${
              statusFilter === 'all' 
                ? 'bg-white text-buttonActive shadow-md' 
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            ALL
          </Button>
          <Button
            variant={statusFilter === 'pending' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('pending')}
            className={`h-8 rounded-full px-4 text-xs font-bold transition-all ${
              statusFilter === 'pending' 
                ? 'bg-amber-400 text-amber-950 shadow-md ring-2 ring-amber-200' 
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            PENDING
          </Button>
          <Button
            variant={statusFilter === 'completed' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('completed')}
            className={`h-8 rounded-full px-4 text-xs font-bold transition-all ${
              statusFilter === 'completed' 
                ? 'bg-emerald-400 text-emerald-950 shadow-md ring-2 ring-emerald-200' 
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            COMPLETED
          </Button>
          
          <div className="ml-auto text-xs font-medium text-white/80">
            Showing {filteredRequests.length} movement requests
          </div>
        </div>
      </div>

      {/* Table Area (Desktop) */}
      <div className="hidden lg:block overflow-hidden rounded-lg">
        {loading ? (
          <MovementRequestsTableSkeleton />
        ) : (
          <MovementRequestsTable
            requests={paginatedRequests}
            onEdit={handleEdit}
            onDelete={handleDelete}
            locationsMap={locationsMap}
          />
        )}
      </div>

      {/* Card Area (Mobile/Tablet) */}
      <div className="block w-full max-w-full space-y-4 lg:hidden">
        {loading ? (
          <MovementRequestCardSkeleton />
        ) : paginatedRequests.length > 0 ? (
          paginatedRequests.map(req => (
            <MovementRequestCard
              key={req._id}
              request={req}
              onEdit={handleEdit}
              onDelete={handleDelete}
              locationsMap={locationsMap}
            />
          ))
        ) : (
          <div className="rounded-lg border-2 border-dashed border-gray-200 py-12 text-center text-gray-500">
            <p className="mb-1 font-semibold text-gray-600">No requests found</p>
            <p className="text-sm">Try adjusting your filters or search term.</p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center pb-4">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            setCurrentPage={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
