/**
 * Profile Validation Gate Component
 * Provider component that enforces profile validation and updates.
 *
 * Features:
 * - Automatically evaluates user profile for invalid/missing fields
 * - Shows ProfileValidationModal when profile needs updates
 * - Handles profile update API calls
 * - Validates password strength
 * - Tracks licensee and location dependencies
 * - Forces logout after successful profile update (sessionVersion increment)
 * - Prevents modal reopening after successful update
 * - Shows success/error toasts
 * - Redirects to login after profile update
 *
 * This component acts as a gate that blocks access until profile is valid.
 *
 * @returns ProfileValidationModal when profile needs updates, null otherwise
 */
'use client';

import ProfileCompletionModal from '@/components/shared/ui/ProfileCompletionModal';
import { logoutUser } from '@/lib/helpers/client';
import { useCurrentUserQuery } from '@/lib/hooks/useCurrentUserQuery';
import { useAuthSessionStore } from '@/lib/store/authSessionStore';
import { useUserStore } from '@/lib/store/userStore';
import type {
    ProfileValidationFormData,
    ProfileValidationModalData,
} from '@/lib/types/auth';
import { validatePasswordStrength } from '@/lib/utils/validation';
import type {
    InvalidProfileFields,
    ProfileValidationReasons,
} from '@/shared/types/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

// ============================================================================
// Types & Constants
// ============================================================================

type ProfileUpdateResult = {
  success: boolean;
  invalidFields?: InvalidProfileFields;
  fieldErrors?: Record<string, string>;
  message?: string;
  invalidProfileReasons?: ProfileValidationReasons;
};

const EMPTY_FIELDS: InvalidProfileFields = {};
const EMPTY_REASONS: ProfileValidationReasons = {};

type ProfileValidationGateProps = {
  context?: 'CMS' | 'VAULT';
};

export default function ProfileValidationGate({
  context = 'CMS',
}: ProfileValidationGateProps) {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  // Context is available for future use when different validation rules are needed
  // for CMS vs VAULT applications
  void context; // Reserved for future use
  const router = useRouter();
  const { user, setUser, clearUser } = useUserStore();
  const { refetch } = useCurrentUserQuery();
  const { lastLoginPassword, clearLastLoginPassword } =
    useAuthSessionStore();
  // Use only new fields - memoize to prevent dependency array issues
  const userLicenseeDeps = useMemo(() => {
    return Array.isArray(user?.assignedLicensees) && user.assignedLicensees.length > 0
      ? user.assignedLicensees
      : [];
  }, [user?.assignedLicensees]);
  const userLocationDeps = useMemo(() => {
    return Array.isArray(user?.assignedLocations) && user.assignedLocations.length > 0
      ? user.assignedLocations
      : [];
  }, [user?.assignedLocations]);
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
  
  // Track if we just successfully updated to prevent re-evaluation
  const justUpdatedRef = useRef(false);

  // ============================================================================
  // Computed Values
  // ============================================================================
  const hasInvalidFields = useMemo(() => {
    if (!invalidFields) return false;
    return Object.values(invalidFields).some(Boolean);
  }, [invalidFields]);

  // ============================================================================
  // Effects - Profile Validation Evaluation
  // ============================================================================
  useEffect(() => {
    let cancelled = false;

    const evaluate = async () => {
      // Skip evaluation if we just successfully updated (prevent modal from reopening)
      if (justUpdatedRef.current) {
        return;
      }

      if (!user) {
        // Reset the flag when user is null (e.g., after logout)
        justUpdatedRef.current = false;
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

      // Skip validation for admins and developers
      const userRoles = Array.isArray(user.roles) ? user.roles : [];
      const isAdminOrDeveloper = userRoles.some(
        role =>
          typeof role === 'string' &&
          (role.toLowerCase() === 'admin' || role.toLowerCase() === 'developer')
      );

      if (isAdminOrDeveloper) {
        setOpen(false);
        setInvalidFields(EMPTY_FIELDS);
        setFieldReasons(EMPTY_REASONS);
        return;
      }

      const shouldRefetch =
        user.requiresProfileUpdate ||
        (user.invalidProfileFields &&
          Object.values(user.invalidProfileFields).some(Boolean));

      const result = shouldRefetch ? await refetch() : null;
      if (cancelled) return;

      // If refetch was attempted but failed (no data) or resulted in error,
      // stop here to prevent using stale 'user' data which might trigger the modal on an invalid session.
      // The useCurrentUserQuery hook will handle 401s by clearing the user eventually.
      if (shouldRefetch && (!result?.data || result.isError)) {
        return;
      }

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

      // EXEMPTION: Date of Birth is no longer required
      // Remove it from validation checks so it doesn't trigger the modal
      if (nextInvalid.dateOfBirth) {
        delete nextInvalid.dateOfBirth;
        delete nextReasons.dateOfBirth;
      }

      // EXEMPTION: Phone is no longer required
      // Remove it from validation checks so it doesn't trigger the modal
      if (nextInvalid.phone) {
        delete nextInvalid.phone;
        delete nextReasons.phone;
      }

      const needsUpdate = Object.values(nextInvalid).some(Boolean);

      // Use only new fields
      let latestLicenseeIds: string[] = [];
      if (Array.isArray(latestUser.assignedLicensees) && latestUser.assignedLicensees.length > 0) {
        latestLicenseeIds = latestUser.assignedLicensees.map(id => String(id));
      }
      
      let latestLocationIds: string[] = [];
      if (Array.isArray(latestUser.assignedLocations) && latestUser.assignedLocations.length > 0) {
        latestLocationIds = latestUser.assignedLocations.map(id => String(id));
      }

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
  }, [
    user?.username,
    user?.requiresProfileUpdate,
    user?.invalidProfileFields,
    userLicenseeDeps,
    userLocationDeps,
    refetch,
    lastLoginPassword,
    clearLastLoginPassword,
    setCurrentData,
    setInvalidFields,
    setFieldReasons,
    setOpen,
    user,
  ]);

  // ============================================================================
  // Event Handlers - Profile Update
  // ============================================================================
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
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      console.log('[ProfileValidationGate] Profile update result:', {
        success: result.success,
        requiresProfileUpdate: result.requiresProfileUpdate,
        invalidFields: result.invalidProfileFields,
        hasInvalidFields: result.invalidProfileFields && Object.values(result.invalidProfileFields).some(Boolean),
      });

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
        licenseeIds: (() => {
          // Use only new field
          if (Array.isArray(result.user?.assignedLicensees) && result.user.assignedLicensees.length > 0) {
            return result.user.assignedLicensees.map((id: string) => String(id));
          }
          return data.licenseeIds ?? [];
        })(),
        locationIds: (() => {
          // Use only new field
          if (Array.isArray(result.user?.assignedLocations) && result.user.assignedLocations.length > 0) {
            return result.user.assignedLocations.map((id: string) => String(id));
          }
          return data.locationIds ?? [];
        })(),
      });

      // Check if profile update is complete (no invalid fields remaining)
      const hasNoInvalidFields = !result.invalidProfileFields || 
        !Object.values(result.invalidProfileFields).some(Boolean);
      const profileUpdateComplete = !result.requiresProfileUpdate && hasNoInvalidFields;

      console.log('[ProfileValidationGate] Profile update complete check:', {
        requiresProfileUpdate: result.requiresProfileUpdate,
        hasNoInvalidFields,
        profileUpdateComplete,
      });

      // ALWAYS logout after successful profile update because sessionVersion is incremented
      // This invalidates the JWT token, so user must re-login
      if (result.success) {
        console.log('[ProfileValidationGate] Profile update successful - initiating logout (sessionVersion incremented)...');
        
        // Set flag to prevent re-evaluation
        justUpdatedRef.current = true;
        
        // Close modal immediately
        setOpen(false);
        
        // Show success toast
        const toastMessage = profileUpdateComplete
          ? 'Profile updated successfully. Please log in again to continue.'
          : 'Profile updated. Please log in again to continue. Some fields may still need attention.';
        toast.success(toastMessage, {
          duration: 5000,
        });
        
        // Small delay to ensure toast is visible, then logout and redirect
        setTimeout(async () => {
          try {
            console.log('[ProfileValidationGate] Calling logout...');
            // Logout via API (clears cookies)
            await logoutUser();
            console.log('[ProfileValidationGate] Logout successful');
            
            // Clear user from store
            clearUser();
            
            // Redirect to login with success message
            console.log('[ProfileValidationGate] Redirecting to login...');
            const loginMessage = profileUpdateComplete
              ? 'Profile updated successfully. Please log in again to continue.'
              : 'Profile updated. Please log in again to continue. Some fields may still need attention.';
            router.push('/login?message=' + encodeURIComponent(loginMessage));
          } catch (error) {
            console.error('[ProfileValidationGate] Logout error:', error);
            // Even if logout fails, clear local storage and redirect
            clearUser();
            const loginMessage = profileUpdateComplete
              ? 'Profile updated successfully. Please log in again to continue.'
              : 'Profile updated. Please log in again to continue. Some fields may still need attention.';
            router.push('/login?message=' + encodeURIComponent(loginMessage));
          }
        }, 1000);
        
        return {
          success: profileUpdateComplete,
          invalidFields: result.invalidProfileFields,
          invalidProfileReasons: result.invalidProfileReasons,
        };
      }

      return {
        success: false,
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


// ... (previous imports remain, ProfileValidationModal is removed)

// ...

  // ============================================================================
  // Render - Profile Validation Modal
  // ============================================================================
  if (!open || !hasInvalidFields) {
    return null;
  }

  return (
    <ProfileCompletionModal
      open={open}
      onUpdate={handleUpdate}
      loading={loading}
      invalidFields={invalidFields}
      reasons={fieldReasons}
      currentData={currentData}
    />
  );
}


