import React, { useEffect, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import PaginationControls from '@/components/ui/PaginationControls';
import MovementRequestsTable from '@/components/ui/movements/MovementRequestsTable';
import MovementRequestCard from '@/components/ui/movements/MovementRequestCard';
import { MovementRequest } from '@/lib/types/movementRequests';
import {
  fetchMovementRequests,
  filterMovementRequests,
  paginateMovementRequests,
} from '@/lib/helpers/movementRequests';
import {
  MovementRequestsTableSkeleton,
  MovementRequestCardSkeleton,
} from '@/components/ui/movements/MovementRequestsSkeleton';
import { fetchAllGamingLocations } from '@/lib/helpers/locations';
import { useMovementRequestActionsStore } from '@/lib/store/movementRequestActionsStore';
import EditMovementRequestModal from '@/components/ui/movements/EditMovementRequestModal';
import DeleteMovementRequestModal from '@/components/ui/movements/DeleteMovementRequestModal';
import { useDashBoardStore } from '@/lib/store/dashboardStore';

const ITEMS_PER_PAGE = 10;

export default function MovementRequests({
  locations,
}: {
  locations: { _id: string; name: string }[];
}) {
  const { selectedLicencee } = useDashBoardStore();

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
      const allLocations = await fetchAllGamingLocations(selectedLicencee);
      const map: { [id: string]: string } = {};
      allLocations.forEach(loc => {
        map[loc.id] = loc.name;
      });
      setLocationsMap(map);
    }
    loadLocationsMap();
  }, [selectedLicencee]);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMovementRequests(selectedLicencee);
      setRequests(data);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [selectedLicencee]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const filteredRequests = filterMovementRequests(
    requests,
    searchTerm,
    selectedLocation,
    locations
  );
  const { paginatedRequests, totalPages } = paginateMovementRequests(
    filteredRequests,
    currentPage,
    ITEMS_PER_PAGE
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
      <div className="flex flex-col items-center gap-4 rounded-t-lg bg-buttonActive p-4 shadow-sm md:flex-row">
        <div className="relative w-full md:w-2/3">
          <Input
            placeholder="Search requests... (e.g., Creator, Location, Cabinet, Status)"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="h-11 w-full rounded-md border-none bg-white px-4 pr-10 text-gray-700 placeholder-gray-400 focus:ring-1 focus:ring-white focus:ring-offset-2 focus:ring-offset-buttonActive"
          />
        </div>
        <div className="relative w-full md:w-1/3">
          <select
            value={selectedLocation}
            onChange={e => setSelectedLocation(e.target.value)}
            className="h-11 w-full appearance-none rounded-md border-none bg-white px-3 pr-8 text-gray-700 focus:ring-1 focus:ring-white focus:ring-offset-2 focus:ring-offset-buttonActive"
          >
            <option value="all">All Locations</option>
            {locations.map(loc => (
              <option key={loc._id} value={loc._id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>
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
