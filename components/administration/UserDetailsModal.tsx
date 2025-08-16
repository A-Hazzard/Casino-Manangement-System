import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { X, Trash2 } from "lucide-react";
import type { UserDetailsModalProps } from "@/lib/types/administration";
import gsap from "gsap";
import defaultAvatar from "@/public/defaultAvatar.svg";
import cameraIcon from "@/public/cameraIcon.svg";
import CircleCropModal from "@/components/ui/image/CircleCropModal";

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

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    otherName: "",
    gender: "",
    street: "",
    town: "",
    region: "",
    country: "",
    postalCode: "",
    dateOfBirth: "",
    idType: "",
    idNumber: "",
    notes: "",
    profilePicture: "",
  });

  // Initialize form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.profile?.firstName || "",
        lastName: user.profile?.lastName || "",
        middleName: user.profile?.middleName || "",
        otherName: user.profile?.otherName || "",
        gender: user.profile?.gender || "",
        street: user.profile?.address?.street || "",
        town: user.profile?.address?.town || "",
        region: user.profile?.address?.region || "",
        country: user.profile?.address?.country || "",
        postalCode: user.profile?.address?.postalCode || "",
        dateOfBirth: user.profile?.identification?.dateOfBirth || "",
        idType: user.profile?.identification?.idType || "",
        idNumber: user.profile?.identification?.idNumber || "",
        notes: user.profile?.identification?.notes || "",
        profilePicture: user.profilePicture || "",
      });
    }
  }, [user]);

  useEffect(() => {
    if (open && modalRef.current && backdropRef.current) {
      gsap.fromTo(
        modalRef.current,
        { y: 100, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" }
      );
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "power2.out" }
      );
    }
  }, [open]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setRawImageSrc(e.target?.result as string);
        setIsCropOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveProfilePicture = () => {
    setFormData((prev) => ({ ...prev, profilePicture: "" }));
  };

  const handleCropComplete = (croppedImageUrl: string) => {
    setFormData((prev) => ({ ...prev, profilePicture: croppedImageUrl }));
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
      <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
        <div
          ref={backdropRef}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />
        <div
          ref={modalRef}
          className="relative w-full h-full lg:max-w-4xl lg:max-h-[95vh] lg:rounded-2xl bg-background flex flex-col overflow-y-auto animate-in p-4 lg:p-10 border border-border"
          style={{ opacity: 1 }}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow hover:bg-gray-100"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-6 h-6 text-gray-700" />
          </button>
          <div className="flex flex-col items-center mb-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              Edit User Details
            </h2>
          </div>
          <form className="w-full flex flex-col gap-8" onSubmit={handleSubmit}>
            {/* Top section: Profile pic + username/email (left), user info fields (right) */}
            <div className="w-full flex flex-col lg:flex-row lg:gap-12 items-start lg:items-center">
              {/* Left: Profile pic, username, and email */}
              <div className="w-full lg:w-1/3 flex flex-col items-center lg:items-start justify-center">
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
                    className="rounded-full bg-gray-200 border-4 border-container"
                  />
                  <button
                    type="button"
                    className="absolute bottom-4 right-4 rounded-full border-2 border-border shadow flex items-center justify-center bg-transparent hover:bg-gray-100 transition-colors"
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
                      className="absolute top-2 right-2 rounded-full bg-red-500 text-white p-1 hover:bg-red-600 transition-colors"
                      onClick={handleRemoveProfilePicture}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="w-full flex flex-col items-center lg:items-start space-y-4">
                  <div className="w-full">
                    <label className="block text-sm font-semibold mb-1 text-gray-900">
                      Username:
                    </label>
                    <input
                      className="w-full rounded-md p-3 bg-white border border-border text-center lg:text-left"
                      value={user.username || ""}
                      disabled
                      placeholder="Username"
                    />
                  </div>
                  <div className="w-full">
                    <label className="block text-sm font-semibold mb-1 text-gray-900">
                      Email Address:
                    </label>
                    <input
                      type="email"
                      className="w-full rounded-md p-3 bg-white border border-border text-center lg:text-left"
                      value={user.email || ""}
                      disabled
                      placeholder="Email Address"
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
              <div className="w-full lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 lg:mt-0">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-900">
                    First Name:
                  </label>
                  <input
                    className="w-full rounded-md p-3 bg-white border border-border"
                    value={formData.firstName}
                    onChange={(e) =>
                      handleInputChange("firstName", e.target.value)
                    }
                    placeholder="Enter First Name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-900">
                    Last Name:
                  </label>
                  <input
                    className="w-full rounded-md p-3 bg-white border border-border"
                    value={formData.lastName}
                    onChange={(e) =>
                      handleInputChange("lastName", e.target.value)
                    }
                    placeholder="Enter Last Name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-900">
                    Middle Name:
                  </label>
                  <input
                    className="w-full rounded-md p-3 bg-white border border-border"
                    value={formData.middleName}
                    onChange={(e) =>
                      handleInputChange("middleName", e.target.value)
                    }
                    placeholder="Enter Middle Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-900">
                    Other Name:
                  </label>
                  <input
                    className="w-full rounded-md p-3 bg-white border border-border"
                    value={formData.otherName}
                    onChange={(e) =>
                      handleInputChange("otherName", e.target.value)
                    }
                    placeholder="Enter Other Name"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-1 text-gray-900">
                    Gender:
                  </label>
                  <select
                    className="w-full rounded-md p-3 bg-white border border-border"
                    value={formData.gender}
                    onChange={(e) =>
                      handleInputChange("gender", e.target.value)
                    }
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
            <hr className="my-6 border-gray-400 w-full" />
            <div className="w-full flex flex-col items-center">
              <h3 className="text-2xl font-bold text-center mb-4 text-gray-900">
                Address
              </h3>
              <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-900">
                    Street:
                  </label>
                  <input
                    className="w-full rounded-md p-3 bg-white border border-border"
                    value={formData.street}
                    onChange={(e) =>
                      handleInputChange("street", e.target.value)
                    }
                    placeholder="Enter Street"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-900">
                    Town:
                  </label>
                  <input
                    className="w-full rounded-md p-3 bg-white border border-border"
                    value={formData.town}
                    onChange={(e) => handleInputChange("town", e.target.value)}
                    placeholder="Enter Town"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-900">
                    Region:
                  </label>
                  <input
                    className="w-full rounded-md p-3 bg-white border border-border"
                    value={formData.region}
                    onChange={(e) =>
                      handleInputChange("region", e.target.value)
                    }
                    placeholder="Enter Region"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-900">
                    Country:
                  </label>
                  <input
                    className="w-full rounded-md p-3 bg-white border border-border"
                    value={formData.country}
                    onChange={(e) =>
                      handleInputChange("country", e.target.value)
                    }
                    placeholder="Enter Country"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-900">
                    Postal Code:
                  </label>
                  <input
                    className="w-full rounded-md p-3 bg-white border border-border"
                    value={formData.postalCode}
                    onChange={(e) =>
                      handleInputChange("postalCode", e.target.value)
                    }
                    placeholder="Enter Postal Code"
                  />
                </div>
              </div>
            </div>

            {/* Identification Section */}
            <hr className="my-6 border-gray-400 w-full" />
            <div className="w-full flex flex-col items-center">
              <h3 className="text-2xl font-bold text-center mb-4 text-gray-900">
                Identification
              </h3>
              <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-900">
                    D.O.B:
                  </label>
                  <input
                    className="w-full rounded-md p-3 bg-white border border-border"
                    value={formData.dateOfBirth}
                    onChange={(e) =>
                      handleInputChange("dateOfBirth", e.target.value)
                    }
                    placeholder="YYYY-MM-DD"
                    type="date"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-900">
                    ID Type:
                  </label>
                  <input
                    className="w-full rounded-md p-3 bg-white border border-border"
                    value={formData.idType}
                    onChange={(e) =>
                      handleInputChange("idType", e.target.value)
                    }
                    placeholder="Enter ID Type"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-900">
                    ID Number:
                  </label>
                  <input
                    className="w-full rounded-md p-3 bg-white border border-border"
                    value={formData.idNumber}
                    onChange={(e) =>
                      handleInputChange("idNumber", e.target.value)
                    }
                    placeholder="Enter ID Number"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-1 text-gray-900">
                    Notes:
                  </label>
                  <textarea
                    className="w-full rounded-md p-3 min-h-[56px] bg-white border border-border"
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    placeholder="Enter Notes"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end mt-8 gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="px-8 py-3 rounded-md text-lg font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-button text-white px-8 py-3 rounded-md text-lg font-semibold hover:bg-buttonActive"
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
