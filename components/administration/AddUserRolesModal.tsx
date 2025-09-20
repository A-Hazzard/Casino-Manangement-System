import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import type { User } from "@/lib/types/administration";
import gsap from "gsap";
import axios from "axios";

type AddUserRolesModalProps = {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
  onSave: () => void;
  formState: Partial<User> & {
    password?: string;
    confirmPassword?: string;
    roles?: string[];
    allowedLocations?: string[];
    notes?: string;
  };
  setFormState: (_data: Partial<AddUserRolesModalProps["formState"]>) => void;
};

type Location = {
  _id: string;
  name: string;
};

const ROLE_OPTIONS = [
  { label: "Technician", value: "technician" },
  { label: "Collector", value: "collector" },
  { label: "Collector Meters", value: "collectormeters" },
  { label: "Location Admin", value: "locationadmin" },
  { label: "Manager", value: "manager" },
  { label: "Administrator", value: "admin" },
];

const PASSWORD_REQUIREMENTS = [
  {
    label: "8+ chars",
    test: (password: string) => password.length >= 8,
  },
  {
    label: "A-Z",
    test: (password: string) => /[A-Z]/.test(password),
  },
  {
    label: "a-z",
    test: (password: string) => /[a-z]/.test(password),
  },
  {
    label: "0-9",
    test: (password: string) => /\d/.test(password),
  },
  {
    label: "!@#$",
    test: (password: string) => /[!@#$%^&*(),.?":{}|<>]/.test(password),
  },
];

export default function AddUserRolesModal({
  open,
  onClose,
  onBack,
  onSave,
  formState,
  setFormState,
}: AddUserRolesModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const locationSearchRef = useRef<HTMLInputElement>(null);
  const [locationSearch, setLocationSearch] = useState("");
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [selectAllLocations, setSelectAllLocations] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordRequirements, setShowPasswordRequirements] =
    useState(false);

  useEffect(() => {
    if (open && modalRef.current && backdropRef.current) {
      gsap.fromTo(
        modalRef.current,
        { y: 100, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" }
      );
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "power2.out" }
      );
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      fetchLocations();
    }
  }, [open]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        locationSearchRef.current &&
        !locationSearchRef.current.contains(event.target as Node)
      ) {
        setLocationDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Update selectAllLocations based on current allowedLocations
    if (formState.allowedLocations && locations.length > 0) {
      const allLocationIds = locations.map((loc) => loc._id);
      const hasAllLocations = allLocationIds.every((id) =>
        formState.allowedLocations?.includes(id)
      );
      setSelectAllLocations(
        hasAllLocations &&
          formState.allowedLocations.length === allLocationIds.length
      );
    }
  }, [formState.allowedLocations, locations]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        locationSearchRef.current &&
        !locationSearchRef.current.contains(event.target as Node)
      ) {
        setLocationDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchLocations = async () => {
    setIsLoadingLocations(true);
    try {
      const response = await axios.get("/api/locations?minimal=1");
      console.warn(
        `📍 Fetched locations: ${response.data.locations?.length || 0}`
      );
      setLocations(response.data.locations || []);
    } catch (error) {
      console.error("Error fetching locations:", error);
      setLocations([]);
    } finally {
      setIsLoadingLocations(false);
    }
  };

  const handleRoleChange = (role: string, checked: boolean) => {
    setFormState({
      roles: checked
        ? [...(formState.roles || []), role]
        : (formState.roles || []).filter((r) => r !== role),
    });
  };

  const handleLocationSelect = (id: string) => {
    const currentLocations = formState.allowedLocations || [];
    if (!currentLocations.includes(id)) {
      setFormState({
        allowedLocations: [...currentLocations, id],
      });
    }
    setLocationSearch("");
    setLocationDropdownOpen(false);
  };

  const handleLocationRemove = (id: string) => {
    setFormState({
      allowedLocations: (formState.allowedLocations || []).filter(
        (locId) => locId !== id
      ),
    });
  };

  const handleSelectAllLocations = (checked: boolean) => {
    if (checked) {
      setFormState({
        allowedLocations: locations.map((loc) => loc._id),
      });
    } else {
      setFormState({
        allowedLocations: [],
      });
    }
  };

  const filteredLocations = locations.filter(
    (location) =>
      location.name.toLowerCase().includes(locationSearch.toLowerCase()) &&
      !formState.allowedLocations?.includes(location._id)
  );

  const allRequirementsMet = PASSWORD_REQUIREMENTS.every((req) =>
    req.test(formState.password || "")
  );
  const passwordsMatch =
    formState.password === formState.confirmPassword &&
    formState.password !== "";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        ref={modalRef}
        className="bg-container shadow-lg flex flex-col gap-3 animate-in w-full max-w-lg mx-auto md:relative md:rounded-2xl md:p-6 md:my-0 md:top-0 md:left-0 md:bottom-auto md:right-auto md:max-h-none md:overflow-visible absolute bottom-0 left-0 right-0 rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            User Roles & Permissions
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Roles Section */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">Roles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {ROLE_OPTIONS.map((role) => (
              <div key={role.value} className="flex items-center space-x-2">
                <Checkbox
                  id={role.value}
                  checked={formState.roles?.includes(role.value) || false}
                  onCheckedChange={(checked) =>
                    handleRoleChange(role.value, checked as boolean)
                  }
                />
                <label
                  htmlFor={role.value}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {role.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Password Section */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">Password</h3>

          {/* Password Field */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={formState.password || ""}
                onChange={(e) => setFormState({ password: e.target.value })}
                onFocus={() => setShowPasswordRequirements(true)}
                placeholder="Enter password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Compact Password Requirements */}
          {showPasswordRequirements && (
            <div className="p-2 bg-gray-50 rounded-md">
              <p className="text-xs font-medium text-gray-700 mb-2">
                Requirements:
              </p>
              <div className="flex flex-wrap gap-2">
                {PASSWORD_REQUIREMENTS.map((req, index) => {
                  const isMet = req.test(formState.password || "");
                  return (
                    <span
                      key={index}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                        isMet
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {isMet ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {req.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={formState.confirmPassword || ""}
                onChange={(e) =>
                  setFormState({ confirmPassword: e.target.value })
                }
                placeholder="Confirm password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {formState.confirmPassword && (
              <div className="flex items-center gap-2 text-sm">
                {passwordsMatch ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span
                  className={passwordsMatch ? "text-green-700" : "text-red-700"}
                >
                  Passwords {passwordsMatch ? "match" : "do not match"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Locations Section */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Allowed Locations
          </h3>

          {/* Select All Locations */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="select-all-locations"
              checked={selectAllLocations}
              onCheckedChange={handleSelectAllLocations}
            />
            <label
              htmlFor="select-all-locations"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Select All Locations
            </label>
          </div>

          {/* Location Search */}
          <div className="relative" ref={locationSearchRef}>
            <Input
              type="text"
              placeholder={
                isLoadingLocations
                  ? "Loading locations..."
                  : "Search locations..."
              }
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              onFocus={() => setLocationDropdownOpen(true)}
              disabled={isLoadingLocations}
              className="w-full"
            />

            {/* Location Dropdown */}
            {locationDropdownOpen && !selectAllLocations && (
              <div className="absolute z-[60] w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {filteredLocations.length > 0 ? (
                  filteredLocations.map((location) => (
                    <button
                      key={location._id}
                      onClick={() => handleLocationSelect(location._id)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-sm"
                    >
                      {location.name}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-2 text-gray-500 text-sm">
                    {locationSearch
                      ? "No locations found"
                      : "No locations available"}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected Locations Display */}
          <div className="flex flex-wrap gap-2 min-h-[2rem]">
            {selectAllLocations ? (
              <span className="bg-green-500 text-white rounded-full px-3 py-1 flex items-center text-sm font-medium">
                All Locations Selected
              </span>
            ) : (formState.allowedLocations || []).length > 0 ? (
              <>
                {(formState.allowedLocations || []).slice(0, 3).map((id) => {
                  const loc = locations.find((l) => l._id === id);
                  return loc ? (
                    <span
                      key={id}
                      className="bg-blue-500 text-white rounded-full px-3 py-1 flex items-center gap-1 text-sm font-medium"
                    >
                      {loc.name}
                      <button
                        onClick={() => handleLocationRemove(id)}
                        className="hover:bg-blue-600 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ) : null;
                })}
                {(formState.allowedLocations || []).length > 3 && (
                  <span className="bg-gray-500 text-white rounded-full px-3 py-1 text-sm font-medium">
                    +{(formState.allowedLocations || []).length - 3} more
                  </span>
                )}
              </>
            ) : (
              <span className="text-gray-500 text-sm">
                No locations selected
              </span>
            )}
          </div>
        </div>

        {/* Notes Section */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Notes</label>
          <textarea
            value={formState.notes || ""}
            onChange={(e) => setFormState({ notes: e.target.value })}
            placeholder="Enter any additional notes..."
            className="w-full p-3 border border-gray-300 rounded-md resize-none"
            rows={2}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button onClick={onBack} variant="outline" className="flex-1">
            Back
          </Button>
          <Button
            onClick={onSave}
            disabled={!allRequirementsMet || !passwordsMatch}
            className="flex-1 bg-button text-white hover:bg-buttonActive disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
