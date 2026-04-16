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
import { Skeleton } from '@/components/shared/ui/skeleton';
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
    licencees,
    licenceesLoading,
    licenceeOptions,
    locations,
    locationsLoading,
    locationOptions,
    availableLocations,
    missingLocationNames,
    selectedLicenceeIds,
    setSelectedLicenceeIds,
    selectedLocationIds,
    setSelectedLocationIds,
    allLicenceesSelected,
    setAllLicenceesSelected,
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
    emailAddress,
    setEmailAddress,
    isCurrentPasswordVerified,
    passwordReuseError,
    validateCurrentPassword,
    validateNewPassword,
  } = useProfileModal({ open, onClose });

  const handleInputChange = (
    field: string,
    value: string,
    section?: 'address' | 'identification'
  ) => {
    if (field === 'emailAddress') {
      setEmailAddress(value);
    } else if (section && formData) {
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
            userId={userData?._id}
          />

          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            {!userData ? (
              <div className="space-y-6">
                {/* Header skeleton */}
                <div className="flex items-center gap-4 rounded-xl border bg-white p-6">
                  <Skeleton className="h-20 w-20 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
                {/* Assignments skeleton */}
                <div className="rounded-xl border bg-white p-6 space-y-4">
                  <Skeleton className="h-5 w-32" />
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <Skeleton className="h-24 w-full" />
                </div>
                {/* Address / Identity skeleton */}
                <div className="rounded-xl border bg-white p-6 space-y-4">
                  <Skeleton className="h-5 w-32" />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <ProfileBasicInfo
                  userData={userData}
                  formData={formData}
                  isEditMode={isEditMode}
                  profilePicture={profilePicture}
                  emailAddress={emailAddress}
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
                  licencees={licencees}
                  licenceesLoading={licenceesLoading}
                  allLicenceesSelected={allLicenceesSelected}
                  onAllLicenceesToggle={setAllLicenceesSelected}
                  selectedLicenceeIds={selectedLicenceeIds}
                  onLicenceeChange={setSelectedLicenceeIds}
                  licenceeOptions={licenceeOptions}
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
                    isCurrentPasswordVerified={isCurrentPasswordVerified}
                    passwordReuseError={passwordReuseError}
                    validateCurrentPassword={validateCurrentPassword}
                    validateNewPassword={validateNewPassword}
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
                  disabled={isLoading || isCurrentPasswordVerified === false || !!passwordReuseError}
                  className="gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-500"
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

