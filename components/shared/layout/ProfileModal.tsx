/**
 * Profile Modal Component
 *
 * Comprehensive user profile editor with image upload, form validation, and change detection.
 * Handles user profile data, profile picture, password changes, and permissions.
 *
 * @module components/layout/ProfileModal
 */

'use client';

import { Button } from '@/components/shared/ui/button';
import CircleCropModal from '@/components/shared/ui/image/CircleCropModal';
import { useProfileModal } from '@/lib/hooks/useProfileModal';
import * as Dialog from '@radix-ui/react-dialog';
import { Save, X } from 'lucide-react';
import ProfileAddressIdentity from './profile/ProfileAddressIdentity';
import ProfileAssignments from './profile/ProfileAssignments';
import ProfileBasicInfo from './profile/ProfileBasicInfo';
import ProfileHeader from './profile/ProfileHeader';
import ProfilePassword from './profile/ProfilePassword';

type ProfileModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function ProfileModal({ open, onClose }: ProfileModalProps) {
  const {
    userData,
    formData,
    setFormData,
    passwordData,
    setPasswordData,
    isLoading,
    isEditMode,
    setIsEditMode,
    countries,
    countriesLoading,
    licensees,
    licenseesLoading,
    licenseeOptions,
    locations,
    locationsLoading,
    locationOptions,
    availableLocations,
    missingLocationNames,
    selectedLicenseeIds,
    setSelectedLicenseeIds,
    selectedLocationIds,
    setSelectedLocationIds,
    allLicenseesSelected,
    setAllLicenseesSelected,
    allLocationsSelected,
    setAllLocationsSelected,
    selectedRoles,
    setSelectedRoles,
    profilePicture,
    isCropOpen,
    setIsCropOpen,
    rawImageSrc,
    fileInputRef,
    handleFileSelect,
    handleCropComplete,
    handleSave,
    handlePasswordChange,
    passwordStrength,
    validationErrors,
    setValidationErrors,
  } = useProfileModal({ open, onClose });

  const handleInputChange = (
    field: string,
    value: string,
    section?: 'address' | 'identification'
  ) => {
      if (section && formData) {
      setFormData({
        ...formData,
        [section]: {
          ...(formData[section] as Record<string, string>),
          [field]: value,
        },
      });
    } else {
      setFormData({ ...formData, [field]: value });
    }
  };

  if (!open) return null;

        return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[99998] bg-black/50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-[99999] flex max-h-[95vh] w-full max-w-6xl translate-x-[-50%] translate-y-[-50%] flex-col overflow-hidden rounded-xl bg-gray-50 shadow-2xl">
          <Dialog.Title className="sr-only">My Profile</Dialog.Title>

          <ProfileHeader
            isEditMode={isEditMode}
            onToggleEdit={() => setIsEditMode(!isEditMode)}
            onClose={onClose}
          />

          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            {userData && (
              <>
                <ProfileBasicInfo
                  userData={userData}
                  formData={formData}
                  isEditMode={isEditMode}
                  profilePicture={profilePicture}
                  onInputChange={handleInputChange}
                  onEditProfilePicture={() => fileInputRef.current?.click()}
                  onRemoveProfilePicture={() => {
                    /* handle remove picture logic if needed */
                  }}
                  fileInputRef={fileInputRef}
                  onFileSelect={handleFileSelect}
                  validationErrors={validationErrors}
                  setValidationErrors={setValidationErrors}
                />

                <ProfileAssignments
                  userData={userData}
                  isEditMode={isEditMode}
                  selectedRoles={selectedRoles}
                  setSelectedRoles={setSelectedRoles}
                  licensees={licensees}
                  licenseesLoading={licenseesLoading}
                  allLicenseesSelected={allLicenseesSelected}
                  onAllLicenseesToggle={setAllLicenseesSelected}
                  selectedLicenseeIds={selectedLicenseeIds}
                  onLicenseeChange={setSelectedLicenseeIds}
                  licenseeOptions={licenseeOptions}
                  locations={locations}
                  locationsLoading={locationsLoading}
                  allLocationsSelected={allLocationsSelected}
                  onAllLocationsToggle={setAllLocationsSelected}
                  selectedLocationIds={selectedLocationIds}
                  onLocationChange={setSelectedLocationIds}
                  locationOptions={locationOptions}
                  availableLocations={availableLocations}
                  missingLocationNames={missingLocationNames}
                />

                <ProfileAddressIdentity
                  formData={formData}
                  isEditMode={isEditMode}
                  countries={countries}
                  countriesLoading={countriesLoading}
                  onInputChange={handleInputChange}
                  validationErrors={validationErrors}
                  setValidationErrors={setValidationErrors}
                />

                    {isEditMode && (
                  <ProfilePassword
                    passwordData={passwordData}
                    setPasswordData={setPasswordData}
                    isLoading={isLoading}
                    onPasswordChange={handlePasswordChange}
                    passwordStrength={passwordStrength}
                  />
                )}

          {isEditMode && (
                  <div className="sticky bottom-0 flex justify-end gap-3 border-t border-gray-200 bg-gray-50 pb-2 pt-4">
                <Button
                  variant="outline"
                      onClick={() => setIsEditMode(false)}
                      disabled={isLoading}
                      className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isLoading}
                      className="gap-2 bg-green-600 hover:bg-green-700"
                    >
                      <Save className="h-4 w-4" />
                      {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
          )}
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>

      {isCropOpen && rawImageSrc && (
        <CircleCropModal
          open={isCropOpen}
          imageSrc={rawImageSrc}
          onCropped={handleCropComplete}
          onClose={() => setIsCropOpen(false)}
        />
      )}
    </Dialog.Root>
  );
}

