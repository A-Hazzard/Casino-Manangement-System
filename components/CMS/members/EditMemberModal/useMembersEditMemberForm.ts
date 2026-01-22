/**
 * Custom hook for Members Edit Member form state management
 * 
 * Handles form data state, original data tracking, and form submission logic
 * 
 * @param props - Hook props
 */

import {
  detectChanges,
  filterMeaningfulChanges,
  getChangesSummary,
} from '@/lib/utils/changeDetection';
import { CasinoMember as Member } from '@/shared/types/entities';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type FormData = {
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

export type UseMembersEditMemberFormProps = {
  selectedMember: Member | null;
  onMemberUpdated: () => void;
  onClose: () => void;
  logActivity: (
    action: string,
    resource: string,
    resourceId: string,
    resourceName: string,
    details: string,
    previousData?: Record<string, unknown> | null,
    newData?: Record<string, unknown> | null,
    changes?: Array<{ field: string; oldValue: unknown; newValue: unknown }>
  ) => Promise<void>;
};

export function useMembersEditMemberForm({
  selectedMember,
  onMemberUpdated,
  onClose,
  logActivity,
}: UseMembersEditMemberFormProps) {
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phoneNumber: '',
    occupation: '',
    address: '',
    points: 0,
    uaccount: 0,
    gamingLocation: '',
  });

  const [originalFormData, setOriginalFormData] = useState<FormData | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  // Helper to trim values
  const trimValue = (value: string): string => (value || '').trim();

  // Load form data when member is selected
  useEffect(() => {
    if (selectedMember) {
      const loadedFormData: FormData = {
        firstName: trimValue(selectedMember.profile.firstName),
        lastName: trimValue(selectedMember.profile.lastName),
        username: trimValue(selectedMember.username),
        email: trimValue(selectedMember.profile?.email || ''),
        phoneNumber: trimValue(selectedMember.phoneNumber || ''),
        occupation: trimValue(selectedMember.profile.occupation),
        address: trimValue(selectedMember.profile.address),
        points: selectedMember.points || 0,
        uaccount: selectedMember.uaccount || 0,
        gamingLocation: selectedMember.gamingLocation || '',
      };

      setFormData(loadedFormData);
      setOriginalFormData(loadedFormData);
    }
  }, [selectedMember]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]:
        name === 'points' || name === 'uaccount'
          ? value === '' ? 0 : Number(value)
          : value,
    }));
  };

  const handleLocationChange = (locationId: string) => {
    setFormData(prev => ({
      ...prev,
      gamingLocation: locationId,
    }));
  };

  const handleSubmit = async (
    errors: Record<string, string>,
    setSubmitAttempted: (value: boolean) => void
  ) => {
    if (!selectedMember?._id) {
      toast.error('No member selected', {
        position: 'top-center',
      });
      return;
    }

    if (!originalFormData) {
      toast.error('Member details not loaded', {
        position: 'top-center',
      });
      return;
    }

    setSubmitAttempted(true);

    // Wait a bit for validation to run
    await new Promise(resolve => setTimeout(resolve, 350));

    if (Object.keys(errors).length > 0) {
      toast.error('Please fix the errors before submitting.', {
        position: 'top-center',
      });
      return;
    }

    // Compare original loaded data with current form data
    const originalData = {
      profile: {
        firstName: trimValue(originalFormData.firstName),
        lastName: trimValue(originalFormData.lastName),
        email: trimValue(originalFormData.email),
        occupation: trimValue(originalFormData.occupation),
        address: trimValue(originalFormData.address),
      },
      phoneNumber: trimValue(originalFormData.phoneNumber),
      points: originalFormData.points,
      uaccount: originalFormData.uaccount,
      gamingLocation: originalFormData.gamingLocation,
    };

    const currentData = {
      profile: {
        firstName: trimValue(formData.firstName),
        lastName: trimValue(formData.lastName),
        email: trimValue(formData.email),
        occupation: trimValue(formData.occupation),
        address: trimValue(formData.address),
      },
      phoneNumber: trimValue(formData.phoneNumber),
      points: formData.points,
      uaccount: formData.uaccount,
      gamingLocation: formData.gamingLocation,
    };

    // Detect actual changes
    const changes = detectChanges(originalData, currentData);
    const meaningfulChanges = filterMeaningfulChanges(changes);

    // Only proceed if there are actual changes
    if (meaningfulChanges.length === 0) {
      toast.info('No changes detected', {
        position: 'top-center',
      });
      return;
    }

    // Build update payload with ONLY changed fields
    const updatePayload: Record<string, unknown> = {};
    meaningfulChanges.forEach(change => {
      const fieldPath = change.path;
      let value = change.newValue;

      // Trim string values (except for gamingLocation)
      if (typeof value === 'string' && fieldPath !== 'gamingLocation') {
        value = value.trim();
      }

      // For gamingLocation, ensure it's a valid non-empty string
      if (fieldPath === 'gamingLocation') {
        if (typeof value === 'string' && value.trim()) {
          value = value.trim();
        } else {
          return;
        }
      }

      if (fieldPath.includes('.')) {
        const [parent, child] = fieldPath.split('.');
        if (!updatePayload[parent]) {
          updatePayload[parent] = {};
        }
        (updatePayload[parent] as Record<string, unknown>)[child] = value;
      } else {
        updatePayload[fieldPath] = value;
      }
    });

    setLoading(true);
    try {
      const response = await axios.put(
        `/api/members/${selectedMember._id}`,
        updatePayload
      );

      if (response.status === 200) {
        // Log the update activity
        const changesSummary = getChangesSummary(meaningfulChanges);
        await logActivity(
          'update',
          'member',
          selectedMember._id,
          `${selectedMember.profile?.firstName || 'Unknown'} ${
            selectedMember.profile?.lastName || 'Member'
          }`,
          `Updated member: ${changesSummary}`,
          selectedMember,
          response.data,
          meaningfulChanges.map(change => ({
            field: change.field,
            oldValue: change.oldValue,
            newValue: change.newValue,
          }))
        );

        toast.success(`Member updated successfully: ${changesSummary}`, {
          position: 'top-center',
        });
        onMemberUpdated();
        onClose();
      } else {
        toast.error('Failed to update member', {
          position: 'top-center',
        });
      }
    } catch (error) {
      console.error('Error updating member:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update member';
      toast.error(errorMessage, {
        position: 'top-center',
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    loading,
    handleInputChange,
    handleLocationChange,
    handleSubmit,
  };
}

