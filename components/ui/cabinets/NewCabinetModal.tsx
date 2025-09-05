"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Cross2Icon } from "@radix-ui/react-icons";
import { useNewCabinetStore } from "@/lib/store/newCabinetStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { NewCabinetFormData } from "@/lib/types/cabinets";
import { createCabinet } from "@/lib/helpers/cabinets";
import { createActivityLogger } from "@/lib/helpers/activityLogger";

type NewCabinetModalProps = {
  locations?: { _id: string; name: string }[];
  onCreated?: () => void;
};

export const NewCabinetModal = ({
  locations,
  onCreated,
}: NewCabinetModalProps) => {
  const { isCabinetModalOpen, locationId, closeCabinetModal } =
    useNewCabinetStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  // Create activity logger for cabinet operations
  const cabinetLogger = createActivityLogger("machine");

  const [formData, setFormData] = useState<NewCabinetFormData>({
    serialNumber: "",
    game: "",
    gameType: "Slot",
    isCronosMachine: false,
    accountingDenomination: "",
    cabinetType: "Standing",
    assetStatus: "Functional",
    gamingLocation: locationId || "",
    smibBoard: "",
    collectionSettings: {
      multiplier: "1",
      lastCollectionTime: new Date().toISOString().slice(0, 16), // Format: YYYY-MM-DDThh:mm
     lastMetersIn: "0",
      lastMetersOut: "0",
    },
  });

  // Update gaming location when locationId changes
  useEffect(() => {
    if (locationId) {
      setFormData((prev) => ({
        ...prev,
        gamingLocation: locationId,
      }));
    }
  }, [locationId]);

  useEffect(() => {
    if (isCabinetModalOpen) {
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
  }, [isCabinetModalOpen]);

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
      onComplete: closeCabinetModal,
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const success = await createCabinet(formData);
      if (success) {
        // Log the cabinet creation activity
        await cabinetLogger.logCreate(
          formData.serialNumber || "Unknown",
          `${formData.game} - ${formData.serialNumber}`,
          formData,
          `Created new cabinet: ${formData.game} (${formData.serialNumber}) at location ${formData.gamingLocation}`
        );

        handleClose();
        // Reset form after successful submission
        resetForm();
        onCreated?.(); // Call the onCreated callback
      }
    } catch (err) {
      // Log error for debugging in development
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to create cabinet:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      serialNumber: "",
      game: "",
      gameType: "Slot",
      isCronosMachine: false,
      accountingDenomination: "",
      cabinetType: "Standing",
      assetStatus: "Functional",
      gamingLocation: locationId || "",
      smibBoard: "",
      collectionSettings: {
        multiplier: "1",
        lastCollectionTime: new Date().toISOString().slice(0, 16),
        lastMetersIn: "0",
        lastMetersOut: "0",
      },
    });
  };

  // Define a consistent change handler to fix the typing issues
  const handleInputChange = (
    field: keyof Omit<NewCabinetFormData, "collectionSettings">,
    value: string
  ) => {
    setFormData((prev: NewCabinetFormData) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData((prev: NewCabinetFormData) => ({
      ...prev,
      isCronosMachine: checked,
    }));
  };

  const handleCollectionSettingChange = (
    field: keyof NewCabinetFormData["collectionSettings"],
    value: string
  ) => {
    setFormData((prev: NewCabinetFormData) => ({
      ...prev,
      collectionSettings: {
        ...prev.collectionSettings,
        [field]: value,
      },
    }));
  };

  const handleSelectChange = (field: string, value: string) => {
    setFormData((prev: NewCabinetFormData) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (!isCabinetModalOpen) return null;

  // Desktop View
  return (
    <div className="fixed inset-0 z-50">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50 opacity-0"
        onClick={handleClose}
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          ref={modalRef}
          className="bg-container rounded-md shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          style={{ opacity: 0, transform: "translateY(-20px)" }}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border flex justify-between items-center">
            <h2 className="text-xl font-semibold">New Cabinet</h2>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <Cross2Icon className="h-4 w-4" />
            </Button>
          </div>

          {/* Form Content */}
          <div className="p-6">
            <div className="space-y-6">
              {/* Serial Number & Installed Game */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-buttonActive block mb-2">
                    Serial Number
                  </label>
                  <Input
                    id="serialNumber"
                    placeholder="Machine Serial Number"
                    value={formData.serialNumber}
                    onChange={(e) =>
                      handleInputChange("serialNumber", e.target.value)
                    }
                    className="bg-container border-border"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-buttonActive block mb-2">
                    Installed Game
                  </label>
                  <Input
                    id="game"
                    placeholder="Enter Game Name"
                    value={formData.game}
                    onChange={(e) => handleInputChange("game", e.target.value)}
                    className="bg-container border-border"
                  />
                </div>
              </div>

              {/* Game Type & Cronos Machine */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-buttonActive block mb-2">
                    Game Type
                  </label>
                  <Select
                    value={formData.gameType}
                    onValueChange={(value) =>
                      handleSelectChange("gameType", value)
                    }
                  >
                    <SelectTrigger className="bg-container border-border">
                      <SelectValue placeholder="Select Game Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Slot">Slot</SelectItem>
                      <SelectItem value="Video Poker">Video Poker</SelectItem>
                      <SelectItem value="Table Game">Table Game</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-y-0 pt-8">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isCronosMachine"
                      checked={formData.isCronosMachine}
                      onCheckedChange={handleCheckboxChange}
                    />
                    <label
                      htmlFor="isCronosMachine"
                      className="text-sm font-medium"
                    >
                      Cronos Machine
                    </label>
                  </div>
                </div>
              </div>

              {/* Accounting Denomination & Cabinet Type */}
              <div className="grid grid-cols-2 gap-4">
                {formData.isCronosMachine && (
                  <div>
                    <label className="text-sm font-medium text-buttonActive block mb-2">
                      Accounting Denomination (Only Cronos)
                    </label>
                    <Input
                      id="accountingDenomination"
                      placeholder="The denomination the machine uses when sending meter values"
                      value={formData.accountingDenomination}
                      onChange={(e) =>
                        handleInputChange(
                          "accountingDenomination",
                          e.target.value
                        )
                      }
                      className="bg-container border-border"
                    />
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-buttonActive block mb-2">
                    Cabinet Type
                  </label>
                  <Select
                    value={formData.cabinetType}
                    onValueChange={(value) =>
                      handleSelectChange("cabinetType", value)
                    }
                  >
                    <SelectTrigger className="bg-container border-border">
                      <SelectValue placeholder="Select Cabinet Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Standing">Standing</SelectItem>
                      <SelectItem value="Slant Top">Slant Top</SelectItem>
                      <SelectItem value="Bar Top">Bar Top</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Location & SMIB Board */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-buttonActive block mb-2">
                    Location
                  </label>
                  <Select
                    value={formData.gamingLocation}
                    onValueChange={(value) =>
                      handleSelectChange("gamingLocation", value)
                    }
                    disabled={!!locationId}
                  >
                    <SelectTrigger className="bg-container border-border">
                      <SelectValue placeholder="Select Location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations && locations.length > 0 ? (
                        locations.map((location) => (
                          <SelectItem key={location._id} value={location._id}>
                            {location.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-locations" disabled>
                          No locations available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-buttonActive block mb-2">
                    SMIB Board
                  </label>
                  <Input
                    id="smibBoard"
                    placeholder="Enter Manufacturer Name"
                    value={formData.smibBoard}
                    onChange={(e) =>
                      handleInputChange("smibBoard", e.target.value)
                    }
                    className="bg-container border-border"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="text-sm font-medium text-buttonActive block mb-2">
                  Status
                </label>
                <Select
                  value={formData.assetStatus}
                  onValueChange={(value) =>
                    handleSelectChange("assetStatus", value)
                  }
                >
                  <SelectTrigger className="bg-container border-border">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Functional">Functional</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                    <SelectItem value="Offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Collection Settings */}
              <div className="border-t border-border pt-4 mt-4">
                <h3 className="text-sm font-medium text-buttonActive mb-4">
                  Collection Settings
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium block mb-2">
                      Collection Report Multiplier
                    </label>
                    <Input
                      id="multiplier"
                      placeholder="Enter multiplier (default: 1)"
                      value={formData.collectionSettings.multiplier}
                      onChange={(e) =>
                        handleCollectionSettingChange(
                          "multiplier",
                          e.target.value
                        )
                      }
                      className="bg-container border-border"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">
                      Last Collection Time
                    </label>
                    <Input
                      id="lastCollection"
                      type="datetime-local"
                      value={formData.collectionSettings.lastCollectionTime}
                      onChange={(e) =>
                        handleCollectionSettingChange(
                          "lastCollectionTime",
                          e.target.value
                        )
                      }
                      className="bg-container border-border"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">
                      Last Meters In
                    </label>
                    <Input
                      id="metersIn"
                      placeholder="Enter last meters in"
                      value={formData.collectionSettings.lastMetersIn}
                      onChange={(e) =>
                        handleCollectionSettingChange(
                          "lastMetersIn",
                          e.target.value
                        )
                      }
                      className="bg-container border-border"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">
                      Last Meters Out
                    </label>
                    <Input
                      id="metersOut"
                      placeholder="Enter last meters out"
                      value={formData.collectionSettings.lastMetersOut}
                      onChange={(e) =>
                        handleCollectionSettingChange(
                          "lastMetersOut",
                          e.target.value
                        )
                      }
                      className="bg-container border-border"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-center space-x-3 mt-8">
              <Button
                onClick={handleSubmit}
                className="bg-button hover:bg-button/90 text-container px-8"
                disabled={loading}
              >
                {loading ? "Creating..." : "Save"}
              </Button>
              <Button
                onClick={handleClose}
                variant="outline"
                disabled={loading}
                className="px-8"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
