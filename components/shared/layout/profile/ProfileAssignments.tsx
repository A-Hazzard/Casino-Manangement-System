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
import { useMemo } from 'react';

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
  locations: Array<{ 
    _id: string; 
    name: string; 
    licenseeId?: string | string[]; 
    licensee?: string | string[];
    rel?: {
      licensee?: string | string[];
      licencee?: string | string[];
    }
  }>;
  locationsLoading: boolean;
  allLocationsSelected: boolean;
  onAllLocationsToggle: (checked: boolean) => void;
  selectedLocationIds: string[];
  onLocationChange: (ids: string[]) => void;
  locationOptions: MultiSelectOption[];
  availableLocations: Array<{ _id: string; name: string; licenseeId?: string | string[] }>;
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

  const displayRows = useMemo(() => {
    // If "All Locations" (the master global flag) is checked or if 'all' is in selectedLocationIds
    const isActuallyAllSelected = allLocationsSelected || selectedLocationIds.includes('all');
    
    if (isActuallyAllSelected) {
      return locations.map(loc => {
        const lid = loc.licenseeId || loc.rel?.licensee || loc.rel?.licencee || loc.licensee;
        const lic = licensees.find(l => String(l._id) === (Array.isArray(lid) ? String(lid[0]) : String(lid)));
        return {
          locationName: loc.name,
          licenseeName: lic?.name || 'Unknown',
          id: String(loc._id),
        };
      }).sort((a, b) => a.locationName.localeCompare(b.locationName));
    }

    const rows: Array<{ locationName: string; licenseeName: string; id: string }> = [];
    const processedLocationIds = new Set<string>();

    selectedLocationIds.forEach(id => {
      if (!id || id === 'all') return;
      
      const licensee = licensees.find(l => String(l._id) === id);
      if (licensee) {
        // It's a licensee ID - find all locations for it
        const licenseeLocations = locations.filter(loc => {
          const lid = loc.licenseeId || loc.rel?.licensee || loc.rel?.licencee || loc.licensee;
          if (Array.isArray(lid)) {
             return lid.some(l => String(l) === String(licensee._id));
          }
          return String(lid) === String(licensee._id);
        });
        
        licenseeLocations.forEach(loc => {
          if (!processedLocationIds.has(String(loc._id))) {
            rows.push({
              locationName: loc.name,
              licenseeName: licensee.name,
              id: String(loc._id)
            });
            processedLocationIds.add(String(loc._id));
          }
        });
      } else {
        // Regular location ID
        const loc = locations.find(l => String(l._id) === id);
        if (loc) {
          if (!processedLocationIds.has(String(loc._id))) {
            const lid = loc.licenseeId || loc.rel?.licensee || loc.rel?.licencee || loc.licensee;
            const singleLid = Array.isArray(lid) ? lid[0] : lid;
            const lic = licensees.find(l => String(l._id) === String(singleLid));
            rows.push({
              locationName: loc.name,
              licenseeName: lic?.name || 'Unknown',
              id: String(loc._id)
            });
            processedLocationIds.add(String(loc._id));
          }
        } else {
          rows.push({
            locationName: missingLocationNames[id] || id,
            licenseeName: 'Unknown',
            id
          });
        }
      }
    });

    return rows.sort((a, b) => a.locationName.localeCompare(b.locationName));
  }, [allLocationsSelected, selectedLocationIds, locations, licensees, missingLocationNames]);

  // Only admins and developers can edit assigned locations and licensees
  const canEditAssignments = userData.roles?.some(role =>
    ['admin', 'developer'].includes(role.toLowerCase())
  );

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
            {isEditMode && userData.roles?.some(r => ['admin', 'developer'].includes(r.toLowerCase())) ? (
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
            ) : isEditMode && canEditAssignments ? (
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
              <div className="text-sm font-medium text-gray-600">
                {selectedLicenseeIds.length
                  ? selectedLicenseeIds
                      .map(
                        id => licensees.find(l => String(l._id) === id)?.name || id
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
            ) : isEditMode && canEditAssignments ? (
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
                    {displayRows.length ? (
                      displayRows.map((row, i) => (
                        <tr key={i}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {row.locationName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {row.licenseeName}
                          </td>
                        </tr>
                      ))
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
