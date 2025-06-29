"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Cross2Icon } from "@radix-ui/react-icons";
import { useCabinetActionsStore } from "@/lib/store/cabinetActionsStore";
import { CabinetFormData } from "@/lib/types/cabinets";
import { fetchCabinetById, updateCabinet } from "@/lib/helpers/cabinets";
import { Trash2 } from "lucide-react";

export const EditCabinetModal = () => {
  const { isEditModalOpen, selectedCabinet, closeEditModal } =
    useCabinetActionsStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [formData, setFormData] = useState<CabinetFormData>({
    id: "",
    assetNumber: "",
    installedGame: "",
    accountingDenomination: "1",
    collectionMultiplier: "1",
    location: "",
    smbId: "",
    status: "Functional",
  });

  // Check if we're on mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);

    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

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
      });

      // Fetch additional cabinet details if needed
      if (selectedCabinet._id) {
        setFetchingDetails(true);
        fetchCabinetById(selectedCabinet._id)
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
            setFetchingDetails(false);
          });
      }
    }
  }, [selectedCabinet]);

  useEffect(() => {
    if (isEditModalOpen) {
      if (isMobile) {
        gsap.to(modalRef.current, {
          y: 0,
          duration: 0.3,
          ease: "power2.out",
          overwrite: true,
        });
      } else {
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
      }
      gsap.to(backdropRef.current, {
        opacity: 1,
        duration: 0.2,
        ease: "power2.out",
        overwrite: true,
      });
    }
  }, [isEditModalOpen, isMobile]);

  const handleClose = () => {
    if (isMobile) {
      gsap.to(modalRef.current, {
        y: "100%",
        duration: 0.3,
        ease: "power2.in",
        overwrite: true,
      });
    } else {
      gsap.to(modalRef.current, {
        opacity: 0,
        y: -20,
        duration: 0.3,
        ease: "power2.in",
        overwrite: true,
      });
    }
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
      // Pass the entire formData object with id included
      const success = await updateCabinet(formData);
      if (success) {
        handleClose();
        // You can add a toast notification here
      }
    } catch (error) {
      // Log error for debugging in development
      if (process.env.NODE_ENV === "development") {
        console.error("Error updating cabinet:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isEditModalOpen || !selectedCabinet) return null;

  // Desktop View Modal Content
  if (!isMobile) {
    return (
      <div className="fixed inset-0 z-50">
        {/* Backdrop */}
        <div
          ref={backdropRef}
          className="absolute inset-0 bg-black/50"
          onClick={handleClose}
        />

        {/* Desktop Modal */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <div
            ref={modalRef}
            className="bg-container rounded-md shadow-lg max-w-xl w-full max-h-[90vh] overflow-y-auto"
            style={{ opacity: 0, transform: "translateY(-20px)" }}
          >
            <div className="p-4 flex items-center border-b border-border">
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
            <div className="px-8 pb-8 space-y-4">
              {fetchingDetails ? (
                <div className="py-8 text-center text-muted-foreground">
                  Loading cabinet details...
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Serial Number & Installed Game */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-grayHighlight block mb-2">
                        Serial Number
                      </label>
                      <Input
                        id="assetNumber"
                        name="assetNumber"
                        value={formData.assetNumber}
                        onChange={handleChange}
                        placeholder="Enter serial number"
                        className="bg-container border-border"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-grayHighlight block mb-2">
                        Installed Game
                      </label>
                      <Input
                        id="installedGame"
                        name="installedGame"
                        value={formData.installedGame}
                        onChange={handleChange}
                        placeholder="Enter installed game name"
                        className="bg-container border-border"
                      />
                    </div>
                  </div>

                  {/* Accounting Denomination & Collection Multiplier */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-grayHighlight block mb-2">
                        Accounting Denomination
                      </label>
                      <Input
                        id="accountingDenomination"
                        name="accountingDenomination"
                        value={formData.accountingDenomination}
                        onChange={handleChange}
                        placeholder="Enter denomination value"
                        className="bg-container border-border"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-grayHighlight block mb-2">
                        Collection Report Multiplier
                      </label>
                      <Input
                        id="collectionMultiplier"
                        name="collectionMultiplier"
                        value={formData.collectionMultiplier}
                        onChange={handleChange}
                        placeholder="Enter multiplier value"
                        className="bg-container border-border"
                      />
                    </div>
                  </div>

                  {/* Location & SMIB Board */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-grayHighlight block mb-2">
                        Location
                      </label>
                      <Input
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        placeholder="Enter location name"
                        className="bg-container border-border"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-grayHighlight block mb-2">
                        SMIB Board
                      </label>
                      <Input
                        id="smbId"
                        name="smbId"
                        value={formData.smbId}
                        onChange={handleChange}
                        placeholder="Enter SMIB ID"
                        className="bg-container border-border"
                      />
                    </div>
                  </div>

                  {/* Status Field */}
                  <div>
                    <label className="text-sm font-medium text-grayHighlight block mb-2">
                      Status
                    </label>
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
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex justify-center space-x-4 mt-6">
                <Button
                  onClick={handleSubmit}
                  disabled={loading || fetchingDetails}
                  className="bg-button hover:bg-button/90 text-container px-8"
                >
                  {loading ? "Saving..." : "SAVE"}
                </Button>
                <Button
                  onClick={handleClose}
                  variant="outline"
                  disabled={loading || fetchingDetails}
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
  }

  // Mobile View (original bottom sheet modal)
  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />
      {/* Mobile Modal Content */}
      <div
        ref={modalRef}
        className="fixed bottom-0 left-0 right-0 bg-container rounded-t-2xl p-6 shadow-lg max-h-[90vh] overflow-y-auto"
        style={{ transform: "translateY(100%)" }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Edit Cabinet Details</h2>
          <div className="flex space-x-2 items-center">
            <Button
              variant="outline"
              size="sm"
              className="border-destructive text-destructive hover:bg-destructive/10"
            >
              DELETE
            </Button>
            <Button onClick={handleClose} variant="ghost">
              <Cross2Icon className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {fetchingDetails ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading cabinet details...
          </div>
        ) : (
          <div className="space-y-4">
            {[
              {
                label: "Serial Number",
                name: "assetNumber",
                placeholder: "Enter serial number",
              },
              {
                label: "Installed Game",
                name: "installedGame",
                placeholder: "Enter installed game name",
              },
              {
                label: "Accounting Denomination",
                name: "accountingDenomination",
                placeholder: "Enter denomination value",
              },
              {
                label: "Collection Report Multiplier",
                name: "collectionMultiplier",
                placeholder: "Enter multiplier value",
              },
              {
                label: "Location",
                name: "location",
                placeholder: "Enter location name",
              },
              {
                label: "SMIB Board",
                name: "smbId",
                placeholder: "Enter SMIB ID",
              },
            ].map((field) => (
              <div key={field.name}>
                <label className="text-sm block mb-1 font-medium text-grayHighlight">
                  {field.label}
                </label>
                <Input
                  name={field.name}
                  value={formData[field.name as keyof CabinetFormData]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  className="bg-container border-border"
                />
              </div>
            ))}

            {/* Status Field */}
            <div>
              <label className="text-sm block mb-1 font-medium text-grayHighlight">
                Status
              </label>
              <div className="flex flex-wrap gap-4">
                {["Functional", "Maintenance", "Offline"].map((status) => (
                  <label key={status} className="inline-flex items-center">
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
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-center mt-6 space-x-4">
          <Button
            onClick={handleSubmit}
            className="bg-button hover:bg-button/90 text-container px-8"
            disabled={loading || fetchingDetails}
          >
            {loading ? "Saving..." : "SAVE"}
          </Button>
          <Button
            onClick={handleClose}
            variant="outline"
            disabled={loading || fetchingDetails}
            className="px-8"
          >
            CLOSE
          </Button>
        </div>
      </div>
    </div>
  );
};
