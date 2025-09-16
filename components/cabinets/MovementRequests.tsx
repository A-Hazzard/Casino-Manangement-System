import React, { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import PaginationControls from "@/components/ui/PaginationControls";
import MovementRequestsTable from "@/components/ui/movements/MovementRequestsTable";
import MovementRequestCard from "@/components/ui/movements/MovementRequestCard";
import { MovementRequest } from "@/lib/types/movementRequests";
import { fetchMovementRequests } from "@/lib/helpers/movementRequests";
import {
  MovementRequestsTableSkeleton,
  MovementRequestCardSkeleton,
} from "@/components/ui/movements/MovementRequestsSkeleton";
import { fetchAllGamingLocations } from "@/lib/helpers/locations";
import { useMovementRequestActionsStore } from "@/lib/store/movementRequestActionsStore";
import EditMovementRequestModal from "@/components/ui/movements/EditMovementRequestModal";
import DeleteMovementRequestModal from "@/components/ui/movements/DeleteMovementRequestModal";
import NewMovementRequestModal from "@/components/ui/movements/NewMovementRequestModal";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const ITEMS_PER_PAGE = 10;

export default function MovementRequests({
  locations,
}: {
  locations: { _id: string; name: string }[];
}) {
  const [isNewMovementRequestModalOpen, setIsNewMovementRequestModalOpen] = useState(false);
  
  const openNewMovementRequestModal = () => setIsNewMovementRequestModalOpen(true);
  const closeNewMovementRequestModal = () => setIsNewMovementRequestModalOpen(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("all");
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
      allLocations.forEach((loc) => {
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

  const filteredRequests = requests.filter((req) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      req.createdBy.toLowerCase().includes(searchLower) ||
      req.locationFrom.toLowerCase().includes(searchLower) ||
      req.locationTo.toLowerCase().includes(searchLower) ||
      req.cabinetIn.toLowerCase().includes(searchLower) ||
      req.status.toLowerCase().includes(searchLower);
    const locationData = locations.find((l) => l._id === selectedLocation);
    const matchesLocation =
      selectedLocation === "all" ||
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
    <div className="w-full max-w-full flex flex-col p-1">
      <EditMovementRequestModal onSaved={loadRequests} />
      <DeleteMovementRequestModal onDeleted={loadRequests} />
      <NewMovementRequestModal
        isOpen={isNewMovementRequestModalOpen}
        onClose={closeNewMovementRequestModal}
        locations={locations}
        onSubmit={loadRequests}
      />

      {/* Mobile: Search and filters stacked */}
      <div className="lg:hidden flex flex-col gap-4 p-4 bg-buttonActive rounded-lg shadow-sm mb-4">
        {/* Mobile: Create Movement Request button */}
        <Button
          onClick={openNewMovementRequestModal}
          className="w-full bg-button hover:bg-buttonActive text-white py-3 rounded-lg flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          Create Movement Request
        </Button>
        <div className="relative w-full">
          <Input
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 bg-white border-none rounded-md h-11 px-4 text-gray-700 placeholder-gray-400"
          />
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        </div>
        <select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="w-full h-11 rounded-md border-none px-3 bg-white text-gray-700"
        >
          <option value="all">All Locations</option>
          {locations.map((location) => (
            <option key={location._id} value={location._id}>
              {location.name}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop: Search and filters in row */}
      <div className="hidden lg:flex flex-col md:flex-row gap-4 items-center p-4 bg-buttonActive rounded-t-lg shadow-sm">
        {/* Desktop: Create Movement Request button */}
        <Button
          onClick={openNewMovementRequestModal}
          className="bg-button hover:bg-buttonActive text-white px-4 py-2 rounded-md items-center gap-2 flex-shrink-0"
        >
          <div className="flex items-center justify-center w-6 h-6 border-2 border-white rounded-full">
            <Plus className="w-4 h-4 text-white" />
          </div>
          <span>Create Movement Request</span>
        </Button>
        <div className="relative w-full md:w-2/3">
          <Input
            placeholder="Search requests... (e.g., Creator, Location, Cabinet, Status)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 bg-white border-none rounded-md h-11 px-4 text-gray-700 placeholder-gray-400"
          />
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        </div>
        <select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="w-full md:w-1/3 h-11 rounded-md border-none px-3 bg-white text-gray-700"
        >
          <option value="all">All Locations</option>
          {locations.map((location) => (
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
      <div className="block lg:hidden mt-4 px-1 sm:px-2 md:px-4 space-y-3 sm:space-y-4 w-full max-w-full">
        {loading ? (
          <MovementRequestCardSkeleton />
        ) : paginatedRequests.length > 0 ? (
          paginatedRequests.map((req) => (
            <MovementRequestCard
              key={req._id}
              request={req}
              onEdit={handleEdit}
              onDelete={handleDelete}
              locationsMap={locationsMap}
            />
          ))
        ) : (
          <div className="text-center text-gray-500 py-8">
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
