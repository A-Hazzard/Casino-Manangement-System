"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Cross2Icon } from "@radix-ui/react-icons";
import { useLocationStore } from "@/lib/store/locationStore";
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
import { getNames } from "country-list";

export const NewLocationModal = () => {
  const { isLocationModalOpen, closeLocationModal } = useLocationStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    street: "",
    line2: "",
    city: "",
    country: "Guyana",
    profitShare: "50",
    licencee: "",
    isLocalServer: false,
    latitude: "6.809985",
    longitude: "-58.166204",
  });

  const [loading, setLoading] = useState(false);

  const countryNames = getNames();

  // Check if we're on mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);

    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  // Handle modal animations
  useEffect(() => {
    if (isLocationModalOpen) {
      if (isMobile) {
        // Mobile animation: Slide up and fade in
        gsap.to(modalRef.current, {
          y: 0,
          duration: 0.3,
          ease: "power2.out",
          overwrite: true,
        });
      } else {
        // Desktop animation: Fade in
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
  }, [isLocationModalOpen, isMobile]);

  const handleClose = () => {
    if (isMobile) {
      // Mobile animation: Slide down and fade out
      gsap.to(modalRef.current, {
        y: "100%",
        duration: 0.3,
        ease: "power2.in",
        overwrite: true,
      });
    } else {
      // Desktop animation: Fade out
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
      onComplete: closeLocationModal,
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

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const locationData = {
        name: formData.name,
        address: {
          street: formData.street,
          line2: formData.line2,
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
      };

      await axios.post("/api/locations", locationData);
      handleClose();
      // You might want to refresh the locations list after adding a new one
    } catch (error) {
      // Log error for debugging in development
      if (process.env.NODE_ENV === "development") {
        console.error("Error creating location:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isLocationModalOpen) return null;

  // Desktop View
  if (!isMobile) {
    return (
      <div className="fixed inset-0 z-50">
        {/* Backdrop */}
        <div
          ref={backdropRef}
          className="absolute inset-0 bg-black/50"
          onClick={handleClose}
        />

        {/* Desktop Modal Content */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <div
            ref={modalRef}
            className="bg-blue-50 rounded-md shadow-lg max-w-xl w-full"
            style={{ opacity: 0, transform: "translateY(-20px)" }}
          >
            <div className="p-4">
              <h2 className="text-xl font-semibold text-center mb-4">
                New Location
              </h2>
            </div>

            <div className="px-8 pb-8 space-y-4">
              {/* Location Name */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-grayHighlight mb-1">
                  Location Name
                </label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Mixtura Brasileira 2 LT"
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
                  name="line2"
                  value={formData.line2}
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
                  onValueChange={(value) =>
                    handleSelectChange("country", value)
                  }
                >
                  <SelectTrigger className="bg-container border-border">
                    <SelectValue placeholder="Country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countryNames.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
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
                      className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 border-l-0"
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
                  <Label
                    htmlFor="noSMIBLocation"
                    className="text-sm font-medium"
                  >
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

  // Mobile View (original bottom sheet modal)
  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal Content */}
      <div
        ref={modalRef}
        className="absolute bottom-0 w-full bg-container rounded-t-2xl p-6 shadow-lg max-h-[90vh] overflow-y-auto"
        style={{ transform: "translateY(100%)" }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-buttonActive">New Location</h2>
          <Button
            variant="ghost"
            onClick={handleClose}
            className="text-grayHighlight hover:bg-buttonInactive/10"
          >
            <Cross2Icon className="w-6 h-6" />
          </Button>
        </div>

        {/* Form Content */}
        <div className="space-y-6">
          {/* Location Name */}
          <div>
            <label className="block text-sm font-medium text-buttonActive mb-2">
              Location Name
            </label>
            <Input
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Mixtura Brasileira 2 LT"
              className="bg-container border-border focus-visible:ring-buttonActive"
            />
          </div>

          {/* Address Section */}
          <div>
            <h3 className="text-lg font-semibold text-buttonActive mb-4">
              Address
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                name="street"
                value={formData.street}
                onChange={handleInputChange}
                placeholder="Street"
                className="bg-container border-border"
              />
              <Input
                name="line2"
                value={formData.line2}
                onChange={handleInputChange}
                placeholder="Line 2"
                className="bg-container border-border"
              />
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
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  {countryNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Profit Share and Licencee */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold text-buttonActive mb-2">
                Profit Share
              </h3>
              <Select
                value={formData.profitShare}
                onValueChange={(value) =>
                  handleSelectChange("profitShare", value)
                }
              >
                <SelectTrigger className="bg-container border-border">
                  <SelectValue placeholder="Profit Share" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50%</SelectItem>
                  <SelectItem value="40">40%</SelectItem>
                  <SelectItem value="60">60%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-buttonActive mb-2">
                Licencee
              </h3>
              <Select
                value={formData.licencee}
                onValueChange={(value) => handleSelectChange("licencee", value)}
              >
                <SelectTrigger className="bg-container border-border">
                  <SelectValue placeholder="Licencee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TTG">TTG</SelectItem>
                  <SelectItem value="Cabana">Cabana</SelectItem>
                  <SelectItem value="Barbados">Barbados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* No SMIB Location */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isLocalServer"
              checked={formData.isLocalServer}
              onCheckedChange={(checked) =>
                handleCheckboxChange("isLocalServer", checked as boolean)
              }
              className="text-buttonActive border-buttonActive focus:ring-buttonActive"
            />
            <Label
              htmlFor="isLocalServer"
              className="text-buttonActive font-medium"
            >
              No SMIB Location
            </Label>
          </div>

          {/* Day Start Time */}
          <div>
            <h3 className="text-lg font-semibold text-buttonActive mb-2">
              Day Start Time
            </h3>
            <div className="bg-container border-border rounded-md p-3 text-grayHighlight">
              {new Date().toLocaleDateString()}, 08:00
            </div>
          </div>

          {/* GEO Coordinates */}
          <div>
            <h3 className="text-lg font-semibold text-buttonActive mb-2">
              GEO Coordinates
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label
                  htmlFor="latitude"
                  className="text-sm text-grayHighlight mb-1 block"
                >
                  Latitude
                </Label>
                <Input
                  id="latitude"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleInputChange}
                  className="bg-container border-border"
                />
              </div>
              <div>
                <Label
                  htmlFor="longitude"
                  className="text-sm text-grayHighlight mb-1 block"
                >
                  Longitude
                </Label>
                <Input
                  id="longitude"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleInputChange}
                  className="bg-container border-border"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6">
            <Button
              onClick={handleClose}
              className="bg-buttonInactive text-primary-foreground hover:bg-buttonInactive/90 px-6 py-2"
              disabled={loading}
            >
              Close
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-buttonActive text-primary-foreground hover:bg-buttonActive/90 px-6 py-2"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
