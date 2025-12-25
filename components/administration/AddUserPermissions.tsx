/**
 * Add User Permissions Component
 */

'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import MultiSelectDropdown, { type MultiSelectOption } from '@/components/ui/common/MultiSelectDropdown';

type AddUserPermissionsProps = {
  selectedRoles: string[];
  setSelectedRoles: (roles: string[]) => void;
  allLicenseesSelected: boolean;
  setAllLicenseesSelected: (val: boolean) => void;
  selectedLicenseeIds: string[];
  setSelectedLicenseeIds: (ids: string[]) => void;
  licenseeOptions: MultiSelectOption[];
  allLocationsSelected: boolean;
  setAllLocationsSelected: (val: boolean) => void;
  selectedLocationIds: string[];
  setSelectedLocationIds: (ids: string[]) => void;
  locationOptions: MultiSelectOption[];
  availableLocations: unknown[];
};

export default function AddUserPermissions({
  selectedRoles,
  setSelectedRoles,
  allLicenseesSelected,
  setAllLicenseesSelected,
  selectedLicenseeIds,
  setSelectedLicenseeIds,
  licenseeOptions,
  allLocationsSelected,
  setAllLocationsSelected,
  selectedLocationIds,
  setSelectedLocationIds,
  locationOptions,
  availableLocations,
}: AddUserPermissionsProps) {
  const roles = ['developer', 'admin', 'manager', 'location admin', 'technician', 'collector'];

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-medium">Roles</Label>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {roles.map(role => (
            <div key={role} className="flex items-center gap-2 rounded-lg border p-2">
              <Checkbox
                id={`role-${role}`}
                checked={selectedRoles.includes(role)}
                onCheckedChange={checked => {
                  if (checked) setSelectedRoles([...selectedRoles, role]);
                  else setSelectedRoles(selectedRoles.filter(r => r !== role));
                }}
              />
              <Label htmlFor={`role-${role}`} className="cursor-pointer capitalize text-sm">{role}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <Label className="text-base font-medium">Licensee Assignments</Label>
          <div className="mt-2 flex items-center gap-2 rounded-lg border p-3">
            <Checkbox
              id="allLicensees"
              checked={allLicenseesSelected}
              onCheckedChange={checked => setAllLicenseesSelected(checked === true)}
            />
            <Label htmlFor="allLicensees" className="cursor-pointer text-sm font-medium">All Licensees</Label>
          </div>
          {!allLicenseesSelected && (
            <div className="mt-3">
              <MultiSelectDropdown
                options={licenseeOptions}
                selectedIds={selectedLicenseeIds}
                onChange={setSelectedLicenseeIds}
                label="licensees"
                showSelectAll
              />
            </div>
          )}
        </div>

        <div>
          <Label className="text-base font-medium">Location Assignments</Label>
          <div className="mt-2 flex items-center gap-2 rounded-lg border p-3">
            <Checkbox
              id="allLocations"
              checked={allLocationsSelected}
              onCheckedChange={checked => setAllLocationsSelected(checked === true)}
              disabled={availableLocations.length === 0}
            />
            <Label htmlFor="allLocations" className="cursor-pointer text-sm font-medium">All Locations</Label>
          </div>
          {!allLocationsSelected && (
            <div className="mt-3">
              <MultiSelectDropdown
                options={locationOptions}
                selectedIds={selectedLocationIds}
                onChange={setSelectedLocationIds}
                label="locations"
                showSelectAll
                disabled={availableLocations.length === 0}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

