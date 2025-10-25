'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { X, Edit, Save, X as Cancel } from 'lucide-react';
import gsap from 'gsap';
import { toast } from 'sonner';
import axios from 'axios';

type MemberDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  member: {
    _id: string;
    fullName: string;
    address: string;
    phoneNumber: string;
    lastLogin?: string;
    createdAt: string;
    locationName: string;
    gamingLocation: string;
    // Additional fields that might be available
    email?: string;
    username?: string;
    profile?: {
      firstName?: string;
      lastName?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
  } | null;
};

export default function MemberDetailsModal({
  isOpen,
  onClose,
  member,
}: MemberDetailsModalProps) {
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // State for edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state for editing
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
  });

  // Original data for comparison
  const [originalData, setOriginalData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
  });

  // Initialize form data when member changes
  useEffect(() => {
    if (member) {
      const memberData = {
        firstName: member.profile?.firstName || '',
        lastName: member.profile?.lastName || '',
        email: member.email || '',
        phoneNumber: member.phoneNumber || '',
        address: member.address || '',
        city: member.profile?.city || '',
        state: member.profile?.state || '',
        zipCode: member.profile?.zipCode || '',
      };

      setFormData(memberData);
      setOriginalData(memberData);
      setIsEditMode(false); // Reset to view mode when member changes
    }
  }, [member]);

  useEffect(() => {
    if (isOpen && modalRef.current && backdropRef.current) {
      gsap.fromTo(
        modalRef.current,
        { y: 100, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' }
      );
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [isOpen]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleViewSessions = () => {
    router.push(`/members/${member?._id}`);
    onClose();
  };

  const handleEditMode = () => {
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setFormData(originalData);
    setIsEditMode(false);
  };

  const handleSaveMember = async () => {
    if (!member?._id) return;

    setIsSaving(true);
    try {
      await axios.put(`/api/members/${member._id}`, {
        profile: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
        },
        phoneNumber: formData.phoneNumber,
      });

      toast.success('Member updated successfully');
      setOriginalData(formData);
      setIsEditMode(false);
    } catch (error) {
      console.error('Error updating member:', error);
      toast.error('Failed to update member');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatDateTime = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        ref={modalRef}
        className="relative flex h-full w-full flex-col overflow-y-auto border border-border bg-background p-4 animate-in lg:max-h-[95vh] lg:max-w-4xl lg:rounded-2xl lg:p-10"
        style={{ opacity: 1 }}
      >
        {/* Single close button */}
        <button
          className="absolute right-4 top-4 z-10 rounded-full bg-white p-2 shadow hover:bg-gray-100"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-6 w-6 text-gray-700" />
        </button>

        <div className="mb-6 flex flex-col items-center">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">
            Member Details
          </h2>
        </div>

        <div className="flex w-full flex-col gap-8">
          {/* Top section: Member info fields */}
          <div className="flex w-full flex-col items-start lg:flex-row lg:items-center lg:gap-12">
            {/* Left: Member ID and basic info */}
            <div className="flex w-full flex-col items-center justify-center lg:w-1/3 lg:items-start">
              <div className="flex w-full flex-col items-center lg:items-start">
                <label className="mb-1 block text-sm font-semibold text-gray-900">
                  Member ID:
                </label>
                <input
                  className="w-full rounded-md border border-border bg-gray-50 p-3 text-center lg:text-left"
                  value={member._id}
                  readOnly
                />
              </div>
              <div className="mt-4 flex w-full flex-col items-center lg:items-start">
                <label className="mb-1 block text-sm font-semibold text-gray-900">
                  Username:
                </label>
                <input
                  className="w-full rounded-md border border-border bg-gray-50 p-3 text-center lg:text-left"
                  value={member.username || 'N/A'}
                  readOnly
                />
              </div>
            </div>

            {/* Right: Member info fields */}
            <div className="mt-6 grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:mt-0 lg:w-2/3">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-900">
                  First Name:
                </label>
                <input
                  className={`w-full rounded-md border border-border p-3 ${
                    isEditMode
                      ? 'bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500'
                      : 'cursor-not-allowed bg-gray-100'
                  }`}
                  placeholder="Enter First Name"
                  value={formData.firstName}
                  onChange={e => handleInputChange('firstName', e.target.value)}
                  readOnly={!isEditMode}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-900">
                  Last Name:
                </label>
                <input
                  className={`w-full rounded-md border border-border p-3 ${
                    isEditMode
                      ? 'bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500'
                      : 'cursor-not-allowed bg-gray-100'
                  }`}
                  placeholder="Enter Last Name"
                  value={formData.lastName}
                  onChange={e => handleInputChange('lastName', e.target.value)}
                  readOnly={!isEditMode}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-900">
                  Email:
                </label>
                <input
                  className={`w-full rounded-md border border-border p-3 ${
                    isEditMode
                      ? 'bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500'
                      : 'cursor-not-allowed bg-gray-100'
                  }`}
                  placeholder="Enter Email"
                  value={formData.email}
                  onChange={e => handleInputChange('email', e.target.value)}
                  readOnly={!isEditMode}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-900">
                  Phone Number:
                </label>
                <input
                  className={`w-full rounded-md border border-border p-3 ${
                    isEditMode
                      ? 'bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500'
                      : 'cursor-not-allowed bg-gray-100'
                  }`}
                  placeholder="Enter Phone Number"
                  value={formData.phoneNumber}
                  onChange={e =>
                    handleInputChange('phoneNumber', e.target.value)
                  }
                  readOnly={!isEditMode}
                />
              </div>
            </div>
          </div>

          {/* Address Section */}
          <hr className="my-6 w-full border-gray-400" />
          <div className="flex w-full flex-col items-center">
            <h3 className="mb-4 text-center text-2xl font-bold text-gray-900">
              Address
            </h3>
            <div className="grid w-full max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-900">
                  Street Address:
                </label>
                <input
                  className={`w-full rounded-md border border-border p-3 ${
                    isEditMode
                      ? 'bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500'
                      : 'cursor-not-allowed bg-gray-100'
                  }`}
                  value={formData.address}
                  onChange={e => handleInputChange('address', e.target.value)}
                  placeholder="Enter Street Address"
                  readOnly={!isEditMode}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-900">
                  City:
                </label>
                <input
                  className={`w-full rounded-md border border-border p-3 ${
                    isEditMode
                      ? 'bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500'
                      : 'cursor-not-allowed bg-gray-100'
                  }`}
                  value={formData.city}
                  onChange={e => handleInputChange('city', e.target.value)}
                  placeholder="Enter City"
                  readOnly={!isEditMode}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-900">
                  State:
                </label>
                <input
                  className={`w-full rounded-md border border-border p-3 ${
                    isEditMode
                      ? 'bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500'
                      : 'cursor-not-allowed bg-gray-100'
                  }`}
                  value={formData.state}
                  onChange={e => handleInputChange('state', e.target.value)}
                  placeholder="Enter State"
                  readOnly={!isEditMode}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-900">
                  ZIP Code:
                </label>
                <input
                  className={`w-full rounded-md border border-border p-3 ${
                    isEditMode
                      ? 'bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500'
                      : 'cursor-not-allowed bg-gray-100'
                  }`}
                  value={formData.zipCode}
                  onChange={e => handleInputChange('zipCode', e.target.value)}
                  placeholder="Enter ZIP Code"
                  readOnly={!isEditMode}
                />
              </div>
            </div>
          </div>

          {/* Account Information Section */}
          <hr className="my-6 w-full border-gray-400" />
          <div className="flex w-full flex-col items-center">
            <h3 className="mb-4 text-center text-2xl font-bold text-gray-900">
              Account Information
            </h3>
            <div className="grid w-full max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-900">
                  Member Since:
                </label>
                <input
                  className="w-full rounded-md border border-border bg-gray-50 p-3"
                  value={formatDate(member.createdAt)}
                  readOnly
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-900">
                  Last Login:
                </label>
                <input
                  className="w-full rounded-md border border-border bg-gray-50 p-3"
                  value={formatDateTime(member.lastLogin)}
                  readOnly
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-900">
                  Gaming Location:
                </label>
                <input
                  className="w-full rounded-md border border-border bg-gray-50 p-3"
                  value={member.locationName}
                  readOnly
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-900">
                  Location ID:
                </label>
                <input
                  className="w-full rounded-md border border-border bg-gray-50 p-3"
                  value={member.gamingLocation}
                  readOnly
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center gap-4 lg:justify-end">
            <Button
              onClick={handleViewSessions}
              className="rounded-md bg-blue-600 px-6 py-3 text-lg font-semibold text-white hover:bg-blue-700"
            >
              View Sessions
            </Button>

            {!isEditMode ? (
              <Button
                onClick={handleEditMode}
                className="flex items-center gap-2 rounded-md bg-button px-6 py-3 text-lg font-semibold text-white hover:bg-buttonActive"
              >
                <Edit className="h-4 w-4" />
                Edit Member
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={handleCancelEdit}
                  variant="outline"
                  className="flex items-center gap-2 rounded-md px-6 py-3 text-lg font-semibold"
                >
                  <Cancel className="h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveMember}
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-md bg-button px-6 py-3 text-lg font-semibold text-white hover:bg-buttonActive"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
