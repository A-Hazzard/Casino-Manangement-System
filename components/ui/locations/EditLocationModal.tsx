"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocationActionsStore } from "@/lib/store/locationActionsStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import axios from "axios";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLocationStore } from "@/lib/store/locationStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Location } from "@/lib/types";
import type { EditLocationModalProps } from "@/lib/types/components";

export default function EditLocationModal({
  isOpen,
  onClose,
  location,
  onLocationUpdated,
}: EditLocationModalProps) {
  const { isEditModalOpen, selectedLocation, closeEditModal } =
    useLocationActionsStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    street: "",
    city: "",
    country: "Guyana",
    profitShare: "50",
    licencee: "",
    isLocalServer: false,
    latitude: "",
    longitude: "",
    billValidatorOptions: [] as number[],
  });

  // Initialize form data when a location is selected
  useEffect(() => {
    if (selectedLocation) {
      setFormData({
        name: selectedLocation.locationName || "",
        street: "",
        city: "",
        country: "Guyana",
        profitShare: "50",
        licencee: "",
        isLocalServer: selectedLocation.isLocalServer || false,
        latitude: "8.909985",
        longitude: "-58.186204",
        billValidatorOptions: [],
      });
    }
  }, [selectedLocation]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleBillValidatorChange = (denom: number, checked: boolean) => {
    setFormData((prev) => {
      if (checked) {
        return {
          ...prev,
          billValidatorOptions: [...prev.billValidatorOptions, denom],
        };
      } else {
        return {
          ...prev,
          billValidatorOptions: prev.billValidatorOptions.filter(
            (d) => d !== denom
          ),
        };
      }
    });
  };

  const handleSubmit = async () => {
    if (!selectedLocation) {
      // Log error for debugging in development
      if (process.env.NODE_ENV === "development") {
        console.error("No location selected");
      }
      return;
    }

    if (!selectedLocation.name) {
      // Log error for debugging in development
      if (process.env.NODE_ENV === "development") {
        console.error("Location name is missing in the selected location");
      }
      return;
    }

    try {
      setLoading(true);

      // Use locationName as identifier since _id might not be available
      if (!selectedLocation.locationName) {
        console.error("Location name is missing in the selected location");
        return;
      }

      const locationData = {
        locationName: selectedLocation.locationName,
        name: formData.name,
        address: {
          street: formData.street,
          city: formData.city,
        },
        country: formData.country,
        profitShare: parseInt(formData.profitShare),
        rel: {
          licencee: formData.licencee,
        },
        isLocalServer: formData.isLocalServer,
        geoCoords: {
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
        },
        billValidatorOptions: formData.billValidatorOptions,
      };

      await axios.put("/api/locations", locationData);
      toast.success("Location updated successfully");
      onLocationUpdated?.();
      handleClose();
    } catch (error) {
      console.error("Error updating location:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isEditModalOpen || !selectedLocation) return null;

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
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          ref={modalRef}
          className="bg-container rounded-md shadow-lg max-w-xl w-full"
          style={{ opacity: 0, transform: "translateY(-20px)" }}
        >
          {/* Header */}
          <div className="p-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-center flex-1">
              Edit Location Details
            </h2>
            <Button
              variant="ghost"
              className="text-pinkHighlight hover:bg-pinkHighlight/10 border-2 border-pinkHighlight ml-2 flex items-center"
              onClick={() => {
                useLocationActionsStore
                  .getState()
                  .openDeleteModal(selectedLocation);
              }}
              aria-label="Delete Location"
            >
              <Trash2 className="w-5 h-5 mr-1" />
              Delete
            </Button>
          </div>

          {/* Form Content */}
          <div className="px-8 pb-8 space-y-4">
            {/* Location Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-grayHighlight mb-1">
                Location Name
              </label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full bg-container border-border"
              />
            </div>

            {/* Address */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-grayHighlight mb-1">
                Address
              </label>
              <Input
                name="street"
                value={formData.street}
                onChange={handleInputChange}
                placeholder="Street"
                className="w-full bg-container border-border"
              />
            </div>

            {/* Line 2 */}
            <div className="mb-4">
              <Input
                name="street"
                value={formData.street}
                onChange={handleInputChange}
                placeholder="Line 2"
                className="w-full bg-container border-border"
              />
            </div>

            {/* City and Country */}
            <div className="mb-4 grid grid-cols-2 gap-2">
              <Input
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="City"
                className="bg-container border-border"
              />
              <Select
                value={formData.country}
                onValueChange={(value) => handleSelectChange("country", value)}
              >
                <SelectTrigger className="bg-container border-border">
                  <SelectValue placeholder="Guyana" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Guyana">Guyana</SelectItem>
                  <SelectItem value="Trinidad & Tobago">
                    Trinidad & Tobago
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Profit Share and Day Start Time */}
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div className="flex items-center">
                <div className="bg-button text-primary-foreground rounded-l-md py-2 px-4">
                  <span className="text-sm font-medium">Profit Share</span>
                </div>
                <div className="flex-1 flex items-center bg-container rounded-r-md border border-border border-l-0">
                  <Input
                    name="profitShare"
                    value={formData.profitShare}
                    onChange={handleInputChange}
                    className="focus-visible:ring-0 focus-visible:ring-offset-0 border-l-none border-none"
                  />
                  <span className="pr-4">%</span>
                </div>
              </div>

              <div className="flex items-center">
                <div className="bg-button text-primary-foreground rounded-l-md py-2 px-4">
                  <span className="text-sm font-medium">Day Start Time</span>
                </div>
                <Input
                  name="dayStartTime"
                  value="Curr. day, 08:00"
                  readOnly
                  className="flex-1 focus-visible:ring-0 focus-visible:ring-offset-0 bg-container rounded-r-md border border-border border-l-0"
                />
              </div>
            </div>

            {/* No SMIB Location */}
            <div className="mb-4 flex justify-center">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="noSMIBLocation"
                  checked={formData.isLocalServer}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange("isLocalServer", checked === true)
                  }
                  className="text-grayHighlight border-buttonActive focus:ring-buttonActive"
                />
                <Label htmlFor="noSMIBLocation" className="text-sm font-medium">
                  No SMIB Location
                </Label>
              </div>
            </div>

            {/* GEO Coordinates */}
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">GEO Coordinates</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center">
                  <div className="bg-button text-primary-foreground rounded-l-md py-2 px-4">
                    <span className="text-sm font-medium">Latitude</span>
                  </div>
                  <Input
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleInputChange}
                    className="flex-1 focus-visible:ring-0 focus-visible:ring-offset-0 bg-container rounded-r-md border border-border border-l-0"
                  />
                </div>
                <div className="flex items-center">
                  <div className="bg-button text-primary-foreground rounded-l-md py-2 px-4">
                    <span className="text-sm font-medium">Longitude</span>
                  </div>
                  <Input
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleInputChange}
                    className="flex-1 focus-visible:ring-0 focus-visible:ring-offset-0 bg-container rounded-r-md border border-border border-l-0"
                  />
                </div>
              </div>
            </div>

            {/* Bill Validator Options */}
            <div className="mb-4">
              <div className="flex justify-center mb-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="billValidatorOptions"
                    checked={formData.billValidatorOptions.length > 0}
                    className="text-grayHighlight border-buttonActive focus:ring-buttonActive"
                  />
                  <Label
                    htmlFor="billValidatorOptions"
                    className="text-sm font-medium"
                  >
                    Bill Validator Options
                  </Label>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000,
                ].map((denom) => (
                  <div key={denom} className="flex items-center space-x-1">
                    <Checkbox
                      id={`denom-${denom}`}
                      checked={formData.billValidatorOptions.includes(denom)}
                      onCheckedChange={(checked) =>
                        handleBillValidatorChange(denom, checked === true)
                      }
                      className="text-grayHighlight border-buttonActive focus:ring-buttonActive"
                    />
                    <Label
                      htmlFor={`denom-${denom}`}
                      className="text-xs font-medium"
                    >
                      {denom} Denomination
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-center space-x-4 mt-6">
              <Button
                className="bg-button hover:bg-button/90 text-primary-foreground px-6"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="outline"
                className="border-button text-button hover:bg-button/10 px-6"
                onClick={handleClose}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
