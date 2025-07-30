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
import Chip from "@/components/ui/common/Chip";
import { PlusCircledIcon } from "@radix-ui/react-icons";
import { fetchAllGamingLocations } from "@/lib/helpers/locations";
import { fetchCabinetsForLocation } from "@/lib/helpers/cabinets";
import { createMovementRequest } from "@/lib/helpers/movementRequests";
import { validateEmail } from "@/lib/utils/validation";
import type { MovementRequest } from "@/lib/types/movementRequests";
import type { Cabinet } from "@/lib/types/cabinets";
import type { NewMovementModalProps } from "@/lib/types/components";

const NewMovementRequestModal: React.FC<NewMovementModalProps> = ({
  isOpen,
  onClose,
  locations: propLocations,
}) => {
  const [locations, setLocations] = useState<{ id: string; name: string }[]>(
    []
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

  // Fetch cabinets for selected from location
  useEffect(() => {
    if (fromLocation) {
      setLoadingCabinets(true);
      fetchCabinetsForLocation(fromLocation)
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
    if (!fromLocation) errs.fromLocation = "From location is required.";
    if (!selectedCabinets.length)
      errs.selectedCabinets = "Select at least one machine.";
    if (!toLocation) errs.toLocation = "Destination location is required.";
    if (toLocation && toLocation === fromLocation)
      errs.toLocation = "Destination must be different from source.";
    if (!requestTo) errs.requestTo = "Recipient email is required.";
    else if (!validateEmail(requestTo))
      errs.requestTo = "Enter a valid email address.";
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
      // Compose the request payload (simplified, adjust as needed)
      const payload: Partial<MovementRequest> = {
        locationFrom: fromLocation,
        locationTo: toLocation,
        requestTo,
        reason: notes,
        cabinetIn: selectedCabinets
          .map(
            (cab) =>
              cab.serialNumber || cab.assetNumber || cab.relayId || cab._id
          )
          .join(","),
        status: "pending",
        createdBy: "", // Fill with current user if available
        movementType: "cabinet",
        installationType: "move",
        timestamp: new Date(),
        // Add other required fields as needed
      };
      await createMovementRequest(
        payload as Omit<MovementRequest, "_id" | "createdAt" | "updatedAt">
      );
      onClose();
    } catch {
      setErrors({ submit: "Failed to create movement request." });
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
          {/* Left Column: Selection */}
          <div className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="fromLocationModal"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                From Location <span className="text-red-500">*</span>
              </label>
              <select
                id="fromLocationModal"
                value={fromLocation}
                onChange={(e) => setFromLocation(e.target.value)}
                className="w-full h-10 rounded-md border border-gray-300 px-3 bg-white text-gray-700 focus:ring-buttonActive focus:border-buttonActive"
              >
                <option value="" disabled>
                  Select source location
                </option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
              {errors.fromLocation && (
                <div className="text-red-500 text-xs mt-1">
                  {errors.fromLocation}
                </div>
              )}
            </div>
            <div>
              <label
                htmlFor="cabinetSearchModal"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Search Machines <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  id="cabinetSearchModal"
                  placeholder="Search by machine name, serial #, asset #, or ID..."
                  value={cabinetSearch}
                  onChange={(e) => {
                    setCabinetSearch(e.target.value);
                    setCabinetDropdownOpen(true);
                  }}
                  onFocus={() => setCabinetDropdownOpen(true)}
                  onBlur={() =>
                    setTimeout(() => setCabinetDropdownOpen(false), 150)
                  }
                  disabled={!fromLocation}
                  className="border-gray-300 placeholder-gray-400 focus:ring-buttonActive focus:border-buttonActive"
                  autoComplete="off"
                />
                {/* Dropdown of filtered cabinets */}
                {cabinetDropdownOpen && fromLocation && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                    {loadingCabinets ? (
                      <div className="px-4 py-2 text-sm text-gray-400 text-center">
                        Loading machines...
                      </div>
                    ) : availableCabinets.length > 0 ? (
                      availableCabinets.map((cab) => {
                        const displayName =
                          cab.installedGame ||
                          cab.game ||
                          cab.assetNumber ||
                          cab.serialNumber ||
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
                          ? "No machines match your search."
                          : "No machines available at this location."}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            {errors.selectedCabinets && (
              <div className="text-red-500 text-xs mt-1">
                {errors.selectedCabinets}
              </div>
            )}
          </div>

          {/* Right Column: Selected & Destination */}
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Selected Machines ({selectedCabinets.length}){" "}
                <span className="text-red-500">*</span>
              </label>
              <div className="border rounded-md p-3 h-40 overflow-y-auto bg-gray-50 min-h-[60px]">
                {selectedCabinets.length > 0 ? (
                  selectedCabinets.map((cab) => {
                    const displayName =
                      cab.installedGame ||
                      cab.game ||
                      cab.assetNumber ||
                      cab.serialNumber ||
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
                    No machines selected.
                  </p>
                )}
              </div>
            </div>
            <div>
              <label
                htmlFor="toLocationModal"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Moving To (Destination Location){" "}
                <span className="text-red-500">*</span>
              </label>
              <select
                id="toLocationModal"
                value={toLocation}
                onChange={(e) => setToLocation(e.target.value)}
                className="w-full h-10 rounded-md border border-gray-300 px-3 bg-white text-gray-700 focus:ring-buttonActive focus:border-buttonActive"
                disabled={!selectedCabinets.length}
              >
                <option value="" disabled>
                  Select destination location
                </option>
                {locations
                  .filter((loc) => loc.id !== fromLocation)
                  .map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
              </select>
              {errors.toLocation && (
                <div className="text-red-500 text-xs mt-1">
                  {errors.toLocation}
                </div>
              )}
            </div>
            <div>
              <label
                htmlFor="requestToModal"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Request To (Email) <span className="text-red-500">*</span>
              </label>
              <Input
                id="requestToModal"
                type="email"
                value={requestTo}
                onChange={(e) => setRequestTo(e.target.value)}
                className="border-gray-300 placeholder-gray-400 focus:ring-buttonActive focus:border-buttonActive"
                disabled={!toLocation}
                placeholder="Enter recipient's email"
              />
              {errors.requestTo && (
                <div className="text-red-500 text-xs mt-1">
                  {errors.requestTo}
                </div>
              )}
            </div>
            <div>
              <label
                htmlFor="notesModal"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Notes (Optional)
              </label>
              <Textarea
                id="notesModal"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="border-gray-300 placeholder-gray-400 focus:ring-buttonActive focus:border-buttonActive"
                placeholder="Add any notes (optional)"
              />
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
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-button text-white"
          >
            {submitting ? "Submitting..." : "Submit Request"}
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
