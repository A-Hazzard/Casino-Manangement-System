/**
 * Profile Address and Identity Component
 *
 * Handles address details and identification information (DOB, ID, etc.).
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import type { User } from '@/lib/types/administration';
import type { Country } from '@/lib/types/common';

type ProfileAddressIdentityProps = {
  formData: Partial<User['profile']>;
  isEditMode: boolean;
  countries: Country[];
  countriesLoading: boolean;
  onInputChange: (field: string, value: string, section?: 'address' | 'identification') => void;
  validationErrors: Record<string, string>;
  setValidationErrors: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
};

export default function ProfileAddressIdentity({
  formData,
  isEditMode,
  countries,
  onInputChange,
  validationErrors,
  setValidationErrors,
}: ProfileAddressIdentityProps) {
  const handleInputChangeWithValidation = (
    field: string,
    value: string,
    section?: 'address' | 'identification'
  ) => {
    onInputChange(field, value, section);
    // Clear error when user starts typing
    const errorKey = section ? `${section}.${field}` : field;
    if (validationErrors[errorKey] || validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
          <CardDescription>Physical address information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Street</Label>
              {isEditMode ? (
                <Input value={formData?.address?.street || ''} onChange={e => onInputChange('street', e.target.value, 'address')} className="mt-2" />
              ) : (
                <p className="mt-2 text-sm text-gray-900">{formData?.address?.street || '-'}</p>
              )}
            </div>
            <div>
              <Label>Town</Label>
              {isEditMode ? (
                <>
                  <Input
                    value={formData?.address?.town || ''}
                    onChange={e =>
                      handleInputChangeWithValidation('town', e.target.value, 'address')
                    }
                    className={`mt-2 ${validationErrors.town ? 'border-red-500' : ''}`}
                  />
                  {validationErrors.town && (
                    <p className="mt-1.5 text-sm text-red-600">
                      {validationErrors.town}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-sm text-gray-900">
                  {formData?.address?.town || '-'}
                </p>
              )}
            </div>
            <div>
              <Label>Region</Label>
              {isEditMode ? (
                <>
                  <Input
                    value={formData?.address?.region || ''}
                    onChange={e =>
                      handleInputChangeWithValidation('region', e.target.value, 'address')
                    }
                    className={`mt-2 ${validationErrors.region ? 'border-red-500' : ''}`}
                  />
                  {validationErrors.region && (
                    <p className="mt-1.5 text-sm text-red-600">
                      {validationErrors.region}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-sm text-gray-900">
                  {formData?.address?.region || '-'}
                </p>
              )}
            </div>
            <div>
              <Label>Country</Label>
              {isEditMode ? (
                <>
                  <select
                    className={`mt-2 h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ${
                      validationErrors.country ? 'border-red-500' : ''
                    }`}
                    value={formData?.address?.country || ''}
                    onChange={e =>
                      handleInputChangeWithValidation('country', e.target.value, 'address')
                    }
                  >
                    <option value="">Select country</option>
                    {countries.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {validationErrors.country && (
                    <p className="mt-1.5 text-sm text-red-600">
                      {validationErrors.country}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-sm text-gray-900">
                  {countries.find(c => c._id === formData?.address?.country)?.name ||
                    formData?.address?.country ||
                    '-'}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Identification</CardTitle>
          <CardDescription>Verification details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Date of Birth</Label>
              {isEditMode ? (
                <>
                  <Input
                    type="date"
                    value={
                      formData?.identification?.dateOfBirth?.split('T')[0] || ''
                    }
                    onChange={e =>
                      handleInputChangeWithValidation(
                        'dateOfBirth',
                        e.target.value,
                        'identification'
                      )
                    }
                    max={new Date().toISOString().split('T')[0]}
                    className={`mt-2 ${
                      validationErrors.dateOfBirth ? 'border-red-500' : ''
                    }`}
                  />
                  {validationErrors.dateOfBirth && (
                    <p className="mt-1.5 text-sm text-red-600">
                      {validationErrors.dateOfBirth}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-sm text-gray-900">
                  {formData?.identification?.dateOfBirth
                    ? new Date(formData.identification.dateOfBirth).toLocaleDateString()
                    : '-'}
                </p>
              )}
            </div>
            <div>
              <Label>ID Type</Label>
              {isEditMode ? (
                <>
                  <Input
                    value={formData?.identification?.idType || ''}
                    onChange={e =>
                      handleInputChangeWithValidation(
                        'idType',
                        e.target.value,
                        'identification'
                      )
                    }
                    placeholder="Enter ID type (e.g., National ID, Passport)"
                    className={`mt-2 ${
                      validationErrors.idType ? 'border-red-500' : ''
                    }`}
                  />
                  {validationErrors.idType && (
                    <p className="mt-1.5 text-sm text-red-600">
                      {validationErrors.idType}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-sm text-gray-900 capitalize">
                  {formData?.identification?.idType || '-'}
                </p>
              )}
            </div>
            <div>
              <Label>ID Number</Label>
              {isEditMode ? (
                <>
                  <Input
                    value={formData?.identification?.idNumber || ''}
                    onChange={e =>
                      handleInputChangeWithValidation(
                        'idNumber',
                        e.target.value,
                        'identification'
                      )
                    }
                    placeholder="Enter ID number"
                    className={`mt-2 ${
                      validationErrors.idNumber ? 'border-red-500' : ''
                    }`}
                  />
                  {validationErrors.idNumber && (
                    <p className="mt-1.5 text-sm text-red-600">
                      {validationErrors.idNumber}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-sm text-gray-900">
                  {formData?.identification?.idNumber || '-'}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}


