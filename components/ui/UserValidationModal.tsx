"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { useUserStore } from "@/lib/store/userStore";
import axios from "axios";
import { toast } from "sonner";
import { validateName } from "@/lib/utils/nameValidation";

type UserValidationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  validationType: "username" | "profile" | "both";
  currentUsername?: string;
};

export default function UserValidationModal({
  isOpen,
  onClose,
  validationType,
  currentUsername,
}: UserValidationModalProps) {
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  
  const [newUsername, setNewUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    username?: string;
    firstName?: string;
    lastName?: string;
  }>({});

  const handleFirstNameChange = (value: string) => {
    setFirstName(value);
    // Clear error when user starts typing valid characters
    if (errors.firstName && validateName(value)) {
      setErrors(prev => ({ ...prev, firstName: undefined }));
    }
  };

  const handleLastNameChange = (value: string) => {
    setLastName(value);
    // Clear error when user starts typing valid characters
    if (errors.lastName && validateName(value)) {
      setErrors(prev => ({ ...prev, lastName: undefined }));
    }
  };
  const [showCloseWarning, setShowCloseWarning] = useState(false);

  // Initialize form with current user data and fetch fresh data
  useEffect(() => {
    const initializeForm = async () => {
      if (user?._id) {
        try {
          // Fetch fresh user data from API
          const response = await axios.get(`/api/users/${user._id}`);
          const freshUserData = response.data.user;
          
          // Update the user store with fresh data
          setUser(freshUserData);
          
          // Initialize form with fresh data
          setNewUsername(freshUserData.username || "");
          setFirstName(freshUserData.profile?.firstName || "");
          setLastName(freshUserData.profile?.lastName || "");
        } catch (error) {
          console.error("Error fetching fresh user data:", error);
          // Fallback to store data
          setNewUsername(user.username || "");
          setFirstName(user.profile?.firstName || "");
          setLastName(user.profile?.lastName || "");
        }
      }
    };

    initializeForm();
  }, [user?._id, user?.username, user?.profile?.firstName, user?.profile?.lastName, setUser]);

  const validateUsername = (username: string): boolean => {
    // Check if username contains @ or .com
    if (username.includes("@") || username.includes(".com")) {
      return false;
    }
    // Check if username is at least 3 characters
    if (username.length < 3) {
      return false;
    }
    return true;
  };


  const checkUsernameExists = async (username: string): Promise<boolean> => {
    try {
      const response = await axios.get(`/api/users/check-username?username=${encodeURIComponent(username)}`);
      return response.data.exists;
    } catch (error) {
      console.error("Error checking username:", error);
      return false;
    }
  };

  const isFormValid = (): boolean => {
    // Check username validation if needed
    if (validationType === "username" || validationType === "both") {
      if (!newUsername.trim() || !validateUsername(newUsername)) {
        return false;
      }
    }

    // Check profile validation if needed
    if (validationType === "profile" || validationType === "both") {
      if (!firstName.trim() || !lastName.trim() || !validateName(firstName) || !validateName(lastName)) {
        return false;
      }
    }

    return true;
  };

  const handleCloseAttempt = () => {
    if (isFormValid()) {
      onClose();
    } else {
      setShowCloseWarning(true);
      
      // Show toast message with specific instructions
      const getToastMessage = () => {
        switch (validationType) {
          case "username":
            return "Please provide a valid username (no @ symbols, .com, or email patterns) to continue.";
          case "profile":
            return "Please provide valid first and last names (no numbers, symbols, or special characters) to continue.";
          case "both":
            return "Please provide a valid username (no @ or .com) and valid names (letters only) to continue.";
          default:
            return "Please complete all required fields to continue.";
        }
      };
      
      toast.error(getToastMessage(), {
        duration: 4000,
        description: "This information is required for proper system identification."
      });
      
      // Hide warning after 3 seconds
      setTimeout(() => setShowCloseWarning(false), 3000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCloseAttempt();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    let hasErrors = false;
    const newErrors: typeof errors = {};

    // Validate username if needed
    if (validationType === "username" || validationType === "both") {
      if (!newUsername.trim()) {
        newErrors.username = "Username is required";
        hasErrors = true;
      } else if (!validateUsername(newUsername)) {
        newErrors.username = "Username cannot contain @ symbols, .com, or email patterns. Must be at least 3 characters and contain only letters, numbers, and basic symbols.";
        hasErrors = true;
      } else {
        // Check if username already exists
        const exists = await checkUsernameExists(newUsername);
        if (exists) {
          newErrors.username = "Username already exists";
          hasErrors = true;
        }
      }
    }

    // Validate profile if needed
    if (validationType === "profile" || validationType === "both") {
      if (!firstName.trim()) {
        newErrors.firstName = "First name is required";
        hasErrors = true;
      } else if (!validateName(firstName)) {
        newErrors.firstName = "First name cannot contain numbers, symbols, or special characters (@, #, $, etc.). Only letters, spaces, hyphens, and apostrophes are allowed.";
        hasErrors = true;
      }
      if (!lastName.trim()) {
        newErrors.lastName = "Last name is required";
        hasErrors = true;
      } else if (!validateName(lastName)) {
        newErrors.lastName = "Last name cannot contain numbers, symbols, or special characters (@, #, $, etc.). Only letters, spaces, hyphens, and apostrophes are allowed.";
        hasErrors = true;
      }
    }

    if (hasErrors) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      // Update user profile
      const updateData: {
        username?: string;
        profile?: {
          firstName: string;
          lastName: string;
        };
      } = {};
      
      if (validationType === "username" || validationType === "both") {
        updateData.username = newUsername;
      }
      
      if (validationType === "profile" || validationType === "both") {
        updateData.profile = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        };
      }

      const response = await axios.put(`/api/users/${user?._id}`, updateData);
      
      if (response.data.success) {
        // Update local user store with the complete updated user data
        setUser(response.data.user);
        
        toast.success("Profile updated successfully!");
        onClose();
      } else {
        toast.error("Failed to update profile. Please try again.");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (validationType) {
      case "username":
        return "Update Your Username";
      case "profile":
        return "Complete Your Profile";
      case "both":
        return "Update Your Profile";
      default:
        return "Profile Update Required";
    }
  };

  const getDescription = () => {
    switch (validationType) {
      case "username":
        return `Your current username "${currentUsername}" contains email-like characters (@ or .com). For security and identification purposes, please choose a proper username that doesn't contain email patterns.`;
      case "profile":
        return "To ensure proper identification in reports and system records, please provide both your first and last name (letters only, no numbers or special characters) to complete your profile.";
      case "both":
        return "Your profile needs to be updated for proper system identification. Please choose a username without email patterns (@, .com) and provide valid first and last names (letters only, no numbers or special characters).";
      default:
        return "Please complete your profile information for proper system identification.";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseAttempt}>
      <DialogContent 
        className="sm:max-w-md" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {getTitle()}
          </DialogTitle>
        </DialogHeader>
        
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            {getDescription()}
          </div>
        </div>

        {showCloseWarning && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-800">
              <strong>Cannot close without completing required fields.</strong> You must provide a valid username and both first and last name to proceed. This information is required for proper system identification and security.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {(validationType === "username" || validationType === "both") && (
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Enter a username"
                disabled={loading}
                className={errors.username ? "border-red-500" : ""}
              />
              {errors.username && (
                <p className="text-sm text-red-500 mt-1">{errors.username}</p>
              )}
            </div>
          )}

          {(validationType === "profile" || validationType === "both") && (
            <>
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => handleFirstNameChange(e.target.value)}
                  placeholder="Enter your first name"
                  disabled={loading}
                  className={errors.firstName ? "border-red-500" : ""}
                />
                {errors.firstName && (
                  <p className="text-sm text-red-500 mt-1">{errors.firstName}</p>
                )}
              </div>

              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => handleLastNameChange(e.target.value)}
                  placeholder="Enter your last name"
                  disabled={loading}
                  className={errors.lastName ? "border-red-500" : ""}
                />
                {errors.lastName && (
                  <p className="text-sm text-red-500 mt-1">{errors.lastName}</p>
                )}
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary hover:bg-primary/90"
            >
              {loading ? "Updating..." : "Update Profile"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
