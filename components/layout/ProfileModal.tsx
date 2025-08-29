import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Pencil } from "lucide-react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { useUserStore } from "@/lib/store/userStore";
import type { User } from "@/lib/types/administration";
import { toast } from "sonner";
import { createActivityLogger } from "@/lib/helpers/activityLogger";
import defaultAvatar from "@/public/defaultAvatar.svg";
import cameraIcon from "@/public/cameraIcon.svg";
import CircleCropModal from "@/components/ui/image/CircleCropModal";

async function fetchUserData(userId: string): Promise<User | null> {
  try {
    const response = await axios.get(`/api/users/${userId}`);
    const { user } = response.data;
    return user;
  } catch (error) {
    console.error("Failed to fetch user data", error);
    return null;
  }
}

export default function ProfileModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user: authUser } = useUserStore();
  const [userData, setUserData] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User["profile"]>>({});
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const userLogger = createActivityLogger("user");

  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && authUser?._id) {
      setIsLoading(true);
      fetchUserData(authUser._id)
        .then((data) => {
          if (data) {
            setUserData(data);
            setFormData(data.profile || {});
            setProfilePicture(data.profilePicture || null);
          } else {
            toast.error("Could not load user profile.");
            onClose();
          }
        })
        .finally(() => setIsLoading(false));
    } else if (!open) {
      // Reset edit mode when modal is closed
      setIsEditMode(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  }, [open, authUser, onClose]);

  const handleInputChange = (
    field: string,
    value: string,
    section?: "address" | "identification"
  ) => {
    setFormData((prev = {}) => {
      if (section) {
        return {
          ...prev,
          [section]: {
            ...(prev[section] || {}),
            [field]: value,
          },
        };
      }
      return { ...prev, [field]: value };
    });
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
    setProfilePicture(null);
  };

  const handleCropComplete = (croppedImageUrl: string) => {
    setProfilePicture(croppedImageUrl);
    setIsCropOpen(false);
    setRawImageSrc(null);
  };

  const handleSave = async () => {
    if (!userData) return;

    const payload: {
      _id: string;
      profile: typeof formData;
      password?: { current: string; new: string };
      profilePicture?: string | null;
    } = {
      _id: userData._id,
      profile: formData,
      profilePicture: profilePicture ?? null,
    };

    if (
      passwordData.newPassword &&
      passwordData.newPassword === passwordData.confirmPassword
    ) {
      if (!passwordData.currentPassword) {
        toast.error("Please enter your current password to set a new one.");
        return;
      }
      payload.password = {
        current: passwordData.currentPassword,
        new: passwordData.newPassword,
      };
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    try {
      const previousData = { ...userData };

      await axios.put(`/api/users/${userData._id}`, payload);

      // Log the profile update activity
      await userLogger.logUpdate(
        userData._id,
        userData.username,
        previousData,
        payload,
        `Updated profile for user: ${userData.username}`
      );

      toast.success("Profile updated successfully!");
      // Emit a browser event so the sidebar can update immediately
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("profile-updated", {
            detail: {
              profilePicture,
              username: userData.username,
              email: userData.email,
            },
          })
        );
      }
      onClose();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update profile.";
      toast.error(errorMessage);
      console.error(error);
    }
  };

  const handleCancelEdit = () => {
    if (userData) {
      setFormData(userData.profile || {});
      setProfilePicture(userData.profilePicture || null);
    }
    setIsEditMode(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[99] bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-0 z-[100] flex flex-col w-full bg-background shadow-lg duration-200 overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-w-4xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:grid sm:gap-4 sm:border sm:p-6 sm:overflow-visible data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="p-4 space-y-4 sm:p-0 sm:space-y-0 sm:gap-4 sm:grid">
            <div className="flex justify-between items-center">
              <Dialog.Title className="text-2xl font-bold text-center">
                My Profile
              </Dialog.Title>
            {!isEditMode && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditMode(true)}
                className="absolute top-4 right-16 text-gray-600 hover:text-gray-900"
              >
                <Pencil className="h-5 w-5" />
              </Button>
            )}
          </div>
          <Dialog.Close asChild>
            <button
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
          </Dialog.Close>

          {isLoading ? (
            <div className="max-h-[80vh] overflow-y-auto pr-4">
              <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Left section skeleton */}
                <div className="w-full lg:w-1/3 flex flex-col items-center">
                  <Skeleton className="w-40 h-40 rounded-full" />
                  <Skeleton className="h-6 w-32 mt-4" />
                  <Skeleton className="h-4 w-48 mt-2" />
                </div>

                {/* Right section skeleton */}
                <div className="w-full lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Skeleton className="h-6 w-48 mb-4" />
                  </div>
                  
                  {/* Personal Information Fields */}
                  <div>
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="md:col-span-2">
                    <Skeleton className="h-4 w-16 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              </div>

              {/* Address Section Skeleton */}
              <div className="mt-8">
                <Skeleton className="h-6 w-24 mb-4" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-16 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-18 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              </div>

              {/* Contact Information Section Skeleton */}
              <div className="mt-8">
                <Skeleton className="h-6 w-36 mb-4" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              </div>

              {/* Password Section Skeleton */}
              <div className="mt-8">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-28 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-36 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            userData && (
              <div className="max-h-[80vh] overflow-y-auto pr-4 relative z-[150]">
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                  {/* Left section */}
                  <div className="w-full lg:w-1/3 flex flex-col items-center">
                    <div className="relative">
                      <Image
                        src={profilePicture || userData.profilePicture || defaultAvatar}
                        alt="Avatar"
                        width={160}
                        height={160}
                        className="rounded-full border-4 border-gray-200"
                      />
                      {isEditMode && (
                        <>
                          <button
                            type="button"
                            className="absolute bottom-2 right-2 rounded-full border-2 border-border bg-white p-1 shadow"
                            onClick={() => fileInputRef.current?.click()}
                            aria-label="Upload avatar"
                          >
                            <Image src={cameraIcon} alt="Edit" width={24} height={24} />
                          </button>
                          {(profilePicture || userData.profilePicture) && (
                            <button
                              type="button"
                              className="absolute top-2 right-2 h-8 w-8 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow"
                              onClick={handleRemoveProfilePicture}
                              aria-label="Remove avatar"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-4 h-4"><path d="M9 3a1 1 0 0 0-1 1v1H5.5a1 1 0 1 0 0 2H6v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7h.5a1 1 0 1 0 0-2H16V4a1 1 0 0 0-1-1H9Zm2 4h2v10h-2V7Zm-4 0h2v10H7V7Zm8 0h2v10h-2V7Z"/></svg>
                            </button>
                          )}
                          <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                        </>
                      )}
                    </div>
                    <h3 className="text-xl font-semibold mt-4">
                      {userData.username}
                    </h3>
                    <p className="text-sm text-gray-500">{userData.email}</p>
                  </div>

                  {/* Right section */}
                  <div className="w-full lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <h4 className="text-lg font-semibold mb-2 border-b pb-1">
                        Personal Information
                      </h4>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      {isEditMode ? (
                        <input
                          type="text"
                          className="w-full rounded-md p-2 bg-white border border-border"
                          value={formData?.firstName || ""}
                          onChange={(e) =>
                            handleInputChange("firstName", e.target.value)
                          }
                        />
                      ) : (
                        <p className="p-2">{formData?.firstName || "-"}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      {isEditMode ? (
                        <input
                          type="text"
                          className="w-full rounded-md p-2 bg-white border border-border"
                          value={formData?.lastName || ""}
                          onChange={(e) =>
                            handleInputChange("lastName", e.target.value)
                          }
                        />
                      ) : (
                        <p className="p-2">{formData?.lastName || "-"}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Middle Name
                      </label>
                      {isEditMode ? (
                        <input
                          type="text"
                          className="w-full rounded-md p-2 bg-white border border-border"
                          value={formData?.middleName || ""}
                          onChange={(e) =>
                            handleInputChange("middleName", e.target.value)
                          }
                        />
                      ) : (
                        <p className="p-2">{formData?.middleName || "-"}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Other Name
                      </label>
                      {isEditMode ? (
                        <input
                          type="text"
                          className="w-full rounded-md p-2 bg-white border border-border"
                          value={formData?.otherName || ""}
                          onChange={(e) =>
                            handleInputChange("otherName", e.target.value)
                          }
                        />
                      ) : (
                        <p className="p-2">{formData?.otherName || "-"}</p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gender
                      </label>
                      {isEditMode ? (
                        <select
                          className="w-full rounded-md p-2 bg-white border border-border"
                          value={formData?.gender || ""}
                          onChange={(e) =>
                            handleInputChange("gender", e.target.value)
                          }
                        >
                          <option value="">Select</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      ) : (
                        <p className="p-2 capitalize">
                          {formData?.gender || "-"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Address Section */}
                <div className="mt-8">
                  <h4 className="text-lg font-semibold mb-2 border-b pb-1">
                    Address
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Street
                      </label>
                      {isEditMode ? (
                        <input
                          type="text"
                          className="w-full rounded-md p-2 bg-white border border-border"
                          value={formData?.address?.street || ""}
                          onChange={(e) =>
                            handleInputChange(
                              "street",
                              e.target.value,
                              "address"
                            )
                          }
                        />
                      ) : (
                        <p className="p-2">
                          {formData?.address?.street || "-"}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Town
                      </label>
                      {isEditMode ? (
                        <input
                          type="text"
                          className="w-full rounded-md p-2 bg-white border border-border"
                          value={formData?.address?.town || ""}
                          onChange={(e) =>
                            handleInputChange("town", e.target.value, "address")
                          }
                        />
                      ) : (
                        <p className="p-2">{formData?.address?.town || "-"}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Region
                      </label>
                      {isEditMode ? (
                        <input
                          type="text"
                          className="w-full rounded-md p-2 bg-white border border-border"
                          value={formData?.address?.region || ""}
                          onChange={(e) =>
                            handleInputChange(
                              "region",
                              e.target.value,
                              "address"
                            )
                          }
                        />
                      ) : (
                        <p className="p-2">
                          {formData?.address?.region || "-"}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Country
                      </label>
                      {isEditMode ? (
                        <input
                          type="text"
                          className="w-full rounded-md p-2 bg-white border border-border"
                          value={formData?.address?.country || ""}
                          onChange={(e) =>
                            handleInputChange(
                              "country",
                              e.target.value,
                              "address"
                            )
                          }
                        />
                      ) : (
                        <p className="p-2">
                          {formData?.address?.country || "-"}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Postal Code
                      </label>
                      {isEditMode ? (
                        <input
                          type="text"
                          className="w-full rounded-md p-2 bg-white border border-border"
                          value={formData?.address?.postalCode || ""}
                          onChange={(e) =>
                            handleInputChange(
                              "postalCode",
                              e.target.value,
                              "address"
                            )
                          }
                        />
                      ) : (
                        <p className="p-2">
                          {formData?.address?.postalCode || "-"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Identification Section */}
                <div className="mt-8">
                  <h4 className="text-lg font-semibold mb-2 border-b pb-1">
                    Identification
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date of Birth
                      </label>
                      {isEditMode ? (
                        <input
                          type="date"
                          className="w-full rounded-md p-2 bg-white border border-border"
                          value={
                            formData?.identification?.dateOfBirth?.split(
                              "T"
                            )[0] || ""
                          }
                          onChange={(e) =>
                            handleInputChange(
                              "dateOfBirth",
                              e.target.value,
                              "identification"
                            )
                          }
                        />
                      ) : (
                        <p className="p-2">
                          {formData?.identification?.dateOfBirth
                            ? new Date(
                                formData.identification.dateOfBirth
                              ).toLocaleDateString()
                            : "-"}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ID Type
                      </label>
                      {isEditMode ? (
                        <input
                          type="text"
                          className="w-full rounded-md p-2 bg-white border border-border"
                          value={formData?.identification?.idType || ""}
                          onChange={(e) =>
                            handleInputChange(
                              "idType",
                              e.target.value,
                              "identification"
                            )
                          }
                        />
                      ) : (
                        <p className="p-2">
                          {formData?.identification?.idType || "-"}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ID Number
                      </label>
                      {isEditMode ? (
                        <input
                          type="text"
                          className="w-full rounded-md p-2 bg-white border border-border"
                          value={formData?.identification?.idNumber || ""}
                          onChange={(e) =>
                            handleInputChange(
                              "idNumber",
                              e.target.value,
                              "identification"
                            )
                          }
                        />
                      ) : (
                        <p className="p-2">
                          {formData?.identification?.idNumber || "-"}
                        </p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      {isEditMode ? (
                        <textarea
                          className="w-full rounded-md p-2 bg-white border border-border min-h-[80px]"
                          value={formData?.identification?.notes || ""}
                          onChange={(e) =>
                            handleInputChange(
                              "notes",
                              e.target.value,
                              "identification"
                            )
                          }
                        />
                      ) : (
                        <p className="p-2">
                          {formData?.identification?.notes || "-"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {isEditMode && (
                  <div className="flex justify-end mt-8 gap-4">
                    <Button
                      onClick={handleCancelEdit}
                      variant="outline"
                      className="border-gray-400"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      className="bg-button hover:bg-buttonActive"
                    >
                      Save Changes
                    </Button>
                  </div>
                )}
              </div>
            )
          )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>

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
    </Dialog.Root>
  );
}
