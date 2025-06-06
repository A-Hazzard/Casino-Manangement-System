import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { fetchAllGamingLocations } from "@/lib/helpers/locations";
import type { User, ResourcePermissions } from "@/lib/types/administration";
import type { LocationSelectItem } from "@/lib/types/location";
import { X } from "lucide-react";
import gsap from "gsap";

const ROLE_OPTIONS = [
  { label: "Technician", value: "technician" },
  { label: "Collector", value: "collector" },
  { label: "Collector Meters", value: "collectormeters" },
  { label: "Location Admin", value: "locationadmin" },
  { label: "Manager", value: "manager" },
  { label: "Administrator", value: "admin" },
];

export type RolesPermissionsModalProps = {
  open: boolean;
  onClose: () => void;
  user: User | null;
  onSave: (
    user: Partial<User> & {
      password?: string;
      resourcePermissions: ResourcePermissions;
    }
  ) => void;
};

export default function RolesPermissionsModal({
  open,
  onClose,
  user,
  onSave,
}: RolesPermissionsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [roles, setRoles] = useState<string[]>(user?.roles || []);
  const [locations, setLocations] = useState<LocationSelectItem[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>(
    user?.resourcePermissions?.["gaming-locations"]?.resources || []
  );
  const [locationSearch, setLocationSearch] = useState("");
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setRoles(user?.roles || []);
      setSelectedLocationIds(
        user?.resourcePermissions?.["gaming-locations"]?.resources || []
      );
      setPassword("");
      setConfirmPassword("");
    }
  }, [open, user]);

  useEffect(() => {
    fetchAllGamingLocations().then((locs) => {
      setLocations(
        locs.map((loc) => {
          let _id = "";
          if ("id" in loc && typeof loc.id === "string") _id = loc.id;
          else if ("_id" in loc && typeof loc._id === "string") _id = loc._id;
          return { _id, name: loc.name };
        })
      );
    });
  }, []);

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

  const handleRoleChange = (role: string, checked: boolean) => {
    setRoles((prev) =>
      checked ? [...prev, role] : prev.filter((r) => r !== role)
    );
  };

  const handleLocationSelect = (id: string) => {
    if (!selectedLocationIds.includes(id)) {
      setSelectedLocationIds([...selectedLocationIds, id]);
    }
  };

  const handleLocationRemove = (id: string) => {
    setSelectedLocationIds(selectedLocationIds.filter((locId) => locId !== id));
  };

  const filteredLocations = locations.filter((loc) =>
    loc.name.toLowerCase().includes(locationSearch.toLowerCase())
  );

  const handleSave = () => {
    if (password && password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    onSave({
      ...user,
      roles,
      password: password || undefined,
      resourcePermissions: {
        ...(user?.resourcePermissions || {}),
        "gaming-locations": {
          entity: "gaming-locations",
          resources: selectedLocationIds,
        },
      },
    });
  };

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
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-base font-medium">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="rounded-md"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-base font-medium">Confirm Password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              className="rounded-md"
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
                    checked={roles.includes(role.value)}
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
              {/* Dropdown of filtered locations, or all if no search */}
              {locationDropdownOpen &&
                (filteredLocations.length > 0 || locationSearch === "") && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                    {(locationSearch ? filteredLocations : locations).map(
                      (loc) => (
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
                      )
                    )}
                  </div>
                )}
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedLocationIds.map((id) => {
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
          <div className="flex justify-center mt-4">
            <Button
              className="bg-button text-white px-10 py-2 rounded-md text-lg font-semibold hover:bg-buttonActive w-full md:w-auto"
              onClick={handleSave}
            >
              SAVE
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
