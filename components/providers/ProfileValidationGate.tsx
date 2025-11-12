'use client';

import { useEffect, useMemo, useState } from 'react';
import ProfileValidationModal from '@/components/ui/ProfileValidationModal';
import { useCurrentUserQuery } from '@/lib/hooks/useCurrentUserQuery';
import { useUserStore } from '@/lib/store/userStore';
import { useAuthSessionStore } from '@/lib/store/authSessionStore';
import { validatePasswordStrength } from '@/lib/utils/validation';
import type {
  InvalidProfileFields,
  ProfileValidationReasons,
} from '@/shared/types/auth';
import type {
  ProfileValidationFormData,
  ProfileValidationModalData,
} from '@/lib/types/profileValidation';

type ProfileUpdateResult = {
  success: boolean;
  invalidFields?: InvalidProfileFields;
  fieldErrors?: Record<string, string>;
  message?: string;
  invalidProfileReasons?: ProfileValidationReasons;
};

const EMPTY_FIELDS: InvalidProfileFields = {};
const EMPTY_REASONS: ProfileValidationReasons = {};

export default function ProfileValidationGate() {
  const { user, setUser } = useUserStore();
  const { refetch } = useCurrentUserQuery();
  const { lastLoginPassword, clearLastLoginPassword } =
    useAuthSessionStore();
  const userLicenseeDeps = user?.rel?.licencee;
  const userLocationDeps =
    user?.resourcePermissions?.['gaming-locations']?.resources;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invalidFields, setInvalidFields] =
    useState<InvalidProfileFields>(EMPTY_FIELDS);
  const [fieldReasons, setFieldReasons] =
    useState<ProfileValidationReasons>(EMPTY_REASONS);
  const [currentData, setCurrentData] = useState<ProfileValidationModalData>({
    username: '',
    firstName: '',
    lastName: '',
    otherName: '',
    gender: '',
    emailAddress: '',
    phone: '',
    dateOfBirth: '',
    licenseeIds: [],
    locationIds: [],
  });

  const hasInvalidFields = useMemo(() => {
    if (!invalidFields) return false;
    return Object.values(invalidFields).some(Boolean);
  }, [invalidFields]);

  useEffect(() => {
    let cancelled = false;

    const evaluate = async () => {
      if (!user) {
        setOpen(false);
        setInvalidFields(EMPTY_FIELDS);
        setFieldReasons(EMPTY_REASONS);
        setCurrentData({
          username: '',
          firstName: '',
          lastName: '',
          otherName: '',
          gender: '',
          emailAddress: '',
          phone: '',
          dateOfBirth: '',
          licenseeIds: [],
          locationIds: [],
        });
        return;
      }

      const shouldRefetch =
        user.requiresProfileUpdate ||
        (user.invalidProfileFields &&
          Object.values(user.invalidProfileFields).some(Boolean));

      const result = shouldRefetch ? await refetch() : null;
      if (cancelled) return;

      const latestUser = result?.data?.user ?? user;
      if (!latestUser) {
        setOpen(false);
        setInvalidFields(EMPTY_FIELDS);
        setFieldReasons(EMPTY_REASONS);
        return;
      }

        const nextInvalid: InvalidProfileFields = {
        ...(latestUser.invalidProfileFields || {}),
      };
      const nextReasons: ProfileValidationReasons = {
        ...(latestUser.invalidProfileReasons || {}),
      };

      if (nextInvalid.password && lastLoginPassword) {
        const strength = validatePasswordStrength(lastLoginPassword);
        if (strength.isValid) {
          delete nextInvalid.password;
          delete nextReasons.password;
          clearLastLoginPassword();
        } else {
          nextReasons.password = strength.feedback.join(', ');
        }
      }

      const needsUpdate = Object.values(nextInvalid).some(Boolean);

      const latestLicenseeIds = Array.isArray(latestUser.rel?.licencee)
        ? (latestUser.rel?.licencee as string[]).map(id => String(id))
        : [];
      const latestLocationIds =
        latestUser.resourcePermissions?.['gaming-locations']?.resources?.map(
          (id: unknown) => String(id)
        ) || [];

    setCurrentData({
      username: latestUser.username || '',
      firstName: latestUser.profile?.firstName || '',
      lastName: latestUser.profile?.lastName || '',
      otherName: latestUser.profile?.otherName || '',
      gender:
        (latestUser.profile?.gender &&
          String(latestUser.profile.gender).toLowerCase()) ||
        '',
      emailAddress: latestUser.emailAddress || '',
      phone:
        latestUser.profile?.phoneNumber ||
        latestUser.profile?.contact?.phone ||
        latestUser.profile?.contact?.mobile ||
        '',
      dateOfBirth:
        latestUser.profile?.identification?.dateOfBirth
          ? new Date(
              latestUser.profile.identification.dateOfBirth as
                | string
                | number
                | Date
            )
              .toISOString()
              .split('T')[0]
          : '',
      licenseeIds: latestLicenseeIds,
      locationIds: latestLocationIds,
    });

      if (!needsUpdate) {
        setInvalidFields(EMPTY_FIELDS);
        setFieldReasons(EMPTY_REASONS);
        setOpen(false);
        return;
      }

      setInvalidFields({ ...nextInvalid });
      setFieldReasons({ ...nextReasons });
      setOpen(true);
    };

    evaluate();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    user?.username,
    user?.requiresProfileUpdate,
    user?.invalidProfileFields,
    userLicenseeDeps,
    userLocationDeps,
    refetch,
    lastLoginPassword,
    clearLastLoginPassword,
  ]);

  const handleUpdate = async (
    data: ProfileValidationFormData
  ): Promise<ProfileUpdateResult> => {
    setLoading(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setInvalidFields(result.invalidProfileFields || invalidFields);
        setFieldReasons(result.invalidProfileReasons || fieldReasons);
        return {
          success: false,
          invalidFields: result.invalidProfileFields,
          fieldErrors: result.errors,
          message: result.message,
          invalidProfileReasons: result.invalidProfileReasons,
        };
      }

      if (result.user) {
        setUser(result.user);
      }

      setInvalidFields(result.invalidProfileFields || {});
      setFieldReasons(result.invalidProfileReasons || {});
      setCurrentData({
        username: result.user?.username || data.username,
        firstName: result.user?.profile?.firstName || data.firstName || '',
        lastName: result.user?.profile?.lastName || data.lastName || '',
        otherName: result.user?.profile?.otherName || data.otherName || '',
        gender:
          (result.user?.profile?.gender &&
            String(result.user.profile.gender).toLowerCase()) ||
          data.gender ||
          '',
        emailAddress: result.user?.emailAddress || data.emailAddress || '',
        phone:
          result.user?.profile?.phoneNumber ||
          result.user?.profile?.contact?.phone ||
          result.user?.profile?.contact?.mobile ||
          data.phone ||
          '',
      dateOfBirth:
        (result.user?.profile?.identification?.dateOfBirth
          ? new Date(
              result.user.profile.identification.dateOfBirth as
                | string
                | number
                | Date
            )
              .toISOString()
              .split('T')[0]
          : data.dateOfBirth) || '',
        licenseeIds: Array.isArray(result.user?.rel?.licencee)
          ? (result.user?.rel?.licencee as string[]).map(id => String(id))
          : data.licenseeIds ?? [],
        locationIds: Array.isArray(
          result.user?.resourcePermissions?.['gaming-locations']?.resources
        )
          ? (
              result.user?.resourcePermissions?.['gaming-locations']
                ?.resources as string[]
            ).map(id => String(id))
          : data.locationIds ?? [],
      });

      if (!result.requiresProfileUpdate) {
        await refetch();
      }

      return {
        success: !result.requiresProfileUpdate,
        invalidFields: result.invalidProfileFields,
        invalidProfileReasons: result.invalidProfileReasons,
      };
    } catch (error) {
      console.error('[ProfileValidationGate] update failed:', error);
      return {
        success: false,
        message: 'Failed to update profile. Please try again.',
      };
    } finally {
      setLoading(false);
    }
  };

  if (!open || !hasInvalidFields) {
    return null;
  }

  return (
    <ProfileValidationModal
      open={open}
      onClose={() => setOpen(false)}
      onUpdate={handleUpdate}
      loading={loading}
      invalidFields={invalidFields}
      currentData={currentData}
      reasons={fieldReasons}
      enforceUpdate
    />
  );
}

