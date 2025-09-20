import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Chip from "@/components/ui/common/Chip";
import { PlusCircledIcon } from "@radix-ui/react-icons";
import { fetchAllGamingLocations } from "@/lib/helpers/locations";
import { fetchCabinetsForLocation } from "@/lib/helpers/cabinets";
import { createMovementRequest } from "@/lib/helpers/movementRequests";
import type { MovementRequest } from "@/lib/types/movementRequests";
import type { Cabinet } from "@/lib/types/cabinets";
import type { NewMovementModalProps } from "@/lib/types/components";
import type { MachineMovementRecord } from "@/lib/types/reports";
import { generateMongoId } from "@/lib/utils/id";
import { useUserStore } from "@/lib/store/userStore";
import axios from "axios";

const NewMovementRequestModal: React.FC<NewMovementModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onRefresh,
  locations: propLocations,
}) => {
  const [locations, setLocations] = useState<{ id: string; name: string }[]>(
    []
  );
  const [users, setUsers] = useState<
    { _id: string; name: string; email: string }[]
  >([]);
  const [movementType, setMovementType] = useState<"Machine" | "SMIB">(
    "Machine"
  );
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [cabinetSearch, setCabinetSearch] = useState("");
  const [availableCabinets, setAvailableCabinets] = useState<Cabinet[]>([]);
  const [selectedCabinets, setSelectedCabinets] = useState<Cabinet[]>([]);
  const [cabinetDropdownOpen, setCabinetDropdownOpen] = useState(false);
  const [loadingCabinets, setLoadingCabinets] = useState(false);
  const [requestTo, setRequestTo] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);

  // Get current user from store
  const { user: currentUser } = useUserStore();

  // Use prop locations or fetch if not provided
  useEffect(() => {
    if (propLocations && propLocations.length > 0) {
      // Convert prop locations to the expected format
      const formattedLocations = propLocations.map((loc) => ({
        id: loc._id,
        name: loc.name,
      }));
      setLocations(formattedLocations);
    } else {
      // Fallback to fetching locations if not provided
      fetchAllGamingLocations().then(setLocations);
    }
  }, [propLocations]);

  // Fetch users for email dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get("/api/users");
        if (response.data.users) {
          setUsers(response.data.users);
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };
    fetchUsers();
  }, []);

  // Close cabinet dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".cabinet-dropdown-container")) {
        setCabinetDropdownOpen(false);
      }
    };

    if (cabinetDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }

    return undefined;
  }, [cabinetDropdownOpen]);

  // Fetch cabinets for selected from location
  useEffect(() => {
    if (fromLocation) {
      setLoadingCabinets(true);
      // Use "All" as the default timePeriod to get all available machines
      fetchCabinetsForLocation(fromLocation, undefined, "All")
        .then((cabs) => {
          setCabinets(cabs);
          setAvailableCabinets(cabs);
          setSelectedCabinets([]);
        })
        .catch((error) => {
          console.error("Failed to fetch cabinets for location:", error);
          setCabinets([]);
          setAvailableCabinets([]);
          setSelectedCabinets([]);
          // Show user-friendly error if needed
          setErrors((prev) => ({
            ...prev,
            fromLocation: "Failed to load machines for this location",
          }));
        })
        .finally(() => {
          setLoadingCabinets(false);
        });
    } else {
      setCabinets([]);
      setAvailableCabinets([]);
      setSelectedCabinets([]);
      setLoadingCabinets(false);
    }
    setCabinetSearch("");
  }, [fromLocation]);

  // Filter available cabinets by search
  useEffect(() => {
    if (!fromLocation) {
      setAvailableCabinets([]);
      return;
    }
    const searchLower = cabinetSearch.toLowerCase();
    setAvailableCabinets(
      cabinets.filter(
        (cab) =>
          !selectedCabinets.find((sc) => sc._id === cab._id) &&
          (cab.assetNumber?.toLowerCase().includes(searchLower) ||
            cab.serialNumber?.toLowerCase().includes(searchLower) ||
            cab.smbId?.toLowerCase().includes(searchLower) ||
            cab.smibBoard?.toLowerCase().includes(searchLower) ||
            cab.relayId?.toLowerCase().includes(searchLower) ||
            cab.installedGame?.toLowerCase().includes(searchLower) ||
            cab.game?.toLowerCase().includes(searchLower))
      )
    );
  }, [cabinetSearch, cabinets, selectedCabinets, fromLocation]);

  // Validation
  const validate = () => {
    const errs: { [key: string]: string } = {};
    if (!movementType) errs.movementType = "Movement type is required.";
    if (!fromLocation) errs.fromLocation = "From location is required.";
    if (!selectedCabinets.length)
      errs.selectedCabinets = `Select at least one ${movementType.toLowerCase()}.`;
    if (!toLocation) errs.toLocation = "Destination location is required.";
    if (toLocation && toLocation === fromLocation)
      errs.toLocation = "Destination must be different from source.";
    if (!requestTo) errs.requestTo = "Recipient user is required.";
    return errs;
  };

  const handleSelectCabinet = (cabinet: Cabinet) => {
    setSelectedCabinets((prev) => [...prev, cabinet]);
    setCabinetSearch("");
    setCabinetDropdownOpen(false);
  };
  const handleRemoveCabinet = (cabinetId: string) => {
    setSelectedCabinets((prev) => prev.filter((cab) => cab._id !== cabinetId));
  };

  const handleSubmit = async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSubmitting(true);
    try {
      // Get current logged-in user from store
      const createdBy = currentUser?.emailAddress || "unknown";

      // Get location names for the payload
      const fromLocationName =
        locations.find((loc) => loc.id === fromLocation)?.name || fromLocation;
      const toLocationName =
        locations.find((loc) => loc.id === toLocation)?.name || toLocation;

      // Generate a proper MongoDB ObjectId-style hex string for the movement request
      const movementRequestId = await generateMongoId();

      // Compose the request payload with all required fields
      const payload: Partial<MovementRequest> = {
        // Generate a unique ID for the movement request
        _id: movementRequestId,

        // Financial fields (set to 0 for movement requests)
        variance: 0,
        previousBalance: 0,
        currentBalance: 0,
        amountToCollect: 0,
        amountCollected: 0,
        amountUncollected: 0,
        partnerProfit: 0,
        taxes: 0,
        advance: 0,

        // Location fields
        locationName: fromLocationName,
        locationFrom: fromLocationName,
        locationTo: toLocationName,
        locationId: fromLocation,

        // Request details
        requestTo,
        reason: notes,
        cabinetIn: selectedCabinets
          .map(
            (cab) =>
              cab.serialNumber || cab.assetNumber || cab.relayId || cab._id
          )
          .join(","),
        status: "pending",
        createdBy: createdBy,
        movementType: movementType.toLowerCase(),
        installationType: "move",
        timestamp: new Date(),

        // Timestamp fields
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const createdRequest = await createMovementRequest(
        payload as MovementRequest
      );

      // Call the onSubmit callback if provided
      if (onSubmit) {
        // Convert MovementRequest to MachineMovementRecord format
        const machineMovementRecord: MachineMovementRecord = {
          _id: createdRequest._id,
          machineId: selectedCabinets[0]?._id || "",
          machineName: selectedCabinets[0]?.installedGame || selectedCabinets[0]?.game || "Unknown Machine",
          fromLocationId: fromLocation,
          fromLocationName: fromLocationName,
          toLocationId: toLocation,
          toLocationName: toLocationName,
          moveDate: new Date(),
          reason: notes,
          status: "pending",
          movedBy: createdBy,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        onSubmit(machineMovementRecord);
      }

      // Call the onRefresh callback if provided
      if (onRefresh) {
        onRefresh();
      }

      onClose();
    } catch (error) {
      console.error("Movement request creation error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to create movement request.";
      setErrors({ submit: errorMessage });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-white">
        <DialogHeader className="p-6 border-b border-gray-200">
          <DialogTitle className="text-2xl font-bold text-gray-800">
            New Movement Request
          </DialogTitle>
        </DialogHeader>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
          {/* Left Column */}
          <div className="flex flex-col gap-4">
            {/* Movement Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Please Select Movement Type{" "}
                <span className="text-red-500">*</span>
              </label>
              <Select
                value={movementType}
                onValueChange={(value: "Machine" | "SMIB") =>
                  setMovementType(value)
                }
              >
                <SelectTrigger className="w-full border-gray-300 focus:ring-buttonActive focus:border-buttonActive">
                  <SelectValue placeholder="Select movement type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Machine">Machine</SelectItem>
                  <SelectItem value="SMIB">SMIB</SelectItem>
                </SelectContent>
              </Select>
              {errors.movementType && (
                <div className="text-red-500 text-xs mt-1">
                  {errors.movementType}
                </div>
              )}
            </div>

            {/* From Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Please Select Location It Is Coming From{" "}
                <span className="text-red-500">*</span>
              </label>
              <Select
                value={fromLocation || undefined}
                onValueChange={setFromLocation}
              >
                <SelectTrigger className="w-full border-gray-300 focus:ring-buttonActive focus:border-buttonActive">
                  <SelectValue placeholder="Select source location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.fromLocation && (
                <div className="text-red-500 text-xs mt-1">
                  {errors.fromLocation}
                </div>
              )}
            </div>

            {/* To Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Please Select Location It Is Going To{" "}
                <span className="text-red-500">*</span>
              </label>
              <Select
                value={toLocation || undefined}
                onValueChange={setToLocation}
                disabled={!selectedCabinets.length}
              >
                <SelectTrigger className="w-full border-gray-300 focus:ring-buttonActive focus:border-buttonActive">
                  <SelectValue placeholder="Location Is It Going To" />
                </SelectTrigger>
                <SelectContent>
                  {locations
                    .filter((loc) => loc.id !== fromLocation)
                    .map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {errors.toLocation && (
                <div className="text-red-500 text-xs mt-1">
                  {errors.toLocation}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="border-gray-300 placeholder-gray-400 focus:ring-buttonActive focus:border-buttonActive"
                placeholder="Please Enter Notes"
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-4">
            {/* Request To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Request To: <span className="text-red-500">*</span>
              </label>
              <Select
                value={requestTo || undefined}
                onValueChange={setRequestTo}
                disabled={!toLocation}
              >
                <SelectTrigger className="w-full border-gray-300 focus:ring-buttonActive focus:border-buttonActive">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter((user) => user.email && user.email.trim() !== "")
                    .map((user) => (
                      <SelectItem key={user._id} value={user.email}>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {user.name || user.email}
                          </span>
                          <span className="text-xs text-gray-500">
                            {user.email}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {errors.requestTo && (
                <div className="text-red-500 text-xs mt-1">
                  {errors.requestTo}
                </div>
              )}
            </div>

            {/* Cabinet/SMIB Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Please Select a {movementType} to be Moved{" "}
                <span className="text-red-500">*</span>
              </label>
              <div className="relative cabinet-dropdown-container">
                <Input
                  placeholder={`Select ${movementType}`}
                  value={cabinetSearch}
                  onChange={(e) => {
                    setCabinetSearch(e.target.value);
                    setCabinetDropdownOpen(true);
                  }}
                  onFocus={() => setCabinetDropdownOpen(true)}
                  disabled={!fromLocation}
                  className="border-gray-300 placeholder-gray-400 focus:ring-buttonActive focus:border-buttonActive"
                  autoComplete="off"
                />
                {/* Dropdown of filtered cabinets */}
                {cabinetDropdownOpen && fromLocation && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                    {loadingCabinets ? (
                      <div className="px-4 py-2 text-sm text-gray-400 text-center">
                        Loading {movementType.toLowerCase()}s...
                      </div>
                    ) : availableCabinets.length > 0 ? (
                      availableCabinets.map((cab) => {
                        const displayName =
                          cab.installedGame ||
                          cab.game ||
                          cab.assetNumber ||
                          ((cab as Record<string, unknown>)
                            .serialNumber as string) ||
                          ((cab as Record<string, unknown>)
                            .origSerialNumber as string) ||
                          "Unknown Machine";
                        const identifier =
                          ((cab as Record<string, unknown>)
                            .serialNumber as string) ||
                          ((cab as Record<string, unknown>)
                            .origSerialNumber as string) ||
                          cab.assetNumber ||
                          cab.smibBoard ||
                          cab.relayId ||
                          cab._id;

                        return (
                          <button
                            key={cab._id}
                            type="button"
                            className="w-full text-left px-4 py-2 hover:bg-blue-100 text-gray-900 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => handleSelectCabinet(cab)}
                            disabled={selectedCabinets.some(
                              (sc) => sc._id === cab._id
                            )}
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {displayName}
                              </span>
                              <span className="text-xs text-gray-500">
                                {identifier}
                              </span>
                            </div>
                            {!selectedCabinets.some(
                              (sc) => sc._id === cab._id
                            ) && (
                              <PlusCircledIcon className="w-4 h-4 text-button flex-shrink-0 ml-2" />
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-4 py-2 text-sm text-gray-400 text-center">
                        {cabinetSearch
                          ? `No ${movementType.toLowerCase()}s match your search.`
                          : `No ${movementType.toLowerCase()}s available at this location.`}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {errors.selectedCabinets && (
                <div className="text-red-500 text-xs mt-1">
                  {errors.selectedCabinets}
                </div>
              )}
            </div>

            {/* Selected Items */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Selected {movementType}s ({selectedCabinets.length})
              </label>
              <div className="border rounded-md p-3 h-40 overflow-y-auto bg-gray-50 min-h-[60px]">
                {selectedCabinets.length > 0 ? (
                  selectedCabinets.map((cab) => {
                    const displayName =
                      cab.installedGame ||
                      cab.game ||
                      cab.assetNumber ||
                      ((cab as Record<string, unknown>)
                        .serialNumber as string) ||
                      ((cab as Record<string, unknown>)
                        .origSerialNumber as string) ||
                      "Unknown Machine";
                    return (
                      <Chip
                        key={cab._id}
                        label={displayName}
                        onRemove={() => handleRemoveCabinet(cab._id)}
                        className="bg-buttonActive text-white"
                      />
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-400 text-center py-2">
                    No {movementType.toLowerCase()}s selected.
                  </p>
                )}
              </div>
            </div>

            {/* SMIB Machine Selection (conditional) */}
            {movementType === "SMIB" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Please Select Cabinet Is Coming To{" "}
                  <span className="text-red-500">*</span>
                </label>
                <Select value="" onValueChange={() => {}}>
                  <SelectTrigger className="w-full border-blue-300 focus:ring-buttonActive focus:border-buttonActive">
                    <SelectValue placeholder="Cabinet Is Coming To" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="placeholder">
                      Select destination cabinet
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="p-6 border-t border-gray-200 flex justify-end gap-2">
          {errors.submit && (
            <div className="text-red-500 text-xs mr-4 self-center">
              {errors.submit}
            </div>
          )}
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-green-600 hover:bg-green-700 text-white font-bold uppercase"
          >
            {submitting ? "Submitting..." : "CREATE MOVEMENT REQUEST"}
          </Button>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewMovementRequestModal;
