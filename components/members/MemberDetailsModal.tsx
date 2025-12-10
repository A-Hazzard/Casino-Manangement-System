/**
 * Member Details Modal Component
 * Modal for displaying and editing member details.
 * Redesigned to match UserModal structure with Card components.
 *
 * Features:
 * - Member information display with Card-based layout
 * - Edit mode with form fields
 * - Member profile editing
 * - Address and contact information management
 * - Account information display
 * - Save and cancel functionality
 * - GSAP animations
 * - Toast notifications
 * - Navigation to member details page
 *
 * @param isOpen - Whether the modal is visible
 * @param member - Member object to display/edit
 * @param onClose - Callback to close the modal
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUserStore } from '@/lib/store/userStore';
import defaultAvatar from '@/public/defaultAvatar.svg';
import axios from 'axios';
import gsap from 'gsap';
import { Activity, Edit3, Save, X, XCircle } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

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
      occupation?: string;
      email?: string;
    };
    points?: number;
    uaccount?: number;
    profilePicture?: string;
  } | null;
};

export default function MemberDetailsModal({
  isOpen,
  onClose,
  member,
}: MemberDetailsModalProps) {
  const router = useRouter();
  const { user } = useUserStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Check if user can edit members (only admin and developer)
  const canEditMembers = useMemo(() => {
    if (!user || !user.roles) return false;
    return user.roles.some(role => role === 'admin' || role === 'developer');
  }, [user]);

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
    occupation: '',
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
    occupation: '',
  });

  // Initialize form data when member changes
  useEffect(() => {
    if (member) {
      const memberData = {
        firstName: member.profile?.firstName || '',
        lastName: member.profile?.lastName || '',
        email: member.email || member.profile?.email || '',
        phoneNumber: member.phoneNumber || '',
        address: member.address || member.profile?.address || '',
        city: member.profile?.city || '',
        state: member.profile?.state || '',
        zipCode: member.profile?.zipCode || '',
        occupation: member.profile?.occupation || '',
      };

      setFormData(memberData);
      setOriginalData(memberData);
      setIsEditMode(false); // Reset to view mode when member changes
    }
  }, [member]);

  useEffect(() => {
    if (isOpen && modalRef.current && backdropRef.current) {
      // Prevent body scrolling when modal is open
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';

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

      // Cleanup: restore body scrolling when modal closes
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
    return undefined;
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
          occupation: formData.occupation,
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

  const fullName =
    member.fullName ||
    `${member.profile?.firstName || ''} ${member.profile?.lastName || ''}`.trim() ||
    'Member';

  return (
    <>
      {/* Backdrop - covers entire screen including sidebar */}
      <div
        ref={backdropRef}
        className="fixed inset-0 z-[100] bg-black/50"
        onClick={onClose}
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
                  {isEditMode ? 'Edit Member' : 'Member Profile'}
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  {isEditMode
                    ? 'Update member information below'
                    : `Viewing ${fullName}'s profile`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!isEditMode && (
                  <Button
                    onClick={handleViewSessions}
                    size="sm"
                    variant="outline"
                    className="gap-2"
                  >
                    <Activity className="h-4 w-4" />
                    View Sessions
                  </Button>
                )}
                {!isEditMode && canEditMembers && (
                  <Button
                    onClick={handleEditMode}
                    size="sm"
                    className="gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-9 w-9 rounded-full hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
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
                  <div className="flex flex-col items-center lg:items-start">
                    <div className="relative">
                      <Image
                        src={member.profilePicture || defaultAvatar}
                        alt="Member Avatar"
                        width={140}
                        height={140}
                        className="rounded-full border-4 border-gray-100 bg-gray-50 shadow-sm"
                      />
                    </div>
                    <div className="mt-3 flex flex-col items-center gap-1 lg:items-start">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {fullName}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {formData.email || member.email || 'No email'}
                      </p>
                      {member.username && (
                        <p className="text-xs text-gray-500">
                          @{member.username}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Account Details */}
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {/* Member ID */}
                      <div>
                        <Label htmlFor="memberId" className="text-gray-700">
                          Member ID
                        </Label>
                        <p className="mt-2 break-words font-mono text-sm text-gray-900">
                          {member._id}
                        </p>
                      </div>

                      {/* Username */}
                      <div>
                        <Label htmlFor="username" className="text-gray-700">
                          Username
                        </Label>
                        {isEditMode ? (
                          <Input
                            id="username"
                            value={member.username || ''}
                            placeholder="Username"
                            className="mt-2"
                            readOnly
                            disabled
                          />
                        ) : (
                          <p className="mt-2 break-words text-sm text-gray-900">
                            {member.username || 'Not specified'}
                          </p>
                        )}
                      </div>

                      {/* First Name */}
                      <div>
                        <Label htmlFor="firstName" className="text-gray-700">
                          First Name
                        </Label>
                        {isEditMode ? (
                          <Input
                            id="firstName"
                            value={formData.firstName}
                            onChange={e =>
                              handleInputChange('firstName', e.target.value)
                            }
                            placeholder="Enter first name"
                            className="mt-2"
                          />
                        ) : (
                          <p className="mt-2 break-words text-sm text-gray-900">
                            {formData.firstName || 'Not specified'}
                          </p>
                        )}
                      </div>

                      {/* Last Name */}
                      <div>
                        <Label htmlFor="lastName" className="text-gray-700">
                          Last Name
                        </Label>
                        {isEditMode ? (
                          <Input
                            id="lastName"
                            value={formData.lastName}
                            onChange={e =>
                              handleInputChange('lastName', e.target.value)
                            }
                            placeholder="Enter last name"
                            className="mt-2"
                          />
                        ) : (
                          <p className="mt-2 break-words text-sm text-gray-900">
                            {formData.lastName || 'Not specified'}
                          </p>
                        )}
                      </div>

                      {/* Email */}
                      <div>
                        <Label htmlFor="email" className="text-gray-700">
                          Email Address
                        </Label>
                        {isEditMode ? (
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={e =>
                              handleInputChange('email', e.target.value)
                            }
                            placeholder="Enter email address"
                            className="mt-2"
                          />
                        ) : (
                          <p className="mt-2 break-words text-sm text-gray-900">
                            {formData.email || 'Not specified'}
                          </p>
                        )}
                      </div>

                      {/* Phone Number */}
                      <div>
                        <Label htmlFor="phoneNumber" className="text-gray-700">
                          Phone Number
                        </Label>
                        {isEditMode ? (
                          <Input
                            id="phoneNumber"
                            type="tel"
                            value={formData.phoneNumber}
                            onChange={e =>
                              handleInputChange('phoneNumber', e.target.value)
                            }
                            placeholder="Enter phone number"
                            className="mt-2"
                          />
                        ) : (
                          <p className="mt-2 break-words text-sm text-gray-900">
                            {formData.phoneNumber || 'Not specified'}
                          </p>
                        )}
                      </div>

                      {/* Occupation */}
                      <div>
                        <Label htmlFor="occupation" className="text-gray-700">
                          Occupation
                        </Label>
                        {isEditMode ? (
                          <Input
                            id="occupation"
                            value={formData.occupation}
                            onChange={e =>
                              handleInputChange('occupation', e.target.value)
                            }
                            placeholder="Enter occupation"
                            className="mt-2"
                          />
                        ) : (
                          <p className="mt-2 break-words text-sm text-gray-900">
                            {formData.occupation || 'Not specified'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address Card */}
            <Card>
              <CardHeader>
                <CardTitle>Address</CardTitle>
                <CardDescription>
                  Physical address and location information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="address" className="text-gray-700">
                      Street Address
                    </Label>
                    {isEditMode ? (
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={e =>
                          handleInputChange('address', e.target.value)
                        }
                        placeholder="Enter street address"
                        className="mt-2"
                      />
                    ) : (
                      <p className="mt-2 break-words text-sm text-gray-900">
                        {formData.address || 'Not specified'}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="city" className="text-gray-700">
                      City
                    </Label>
                    {isEditMode ? (
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={e =>
                          handleInputChange('city', e.target.value)
                        }
                        placeholder="Enter city"
                        className="mt-2"
                      />
                    ) : (
                      <p className="mt-2 break-words text-sm text-gray-900">
                        {formData.city || 'Not specified'}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="state" className="text-gray-700">
                      State
                    </Label>
                    {isEditMode ? (
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={e =>
                          handleInputChange('state', e.target.value)
                        }
                        placeholder="Enter state"
                        className="mt-2"
                      />
                    ) : (
                      <p className="mt-2 break-words text-sm text-gray-900">
                        {formData.state || 'Not specified'}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="zipCode" className="text-gray-700">
                      ZIP Code
                    </Label>
                    {isEditMode ? (
                      <Input
                        id="zipCode"
                        value={formData.zipCode}
                        onChange={e =>
                          handleInputChange('zipCode', e.target.value)
                        }
                        placeholder="Enter ZIP code"
                        className="mt-2"
                      />
                    ) : (
                      <p className="mt-2 break-words text-sm text-gray-900">
                        {formData.zipCode || 'Not specified'}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Information Card */}
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  Member account details and activity information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-gray-700">Member Since</Label>
                    <p className="mt-2 text-sm text-gray-900">
                      {formatDate(member.createdAt)}
                    </p>
                  </div>

                  <div>
                    <Label className="text-gray-700">Last Login</Label>
                    <p className="mt-2 text-sm text-gray-900">
                      {formatDateTime(member.lastLogin)}
                    </p>
                  </div>

                  <div>
                    <Label className="text-gray-700">Gaming Location</Label>
                    <p className="mt-2 text-sm text-gray-900">
                      {member.locationName || 'Not specified'}
                    </p>
                  </div>

                  <div>
                    <Label className="text-gray-700">Location ID</Label>
                    <p className="mt-2 break-words font-mono text-sm text-gray-900">
                      {member.gamingLocation}
                    </p>
                  </div>

                  {member.points !== undefined && (
                    <div>
                      <Label className="text-gray-700">Points</Label>
                      <p className="mt-2 text-sm font-semibold text-gray-900">
                        {member.points.toLocaleString()}
                      </p>
                    </div>
                  )}

                  {member.uaccount !== undefined && (
                    <div>
                      <Label className="text-gray-700">Account Balance</Label>
                      <p className="mt-2 text-sm font-semibold text-gray-900">
                        $
                        {member.uaccount.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Footer - Sticky for Edit Mode */}
          {isEditMode && (
            <div className="sticky bottom-0 border-t border-gray-200 bg-white px-6 py-4 shadow-lg">
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="min-w-[100px] gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveMember}
                  disabled={isSaving}
                  className="min-w-[140px] gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  {isSaving ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Saving...
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
          )}
        </div>
      </div>
    </>
  );
}
