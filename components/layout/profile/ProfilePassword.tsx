/**
 * Profile Password Component
 *
 * Handles password change functionality and security settings.
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

type PasswordData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type PasswordStrength = {
  score: number;
  label: string;
  feedback: string | string[];
  requirements?: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
};

type ProfilePasswordProps = {
  passwordData: PasswordData;
  setPasswordData: (data: PasswordData) => void;
  isLoading: boolean;
  onPasswordChange: () => Promise<void>;
  passwordStrength: PasswordStrength;
};

export default function ProfilePassword({
  passwordData,
  setPasswordData,
  isLoading,
  onPasswordChange,
  passwordStrength,
}: ProfilePasswordProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Security</CardTitle>
        <CardDescription>Update your password</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label>Current Password</Label>
            <Input
              type="password"
              value={passwordData.currentPassword}
              onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              className="mt-2"
            />
          </div>
          <div>
            <Label>New Password</Label>
            <Input
              type="password"
              value={passwordData.newPassword}
              onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              className="mt-2"
            />
            {passwordData.newPassword && (
              <p className={`mt-1 text-xs ${passwordStrength.score >= 3 ? 'text-green-600' : 'text-red-600'}`}>
                Strength: {passwordStrength.label}
              </p>
            )}
          </div>
          <div>
            <Label>Confirm New Password</Label>
            <Input
              type="password"
              value={passwordData.confirmPassword}
              onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              className="mt-2"
            />
          </div>
          <Button onClick={onPasswordChange} disabled={isLoading} className="mt-2">
            Change Password
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

