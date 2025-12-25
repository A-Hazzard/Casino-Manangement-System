/**
 * Profile Address and Identity Component
 *
 * Handles address details and identification information (DOB, ID, etc.).
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { User } from '@/lib/types/administration';
import type { Country } from '@/lib/types/country';

type ProfileAddressIdentityProps = {
  formData: Partial<User['profile']>;
  isEditMode: boolean;
  countries: Country[];
  countriesLoading: boolean;
  onInputChange: (field: string, value: string, section?: 'address' | 'identification') => void;
};

export default function ProfileAddressIdentity({
  formData,
  isEditMode,
  countries,
  onInputChange,
}: ProfileAddressIdentityProps) {
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
                <Input value={formData?.address?.town || ''} onChange={e => onInputChange('town', e.target.value, 'address')} className="mt-2" />
              ) : (
                <p className="mt-2 text-sm text-gray-900">{formData?.address?.town || '-'}</p>
              )}
            </div>
            <div>
              <Label>Region</Label>
              {isEditMode ? (
                <Input value={formData?.address?.region || ''} onChange={e => onInputChange('region', e.target.value, 'address')} className="mt-2" />
              ) : (
                <p className="mt-2 text-sm text-gray-900">{formData?.address?.region || '-'}</p>
              )}
            </div>
            <div>
              <Label>Country</Label>
              {isEditMode ? (
                <select
                  className="mt-2 h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={formData?.address?.country || ''}
                  onChange={e => onInputChange('country', e.target.value, 'address')}
                >
                  <option value="">Select country</option>
                  {countries.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              ) : (
                <p className="mt-2 text-sm text-gray-900">
                  {countries.find(c => c._id === formData?.address?.country)?.name || formData?.address?.country || '-'}
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
                <Input type="date" value={formData?.identification?.dateOfBirth?.split('T')[0] || ''} onChange={e => onInputChange('dateOfBirth', e.target.value, 'identification')} className="mt-2" />
              ) : (
                <p className="mt-2 text-sm text-gray-900">
                  {formData?.identification?.dateOfBirth ? new Date(formData.identification.dateOfBirth).toLocaleDateString() : '-'}
                </p>
              )}
            </div>
            <div>
              <Label>ID Type</Label>
              {isEditMode ? (
                <select
                  className="mt-2 h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={formData?.identification?.idType || ''}
                  onChange={e => onInputChange('idType', e.target.value, 'identification')}
                >
                  <option value="">Select ID Type</option>
                  <option value="national">National ID</option>
                  <option value="passport">Passport</option>
                  <option value="driver">Driver&apos;s License</option>
                </select>
              ) : (
                <p className="mt-2 text-sm text-gray-900 capitalize">{formData?.identification?.idType || '-'}</p>
              )}
            </div>
            <div>
              <Label>ID Number</Label>
              {isEditMode ? (
                <Input value={formData?.identification?.idNumber || ''} onChange={e => onInputChange('idNumber', e.target.value, 'identification')} className="mt-2" />
              ) : (
                <p className="mt-2 text-sm text-gray-900">{formData?.identification?.idNumber || '-'}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

