import React, { useEffect, useState } from "react";
import { useMovementRequestActionsStore } from "@/lib/store/movementRequestActionsStore";
import { MovementRequest } from "@/lib/types/movementRequests";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Cross2Icon } from "@radix-ui/react-icons";
import { updateMovementRequest } from "@/lib/helpers/movementRequests";
import { fetchAllGamingLocations } from "@/lib/helpers/locations";
import { fetchCabinetsForLocation } from "@/lib/helpers/cabinets";
import type { Cabinet } from "@/lib/types/cabinets";
import axios from "axios";

export default function EditMovementRequestModal({
  onSaved,
}: {
  onSaved: () => void;
}) {
  const { isEditModalOpen, selectedMovementRequest, closeEditModal } =
    useMovementRequestActionsStore();

  // Form state
  const [formData, setFormData] = useState<MovementRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Data state
  const [locations, setLocations] = useState<{ id: string; name: string }[]>(
    []
  );
  const [users, setUsers] = useState<
    { _id: string; name: string; email: string }[]
  >([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [cabinetSearch, setCabinetSearch] = useState("");
  const [availableCabinets, setAvailableCabinets] = useState<Cabinet[]>([]);
  const [selectedCabinets, setSelectedCabinets] = useState<Cabinet[]>([]);
  const [cabinetDropdownOpen, setCabinetDropdownOpen] = useState(false);
  const [loadingCabinets, setLoadingCabinets] = useState(false);

  // Load initial data
  useEffect(() => {
    if (isEditModalOpen && selectedMovementRequest) {
      setFormData(selectedMovementRequest);

      // Parse cabinetIn string back to cabinet objects
      if (selectedMovementRequest.cabinetIn) {
        const cabinetIds = selectedMovementRequest.cabinetIn.split(",");
        // We'll need to fetch the actual cabinet objects
        // For now, create placeholder objects
        const placeholderCabinets = cabinetIds.map((id) => ({
          _id: id,
          serialNumber: id,
          assetNumber: id,
          relayId: id,
          locationId: selectedMovementRequest.locationId,
        })) as Cabinet[];
        setSelectedCabinets(placeholderCabinets);
      }
    }
  }, [isEditModalOpen, selectedMovementRequest]);

  // Fetch locations
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const locationsData = await fetchAllGamingLocations();
        setLocations(locationsData);
      } catch (error) {
        console.error("Failed to fetch locations:", error);
      }
    };
    fetchLocations();
  }, []);

  // Fetch users
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

  // Fetch cabinets when location changes
  useEffect(() => {
    if (formData?.locationFrom) {
      // Find the location ID from the location name
      const location = locations.find(loc => loc.name === formData.locationFrom);
      if (location) {
        const fetchCabinets = async () => {
          setLoadingCabinets(true);
          try {
            const cabinetsData = await fetchCabinetsForLocation(
              location.id,
              undefined,
              "All"
            );
            setCabinets(cabinetsData);
            setAvailableCabinets(cabinetsData);
          } catch (error) {
            console.error("Failed to fetch cabinets:", error);
            setCabinets([]);
            setAvailableCabinets([]);
          } finally {
            setLoadingCabinets(false);
          }
        };
        fetchCabinets();
      }
    } else {
      setCabinets([]);
      setAvailableCabinets([]);
    }
  }, [formData?.locationFrom, locations]);

  // Filter cabinets based on search
  useEffect(() => {
    if (cabinetSearch.trim()) {
      const filtered = cabinets.filter(
        (cab) =>
          !selectedCabinets.find((sc) => sc._id === cab._id) &&
          (cab.serialNumber
            ?.toLowerCase()
            .includes(cabinetSearch.toLowerCase()) ||
          cab.assetNumber
            ?.toLowerCase()
            .includes(cabinetSearch.toLowerCase()) ||
          cab.relayId?.toLowerCase().includes(cabinetSearch.toLowerCase()) ||
          cab.smbId?.toLowerCase().includes(cabinetSearch.toLowerCase()) ||
          cab.smibBoard?.toLowerCase().includes(cabinetSearch.toLowerCase()) ||
          cab.installedGame?.toLowerCase().includes(cabinetSearch.toLowerCase()) ||
          cab.game?.toLowerCase().includes(cabinetSearch.toLowerCase()))
      );
      setAvailableCabinets(filtered);
    } else {
      // Show all cabinets except already selected ones
      setAvailableCabinets(
        cabinets.filter(
          (cab) => !selectedCabinets.find((sc) => sc._id === cab._id)
        )
      );
    }
  }, [cabinetSearch, cabinets, selectedCabinets]);

  // Handle clicks outside cabinet dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".cabinet-dropdown-container")) {
        setCabinetDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isEditModalOpen || !formData) return null;

  const validate = () => {
    const errs: { [key: string]: string } = {};

    if (!formData.movementType) errs.movementType = "Movement type is required";
    if (!formData.locationFrom)
      errs.locationFrom = "Source location is required";
    if (!formData.locationTo)
      errs.locationTo = "Destination location is required";
    if (!formData.requestTo) errs.requestTo = "Request recipient is required";
    if (!selectedCabinets.length)
      errs.selectedCabinets = `${formData.movementType} selection is required`;

    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const updatedData = {
        ...formData,
        cabinetIn: selectedCabinets
          .map(
            (cab) =>
              cab.serialNumber || cab.assetNumber || cab.relayId || cab._id
          )
          .join(","),
        updatedAt: new Date(),
      };

      await updateMovementRequest(updatedData);
      onSaved();
      closeEditModal();
    } catch (error) {
      console.error("Failed to update movement request:", error);
      setErrors({ submit: "Failed to update movement request" });
    } finally {
      setLoading(false);
    }
  };

  const addCabinet = (cabinet: Cabinet) => {
    if (!selectedCabinets.find((cab) => cab._id === cabinet._id)) {
      setSelectedCabinets([...selectedCabinets, cabinet]);
    }
    setCabinetSearch("");
    setCabinetDropdownOpen(false);
  };

  const removeCabinet = (cabinetId: string) => {
    setSelectedCabinets(
      selectedCabinets.filter((cab) => cab._id !== cabinetId)
    );
  };

  return (
    <Dialog open={isEditModalOpen} onOpenChange={closeEditModal}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Edit Movement Request
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
                value={formData.movementType}
                onValueChange={(value) =>
                  setFormData((prev) =>
                    prev ? { ...prev, movementType: value } : null
                  )
                }
              >
                <SelectTrigger className="w-full border-gray-300 focus:ring-buttonActive focus:border-buttonActive">
                  <SelectValue placeholder="Select movement type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="machine">Machine</SelectItem>
                  <SelectItem value="smib">SMIB</SelectItem>
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
                value={formData.locationFrom}
                onValueChange={(value) => {
                  setFormData((prev) =>
                    prev ? { ...prev, locationFrom: value } : null
                  );
                  // Clear selected cabinets when location changes
                  setSelectedCabinets([]);
                  setCabinetSearch("");
                }}
              >
                <SelectTrigger className="w-full border-gray-300 focus:ring-buttonActive focus:border-buttonActive">
                  <SelectValue placeholder="Select source location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.name}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.locationFrom && (
                <div className="text-red-500 text-xs mt-1">
                  {errors.locationFrom}
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
                value={formData.locationTo}
                onValueChange={(value) =>
                  setFormData((prev) =>
                    prev ? { ...prev, locationTo: value } : null
                  )
                }
                disabled={!selectedCabinets.length}
              >
                <SelectTrigger className="w-full border-gray-300 focus:ring-buttonActive focus:border-buttonActive">
                  <SelectValue placeholder="Location Is It Going To" />
                </SelectTrigger>
                <SelectContent>
                  {locations
                    .filter((loc) => loc.name !== formData.locationFrom)
                    .map((loc) => (
                      <SelectItem key={loc.id} value={loc.name}>
                        {loc.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {errors.locationTo && (
                <div className="text-red-500 text-xs mt-1">
                  {errors.locationTo}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <Textarea
                value={formData.reason || ""}
                onChange={(e) =>
                  setFormData((prev) =>
                    prev ? { ...prev, reason: e.target.value } : null
                  )
                }
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
                value={formData.requestTo || undefined}
                onValueChange={(value) =>
                  setFormData((prev) =>
                    prev ? { ...prev, requestTo: value } : null
                  )
                }
                disabled={!formData.locationTo}
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
                Please Select a {formData.movementType} to be Moved{" "}
                <span className="text-red-500">*</span>
              </label>
              <div className="relative cabinet-dropdown-container">
                <Input
                  placeholder={`Select ${formData.movementType}`}
                  value={cabinetSearch}
                  onChange={(e) => {
                    setCabinetSearch(e.target.value);
                    setCabinetDropdownOpen(true);
                  }}
                  onFocus={() => setCabinetDropdownOpen(true)}
                  disabled={!formData.locationFrom}
                  className="border-gray-300 placeholder-gray-400 focus:ring-buttonActive focus:border-buttonActive"
                  autoComplete="off"
                />
                {cabinetDropdownOpen && formData.locationFrom && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                    {loadingCabinets ? (
                      <div className="px-4 py-2 text-sm text-gray-400 text-center">
                        Loading {formData.movementType.toLowerCase()}s...
                      </div>
                    ) : availableCabinets.length > 0 ? (
                      availableCabinets.map((cab) => {
                        const displayName =
                          cab.installedGame ||
                          cab.game ||
                          cab.assetNumber ||
                          cab.serialNumber ||
                          cab.relayId ||
                          "Unknown Machine";
                        const identifier =
                          cab.serialNumber ||
                          cab.assetNumber ||
                          cab.smibBoard ||
                          cab.relayId ||
                          cab._id;

                        return (
                          <button
                            key={cab._id}
                            type="button"
                            className="w-full text-left px-4 py-2 hover:bg-blue-100 text-gray-900 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => addCabinet(cab)}
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
                              <span className="text-blue-600 text-sm">+</span>
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-4 py-2 text-sm text-gray-400 text-center">
                        {cabinetSearch
                          ? `No ${formData.movementType.toLowerCase()}s match your search.`
                          : `No ${formData.movementType.toLowerCase()}s available at this location.`}
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
                Selected {formData.movementType}s ({selectedCabinets.length})
              </label>
              <div className="border rounded-md p-3 h-40 overflow-y-auto bg-gray-50 min-h-[60px]">
                {selectedCabinets.length > 0 ? (
                  selectedCabinets.map((cab) => {
                    const displayName =
                      cab.installedGame ||
                      cab.game ||
                      cab.assetNumber ||
                      cab.serialNumber ||
                      cab.relayId ||
                      "Unknown Machine";
                    return (
                      <div
                        key={cab._id}
                        className="flex items-center justify-between bg-white p-2 rounded border mb-2 last:mb-0"
                      >
                        <div>
                          <div className="font-medium text-sm">
                            {displayName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {cab.serialNumber && cab.serialNumber !== displayName && (
                              <>Serial: {cab.serialNumber}</>
                            )}
                            {cab.assetNumber && cab.assetNumber !== displayName && (
                              <>Asset: {cab.assetNumber}</>
                            )}
                            {cab.relayId && cab.relayId !== displayName && (
                              <>Relay: {cab.relayId}</>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCabinet(cab._id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Cross2Icon className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-400 text-center py-2">
                    No {formData.movementType.toLowerCase()}s selected.
                  </p>
                )}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData((prev) =>
                    prev
                      ? {
                          ...prev,
                          status: value as
                            | "pending"
                            | "approved"
                            | "rejected"
                            | "in progress",
                        }
                      : null
                  )
                }
              >
                <SelectTrigger className="w-full border-gray-300 focus:ring-buttonActive focus:border-buttonActive">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="in progress">In Progress</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 border-t border-gray-200 flex justify-end gap-2">
          {errors.submit && (
            <div className="text-red-500 text-xs mr-4 self-center">
              {errors.submit}
            </div>
          )}
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white font-bold uppercase"
          >
            {loading ? "Updating..." : "UPDATE MOVEMENT REQUEST"}
          </Button>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
