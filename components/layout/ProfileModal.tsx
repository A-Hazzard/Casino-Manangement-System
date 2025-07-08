import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useUserStore } from "@/lib/store/userStore";
import type { User } from "@/lib/types/administration";
import { toast } from "sonner";

async function fetchUserData(userId: string): Promise<User | null> {
  try {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) {
      return null;
    }
    const { user } = await response.json();
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

  useEffect(() => {
    if (open && authUser?._id) {
      setIsLoading(true);
      fetchUserData(authUser._id)
        .then((data) => {
          if (data) {
            setUserData(data);
            setFormData(data.profile || {});
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

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!userData) return;

    const payload: { 
      _id: string; 
      profile: typeof formData; 
      password?: { current: string; new: string } 
    } = {
      _id: userData._id,
      profile: formData,
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
      const response = await fetch(`/api/users/${userData._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to update profile");
      }

      toast.success("Profile updated successfully!");
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update profile.";
      toast.error(errorMessage);
      console.error(error);
    }
  };

  const handleCancelEdit = () => {
    if (userData) {
      setFormData(userData.profile || {});
    }
    setIsEditMode(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[99] bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[100] grid w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg">
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
            <div className="flex justify-center items-center h-96">
              <div className="loader" />
            </div>
          ) : (
            userData && (
              <div className="max-h-[80vh] overflow-y-auto pr-4">
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                  {/* Left section */}
                  <div className="w-full lg:w-1/3 flex flex-col items-center">
                    <Image
                      src={userData.profilePicture || "/defaultAvatar.svg"}
                      alt="Avatar"
                      width={160}
                      height={160}
                      className="rounded-full border-4 border-gray-200"
                    />
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
                        <p className="p-2">{formData?.address?.street || "-"}</p>
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
                        <p className="p-2">{formData?.address?.region || "-"}</p>
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
                            formData?.identification?.dateOfBirth?.split("T")[0] || ""
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
                  <div className="mt-8">
                    <h4 className="text-lg font-semibold mb-2 border-b pb-1">
                      Change Password
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Current Password
                        </label>
                        <input
                          type="password"
                          className="w-full rounded-md p-2 bg-white border border-border"
                          value={passwordData.currentPassword}
                          onChange={(e) =>
                            handlePasswordChange("currentPassword", e.target.value)
                          }
                        />
                      </div>
                      <div>{/* Spacer */}</div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          New Password
                        </label>
                        <input
                          type="password"
                          className="w-full rounded-md p-2 bg-white border border-border"
                          value={passwordData.newPassword}
                          onChange={(e) =>
                            handlePasswordChange("newPassword", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          className="w-full rounded-md p-2 bg-white border border-border"
                          value={passwordData.confirmPassword}
                          onChange={(e) =>
                            handlePasswordChange("confirmPassword", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}

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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
} 