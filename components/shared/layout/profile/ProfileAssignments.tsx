/**
 * Profile Assignments Component
 *
 * Handles user roles, licensee assignments, and location permissions.
 */

'use client';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/shared/ui/card';
import { Checkbox } from '@/components/shared/ui/checkbox';
import MultiSelectDropdown, {
    type MultiSelectOption,
} from '@/components/shared/ui/common/MultiSelectDropdown';
import { Label } from '@/components/shared/ui/label';
import { Skeleton } from '@/components/shared/ui/skeleton';
import type { User } from '@/lib/types/administration';
import type { Licensee } from '@/lib/types/common';

type ProfileAssignmentsProps = {
  userData: User;
  isEditMode: boolean;
  selectedRoles: string[];
  setSelectedRoles: (roles: string[] | ((prev: string[]) => string[])) => void;
  licensees: Licensee[];
  licenseesLoading: boolean;
  allLicenseesSelected: boolean;
  onAllLicenseesToggle: (checked: boolean) => void;
  selectedLicenseeIds: string[];
  onLicenseeChange: (ids: string[]) => void;
  licenseeOptions: MultiSelectOption[];
  locations: Array<{ _id: string; name: string }>;
  locationsLoading: boolean;
  allLocationsSelected: boolean;
  onAllLocationsToggle: (checked: boolean) => void;
  selectedLocationIds: string[];
  onLocationChange: (ids: string[]) => void;
  locationOptions: MultiSelectOption[];
  availableLocations: Array<{ _id: string; name: string }>;
  missingLocationNames: Record<string, string>;
};

export default function ProfileAssignments({
  userData,
  isEditMode,
  selectedRoles,
  setSelectedRoles,
  licensees,
  licenseesLoading,
  allLicenseesSelected,
  onAllLicenseesToggle,
  selectedLicenseeIds,
  onLicenseeChange,
  licenseeOptions,
  locations,
  locationsLoading,
  allLocationsSelected,
  onAllLocationsToggle,
  selectedLocationIds,
  onLocationChange,
  locationOptions,
  availableLocations,
  missingLocationNames,
}: ProfileAssignmentsProps) {
  const roles = [
    'developer',
    'admin',
    'manager',
    'location admin',
    'technician',
    'collector',
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assignments</CardTitle>
        <CardDescription>
          Licensee and location access permissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Roles */}
          <div>
            <Label className="text-base font-medium text-gray-900">Roles</Label>
            <p className="mb-4 text-sm text-gray-500">
              Your assigned roles and permissions
            </p>
            {isEditMode && userData.roles?.includes('developer') ? (
              <div className="space-y-2">
                {roles.map(role => (
                  <div
                    key={role}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2"
                  >
                    <Checkbox
                      id={`role-${role}`}
                      checked={selectedRoles
                        .map(r => r.toLowerCase())
                        .includes(role.toLowerCase())}
                      onCheckedChange={checked => {
                        if (checked) {
                          setSelectedRoles(prev => [
                            ...prev.filter(
                              r => r.toLowerCase() !== role.toLowerCase()
                            ),
                            role,
                          ]);
                        } else {
                          setSelectedRoles(prev =>
                            prev.filter(
                              r => r.toLowerCase() !== role.toLowerCase()
                            )
                          );
                        }
                      }}
                    />
                    <Label
                      htmlFor={`role-${role}`}
                      className="cursor-pointer text-sm font-medium capitalize"
                    >
                      {role}
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {userData.roles?.length ? (
                  userData.roles.map((role, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium capitalize text-blue-800"
                    >
                      {role}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No roles assigned</p>
                )}
              </div>
            )}
          </div>

          {/* Licensees */}
          <div>
            <Label className="text-base font-medium text-gray-900">
              Assigned Licensees
            </Label>
            <p className="mb-4 text-sm text-gray-500">
              Licensees you have access to
            </p>
            {licenseesLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : isEditMode ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <Checkbox
                    id="allLicensees"
                    checked={allLicenseesSelected}
                    onCheckedChange={checked =>
                      onAllLicenseesToggle(checked === true)
                    }
                    disabled={licensees.length === 0}
                  />
                  <Label
                    htmlFor="allLicensees"
                    className="cursor-pointer text-sm font-medium"
                  >
                    All Licensees
                  </Label>
                </div>
                {!allLicenseesSelected && (
                  <MultiSelectDropdown
                    options={licenseeOptions}
                    selectedIds={selectedLicenseeIds}
                    onChange={onLicenseeChange}
                    label="licensees"
                    showSelectAll
                  />
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-700">
                {/* Simplified view for display mode */}
                {selectedLicenseeIds.length
                  ? selectedLicenseeIds
                      .map(
                        id => licensees.find(l => String(l._id) === id)?.name
                      )
                      .filter(Boolean)
                      .join(', ')
                  : 'No licensees assigned'}
              </div>
            )}
          </div>

          {/* Locations */}
          <div className="md:col-span-2">
            <Label className="text-base font-medium text-gray-900">
              Assigned Locations
            </Label>
            {locationsLoading ? (
              <Skeleton className="mt-4 h-24 w-full" />
            ) : isEditMode ? (
              <div className="mt-4 space-y-3 rounded-md border border-border bg-white p-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Checkbox
                    checked={allLocationsSelected}
                    onCheckedChange={checked =>
                      onAllLocationsToggle(checked === true)
                    }
                    disabled={availableLocations.length === 0}
                  />
                  All Locations
                </label>
                {!allLocationsSelected && (
                  <MultiSelectDropdown
                    options={locationOptions}
                    selectedIds={selectedLocationIds}
                    onChange={onLocationChange}
                    label="locations"
                    showSelectAll
                    disabled={availableLocations.length === 0}
                  />
                )}
              </div>
            ) : (
              <div className="mt-4 max-h-[300px] overflow-auto rounded-lg border border-gray-200">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                        Location
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                        Licensee
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {selectedLocationIds.length ? (
                      selectedLocationIds.map((id, i) => {
                        const loc = locations.find(l => String(l._id) === id);
                        return (
                          <tr key={i}>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {loc?.name || missingLocationNames[id] || id}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {licensees.find(
                                l =>
                                  String(l._id) ===
                                  (loc as { licenseeId?: string })?.licenseeId
                              )?.name || 'Unknown'}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={2}
                          className="px-4 py-3 text-center text-sm text-gray-500"
                        >
                          No locations assigned
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
