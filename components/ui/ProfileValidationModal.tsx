"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import {
  validateProfileField,
  validateNameField,
  containsPhonePattern,
} from "@/lib/utils/validation";

type ProfileValidationModalProps = {
  open: boolean;
  onClose: () => void;
  onUpdate: (data: {
    username: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  loading?: boolean;
  invalidFields: {
    username?: boolean;
    firstName?: boolean;
    lastName?: boolean;
  };
  currentData: {
    username: string;
    firstName: string;
    lastName: string;
  };
};

export default function ProfileValidationModal({
  open,
  onClose,
  onUpdate,
  loading = false,
  invalidFields,
  currentData,
}: ProfileValidationModalProps) {
  const [formData, setFormData] = useState({
    username: currentData.username,
    firstName: currentData.firstName,
    lastName: currentData.lastName,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};

    if (!formData.username) {
      newErrors.username = "Username is required";
    } else if (!validateProfileField(formData.username)) {
      if (containsPhonePattern(formData.username)) {
        newErrors.username =
          "Username cannot be a phone number. Please use a proper username.";
      } else {
        newErrors.username =
          "Username contains invalid characters. Only letters, numbers, spaces, hyphens, and apostrophes are allowed.";
      }
    }

    if (!formData.firstName) {
      newErrors.firstName = "First name is required";
    } else if (!validateNameField(formData.firstName)) {
      if (containsPhonePattern(formData.firstName)) {
        newErrors.firstName =
          "First name cannot be a phone number. Please use your actual first name.";
      } else {
        newErrors.firstName =
          "First name contains invalid characters. Only letters and spaces are allowed.";
      }
    }

    if (!formData.lastName) {
      newErrors.lastName = "Last name is required";
    } else if (!validateNameField(formData.lastName)) {
      if (containsPhonePattern(formData.lastName)) {
        newErrors.lastName =
          "Last name cannot be a phone number. Please use your actual last name.";
      } else {
        newErrors.lastName =
          "Last name contains invalid characters. Only letters and spaces are allowed.";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await onUpdate(formData);
      onClose();
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Profile update error:", error);
      }
    }
  };

  const handleClose = () => {
    setFormData({
      username: currentData.username,
      firstName: currentData.firstName,
      lastName: currentData.lastName,
    });
    setErrors({});
    onClose();
  };

  const getFieldError = (field: string) => {
    if (errors[field]) return errors[field];
    if (invalidFields[field as keyof typeof invalidFields]) {
      const fieldValue = formData[field as keyof typeof formData];
      if (containsPhonePattern(fieldValue)) {
        switch (field) {
          case "username":
            return "Username cannot be a phone number. Please use a proper username.";
          case "firstName":
            return "First name cannot be a phone number. Please use your actual first name.";
          case "lastName":
            return "Last name cannot be a phone number. Please use your actual last name.";
          default:
            return "This field cannot be a phone number.";
        }
      }
      return `This field contains special characters that are not allowed.`;
    }
    return "";
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Profile Validation Required
          </DialogTitle>
          <DialogDescription>
            Your profile contains special characters or phone number patterns
            that are not allowed. Please update the following fields:
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Field */}
          {invalidFields.username && (
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, username: e.target.value }))
                }
                className={getFieldError("username") ? "border-red-500" : ""}
                placeholder="Enter username"
              />
              {getFieldError("username") && (
                <p className="text-sm text-red-500">
                  {getFieldError("username")}
                </p>
              )}
            </div>
          )}

          {/* First Name Field */}
          {invalidFields.firstName && (
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    firstName: e.target.value,
                  }))
                }
                className={getFieldError("firstName") ? "border-red-500" : ""}
                placeholder="Enter first name"
              />
              {getFieldError("firstName") && (
                <p className="text-sm text-red-500">
                  {getFieldError("firstName")}
                </p>
              )}
            </div>
          )}

          {/* Last Name Field */}
          {invalidFields.lastName && (
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, lastName: e.target.value }))
                }
                className={getFieldError("lastName") ? "border-red-500" : ""}
                placeholder="Enter last name"
              />
              {getFieldError("lastName") && (
                <p className="text-sm text-red-500">
                  {getFieldError("lastName")}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Profile"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
