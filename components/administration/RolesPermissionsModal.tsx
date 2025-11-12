import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import type { User, ResourcePermissions } from '@/lib/types/administration';
import type { LocationSelectItem } from '@/lib/types/location';
import { X } from 'lucide-react';
import gsap from 'gsap';

const ROLE_OPTIONS = [
  { label: 'Developer', value: 'developer' },
  { label: 'Administrator', value: 'admin' },
  { label: 'Manager', value: 'manager' },
  { label: 'Location Admin', value: 'location admin' },
  { label: 'Technician', value: 'technician' },
  { label: 'Collector', value: 'collector' },
  { label: 'Collector Meters', value: 'collector meters' },
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
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [roles, setRoles] = useState<string[]>(user?.roles || []);
  const [locations, setLocations] = useState<LocationSelectItem[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>(
    user?.resourcePermissions?.['gaming-locations']?.resources || []
  );
  const [locationSearch, setLocationSearch] = useState('');
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [allLocationsSelected, setAllLocationsSelected] = useState(false);

  useEffect(() => {
    if (open) {
      setRoles(user?.roles || []);
      const userLocationIds =
        user?.resourcePermissions?.['gaming-locations']?.resources || [];
      setSelectedLocationIds(userLocationIds);
      setPassword('');
      setConfirmPassword('');

      // Check if all locations are selected
      if (userLocationIds.length > 0 && locations.length > 0) {
        setAllLocationsSelected(userLocationIds.length === locations.length);
      } else {
        setAllLocationsSelected(false);
      }
    }
  }, [open, user, locations]);

  useEffect(() => {
    const loadLocations = async () => {
      try {
        // Fetch all locations with showAll parameter for admin access
        const response = await fetch('/api/locations?showAll=true', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          console.error('Failed to fetch locations');
          return;
        }
        
        const data = await response.json();
        const locationsList = data.locations || [];
        
        const formattedLocs = locationsList.map((loc: { _id?: string; id?: string; name?: string; locationName?: string }) => ({
          _id: (loc._id?.toString() || loc.id?.toString() || ''),
          name: (loc.name || loc.locationName || 'Unknown Location'),
        }));
        
      setLocations(formattedLocs);

      // Check if all locations are selected
      const userLocationIds =
        user?.resourcePermissions?.['gaming-locations']?.resources || [];
      if (userLocationIds.length > 0 && formattedLocs.length > 0) {
        setAllLocationsSelected(
          userLocationIds.length === formattedLocs.length
        );
      }
      } catch (error) {
        console.error('Error loading locations:', error);
      }
    };
    
    loadLocations();
  }, [user]);

  useEffect(() => {
    if (open && modalRef.current && backdropRef.current) {
      gsap.fromTo(
        modalRef.current,
        { y: 100, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' }
      );
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [open]);

  const handleRoleChange = (role: string, checked: boolean) => {
    setRoles(prev =>
      checked ? [...prev, role] : prev.filter(r => r !== role)
    );
  };

  const handleLocationSelect = (id: string) => {
    if (!selectedLocationIds.includes(id)) {
      const newSelectedIds = [...selectedLocationIds, id];
      setSelectedLocationIds(newSelectedIds);

      // Check if all locations are now selected
      if (newSelectedIds.length === locations.length) {
        setAllLocationsSelected(true);
      }
    }
  };

  const handleLocationRemove = (id: string) => {
    const newSelectedIds = selectedLocationIds.filter(locId => locId !== id);
    setSelectedLocationIds(newSelectedIds);
    setAllLocationsSelected(false);
  };

  const handleAllLocationsChange = (checked: boolean) => {
    setAllLocationsSelected(checked);
    if (checked) {
      // Select all locations
      setSelectedLocationIds(locations.map(loc => loc._id));
    } else {
      // Deselect all locations
      setSelectedLocationIds([]);
    }
  };

  const filteredLocations = locations.filter(loc =>
    loc.name.toLowerCase().includes(locationSearch.toLowerCase())
  );

  const handleSave = () => {
    if (password && password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    onSave({
      ...user,
      roles,
      password: password || undefined,
      resourcePermissions: {
        ...(user?.resourcePermissions || {}),
        'gaming-locations': {
          entity: 'gaming-locations',
          resources: selectedLocationIds,
        },
      },
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center md:items-center">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        ref={modalRef}
        className="absolute bottom-0 left-0 right-0 mx-auto flex max-h-[90vh] w-full max-w-lg flex-col gap-6 overflow-y-auto rounded-t-2xl bg-container p-6 shadow-lg animate-in md:relative md:bottom-auto md:left-0 md:right-auto md:top-0 md:my-0 md:max-h-none md:overflow-visible md:rounded-2xl md:p-10"
        style={{ opacity: 1 }}
      >
        {/* Close button */}
        <button
          className="absolute right-4 top-4 z-10 rounded-full bg-white p-2 shadow hover:bg-gray-100 md:right-6 md:top-6"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-6 w-6 text-gray-700" />
        </button>
        <h2 className="mb-2 text-center text-2xl font-bold text-buttonActive md:text-3xl">
          Roles & Permissions
        </h2>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="block text-base font-medium">Password</label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              className="rounded-md"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="block text-base font-medium">
              Confirm Password
            </label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              className="rounded-md"
            />
          </div>
          <div>
            <h3 className="mb-2 text-center text-lg font-semibold text-buttonActive">
              Roles
            </h3>
            <div className="grid grid-cols-2 justify-items-center gap-3 md:grid-cols-3 md:gap-4">
              {ROLE_OPTIONS.map(role => (
                <label
                  key={role.value}
                  className="flex cursor-pointer items-center gap-2 text-base font-medium text-buttonActive"
                >
                  <Checkbox
                    id={role.value}
                    checked={roles.includes(role.value)}
                    onCheckedChange={checked =>
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
            <h3 className="mb-2 text-center text-lg font-semibold text-buttonActive">
              Allowed Locations
            </h3>

            {/* All Locations Checkbox */}
            <div className="mb-3">
              <label className="flex cursor-pointer items-center gap-2 text-base font-medium text-buttonActive">
                <Checkbox
                  checked={allLocationsSelected}
                  onCheckedChange={checked =>
                    handleAllLocationsChange(checked === true)
                  }
                  className="border-2 border-buttonActive text-buttonActive focus:ring-buttonActive"
                />
                All Locations
              </label>
            </div>

            <div className="relative mb-2">
              <Input
                value={locationSearch}
                onChange={e => {
                  setLocationSearch(e.target.value);
                  setLocationDropdownOpen(true);
                }}
                onFocus={() => setLocationDropdownOpen(true)}
                onBlur={() =>
                  setTimeout(() => setLocationDropdownOpen(false), 150)
                }
                placeholder={
                  allLocationsSelected
                    ? 'All locations are selected'
                    : 'Select Location..'
                }
                className="w-full rounded-md pr-10"
                autoComplete="off"
                disabled={allLocationsSelected}
              />
              {/* Dropdown of filtered locations, or all if no search */}
              {!allLocationsSelected &&
                locationDropdownOpen &&
                (filteredLocations.length > 0 || locationSearch === '') && (
                  <div className="absolute left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                    {(locationSearch ? filteredLocations : locations).map(
                      loc => (
                        <button
                          key={loc._id}
                          type="button"
                          className="w-full px-4 py-2 text-left text-gray-900 hover:bg-blue-100"
                          onMouseDown={(e) => {
                            e.preventDefault(); // Prevent blur from firing
                            handleLocationSelect(loc._id);
                            setLocationSearch('');
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
              {allLocationsSelected ? (
                <span className="flex items-center rounded-full bg-green-500 px-4 py-2 text-sm font-medium text-white">
                  All Locations Selected ({locations.length} locations)
                  <button
                    className="ml-2 flex items-center justify-center text-white hover:text-gray-200"
                    onClick={() => handleAllLocationsChange(false)}
                    type="button"
                    title="Remove all locations"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </span>
              ) : (
                selectedLocationIds.map(id => {
                  const loc = locations.find(l => l._id === id);
                  return loc ? (
                    <span
                      key={id}
                      className="flex items-center rounded-full bg-blue-400 px-3 py-1 text-sm text-white"
                    >
                      {loc.name}
                      <button
                        className="ml-2 flex items-center justify-center text-white hover:text-gray-200"
                        onClick={() => handleLocationRemove(id)}
                        type="button"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </span>
                  ) : null;
                })
              )}
            </div>
          </div>
          <div className="mt-4 flex justify-center">
            <Button
              className="w-full rounded-md bg-button px-10 py-2 text-lg font-semibold text-white hover:bg-buttonActive md:w-auto"
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
