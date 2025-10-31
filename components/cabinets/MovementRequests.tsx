import React, { useEffect, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import PaginationControls from '@/components/ui/PaginationControls';
import MovementRequestsTable from '@/components/ui/movements/MovementRequestsTable';
import MovementRequestCard from '@/components/ui/movements/MovementRequestCard';
import { MovementRequest } from '@/lib/types/movementRequests';
import { fetchMovementRequests } from '@/lib/helpers/movementRequests';
import {
  MovementRequestsTableSkeleton,
  MovementRequestCardSkeleton,
} from '@/components/ui/movements/MovementRequestsSkeleton';
import { fetchAllGamingLocations } from '@/lib/helpers/locations';
import { useMovementRequestActionsStore } from '@/lib/store/movementRequestActionsStore';
import EditMovementRequestModal from '@/components/ui/movements/EditMovementRequestModal';
import DeleteMovementRequestModal from '@/components/ui/movements/DeleteMovementRequestModal';
import NewMovementRequestModal from '@/components/ui/movements/NewMovementRequestModal';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ITEMS_PER_PAGE = 10;

export default function MovementRequests({
  locations,
  refreshTrigger = 0,
}: {
  locations: { _id: string; name: string }[];
  refreshTrigger?: number;
}) {
  const [isNewMovementRequestModalOpen, setIsNewMovementRequestModalOpen] =
    useState(false);

  const openNewMovementRequestModal = () =>
    setIsNewMovementRequestModalOpen(true);
  const closeNewMovementRequestModal = () =>
    setIsNewMovementRequestModalOpen(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
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
    const locationData = locations.find(l => l._id === selectedLocation);
    const matchesLocation =
      selectedLocation === 'all' ||
      req.locationFrom === locationData?.name ||
      req.locationTo === locationData?.name;
    return matchesSearch && matchesLocation;
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
      <NewMovementRequestModal
        isOpen={isNewMovementRequestModalOpen}
        onClose={closeNewMovementRequestModal}
        locations={locations}
        onSubmit={loadRequests}
      />

      {/* Mobile: Search and filters stacked */}
      <div className="mb-4 flex flex-col gap-4 rounded-lg bg-buttonActive p-4 shadow-sm lg:hidden">
        <div className="relative w-full">
          <Input
            placeholder="Search requests..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="h-11 w-full rounded-md border-none bg-white px-4 pr-10 text-gray-700 placeholder-gray-400"
          />
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        </div>
        <select
          value={selectedLocation}
          onChange={e => setSelectedLocation(e.target.value)}
          className="h-11 w-full rounded-md border-none bg-white px-3 text-gray-700"
        >
          <option value="all">All Locations</option>
          {locations.map(location => (
            <option key={location._id} value={location._id}>
              {location.name}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop: Search and filters in row */}
      <div className="hidden flex-col items-center gap-4 rounded-t-lg bg-buttonActive p-4 shadow-sm md:flex-row lg:flex">
        <div className="relative w-full md:w-2/3">
          <Input
            placeholder="Search requests... (e.g., Creator, Location, Cabinet, Status)"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="h-11 w-full rounded-md border-none bg-white px-4 pr-10 text-gray-700 placeholder-gray-400"
          />
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        </div>
        <select
          value={selectedLocation}
          onChange={e => setSelectedLocation(e.target.value)}
          className="h-11 w-full rounded-md border-none bg-white px-3 text-gray-700 md:w-1/3"
        >
          <option value="all">All Locations</option>
          {locations.map(location => (
            <option key={location._id} value={location._id}>
              {location.name}
            </option>
          ))}
        </select>
      </div>
      {/* Table Area (Desktop) */}
      <div className="hidden lg:block">
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
      <div className="mt-4 block w-full max-w-full space-y-3 px-1 sm:space-y-4 sm:px-2 md:px-4 lg:hidden">
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
          <div className="py-8 text-center text-gray-500">
            No movement requests found matching your criteria.
          </div>
        )}
      </div>
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-4">
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
