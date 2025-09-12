"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Cross2Icon } from "@radix-ui/react-icons";
import { useCabinetActionsStore } from "@/lib/store/cabinetActionsStore";
import { CabinetFormData } from "@/lib/types/cabinets";
import { fetchCabinetById, updateCabinet } from "@/lib/helpers/cabinets";
import { Trash2 } from "lucide-react";
import { createActivityLogger } from "@/lib/helpers/activityLogger";
import { toast } from "sonner";
import { getSerialNumberIdentifier } from "@/lib/utils/serialNumber";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import axios from "axios";

export const EditCabinetModal = ({
  onCabinetUpdated,
}: {
  onCabinetUpdated?: () => void;
}) => {
  const { isEditModalOpen, selectedCabinet, closeEditModal } =
    useCabinetActionsStore();
  const { activeMetricsFilter } = useDashBoardStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [cabinetDataLoading, setCabinetDataLoading] = useState(false);
  const [locations, setLocations] = useState<
    { id: string; name: string; sasEnabled: boolean }[]
  >([]);
  const [locationsLoading, setLocationsLoading] = useState(false);

  // Create activity logger for cabinet operations
  const cabinetLogger = createActivityLogger("machine");

  // Fetch locations data
  const fetchLocations = useCallback(async () => {
    try {
      setLocationsLoading(true);
      const response = await axios.get("/api/locations");
      const locationsData = response.data.locations || [];
      const mappedLocations = locationsData.map(
        (loc: Record<string, unknown>) => ({
          id: loc._id as string,
          name: loc.name as string,
          sasEnabled:
            ((loc as Record<string, unknown>).sasEnabled as boolean) || false,
        })
      );
      setLocations(mappedLocations);
    } catch (error) {
      console.error("Failed to fetch locations:", error);
      toast.error("Failed to load locations");
      setLocations([]);
    } finally {
      setLocationsLoading(false);
    }
  }, []);

  const [formData, setFormData] = useState<CabinetFormData>({
    id: "",
    assetNumber: "",
    installedGame: "",
    accountingDenomination: "1",
    collectionMultiplier: "1",
    location: "",
    smbId: "",
    status: "Functional",
    isCronosMachine: false,
  });

  useEffect(() => {
    // Initial form data setup from selected cabinet
    if (selectedCabinet) {
      setFormData({
        id: selectedCabinet._id,
        assetNumber: selectedCabinet.assetNumber || "",
        installedGame: selectedCabinet.installedGame || "",
        accountingDenomination: String(
          selectedCabinet.accountingDenomination || "1"
        ),
        collectionMultiplier: selectedCabinet.collectionMultiplier || "1",
        location: selectedCabinet.locationId || "",
        smbId: selectedCabinet.smbId || "",
        status: selectedCabinet.status || "Functional",
        isCronosMachine: selectedCabinet.isCronosMachine || false,
      });

      // Fetch locations data when modal opens
      fetchLocations();

      // Fetch additional cabinet details if needed
      if (selectedCabinet._id && activeMetricsFilter) {
        setCabinetDataLoading(true);
        fetchCabinetById(selectedCabinet._id, activeMetricsFilter)
          .then((cabinetDetails) => {
            if (cabinetDetails) {
              setFormData((prevData) => ({
                ...prevData,
                installedGame:
                  cabinetDetails.installedGame || prevData.installedGame,
                accountingDenomination: String(
                  cabinetDetails.accountingDenomination ||
                    prevData.accountingDenomination
                ),
                collectionMultiplier:
                  cabinetDetails.collectionMultiplier ||
                  prevData.collectionMultiplier,
                status: cabinetDetails.status || prevData.status,
                isCronosMachine:
                  cabinetDetails.isCronosMachine || prevData.isCronosMachine,
              }));
            }
          })
          .catch((error) => {
            // Log error for debugging in development
            if (process.env.NODE_ENV === "development") {
              console.error("Error fetching cabinet details:", error);
            }
          })
          .finally(() => {
            setCabinetDataLoading(false);
          });
      }
    }
  }, [selectedCabinet, fetchLocations, activeMetricsFilter]);

  useEffect(() => {
    if (isEditModalOpen) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, y: -20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.3,
          ease: "power2.out",
          overwrite: true,
        }
      );
      gsap.to(backdropRef.current, {
        opacity: 1,
        duration: 0.2,
        ease: "power2.out",
        overwrite: true,
      });
    }
  }, [isEditModalOpen]);

  const handleClose = () => {
    gsap.to(modalRef.current, {
      opacity: 0,
      y: -20,
      duration: 0.3,
      ease: "power2.in",
      overwrite: true,
    });
    gsap.to(backdropRef.current, {
      opacity: 0,
      duration: 0.2,
      ease: "power2.in",
      overwrite: true,
      onComplete: closeEditModal,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedCabinet) return;
    try {
      setLoading(true);

      const previousData = { ...selectedCabinet };

      // Pass the entire formData object with id included
      const success = await updateCabinet(formData, activeMetricsFilter);
      if (success) {
        // Log the cabinet update activity
        await cabinetLogger.logUpdate(
          selectedCabinet._id,
          `${
            selectedCabinet.installedGame || selectedCabinet.game || "Unknown"
          } - ${
            selectedCabinet.assetNumber ||
            getSerialNumberIdentifier(selectedCabinet) ||
            "Unknown"
          }`,
          previousData,
          formData,
          `Updated cabinet: ${
            selectedCabinet.installedGame || selectedCabinet.game || "Unknown"
          } (${
            selectedCabinet.assetNumber ||
            getSerialNumberIdentifier(selectedCabinet) ||
            "Unknown"
          })`
        );

        // Call the callback to refresh data
        onCabinetUpdated?.();

        // Show success feedback
        toast.success("Cabinet updated successfully");

        // Close the modal
        handleClose();
      }
    } catch (error) {
      console.error("Error updating cabinet:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update cabinet";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isEditModalOpen || !selectedCabinet) return null;

  // No need for skeleton loading since we already have selectedCabinet data
  // The form will be populated with basic data and updated when detailed data arrives

  // Desktop View Modal Content
  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Desktop Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4">
        <div
          ref={modalRef}
          className="bg-container rounded-md shadow-lg max-w-2xl w-full max-h-[98vh] overflow-visible"
          style={{ opacity: 0, transform: "translateY(-20px)" }}
        >
          <div className="p-3 sm:p-4 flex items-center border-b border-border">
            <h2 className="text-xl font-semibold text-center flex-1">
              Edit Cabinet Details
            </h2>
            <Button
              variant="ghost"
              className="text-pinkHighlight hover:bg-pinkHighlight/10 border-none ml-2 flex items-center"
              onClick={() => {
                useCabinetActionsStore
                  .getState()
                  .openDeleteModal(selectedCabinet);
              }}
              aria-label="Delete Cabinet"
            >
              <Trash2 className="w-5 h-5 mr-1" />
              Delete
            </Button>
            <Button
              onClick={handleClose}
              variant="ghost"
              className="text-grayHighlight hover:bg-buttonInactive/10 ml-2"
              size="icon"
              aria-label="Close"
            >
              <Cross2Icon className="w-5 h-5" />
            </Button>
          </div>

          {/* Form Content */}
          <div className="px-4 sm:px-8 pb-6 sm:pb-8 max-h-[calc(98vh-120px)] overflow-visible">
            <div className="space-y-4 max-h-[calc(98vh-180px)] overflow-y-auto">
                <div className="space-y-6">
                  {/* Serial Number & Installed Game */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-grayHighlight block mb-2">
                        Serial Number
                      </label>
                      {cabinetDataLoading ? (
                        <Skeleton className="h-10 w-full" />
                      ) : (
                        <Input
                          id="assetNumber"
                          name="assetNumber"
                          value={formData.assetNumber}
                          onChange={handleChange}
                          placeholder="Enter serial number"
                          className="bg-container border-border"
                        />
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-grayHighlight block mb-2">
                        Installed Game
                      </label>
                      {cabinetDataLoading ? (
                        <Skeleton className="h-10 w-full" />
                      ) : (
                        <Input
                          id="installedGame"
                          name="installedGame"
                          value={formData.installedGame}
                          onChange={handleChange}
                          placeholder="Enter installed game name"
                          className="bg-container border-border"
                        />
                      )}
                    </div>
                  </div>

                  {/* Accounting Denomination & Collection Multiplier */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-grayHighlight block mb-2">
                        Accounting Denomination
                      </label>
                      {cabinetDataLoading ? (
                        <Skeleton className="h-10 w-full" />
                      ) : (
                        <Input
                          id="accountingDenomination"
                          name="accountingDenomination"
                          value={formData.accountingDenomination}
                          onChange={handleChange}
                          placeholder="The denomination the mac"
                          className="bg-container border-border"
                        />
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-grayHighlight block mb-2">
                        Collection Report Multiplier
                      </label>
                      {cabinetDataLoading ? (
                        <Skeleton className="h-10 w-full" />
                      ) : (
                        <Input
                          id="collectionMultiplier"
                          name="collectionMultiplier"
                          value={formData.collectionMultiplier}
                          onChange={handleChange}
                          placeholder="Enter multiplier value"
                          className="bg-container border-border"
                        />
                      )}
                    </div>
                  </div>

                  {/* Location & SMIB Board */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-grayHighlight block mb-2">
                        Location
                      </label>
                      {locationsLoading || cabinetDataLoading ? (
                        <Skeleton className="h-10 w-full" />
                      ) : (
                        <Select
                          value={formData.location || undefined}
                          onValueChange={(locationId) =>
                            setFormData((prev) => ({
                              ...prev,
                              location: locationId,
                            }))
                          }
                        >
                          <SelectTrigger className="w-full bg-container border-border">
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                          <SelectContent>
                            {locations
                              .filter(
                                (location) =>
                                  location.id && location.id.trim() !== ""
                              )
                              .map((location) => (
                                <SelectItem
                                  key={location.id}
                                  value={location.id}
                                >
                                  {location.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-grayHighlight block mb-2">
                        SMIB Board
                      </label>
                      {cabinetDataLoading ? (
                        <Skeleton className="h-10 w-full" />
                      ) : (
                        <Input
                          id="smbId"
                          name="smbId"
                          value={formData.smbId}
                          onChange={handleChange}
                          placeholder="Enter SMIB ID"
                          className="bg-container border-border"
                        />
                      )}
                    </div>
                  </div>

                  {/* Status Field */}
                  <div>
                    <label className="text-sm font-medium text-grayHighlight block mb-2">
                      Status
                    </label>
                    {cabinetDataLoading ? (
                      <div className="flex space-x-4">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                    ) : (
                      <div className="flex space-x-4">
                        {["Functional", "Maintenance", "Offline"].map(
                          (status) => (
                            <label
                              key={status}
                              className="inline-flex items-center"
                            >
                              <input
                                type="radio"
                                name="status"
                                checked={formData.status === status}
                                onChange={() =>
                                  setFormData((prev) => ({ ...prev, status }))
                                }
                                className="w-4 h-4 text-button border-border focus:ring-button"
                              />
                              <span className="ml-2">{status}</span>
                            </label>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mt-6">
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-button hover:bg-button/90 text-container px-8"
              >
                {loading ? "Saving..." : "SAVE"}
              </Button>
              <Button
                onClick={handleClose}
                variant="outline"
                disabled={loading}
                className="px-8"
              >
                CLOSE
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
