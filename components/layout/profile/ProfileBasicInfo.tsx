/**
 * Profile Basic Information Component
 *
 * Handles profile picture, username, email, phone, and name details.
 */

'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { User } from '@/lib/types/administration';
import defaultAvatar from '@/public/defaultAvatar.svg';
import { Camera, Trash2 } from 'lucide-react';
import Image from 'next/image';

type ProfileBasicInfoProps = {
  userData: User;
  formData: Partial<User['profile']>;
  isEditMode: boolean;
  profilePicture: string | null;
  onInputChange: (field: string, value: string) => void;
  onEditProfilePicture: () => void;
  onRemoveProfilePicture: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  validationErrors: Record<string, string>;
  setValidationErrors: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
};

export default function ProfileBasicInfo({
  userData,
  formData,
  isEditMode,
  profilePicture,
  onInputChange,
  onEditProfilePicture,
  onRemoveProfilePicture,
  fileInputRef,
  onFileSelect,
  validationErrors,
  setValidationErrors,
}: ProfileBasicInfoProps) {
  const handleInputChangeWithValidation = (
    field: string,
    value: string
  ) => {
    onInputChange(field, value);
    // Clear error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>
          Basic account information and contact details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          {/* Profile Picture */}
          <div className="flex flex-col items-center lg:items-start">
            <div className="relative">
              <Image
                src={profilePicture || userData.profilePicture || defaultAvatar}
                alt="Avatar"
                width={140}
                height={140}
                className="rounded-full border-4 border-gray-100 bg-gray-50 shadow-sm"
              />
              {isEditMode && (
                <>
                  <button
                    type="button"
                    className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-blue-600 shadow-md transition-colors hover:bg-blue-700"
                    onClick={onEditProfilePicture}
                  >
                    <Camera className="h-5 w-5 text-white" />
                  </button>
                  {(profilePicture || userData.profilePicture) && (
                    <button
                      type="button"
                      className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 shadow-md transition-colors hover:bg-red-600"
                      onClick={onRemoveProfilePicture}
                    >
                      <Trash2 className="h-4 w-4 text-white" />
                    </button>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={onFileSelect}
                    className="hidden"
                  />
                </>
              )}
            </div>
            <div className="mt-3 flex flex-col items-center gap-1 lg:items-start">
              <h3 className="text-lg font-semibold text-gray-900">
                {userData.username}
              </h3>
              <p className="break-words text-sm text-gray-600">
                {userData.email || userData.emailAddress}
              </p>
            </div>
          </div>

          {/* Form Grid */}
          <div className="flex-1">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Username</Label>
                <p className="mt-2 text-sm text-gray-900">
                  {userData.username || '-'}
                </p>
              </div>
              <div>
                <Label>Email Address</Label>
                <p className="mt-2 text-sm text-gray-900">
                  {userData.email || userData.emailAddress || '-'}
                </p>
              </div>
              <div>
                <Label>Phone Number</Label>
                {isEditMode ? (
                  <Input
                    type="tel"
                    value={formData?.phoneNumber || ''}
                    onChange={e =>
                      handleInputChangeWithValidation('phoneNumber', e.target.value)
                    }
                    placeholder="Enter phone number"
                    className="mt-2"
                  />
                ) : (
                  <p className="mt-2 text-sm text-gray-900">
                    {formData?.phoneNumber || '-'}
                  </p>
                )}
              </div>
              <div>
                <Label>Gender</Label>
                {isEditMode ? (
                  <select
                    className="mt-2 h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    value={formData?.gender || ''}
                    onChange={e =>
                      handleInputChangeWithValidation('gender', e.target.value)
                    }
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                ) : (
                  <p className="mt-2 text-sm capitalize text-gray-900">
                    {formData?.gender || '-'}
                  </p>
                )}
              </div>
              <div>
                <Label>First Name</Label>
                {isEditMode ? (
                  <>
                    <Input
                      value={formData?.firstName || ''}
                      onChange={e =>
                        handleInputChangeWithValidation('firstName', e.target.value)
                      }
                      placeholder="Enter first name"
                      className={`mt-2 ${
                        validationErrors.firstName ? 'border-red-500' : ''
                      }`}
                    />
                    {validationErrors.firstName && (
                      <p className="mt-1.5 text-sm text-red-600">
                        {validationErrors.firstName}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-2 text-sm text-gray-900">
                    {formData?.firstName || '-'}
                  </p>
                )}
              </div>
              <div>
                <Label>Last Name</Label>
                {isEditMode ? (
                  <>
                    <Input
                      value={formData?.lastName || ''}
                      onChange={e =>
                        handleInputChangeWithValidation('lastName', e.target.value)
                      }
                      placeholder="Enter last name"
                      className={`mt-2 ${
                        validationErrors.lastName ? 'border-red-500' : ''
                      }`}
                    />
                    {validationErrors.lastName && (
                      <p className="mt-1.5 text-sm text-red-600">
                        {validationErrors.lastName}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-2 text-sm text-gray-900">
                    {formData?.lastName || '-'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
