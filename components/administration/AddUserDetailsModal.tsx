import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { X, Trash2 } from 'lucide-react';
import type { User } from '@/lib/types/administration';
import gsap from 'gsap';
import defaultAvatar from '@/public/defaultAvatar.svg';
import cameraIcon from '@/public/cameraIcon.svg';
import CircleCropModal from '@/components/ui/image/CircleCropModal';
import { validateNameWithMessage } from '@/lib/utils/nameValidation';

type AddUserDetailsModalProps = {
  open: boolean;
  onClose: () => void;
  onNext: () => void;
  formState: Partial<User> & {
    firstName?: string;
    lastName?: string;
    middleName?: string;
    otherName?: string;
    email?: string;
    gender?: string;
    street?: string;
    town?: string;
    region?: string;
    country?: string;
    postalCode?: string;
    dateOfBirth?: string;
    idType?: string;
    idNumber?: string;
    notes?: string;
    profilePicture?: string | null;
  };
  setFormState: (_data: Partial<AddUserDetailsModalProps['formState']>) => void;
};

export default function AddUserDetailsModal({
  open,
  onClose,
  onNext,
  formState,
  setFormState,
}: AddUserDetailsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
  }>({});

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
    setFormState({ profilePicture: null });
  };

  const handleCropComplete = (croppedImageUrl: string) => {
    setFormState({ profilePicture: croppedImageUrl });
    setIsCropOpen(false);
    setRawImageSrc(null);
  };

  const handleFirstNameChange = (value: string) => {
    setFormState({ firstName: value });
    // Clear error when user starts typing valid characters
    if (errors.firstName) {
      const validation = validateNameWithMessage(value);
      if (validation.isValid) {
        setErrors(prev => ({ ...prev, firstName: undefined }));
      }
    }
  };

  const handleLastNameChange = (value: string) => {
    setFormState({ lastName: value });
    // Clear error when user starts typing valid characters
    if (errors.lastName) {
      const validation = validateNameWithMessage(value);
      if (validation.isValid) {
        setErrors(prev => ({ ...prev, lastName: undefined }));
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    let isValid = true;

    // Validate firstName
    const firstNameValidation = validateNameWithMessage(
      formState.firstName || ''
    );
    if (!firstNameValidation.isValid) {
      newErrors.firstName = firstNameValidation.error;
      isValid = false;
    }

    // Validate lastName
    const lastNameValidation = validateNameWithMessage(
      formState.lastName || ''
    );
    if (!lastNameValidation.isValid) {
      newErrors.lastName = lastNameValidation.error;
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  if (!open) return null;

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
              Create New User Details
            </h2>
          </div>
          <form
            className="flex w-full flex-col gap-8"
            onSubmit={e => {
              e.preventDefault();
              if (validateForm()) {
                onNext();
              }
            }}
          >
            {/* Top section: Profile pic + username/email (left), user info fields (right) */}
            <div className="flex w-full flex-col items-start lg:flex-row lg:items-center lg:gap-12">
              {/* Left: Profile pic, username, and email */}
              <div className="flex w-full flex-col items-center justify-center lg:w-1/3 lg:items-start">
                <div className="relative mb-4 flex justify-center">
                  <Image
                    src={formState.profilePicture || defaultAvatar}
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
                  {formState.profilePicture && (
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
                    <input
                      className="w-full rounded-md border border-border bg-white p-3 text-center lg:text-left"
                      value={formState.username || ''}
                      onChange={e => setFormState({ username: e.target.value })}
                      placeholder="Enter Username"
                      required
                    />
                  </div>
                  <div className="w-full">
                    <label className="mb-1 block text-sm font-semibold text-gray-900">
                      Email Address:
                    </label>
                    <input
                      type="email"
                      className="w-full rounded-md border border-border bg-white p-3 text-center lg:text-left"
                      value={formState.email || ''}
                      onChange={e => setFormState({ email: e.target.value })}
                      placeholder="Enter Email Address"
                      required
                    />
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
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    First Name:
                  </label>
                  <input
                    className={`w-full rounded-md border bg-white p-3 ${
                      errors.firstName ? 'border-red-500' : 'border-border'
                    }`}
                    value={formState.firstName || ''}
                    onChange={e => handleFirstNameChange(e.target.value)}
                    placeholder="Enter First Name"
                    required
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.firstName}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Last Name:
                  </label>
                  <input
                    className={`w-full rounded-md border bg-white p-3 ${
                      errors.lastName ? 'border-red-500' : 'border-border'
                    }`}
                    value={formState.lastName || ''}
                    onChange={e => handleLastNameChange(e.target.value)}
                    placeholder="Enter Last Name"
                    required
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.lastName}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Middle Name:
                  </label>
                  <input
                    className="w-full rounded-md border border-border bg-white p-3"
                    value={formState.middleName || ''}
                    onChange={e => setFormState({ middleName: e.target.value })}
                    placeholder="Enter Middle Name"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Other Name:
                  </label>
                  <input
                    className="w-full rounded-md border border-border bg-white p-3"
                    value={formState.otherName || ''}
                    onChange={e => setFormState({ otherName: e.target.value })}
                    placeholder="Enter Other Name"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Gender:
                  </label>
                  <select
                    className="w-full rounded-md border border-border bg-white p-3"
                    value={formState.gender || ''}
                    onChange={e => setFormState({ gender: e.target.value })}
                    required
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
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
                    Street:
                  </label>
                  <input
                    className="w-full rounded-md border border-border bg-white p-3"
                    value={formState.street || ''}
                    onChange={e => setFormState({ street: e.target.value })}
                    placeholder="Enter Street"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Town:
                  </label>
                  <input
                    className="w-full rounded-md border border-border bg-white p-3"
                    value={formState.town || ''}
                    onChange={e => setFormState({ town: e.target.value })}
                    placeholder="Enter Town"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Region:
                  </label>
                  <input
                    className="w-full rounded-md border border-border bg-white p-3"
                    value={formState.region || ''}
                    onChange={e => setFormState({ region: e.target.value })}
                    placeholder="Enter Region"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Country:
                  </label>
                  <input
                    className="w-full rounded-md border border-border bg-white p-3"
                    value={formState.country || ''}
                    onChange={e => setFormState({ country: e.target.value })}
                    placeholder="Enter Country"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Postal Code:
                  </label>
                  <input
                    className="w-full rounded-md border border-border bg-white p-3"
                    value={formState.postalCode || ''}
                    onChange={e => setFormState({ postalCode: e.target.value })}
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
                    value={formState.dateOfBirth || ''}
                    onChange={e =>
                      setFormState({ dateOfBirth: e.target.value })
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
                    value={formState.idType || ''}
                    onChange={e => setFormState({ idType: e.target.value })}
                    placeholder="Enter ID Type"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    ID Number:
                  </label>
                  <input
                    className="w-full rounded-md border border-border bg-white p-3"
                    value={formState.idNumber || ''}
                    onChange={e => setFormState({ idNumber: e.target.value })}
                    placeholder="Enter ID Number"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Notes:
                  </label>
                  <textarea
                    className="min-h-[56px] w-full rounded-md border border-border bg-white p-3"
                    value={formState.notes || ''}
                    onChange={e => setFormState({ notes: e.target.value })}
                    placeholder="Enter Notes"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-center lg:justify-end">
              <Button
                type="submit"
                className="rounded-md bg-button px-12 py-3 text-lg font-semibold text-white hover:bg-buttonActive"
              >
                Next
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
