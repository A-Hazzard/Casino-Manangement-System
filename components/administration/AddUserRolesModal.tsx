import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";
import type { User } from "@/lib/types/administration";
import gsap from "gsap";

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

const ROLE_OPTIONS = [
  { label: "Technician", value: "technician" },
  { label: "Collector", value: "collector" },
  { label: "Collector Meters", value: "collectormeters" },
  { label: "Location Admin", value: "locationadmin" },
  { label: "Manager", value: "manager" },
  { label: "Administrator", value: "admin" },
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
  const [locationSearch, setLocationSearch] = useState("");
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  // For demo, use static locations. Replace with fetch if needed.
  const locations = [
    { _id: "1", name: "Dev Lab" },
    { _id: "2", name: "Asset Management" },
    { _id: "3", name: "Cloud 9" },
  ];

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

  if (!open) return null;

  const handleRoleChange = (role: string, checked: boolean) => {
    setFormState({
      roles: checked
        ? [...(formState.roles || []), role]
        : (formState.roles || []).filter((r) => r !== role),
    });
  };

  const handleLocationSelect = (id: string) => {
    setFormState({
      allowedLocations: [...(formState.allowedLocations || []), id],
    });
  };

  const handleLocationRemove = (id: string) => {
    setFormState({
      allowedLocations: (formState.allowedLocations || []).filter(
        (locId) => locId !== id
      ),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        ref={modalRef}
        className="bg-container shadow-lg flex flex-col gap-6 animate-in w-full max-w-lg mx-auto md:relative md:rounded-2xl md:p-10 md:my-0 md:top-0 md:left-0 md:bottom-auto md:right-auto md:max-h-none md:overflow-visible absolute bottom-0 left-0 right-0 rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto md:static"
        style={{ opacity: 1 }}
      >
        {/* Close button */}
        <button
          className="absolute top-4 right-4 md:top-6 md:right-6 z-10 bg-white rounded-full p-2 shadow hover:bg-gray-100"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="w-6 h-6 text-gray-700" />
        </button>
        <h2 className="text-2xl md:text-3xl font-bold text-center text-buttonActive mb-2">
          Roles & Permissions
        </h2>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
        >
          <div className="flex flex-col gap-2">
            <label className="text-base font-medium">Password</label>
            <Input
              type="password"
              value={formState.password || ""}
              onChange={(e) => setFormState({ password: e.target.value })}
              placeholder="Password"
              className="rounded-md"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-base font-medium">Confirm Password</label>
            <Input
              type="password"
              value={formState.confirmPassword || ""}
              onChange={(e) =>
                setFormState({ confirmPassword: e.target.value })
              }
              placeholder="Confirm Password"
              className="rounded-md"
              required
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-buttonActive text-center mb-2">
              Roles
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 justify-items-center">
              {ROLE_OPTIONS.map((role) => (
                <label
                  key={role.value}
                  className="flex items-center gap-2 cursor-pointer text-buttonActive text-base font-medium"
                >
                  <Checkbox
                    id={role.value}
                    checked={formState.roles?.includes(role.value) || false}
                    onCheckedChange={(checked) =>
                      handleRoleChange(role.value, checked === true)
                    }
                    className="border-2 border-buttonActive text-buttonActive focus:ring-buttonActive"
                  />
                  {role.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-buttonActive text-center mb-2">
              Allowed Locations
            </h3>
            <div className="relative mb-2">
              <Input
                value={locationSearch}
                onChange={(e) => {
                  setLocationSearch(e.target.value);
                  setLocationDropdownOpen(true);
                }}
                onFocus={() => setLocationDropdownOpen(true)}
                onBlur={() =>
                  setTimeout(() => setLocationDropdownOpen(false), 150)
                }
                placeholder="Select Location.."
                className="w-full rounded-md pr-10"
                autoComplete="off"
              />
              {locationDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                  {locations
                    .filter((loc) =>
                      loc.name
                        .toLowerCase()
                        .includes(locationSearch.toLowerCase())
                    )
                    .map((loc) => (
                      <button
                        key={loc._id}
                        type="button"
                        className="w-full text-left px-4 py-2 hover:bg-blue-100 text-gray-900"
                        onClick={() => {
                          handleLocationSelect(loc._id);
                          setLocationSearch("");
                          setLocationDropdownOpen(false);
                        }}
                      >
                        {loc.name}
                      </button>
                    ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {(formState.allowedLocations || []).map((id) => {
                const loc = locations.find((l) => l._id === id);
                return loc ? (
                  <span
                    key={id}
                    className="bg-blue-400 text-white rounded-full px-3 py-1 flex items-center text-sm"
                  >
                    {loc.name}
                    <button
                      className="ml-2 text-white hover:text-gray-200 flex items-center justify-center"
                      onClick={() => handleLocationRemove(id)}
                      type="button"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ) : null;
              })}
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-2">
            <label className="text-base font-medium">Notes</label>
            <textarea
              className="w-full rounded-md p-3 min-h-[56px] bg-white border border-border"
              value={formState.notes || ""}
              onChange={(e) => setFormState({ notes: e.target.value })}
              placeholder="Enter Notes"
            />
          </div>
          <div className="flex justify-between mt-6 gap-4">
            <Button
              type="button"
              className="bg-gray-300 text-gray-800 px-8 py-2 rounded-md text-lg font-semibold hover:bg-gray-400"
              onClick={onBack}
            >
              Prev
            </Button>
            <Button
              type="submit"
              className="bg-button text-white px-10 py-2 rounded-md text-lg font-semibold hover:bg-buttonActive"
            >
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
