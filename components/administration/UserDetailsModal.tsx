import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { X, Trash2 } from 'lucide-react';
import type { UserDetailsModalProps } from '@/lib/types/administration';
import gsap from 'gsap';
import defaultAvatar from '@/public/defaultAvatar.svg';
import cameraIcon from '@/public/cameraIcon.svg';
import CircleCropModal from '@/components/ui/image/CircleCropModal';

export default function UserDetailsModal({
  open,
  user,
  onClose,
  onSave,
}: UserDetailsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    otherName: '',
    gender: '',
    street: '',
    town: '',
    region: '',
    country: '',
    postalCode: '',
    dateOfBirth: '',
    idType: '',
    idNumber: '',
    notes: '',
    profilePicture: '',
  });

  // Initialize form data when user changes
  useEffect(() => {
    if (user) {
      setIsLoading(false);
      setFormData({
        firstName: user.profile?.firstName || '',
        lastName: user.profile?.lastName || '',
        middleName: user.profile?.middleName || '',
        otherName: user.profile?.otherName || '',
        gender: user.profile?.gender || '',
        street: user.profile?.address?.street || '',
        town: user.profile?.address?.town || '',
        region: user.profile?.address?.region || '',
        country: user.profile?.address?.country || '',
        postalCode: user.profile?.address?.postalCode || '',
        dateOfBirth: user.profile?.identification?.dateOfBirth || '',
        idType: user.profile?.identification?.idType || '',
        idNumber: user.profile?.identification?.idNumber || '',
        notes: user.profile?.identification?.notes || '',
        profilePicture: user.profilePicture || '',
      });
    } else if (open) {
      // Show loading state when modal is open but user data is not yet available
      setIsLoading(true);
    }
  }, [user, open]);

  useEffect(() => {
    if (open && modalRef.current && backdropRef.current) {
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
  }, [open]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        setRawImageSrc(e.target?.result as string);
        setIsCropOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveProfilePicture = () => {
    setFormData(prev => ({ ...prev, profilePicture: '' }));
  };

  const handleCropComplete = (croppedImageUrl: string) => {
    setFormData(prev => ({ ...prev, profilePicture: croppedImageUrl }));
    setIsCropOpen(false);
    setRawImageSrc(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      profilePicture: formData.profilePicture || null,
    });
  };

  if (!open || !user) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-end justify-center lg:items-center">
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
          {/* Close button */}
          <button
            className="absolute right-4 top-4 z-10 rounded-full bg-white p-2 shadow hover:bg-gray-100"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-6 w-6 text-gray-700" />
          </button>
          <div className="mb-6 flex flex-col items-center">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              Edit User Details
            </h2>
          </div>
          <form className="flex w-full flex-col gap-8" onSubmit={handleSubmit}>
            {/* Top section: Profile pic + username/email (left), user info fields (right) */}
            <div className="flex w-full flex-col items-start lg:flex-row lg:items-center lg:gap-12">
              {/* Left: Profile pic, username, and email */}
              <div className="flex w-full flex-col items-center justify-center lg:w-1/3 lg:items-start">
                <div className="relative mb-4 flex justify-center">
                  <Image
                    src={
                      formData.profilePicture ||
                      user.profilePicture ||
                      defaultAvatar
                    }
                    alt="Avatar"
                    width={160}
                    height={160}
                    className="rounded-full border-4 border-container bg-gray-200"
                  />
                  <button
                    type="button"
                    className="absolute bottom-4 right-4 flex items-center justify-center rounded-full border-2 border-border bg-transparent shadow transition-colors hover:bg-gray-100"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Image
                      src={cameraIcon}
                      alt="Edit Avatar"
                      width={32}
                      height={32}
                      className="m-0 p-0"
                    />
                  </button>
                  {(formData.profilePicture || user.profilePicture) && (
                    <button
                      type="button"
                      className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white transition-colors hover:bg-red-600"
                      onClick={handleRemoveProfilePicture}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="flex w-full flex-col items-center space-y-4 lg:items-start">
                  <div className="w-full">
                    <label className="mb-1 block text-sm font-semibold text-gray-900">
                      Username:
                    </label>
                    {isLoading ? (
                      <Skeleton className="h-12 w-full" />
                    ) : (
                      <input
                        className="w-full rounded-md border border-border bg-white p-3 text-center lg:text-left"
                        value={user?.username || ''}
                        disabled
                        placeholder="Username"
                      />
                    )}
                  </div>
                  <div className="w-full">
                    <label className="mb-1 block text-sm font-semibold text-gray-900">
                      Email Address:
                    </label>
                    {isLoading ? (
                      <Skeleton className="h-12 w-full" />
                    ) : (
                      <input
                        type="email"
                        className="w-full rounded-md border border-border bg-white p-3 text-center lg:text-left"
                        value={user?.email || user?.emailAddress || ''}
                        disabled
                        placeholder="Email Address"
                      />
                    )}
                  </div>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
              {/* Right: User info fields */}
              <div className="mt-6 grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:mt-0 lg:w-2/3">
                {isLoading ? (
                  // Show skeleton loaders for all form fields
                  <>
                    {Array.from({ length: 12 }).map((_, index) => (
                      <div key={index}>
                        <Skeleton className="mb-1 h-4 w-20" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-900">
                        First Name:
                      </label>
                      <input
                        className="w-full rounded-md border border-border bg-white p-3"
                        value={formData.firstName}
                        onChange={e =>
                          handleInputChange('firstName', e.target.value)
                        }
                        placeholder="Enter First Name"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-900">
                        Last Name:
                      </label>
                      <input
                        className="w-full rounded-md border border-border bg-white p-3"
                        value={formData.lastName}
                        onChange={e =>
                          handleInputChange('lastName', e.target.value)
                        }
                        placeholder="Enter Last Name"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-900">
                        Middle Name:
                      </label>
                      <input
                        className="w-full rounded-md border border-border bg-white p-3"
                        value={formData.middleName}
                        onChange={e =>
                          handleInputChange('middleName', e.target.value)
                        }
                        placeholder="Enter Middle Name"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-900">
                        Other Name:
                      </label>
                      <input
                        className="w-full rounded-md border border-border bg-white p-3"
                        value={formData.otherName}
                        onChange={e =>
                          handleInputChange('otherName', e.target.value)
                        }
                        placeholder="Enter Other Name"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-semibold text-gray-900">
                        Gender:
                      </label>
                      <select
                        className="w-full rounded-md border border-border bg-white p-3"
                        value={formData.gender}
                        onChange={e =>
                          handleInputChange('gender', e.target.value)
                        }
                        required
                      >
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </>
                )}
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
                    Street:
                  </label>
                  <input
                    className="w-full rounded-md border border-border bg-white p-3"
                    value={formData.street}
                    onChange={e => handleInputChange('street', e.target.value)}
                    placeholder="Enter Street"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Town:
                  </label>
                  <input
                    className="w-full rounded-md border border-border bg-white p-3"
                    value={formData.town}
                    onChange={e => handleInputChange('town', e.target.value)}
                    placeholder="Enter Town"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Region:
                  </label>
                  <input
                    className="w-full rounded-md border border-border bg-white p-3"
                    value={formData.region}
                    onChange={e => handleInputChange('region', e.target.value)}
                    placeholder="Enter Region"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Country:
                  </label>
                  <input
                    className="w-full rounded-md border border-border bg-white p-3"
                    value={formData.country}
                    onChange={e => handleInputChange('country', e.target.value)}
                    placeholder="Enter Country"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Postal Code:
                  </label>
                  <input
                    className="w-full rounded-md border border-border bg-white p-3"
                    value={formData.postalCode}
                    onChange={e =>
                      handleInputChange('postalCode', e.target.value)
                    }
                    placeholder="Enter Postal Code"
                  />
                </div>
              </div>
            </div>

            {/* Identification Section */}
            <hr className="my-6 w-full border-gray-400" />
            <div className="flex w-full flex-col items-center">
              <h3 className="mb-4 text-center text-2xl font-bold text-gray-900">
                Identification
              </h3>
              <div className="grid w-full max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    D.O.B:
                  </label>
                  <input
                    className="w-full rounded-md border border-border bg-white p-3"
                    value={formData.dateOfBirth}
                    onChange={e =>
                      handleInputChange('dateOfBirth', e.target.value)
                    }
                    placeholder="YYYY-MM-DD"
                    type="date"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    ID Type:
                  </label>
                  <input
                    className="w-full rounded-md border border-border bg-white p-3"
                    value={formData.idType}
                    onChange={e => handleInputChange('idType', e.target.value)}
                    placeholder="Enter ID Type"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    ID Number:
                  </label>
                  <input
                    className="w-full rounded-md border border-border bg-white p-3"
                    value={formData.idNumber}
                    onChange={e =>
                      handleInputChange('idNumber', e.target.value)
                    }
                    placeholder="Enter ID Number"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Notes:
                  </label>
                  <textarea
                    className="min-h-[56px] w-full rounded-md border border-border bg-white p-3"
                    value={formData.notes}
                    onChange={e => handleInputChange('notes', e.target.value)}
                    placeholder="Enter Notes"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-center gap-4 lg:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="rounded-md px-8 py-3 text-lg font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-md bg-button px-8 py-3 text-lg font-semibold text-white hover:bg-buttonActive"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Profile Picture Cropping Modal */}
      {isCropOpen && rawImageSrc && (
        <CircleCropModal
          open={isCropOpen}
          onClose={() => {
            setIsCropOpen(false);
            setRawImageSrc(null);
          }}
          imageSrc={rawImageSrc}
          onCropped={handleCropComplete}
        />
      )}
    </>
  );
}
