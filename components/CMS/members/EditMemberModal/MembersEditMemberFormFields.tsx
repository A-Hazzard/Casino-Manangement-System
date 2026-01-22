/**
 * Members Edit Member Form Fields Component
 * 
 * Contains all form input fields for editing member information
 * 
 * Features:
 * - Username and email fields with uniqueness validation
 * - Name fields (first/last)
 * - Contact information fields
 * - Account fields (points, uaccount, location)
 * 
 * @param props - Component props
 */

'use client';

import LocationSingleSelect from '@/components/shared/ui/common/LocationSingleSelect';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';

type MembersEditMemberFormFieldsProps = {
  formData: {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    phoneNumber: string;
    occupation: string;
    address: string;
    points: number;
    uaccount: number;
    gamingLocation: string;
  };
  locations: Array<{ id: string; name: string; sasEnabled?: boolean }>;
  errors: Record<string, string>;
  checkingUniqueness: {
    username: boolean;
    email: boolean;
  };
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLocationChange: (locationId: string) => void;
  onFieldTouch: (fieldName: string) => void;
};

export default function MembersEditMemberFormFields({
  formData,
  locations,
  errors,
  checkingUniqueness,
  onInputChange,
  onLocationChange,
  onFieldTouch,
}: MembersEditMemberFormFieldsProps) {
  return (
    <div className="flex-1 space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Username Field */}
        <div>
          <Label htmlFor="username" className="text-gray-700">
            Username *
          </Label>
          <div className="relative mt-2">
            <Input
              id="username"
              name="username"
              value={formData.username}
              onChange={onInputChange}
              onBlur={() => onFieldTouch('username')}
              placeholder="Enter username"
              className={`${
                errors.username
                  ? 'border-red-500'
                  : 'border-gray-300'
              }`}
              disabled={checkingUniqueness.username}
            />
            {checkingUniqueness.username && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"></div>
              </div>
            )}
          </div>
          {errors.username && (
            <p className="mt-1.5 text-sm text-red-600">
              {errors.username}
            </p>
          )}
        </div>

        {/* Email Field */}
        <div>
          <Label htmlFor="email" className="text-gray-700">
            Email Address
          </Label>
          <div className="relative mt-2">
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={onInputChange}
              onBlur={() => onFieldTouch('email')}
              placeholder="Enter email address"
              className={`${
                errors.email
                  ? 'border-red-500'
                  : 'border-gray-300'
              }`}
              disabled={checkingUniqueness.email}
            />
            {checkingUniqueness.email && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"></div>
              </div>
            )}
          </div>
          {errors.email && (
            <p className="mt-1.5 text-sm text-red-600">
              {errors.email}
            </p>
          )}
        </div>

        {/* First Name Field */}
        <div>
          <Label htmlFor="firstName" className="text-gray-700">
            First Name *
          </Label>
          <Input
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={onInputChange}
            onBlur={() => onFieldTouch('firstName')}
            placeholder="Enter first name"
            className={`mt-2 ${
              errors.firstName
                ? 'border-red-500'
                : 'border-gray-300'
            }`}
          />
          {errors.firstName && (
            <p className="mt-1.5 text-sm text-red-600">
              {errors.firstName}
            </p>
          )}
        </div>

        {/* Last Name Field */}
        <div>
          <Label htmlFor="lastName" className="text-gray-700">
            Last Name *
          </Label>
          <Input
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={onInputChange}
            onBlur={() => onFieldTouch('lastName')}
            placeholder="Enter last name"
            className={`mt-2 ${
              errors.lastName
                ? 'border-red-500'
                : 'border-gray-300'
            }`}
          />
          {errors.lastName && (
            <p className="mt-1.5 text-sm text-red-600">
              {errors.lastName}
            </p>
          )}
        </div>

        {/* Phone Number Field */}
        <div>
          <Label htmlFor="phoneNumber" className="text-gray-700">
            Phone Number
          </Label>
          <Input
            id="phoneNumber"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={onInputChange}
            onBlur={() => onFieldTouch('phoneNumber')}
            placeholder="Enter phone number"
            className={`mt-2 ${
              errors.phoneNumber
                ? 'border-red-500'
                : 'border-gray-300'
            }`}
          />
          {errors.phoneNumber && (
            <p className="mt-1.5 text-sm text-red-600">
              {errors.phoneNumber}
            </p>
          )}
        </div>

        {/* Occupation Field */}
        <div>
          <Label htmlFor="occupation" className="text-gray-700">
            Occupation
          </Label>
          <Input
            id="occupation"
            name="occupation"
            value={formData.occupation}
            onChange={onInputChange}
            onBlur={() => onFieldTouch('occupation')}
            placeholder="Enter occupation"
            className={`mt-2 ${
              errors.occupation
                ? 'border-red-500'
                : 'border-gray-300'
            }`}
          />
          {errors.occupation && (
            <p className="mt-1.5 text-sm text-red-600">
              {errors.occupation}
            </p>
          )}
        </div>
      </div>

      {/* Address Field - Full Width */}
      <div>
        <Label htmlFor="address" className="text-gray-700">
          Address
        </Label>
        <Input
          id="address"
          name="address"
          value={formData.address}
          onChange={onInputChange}
          onBlur={() => onFieldTouch('address')}
          placeholder="Enter street address"
          className={`mt-2 ${
            errors.address
              ? 'border-red-500'
              : 'border-gray-300'
          }`}
        />
        {errors.address && (
          <p className="mt-1.5 text-sm text-red-600">
            {errors.address}
          </p>
        )}
      </div>

      {/* Account Information Section */}
      <div className="grid grid-cols-1 gap-4 border-t border-gray-200 pt-4 sm:grid-cols-3">
        {/* Points Field */}
        <div>
          <Label htmlFor="points" className="text-gray-700">
            Points
          </Label>
          <Input
            id="points"
            name="points"
            type="number"
            value={formData.points}
            onChange={onInputChange}
            onBlur={() => onFieldTouch('points')}
            placeholder="0"
            className="mt-2 border-gray-300"
            min="0"
          />
        </div>

        {/* UAccount Field */}
        <div>
          <Label htmlFor="uaccount" className="text-gray-700">
            UAccount
          </Label>
          <Input
            id="uaccount"
            name="uaccount"
            type="number"
            value={formData.uaccount}
            onChange={onInputChange}
            onBlur={() => onFieldTouch('uaccount')}
            placeholder="0"
            className="mt-2 border-gray-300"
            min="0"
          />
        </div>

        {/* Gaming Location Field */}
        <div>
          <Label htmlFor="gamingLocation" className="text-gray-700">
            Gaming Location
          </Label>
          <div className="mt-2">
            <LocationSingleSelect
              locations={locations}
              selectedLocation={formData.gamingLocation}
              onSelectionChange={locationId => {
                onLocationChange(locationId);
                onFieldTouch('gamingLocation');
              }}
              placeholder="Select location..."
              includeAllOption={false}
              showSasBadge={false}
              className="w-full"
              searchPlaceholder="Search locations..."
              emptyMessage="No locations found"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

