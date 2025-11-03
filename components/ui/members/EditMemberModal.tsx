'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMemberActionsStore } from '@/lib/store/memberActionsStore';
import { useUserStore } from '@/lib/store/userStore';
import {
  detectChanges,
  filterMeaningfulChanges,
  getChangesSummary,
} from '@/lib/utils/changeDetection';
import { CasinoMember as Member } from '@/shared/types/entities';
import axios from 'axios';
import { gsap } from 'gsap';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

type EditMemberModalProps = {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  onMemberUpdated: () => void;
};

export default function EditMemberModal({
  onClose,
  onMemberUpdated,
}: EditMemberModalProps) {
  const { isEditModalOpen, selectedMember, closeEditModal } =
    useMemberActionsStore();
  const { user } = useUserStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  // Helper function to get proper user display name for activity logging
  const getUserDisplayName = () => {
    if (!user) return 'Unknown User';

    // Check if user has profile with firstName and lastName
    if (user.profile?.firstName && user.profile?.lastName) {
      return `${user.profile.firstName} ${user.profile.lastName}`;
    }

    // If only firstName exists, use it
    if (user.profile?.firstName && !user.profile?.lastName) {
      return user.profile.firstName;
    }

    // If only lastName exists, use it
    if (!user.profile?.firstName && user.profile?.lastName) {
      return user.profile.lastName;
    }

    // If neither firstName nor lastName exist, use username
    if (user.username && user.username.trim() !== '') {
      return user.username;
    }

    // If username doesn't exist or is blank, use email
    if (user.emailAddress && user.emailAddress.trim() !== '') {
      return user.emailAddress;
    }

    // Fallback
    return 'Unknown User';
  };

  // Activity logging is now handled via API calls
  const logActivity = async (
    action: string,
    resource: string,
    resourceId: string,
    resourceName: string,
    details: string,
    previousData?: Record<string, unknown> | null,
    newData?: Record<string, unknown> | null,
    changes?: Array<{ field: string; oldValue: unknown; newValue: unknown }>
  ) => {
    try {
      const response = await fetch('/api/activity-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          resource,
          resourceId,
          resourceName,
          details,
          userId: user?._id || 'unknown',
          username: getUserDisplayName(),
          userRole: 'user',
          previousData: previousData || null,
          newData: newData || null,
          changes: changes || [], // Use provided changes or empty array
        }),
      });

      if (!response.ok) {
        console.error('Failed to log activity:', response.statusText);
      }
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    occupation: '',
    address: '',
    points: 0,
    uaccount: 0,
  });

  // Store original form data for accurate comparison
  const [originalFormData, setOriginalFormData] = useState<
    typeof formData | null
  >(null);

  // Initialize form data when a member is selected
  useEffect(() => {
    if (selectedMember && selectedMember.profile) {
      const loadedFormData = {
        firstName: selectedMember.profile.firstName || '',
        lastName: selectedMember.profile.lastName || '',
        email: selectedMember.profile.email || '',
        phoneNumber: selectedMember.phoneNumber || '',
        occupation: selectedMember.profile.occupation || '',
        address: selectedMember.profile.address || '',
        points: selectedMember.points || 0,
        uaccount: selectedMember.uaccount || 0,
      };

      setFormData(loadedFormData);
      setOriginalFormData(loadedFormData); // Store original for comparison
    }
  }, [selectedMember]);

  useEffect(() => {
    if (isEditModalOpen) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, y: -20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.3,
          ease: 'power2.out',
          overwrite: true,
        }
      );

      gsap.to(backdropRef.current, {
        opacity: 1,
        duration: 0.2,
        ease: 'power2.out',
        overwrite: true,
      });
    }
  }, [isEditModalOpen]);

  const handleClose = () => {
    gsap.to(modalRef.current, {
      opacity: 0,
      y: -20,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        closeEditModal();
        onClose();
      },
    });

    gsap.to(backdropRef.current, {
      opacity: 0,
      duration: 0.2,
      ease: 'power2.in',
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!selectedMember?._id) {
      toast.error('No member selected');
      return;
    }

    if (!originalFormData) {
      toast.error('Member details not loaded');
      return;
    }

    // Compare original loaded data with current form data
    const originalData = {
      profile: {
        firstName: originalFormData.firstName,
        lastName: originalFormData.lastName,
        email: originalFormData.email,
        occupation: originalFormData.occupation,
        address: originalFormData.address,
      },
      phoneNumber: originalFormData.phoneNumber,
      points: originalFormData.points,
      uaccount: originalFormData.uaccount,
    };

    const currentData = {
      profile: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        occupation: formData.occupation,
        address: formData.address,
      },
      phoneNumber: formData.phoneNumber,
      points: formData.points,
      uaccount: formData.uaccount,
    };

    // Detect actual changes between original and current form data
    const changes = detectChanges(originalData, currentData);
    const meaningfulChanges = filterMeaningfulChanges(changes);

    // Only proceed if there are actual changes
    if (meaningfulChanges.length === 0) {
      toast.info('No changes detected');
      return;
    }

    // Build update payload with ONLY changed fields
    const updatePayload: Record<string, unknown> = {};
    meaningfulChanges.forEach(change => {
      const fieldPath = change.path;

      if (fieldPath.includes('.')) {
        const [parent, child] = fieldPath.split('.');
        if (!updatePayload[parent]) {
          updatePayload[parent] = {};
        }
        (updatePayload[parent] as Record<string, unknown>)[child] =
          change.newValue;
      } else {
        updatePayload[fieldPath] = change.newValue;
      }
    });

    console.warn(
      '🔍 MEMBER UPDATE PAYLOAD:',
      JSON.stringify(updatePayload, null, 2)
    );

    setLoading(true);
    try {
      const response = await axios.put(
        `/api/members/${selectedMember._id}`,
        updatePayload
      );

      if (response.status === 200) {
        // Log the update activity with proper change tracking
        const changesSummary = getChangesSummary(meaningfulChanges);
        await logActivity(
          'update',
          'member',
          selectedMember._id,
          `${selectedMember.profile?.firstName || 'Unknown'} ${
            selectedMember.profile?.lastName || 'Member'
          }`,
          `Updated member: ${changesSummary}`,
          selectedMember, // Previous data
          response.data, // New data
          meaningfulChanges.map(change => ({
            field: change.field,
            oldValue: change.oldValue,
            newValue: change.newValue,
          }))
        );

        toast.success(`Member updated successfully: ${changesSummary}`);
        onMemberUpdated();
        handleClose();
      } else {
        toast.error('Failed to update member');
      }
    } catch (error) {
      console.error('Error updating member:', error);
      toast.error('Failed to update member');
    } finally {
      setLoading(false);
    }
  };

  if (!isEditModalOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="fixed inset-0 z-40 bg-black bg-opacity-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex">
        <div
          ref={modalRef}
          className="flex h-full w-full flex-col overflow-y-auto bg-white"
        >
          {/* Header */}
          <div className="bg-button p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Edit Member</h2>
                <p className="text-sm text-white text-opacity-90">
                  Update member information below.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="text-white hover:bg-white hover:bg-opacity-20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="First Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Last Name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="Phone Number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="occupation">Occupation</Label>
                <Input
                  id="occupation"
                  name="occupation"
                  value={formData.occupation}
                  onChange={handleInputChange}
                  placeholder="Occupation"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="points">Points</Label>
                  <Input
                    id="points"
                    name="points"
                    type="number"
                    value={formData.points}
                    onChange={handleInputChange}
                    placeholder="Points"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="uaccount">Account Balance</Label>
                  <Input
                    id="uaccount"
                    name="uaccount"
                    type="number"
                    value={formData.uaccount}
                    onChange={handleInputChange}
                    placeholder="Account Balance"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto border-t bg-gray-50 px-6 py-4">
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Updating...' : 'Update Member'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
