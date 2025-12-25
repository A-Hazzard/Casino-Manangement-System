/**
 * Add User Modal Component
 *
 * Modal for creating new users with role and permission assignments.
 *
 * @module components/administration/AddUserModal
 */

'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAddUserModal } from '@/lib/hooks/useAddUserModal';
import AddUserFormFields from './AddUserFormFields';
import AddUserPermissions from './AddUserPermissions';

type AddUserModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function AddUserModal({
  open,
  onClose,
  onSuccess,
}: AddUserModalProps) {
  const {
    formData,
    setFormData,
    isLoading,
    licenseeOptions,
    selectedLicenseeIds,
    setSelectedLicenseeIds,
    allLicenseesSelected,
    setAllLicenseesSelected,
    locationOptions,
    selectedLocationIds,
    setSelectedLocationIds,
    allLocationsSelected,
    setAllLocationsSelected,
    availableLocations,
    handleSave,
  } = useAddUserModal({ open, onClose, onSuccess });

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Add New User</DialogTitle>
        </DialogHeader>

        <div className="space-y-8 py-4">
          <section>
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">Basic Information</h3>
            <AddUserFormFields
              formData={formData}
              setFormData={setFormData}
              isLoading={isLoading}
            />
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">Permissions & Assignments</h3>
            <AddUserPermissions
              selectedRoles={formData.roles}
              setSelectedRoles={(roles) => setFormData({ ...formData, roles })}
              allLicenseesSelected={allLicenseesSelected}
              setAllLicenseesSelected={setAllLicenseesSelected}
              selectedLicenseeIds={selectedLicenseeIds}
              setSelectedLicenseeIds={setSelectedLicenseeIds}
              licenseeOptions={licenseeOptions}
              allLocationsSelected={allLocationsSelected}
              setAllLocationsSelected={setAllLocationsSelected}
              selectedLocationIds={selectedLocationIds}
              setSelectedLocationIds={setSelectedLocationIds}
              locationOptions={locationOptions}
              availableLocations={availableLocations}
            />
          </section>
              </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button
            onClick={handleSave}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Creating...' : 'Create User'}
              </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
