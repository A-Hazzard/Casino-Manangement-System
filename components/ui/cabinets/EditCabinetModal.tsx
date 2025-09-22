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
import { fetchManufacturers } from "@/lib/helpers/manufacturers";
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

  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [manufacturersLoading, setManufacturersLoading] = useState(false);
  const [smibBoardError, setSmibBoardError] = useState<string>("");
  const [serialNumberError, setSerialNumberError] = useState<string>("");
  const [installedGameError, setInstalledGameError] = useState<string>("");
  const [locationError, setLocationError] = useState<string>("");
  const [accountingDenominationError, setAccountingDenominationError] =
    useState<string>("");
  const [collectionMultiplierError, setCollectionMultiplierError] =
    useState<string>("");

  // Activity logging is now handled via API calls
  const logActivity = async (
    action: string,
    resource: string,
    resourceId: string,
    resourceName: string,
    details: string
  ) => {
    try {
      const response = await fetch('/api/activity-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          resource,
          resourceId,
          resourceName,
          details,
          userId: 'current-user', // This should be replaced with actual user ID
          username: 'current-user', // This should be replaced with actual username
          userRole: 'user', // This should be replaced with actual user role
        }),
      });
      
      if (!response.ok) {
        console.error('Failed to log activity:', response.statusText);
      }
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  // SMIB Board validation function
  const validateSmibBoard = (value: string): string => {
    if (!value) return "";

    // Check length
    if (value.length !== 12) {
      return "SMIB Board must be exactly 12 characters long";
    }

    // Check if it's hexadecimal and lowercase
    const hexPattern = /^[0-9a-f]+$/;
    if (!hexPattern.test(value)) {
      return "SMIB Board must contain only lowercase hexadecimal characters (0-9, a-f)";
    }

    // Check if it ends with 0, 4, 8, or c
    const lastChar = value.charAt(11);
    if (!["0", "4", "8", "c"].includes(lastChar)) {
      return "SMIB Board must end with 0, 4, 8, or c";
    }

    return ""; // No error
  };

  // Serial Number validation function
  const validateSerialNumber = (value: string): string => {
    if (!value) return "";

    if (value.length < 3) {
      return "Serial number must be at least 3 characters long";
    }

    return ""; // No error
  };

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

  // Fetch manufacturers data
  const fetchManufacturersData = useCallback(async () => {
    try {
      setManufacturersLoading(true);
      const fetchedManufacturers = await fetchManufacturers();
      setManufacturers(fetchedManufacturers);
    } catch (error) {
      console.error("Failed to fetch manufacturers:", error);
      toast.error("Failed to load manufacturers");
      setManufacturers([]);
    } finally {
      setManufacturersLoading(false);
    }
  }, []);

  const [formData, setFormData] = useState<CabinetFormData>({
    id: "",
    assetNumber: "",
    installedGame: "",
    gameType: "Slot",
    accountingDenomination: "1",
    collectionMultiplier: "1",
    location: "",
    smbId: "",
    status: "functional",
    isCronosMachine: false,
    manufacturer: "",
  });

  useEffect(() => {
    // Initial form data setup from selected cabinet
    if (selectedCabinet) {
      setFormData({
        id: selectedCabinet._id,
        assetNumber: selectedCabinet.assetNumber || "",
        installedGame: selectedCabinet.installedGame || "",
        gameType: selectedCabinet.gameType || "Slot",
        accountingDenomination: String(
          selectedCabinet.accountingDenomination || "1"
        ),
        collectionMultiplier: selectedCabinet.collectionMultiplier || "1",
        location: selectedCabinet.locationId || "",
        smbId: selectedCabinet.smbId || "",
        status: selectedCabinet.status || "functional",
        isCronosMachine: selectedCabinet.isCronosMachine || false,
        manufacturer: selectedCabinet.manufacturer || "",
      });

      // Fetch locations and manufacturers data when modal opens
      fetchLocations();
      fetchManufacturersData();

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
                gameType: cabinetDetails.gameType || prevData.gameType,
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
  }, [
    selectedCabinet,
    fetchLocations,
    fetchManufacturersData,
    activeMetricsFilter,
  ]);

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

    // Auto-capitalize serial number letters
    if (name === "assetNumber") {
      const upperCaseValue = value.toUpperCase();

      // Validate the serial number
      const error = validateSerialNumber(upperCaseValue);
      setSerialNumberError(error);

      setFormData((prev) => ({ ...prev, [name]: upperCaseValue }));
    } else if (name === "smbId") {
      // Special handling for SMIB Board with validation
      // Convert to lowercase and remove any non-hex characters
      const cleanValue = value.toLowerCase().replace(/[^0-9a-f]/g, "");

      // Limit to 12 characters
      const limitedValue = cleanValue.slice(0, 12);

      // Validate the value
      const error = validateSmibBoard(limitedValue);
      setSmibBoardError(error);

      setFormData((prev) => ({ ...prev, [name]: limitedValue }));
    } else {
      if (name === "installedGame") setInstalledGameError("");
      if (name === "accountingDenomination") setAccountingDenominationError("");
      if (name === "collectionMultiplier") setCollectionMultiplierError("");
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async () => {
    if (!selectedCabinet) return;
    try {
      setLoading(true);

      // Required-field validations
      const errors: string[] = [];
      if (!formData.assetNumber || formData.assetNumber.trim().length === 0) {
        setSerialNumberError("Serial number is required");
        errors.push("assetNumber");
      } else if (formData.assetNumber.trim().length < 3) {
        setSerialNumberError(
          "Serial number must be at least 3 characters long"
        );
        errors.push("assetNumberLen");
      }
      if (
        !formData.installedGame ||
        formData.installedGame.trim().length === 0
      ) {
        setInstalledGameError("Installed game is required");
        errors.push("installedGame");
      }
      if (
        !formData.accountingDenomination ||
        String(formData.accountingDenomination).trim().length === 0
      ) {
        setAccountingDenominationError("Accounting denomination is required");
        errors.push("accountingDenomination");
      } else if (isNaN(Number(formData.accountingDenomination))) {
        setAccountingDenominationError(
          "Accounting denomination must be a number"
        );
        errors.push("accountingDenominationNaN");
      }
      if (
        !formData.collectionMultiplier ||
        String(formData.collectionMultiplier).trim().length === 0
      ) {
        setCollectionMultiplierError("Collection multiplier is required");
        errors.push("collectionMultiplier");
      } else if (isNaN(Number(formData.collectionMultiplier))) {
        setCollectionMultiplierError("Collection multiplier must be a number");
        errors.push("collectionMultiplierNaN");
      }
      if (!formData.location || formData.location.trim().length === 0) {
        setLocationError("Location is required");
        errors.push("location");
      }
      if (smibBoardError) {
        errors.push("smibBoard");
      }
      if (errors.length > 0) {
        toast.error("Please fix the highlighted fields before saving");
        setLoading(false);
        return;
      }

      // Pass the entire formData object with id included
      const success = await updateCabinet(formData, activeMetricsFilter);
      if (success) {
        // Log the cabinet update activity
        await logActivity(
          "update",
          "cabinet",
          selectedCabinet._id,
          `${selectedCabinet.installedGame || selectedCabinet.game || "Unknown"} - ${selectedCabinet.assetNumber || getSerialNumberIdentifier(selectedCabinet) || "Unknown"}`,
          `Updated cabinet: ${selectedCabinet.installedGame || selectedCabinet.game || "Unknown"} (${selectedCabinet.assetNumber || getSerialNumberIdentifier(selectedCabinet) || "Unknown"})`
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

      const errorMessage =
        error instanceof Error ? error.message : "Failed to update cabinet";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isEditModalOpen || !selectedCabinet) return null;

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
                      <>
                        <Input
                          id="assetNumber"
                          name="assetNumber"
                          value={formData.assetNumber}
                          onChange={handleChange}
                          placeholder="Enter serial number"
                          className={`bg-container border-border ${
                            serialNumberError ? "border-red-500" : ""
                          }`}
                        />
                        {serialNumberError && (
                          <p className="text-red-500 text-xs mt-1">
                            {serialNumberError}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-grayHighlight block mb-2">
                      Installed Game
                    </label>
                    {cabinetDataLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <>
                        <Input
                          id="installedGame"
                          name="installedGame"
                          value={formData.installedGame}
                          onChange={handleChange}
                          placeholder="Enter installed game name"
                          className={`bg-container border-border ${
                            installedGameError ? "border-red-500" : ""
                          }`}
                        />
                        {installedGameError && (
                          <p className="text-red-500 text-xs mt-1">
                            {installedGameError}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Game Type */}
                <div>
                  <label className="text-sm font-medium text-grayHighlight block mb-2">
                    Game Type
                  </label>
                  {cabinetDataLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select
                      value={formData.gameType}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, gameType: value }))
                      }
                    >
                      <SelectTrigger className="bg-container border-border">
                        <SelectValue placeholder="Select Game Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Slot">Slot</SelectItem>
                        <SelectItem value="Roulette">Roulette</SelectItem>
                        <SelectItem value="Blackjack">Blackjack</SelectItem>
                        <SelectItem value="Poker">Poker</SelectItem>
                        <SelectItem value="Baccarat">Baccarat</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Manufacturer */}
                <div>
                  <label className="text-sm font-medium text-grayHighlight block mb-2">
                    Manufacturer
                  </label>
                  {manufacturersLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select
                      value={formData.manufacturer}
                      onValueChange={(value) => {
                        // Prevent setting the disabled "no-manufacturers" value
                        if (value !== "no-manufacturers") {
                          setFormData((prev) => ({
                            ...prev,
                            manufacturer: value,
                          }));
                        }
                      }}
                    >
                      <SelectTrigger className="bg-container border-border h-10">
                        <SelectValue placeholder="Select Manufacturer" />
                      </SelectTrigger>
                      <SelectContent>
                        {manufacturers.length > 0 ? (
                          manufacturers.map((manufacturer) => (
                            <SelectItem key={manufacturer} value={manufacturer}>
                              {manufacturer}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-manufacturers" disabled>
                            No manufacturers found
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}
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
                      <>
                        <Input
                          id="accountingDenomination"
                          name="accountingDenomination"
                          value={formData.accountingDenomination}
                          onChange={handleChange}
                          placeholder="Enter denomination"
                          className={`bg-container border-border ${
                            accountingDenominationError ? "border-red-500" : ""
                          }`}
                        />
                        {accountingDenominationError && (
                          <p className="text-red-500 text-xs mt-1">
                            {accountingDenominationError}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-grayHighlight block mb-2">
                      Collection Report Multiplier
                    </label>
                    {cabinetDataLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <>
                        <Input
                          id="collectionMultiplier"
                          name="collectionMultiplier"
                          value={formData.collectionMultiplier}
                          onChange={handleChange}
                          placeholder="Enter multiplier value"
                          className={`bg-container border-border ${
                            collectionMultiplierError ? "border-red-500" : ""
                          }`}
                        />
                        {collectionMultiplierError && (
                          <p className="text-red-500 text-xs mt-1">
                            {collectionMultiplierError}
                          </p>
                        )}
                      </>
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
                        onValueChange={(locationId) => {
                          setLocationError("");
                          setFormData((prev) => ({
                            ...prev,
                            location: locationId,
                          }));
                        }}
                      >
                        <SelectTrigger
                          className={`w-full bg-container border-border ${
                            locationError ? "border-red-500" : ""
                          }`}
                        >
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations
                            .filter(
                              (location) =>
                                location.id && location.id.trim() !== ""
                            )
                            .map((location) => (
                              <SelectItem key={location.id} value={location.id}>
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
                      <>
                        <Input
                          id="smbId"
                          name="smbId"
                          value={formData.smbId}
                          onChange={handleChange}
                          placeholder="Enter SMIB Board"
                          className={`bg-container border-border ${
                            smibBoardError ? "border-red-500" : ""
                          }`}
                          maxLength={12}
                        />
                        {smibBoardError && (
                          <p className="text-red-500 text-xs mt-1">
                            {smibBoardError}
                          </p>
                        )}
                      </>
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
                      {[
                        { value: "functional", label: "Functional" },
                        { value: "non_functional", label: "Non Functional" },
                      ].map(({ value, label }) => (
                        <label key={value} className="inline-flex items-center">
                          <input
                            type="radio"
                            name="status"
                            checked={formData.status === value}
                            onChange={() =>
                              setFormData((prev) => ({
                                ...prev,
                                status: value,
                              }))
                            }
                            className="w-4 h-4 text-button border-border focus:ring-button"
                          />
                          <span className="ml-2">{label}</span>
                        </label>
                      ))}
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