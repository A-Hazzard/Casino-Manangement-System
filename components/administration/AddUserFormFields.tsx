/**
 * Add User Form Fields Component
 */

'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type AddUserFormData = {
  username: string;
  emailAddress: string;
  password?: string;
  roles: string[];
  profile: {
    firstName: string;
    lastName: string;
  };
};

type AddUserFormFieldsProps = {
  formData: AddUserFormData;
  setFormData: React.Dispatch<React.SetStateAction<AddUserFormData>>;
  isLoading: boolean;
};

export default function AddUserFormFields({
  formData,
  setFormData,
  isLoading,
}: AddUserFormFieldsProps) {
  const handleChange = (field: string, value: string, section?: 'profile') => {
    if (section) {
      setFormData({
        ...formData,
        [section]: { ...formData[section], [field]: value }
      });
    } else {
      setFormData({ ...formData, [field]: value });
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <Label>Username *</Label>
        <Input
          value={formData.username}
          onChange={e => handleChange('username', e.target.value)}
          disabled={isLoading}
          required
        />
      </div>
      <div>
        <Label>Email Address *</Label>
        <Input
          type="email"
          value={formData.emailAddress}
          onChange={e => handleChange('emailAddress', e.target.value)}
          disabled={isLoading}
          required
        />
      </div>
      <div>
        <Label>Password *</Label>
        <Input
          type="password"
          value={formData.password}
          onChange={e => handleChange('password', e.target.value)}
          disabled={isLoading}
          required
        />
      </div>
      <div>
        <Label>First Name</Label>
        <Input
          value={formData.profile.firstName}
          onChange={e => handleChange('firstName', e.target.value, 'profile')}
          disabled={isLoading}
        />
      </div>
      <div>
        <Label>Last Name</Label>
        <Input
          value={formData.profile.lastName}
          onChange={e => handleChange('lastName', e.target.value, 'profile')}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}

