/**
 * Edit Member Modal Component
 * 
 * Modal for editing member information with validation and change tracking
 * 
 * Features:
 * - Form validation with real-time feedback
 * - Uniqueness checks for username and email
 * - Change detection and activity logging
 * - Responsive design with mobile support
 */

'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useMemberActionsStore } from '@/lib/store/memberActionsStore';
import { useUserStore } from '@/lib/store/userStore';
import { gsap } from 'gsap';
import { Save, X, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import EditMemberFormFields from './EditMemberModal/EditMemberFormFields';
import EditMemberProfileHeader from './EditMemberModal/EditMemberProfileHeader';
import { useEditMemberValidation } from './EditMemberModal/useEditMemberValidation';
import { useEditMemberForm } from './EditMemberModal/useEditMemberForm';

import type { CasinoMember as Member } from '@/shared/types/entities';

type EditMemberModalProps = {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  onMemberUpdated: () => void;
};

/**
 * Helper function to get proper user display name for activity logging
 */
function getUserDisplayName(user: { profile?: { firstName?: string; lastName?: string }; username?: string; emailAddress?: string } | null): string {
  if (!user) return 'Unknown User';

  if (user.profile?.firstName && user.profile?.lastName) {
    return `${user.profile.firstName} ${user.profile.lastName}`;
  }

  if (user.profile?.firstName && !user.profile?.lastName) {
    return user.profile.firstName;
  }

  if (!user.profile?.firstName && user.profile?.lastName) {
    return user.profile.lastName;
  }

  if (user.username && user.username.trim() !== '') {
    return user.username;
  }

  if (user.emailAddress && user.emailAddress.trim() !== '') {
    return user.emailAddress;
  }

  return 'Unknown User';
}

/**
 * Edit Member Modal Component
 */
export default function EditMemberModal({
  onClose,
  onMemberUpdated,
}: EditMemberModalProps) {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const { isEditModalOpen, selectedMember, closeEditModal } =
    useMemberActionsStore();
  const { user } = useUserStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Activity logging function
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
          username: getUserDisplayName(user),
          userRole: 'user',
          previousData: previousData || null,
          newData: newData || null,
          changes: changes || [],
        }),
      });

      if (!response.ok) {
        console.error('Failed to log activity:', response.statusText);
      }
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  // Form state management
  const {
    formData,
    loading,
    handleInputChange,
    handleLocationChange,
    handleSubmit: handleFormSubmit,
  } = useEditMemberForm({
    selectedMember: selectedMember && selectedMember._id ? (selectedMember as Member) : null,
    onMemberUpdated,
    onClose,
    logActivity,
  });

  // Validation
  const {
    errors,
    checkingUniqueness,
    setTouched,
    setSubmitAttempted,
  } = useEditMemberValidation({
    formData,
    selectedMemberId: selectedMember?._id,
  });

  // Locations state
  const [locations, setLocations] = useState<
    Array<{ id: string; name: string; sasEnabled?: boolean }>
  >([]);

  // ============================================================================
  // Effects
  // ============================================================================

  // Fetch locations when modal opens
  useEffect(() => {
    if (isEditModalOpen) {
      const fetchLocations = async () => {
        try {
          const response = await axios.get('/api/machines/locations');
          const locationsData = response.data.locations || [];
          const mappedLocations = locationsData.map(
            (loc: { _id: string; name: string; sasEnabled?: boolean }) => ({
              id: loc._id,
              name: loc.name,
              sasEnabled: loc.sasEnabled || false,
            })
          );
          setLocations(mappedLocations);
        } catch (error) {
          console.error('Error fetching locations:', error);
          toast.error('Failed to load locations', {
            position: 'top-center',
          });
        }
      };

      fetchLocations();
    }
  }, [isEditModalOpen]);

  // Modal animation and body scroll management
  useEffect(() => {
    if (isEditModalOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';

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

      // Reset validation state when modal opens
      setTouched({});
      setSubmitAttempted(false);

      return () => {
        document.body.style.overflow = originalStyle;
      };
    } else {
      document.body.style.overflow = '';
      return undefined;
    }
  }, [isEditModalOpen, setTouched, setSubmitAttempted]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

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

  const handleFieldTouch = (fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
  };

  const handleSubmit = async () => {
    await handleFormSubmit(errors, setSubmitAttempted);
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (!isEditModalOpen) return null;

  return (
    <>
      {/* Backdrop - covers entire screen including sidebar */}
      <div
        ref={backdropRef}
        className="fixed inset-0 z-[100] bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="pointer-events-none fixed inset-0 z-[110] flex items-end justify-center lg:items-center">
        <div
          ref={modalRef}
          className="pointer-events-auto relative flex h-full w-full max-w-full flex-col overflow-y-auto bg-gray-50 animate-in md:max-w-2xl lg:max-h-[95vh] lg:max-w-4xl lg:rounded-xl"
          style={{ opacity: 1 }}
        >
          {/* Modern Header - Sticky */}
          <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
                  Edit Member
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Update member information below
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-9 w-9 rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Content Area with Cards */}
          <div className="flex-1 space-y-6 p-6">
            {/* Profile Overview Card */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Basic account information and contact details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
                  {/* Left: Profile Picture */}
                  <EditMemberProfileHeader
                    firstName={selectedMember?.profile?.firstName}
                    lastName={selectedMember?.profile?.lastName}
                    username={formData.username}
                    email={formData.email}
                  />

                  {/* Right: Account Details */}
                  <EditMemberFormFields
                    formData={formData}
                    locations={locations}
                    errors={errors}
                    checkingUniqueness={checkingUniqueness}
                    onInputChange={handleInputChange}
                    onLocationChange={handleLocationChange}
                    onFieldTouch={handleFieldTouch}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Footer - Sticky */}
          <div className="sticky bottom-0 border-t border-gray-200 bg-white px-6 py-4 shadow-lg">
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="min-w-[100px] gap-2"
              >
                <XCircle className="h-4 w-4" />
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading || Object.keys(errors).length > 0}
                className="min-w-[140px] gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
