/**
 * Profile Password Component
 *
 * Handles password change functionality and security settings.
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Button } from '@/components/shared/ui/button';

import { CheckCircle2, XCircle } from 'lucide-react';

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
  isCurrentPasswordVerified: boolean | null;
  passwordReuseError: string | null;
  validateCurrentPassword: () => void;
  validateNewPassword: () => void;
};

export default function ProfilePassword({
  passwordData,
  setPasswordData,
  isLoading,
  onPasswordChange,
  passwordStrength,
  isCurrentPasswordVerified,
  passwordReuseError,
  validateCurrentPassword,
  validateNewPassword,
}: ProfilePasswordProps) {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          Account Security
        </CardTitle>
        <CardDescription className="text-gray-500">
          Ensure your account remains secure with a strong password
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-6">
          {/* Current Password Field */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-gray-700">Current Password</Label>
              {passwordData.currentPassword && isCurrentPasswordVerified !== null && (
                <div className={`flex items-center gap-1 text-xs font-medium ${isCurrentPasswordVerified ? 'text-green-600' : 'text-red-500'}`}>
                  {isCurrentPasswordVerified ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" />
                      Verified
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3" />
                      Incorrect
                    </>
                  )}
                </div>
              )}
            </div>
            <Input
              type="password"
              value={passwordData.currentPassword}
              onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              onBlur={validateCurrentPassword}
              className={`mt-2 transition-all duration-200 ${
                passwordData.currentPassword && isCurrentPasswordVerified !== null
                  ? isCurrentPasswordVerified
                    ? 'border-green-500 bg-green-50/20 focus-visible:ring-green-500'
                    : 'border-red-500 bg-red-50/20 focus-visible:ring-red-500'
                  : ''
              }`}
              placeholder="Enter your present password"
            />
          </div>

          {/* New Password Field */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-gray-700">New Password</Label>
              {passwordReuseError && (
                <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  {passwordReuseError}
                </span>
              )}
            </div>
            <Input
              type="password"
              value={passwordData.newPassword}
              onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              onBlur={validateNewPassword}
              className={`mt-2 transition-all duration-200 ${
                passwordReuseError ? 'border-red-500 bg-red-50/20 focus-visible:ring-red-500' : ''
              }`}
              placeholder="Minimum 8 characters"
            />
            
            {/* Strength Meter & Requirements */}
            <div className={`mt-4 space-y-4 rounded-xl border p-4 transition-all duration-300 ${passwordData.newPassword ? 'bg-white shadow-sm' : 'bg-gray-50/50 opacity-60'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Strength</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(step => (
                      <div
                        key={step}
                        className={`h-1.5 w-6 rounded-full transition-colors duration-300 ${
                          step <= passwordStrength.score
                            ? passwordStrength.score <= 2
                              ? 'bg-red-400'
                              : passwordStrength.score === 3
                                ? 'bg-yellow-400'
                                : 'bg-green-500'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    passwordStrength.score <= 2
                      ? 'bg-red-50 text-red-600'
                      : passwordStrength.score === 3
                        ? 'bg-yellow-50 text-yellow-600'
                        : 'bg-green-50 text-green-600'
                  }`}
                >
                  {passwordStrength.label}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-y-2 gap-x-4 text-xs sm:grid-cols-2">
                <div className={`flex items-center gap-2 transition-colors ${passwordStrength.requirements?.length ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                  {passwordStrength.requirements?.length ? <CheckCircle2 className="h-3.5 w-3.5" /> : <div className="h-3.5 w-3.5 rounded-full border border-gray-300" />}
                  <span>8+ characters</span>
                </div>
                <div className={`flex items-center gap-2 transition-colors ${passwordStrength.requirements?.uppercase ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                  {passwordStrength.requirements?.uppercase ? <CheckCircle2 className="h-3.5 w-3.5" /> : <div className="h-3.5 w-3.5 rounded-full border border-gray-300" />}
                  <span>Uppercase letter</span>
                </div>
                <div className={`flex items-center gap-2 transition-colors ${passwordStrength.requirements?.lowercase ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                  {passwordStrength.requirements?.lowercase ? <CheckCircle2 className="h-3.5 w-3.5" /> : <div className="h-3.5 w-3.5 rounded-full border border-gray-300" />}
                  <span>Lowercase letter</span>
                </div>
                <div className={`flex items-center gap-2 transition-colors ${passwordStrength.requirements?.number ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                  {passwordStrength.requirements?.number ? <CheckCircle2 className="h-3.5 w-3.5" /> : <div className="h-3.5 w-3.5 rounded-full border border-gray-300" />}
                  <span>Numeric value</span>
                </div>
                <div className={`flex items-center gap-2 transition-colors col-span-full ${passwordStrength.requirements?.special ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                  {passwordStrength.requirements?.special ? <CheckCircle2 className="h-3.5 w-3.5" /> : <div className="h-3.5 w-3.5 rounded-full border border-gray-300" />}
                  <span>Special character (#, @, !, etc.)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div>
            <Label className="text-sm font-semibold text-gray-700">Confirm Password</Label>
            <Input
              type="password"
              value={passwordData.confirmPassword}
              onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              className={`mt-2 transition-all duration-200 ${
                passwordData.confirmPassword &&
                passwordData.newPassword &&
                passwordData.newPassword !== passwordData.confirmPassword
                  ? 'border-red-500 bg-red-50/20 focus-visible:ring-red-500'
                  : passwordData.confirmPassword && passwordData.newPassword === passwordData.confirmPassword
                    ? 'border-green-500 bg-green-50/5 focus-visible:ring-green-500'
                    : ''
              }`}
              placeholder="Repeat your new password"
            />
            {passwordData.confirmPassword &&
              passwordData.newPassword &&
              passwordData.newPassword !== passwordData.confirmPassword && (
                <p className="mt-1.5 text-xs font-bold text-red-500 flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Passwords do not match
                </p>
              )}
          </div>

          <Button
            onClick={onPasswordChange}
            disabled={isLoading || passwordStrength.score < 4 || !!passwordReuseError || !isCurrentPasswordVerified}
            className="mt-2 w-full bg-gray-900 text-white hover:bg-black py-6 rounded-xl font-bold shadow-lg shadow-gray-200 transition-all active:scale-95 disabled:bg-gray-200 disabled:shadow-none"
          >
            {isLoading ? 'Processing...' : 'Update Password'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


