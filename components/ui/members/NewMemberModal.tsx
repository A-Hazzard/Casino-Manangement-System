'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import axios from 'axios';
import { toast } from 'sonner';
import { X, UserPlus } from 'lucide-react';
import { useUserStore } from '@/lib/store/userStore';

type NewMemberModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onMemberCreated: () => void;
};

export default function NewMemberModal({
  isOpen,
  onClose,
  onMemberCreated,
}: NewMemberModalProps) {
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
    newData?: Record<string, unknown> | null
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
          changes: [], // Will be calculated by the API
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
    username: '',
    pin: '0000',
  });

  useEffect(() => {
    if (isOpen) {
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
  }, [isOpen]);

  const handleClose = () => {
    gsap.to(modalRef.current, {
      opacity: 0,
      y: -20,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
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
    if (!formData.firstName || !formData.lastName || !formData.username) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/members', {
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
        username: formData.username,
        pin: formData.pin,
      });

      if (response.status === 201) {
        const createdMember = response.data;

        // Log the creation activity
        await logActivity(
          'create',
          'member',
          createdMember._id || formData.username,
          `${formData.firstName} ${formData.lastName}`,
          `Created new member: ${formData.firstName} ${formData.lastName} with username: ${formData.username}`,
          null, // No previous data for creation
          createdMember // New data
        );

        toast.success('Member created successfully');
        onMemberCreated();
        handleClose();
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phoneNumber: '',
          occupation: '',
          address: '',
          points: 0,
          uaccount: 0,
          username: '',
          pin: '0000',
        });
      } else {
        toast.error('Failed to create member');
      }
    } catch (error) {
      console.error('Error creating member:', error);
      toast.error('Failed to create member');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="fixed inset-0 z-40 bg-black bg-opacity-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          ref={modalRef}
          className="mx-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl"
        >
          {/* Header */}
          <div className="rounded-t-lg bg-button p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white bg-opacity-20">
                  <UserPlus className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Create New Member</h2>
                  <p className="text-sm text-white text-opacity-90">
                    Add a new member to the system
                  </p>
                </div>
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
          <div className="p-6">
            <div className="space-y-6">
              {/* Basic Information Section */}
              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800">
                  <div className="h-2 w-2 rounded-full bg-button"></div>
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="firstName"
                      className="text-sm font-medium text-gray-700"
                    >
                      First Name *
                    </Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="Enter first name"
                      className="border-gray-300 focus:border-buttonActive focus:ring-buttonActive"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="lastName"
                      className="text-sm font-medium text-gray-700"
                    >
                      Last Name *
                    </Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Enter last name"
                      className="border-gray-300 focus:border-buttonActive focus:ring-buttonActive"
                      required
                    />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Label
                    htmlFor="username"
                    className="text-sm font-medium text-gray-700"
                  >
                    Username *
                  </Label>
                  <Input
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Enter username"
                    className="border-gray-300 focus:border-buttonActive focus:ring-buttonActive"
                    required
                  />
                </div>
              </div>

              {/* Contact Information Section */}
              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800">
                  <div className="h-2 w-2 rounded-full bg-button"></div>
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-gray-700"
                    >
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter email address"
                      className="border-gray-300 focus:border-buttonActive focus:ring-buttonActive"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="phoneNumber"
                      className="text-sm font-medium text-gray-700"
                    >
                      Phone Number
                    </Label>
                    <Input
                      id="phoneNumber"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      placeholder="Enter phone number"
                      className="border-gray-300 focus:border-buttonActive focus:ring-buttonActive"
                    />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Label
                    htmlFor="address"
                    className="text-sm font-medium text-gray-700"
                  >
                    Address
                  </Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Enter address"
                    className="border-gray-300 focus:border-buttonActive focus:ring-buttonActive"
                  />
                </div>
                <div className="mt-4 space-y-2">
                  <Label
                    htmlFor="occupation"
                    className="text-sm font-medium text-gray-700"
                  >
                    Occupation
                  </Label>
                  <Input
                    id="occupation"
                    name="occupation"
                    value={formData.occupation}
                    onChange={handleInputChange}
                    placeholder="Enter occupation"
                    className="border-gray-300 focus:border-buttonActive focus:ring-buttonActive"
                  />
                </div>
              </div>

              {/* Account Information Section */}
              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800">
                  <div className="h-2 w-2 rounded-full bg-button"></div>
                  Account Information
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="points"
                      className="text-sm font-medium text-gray-700"
                    >
                      Points
                    </Label>
                    <Input
                      id="points"
                      name="points"
                      type="number"
                      value={formData.points}
                      onChange={handleInputChange}
                      placeholder="0"
                      className="border-gray-300 focus:border-buttonActive focus:ring-buttonActive"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="uaccount"
                      className="text-sm font-medium text-gray-700"
                    >
                      Account Balance
                    </Label>
                    <Input
                      id="uaccount"
                      name="uaccount"
                      type="number"
                      value={formData.uaccount}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      className="border-gray-300 focus:border-buttonActive focus:ring-buttonActive"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="rounded-b-lg border-t bg-gray-50 px-6 py-4">
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-button text-white hover:bg-buttonActive"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Creating...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Create Member
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
