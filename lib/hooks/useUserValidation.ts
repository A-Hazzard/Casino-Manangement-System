import { useState, useEffect } from "react";
import { useUserStore } from "@/lib/store/userStore";
import axios from "axios";
import { validateName } from "@/lib/utils/nameValidation";

type ValidationType = "username" | "profile" | "both" | null;

export function useUserValidation() {
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const [needsValidation, setNeedsValidation] = useState(false);
  const [validationType, setValidationType] = useState<ValidationType>(null);
  const [currentUsername, setCurrentUsername] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUserValidation = async () => {
      if (!user?._id) {
        setNeedsValidation(false);
        setValidationType(null);
        setIsLoading(false);
        return;
      }

      try {
        // Fetch fresh user data from API
        const response = await axios.get(`/api/users/${user._id}`);
        const freshUserData = response.data.user;

        // Update the user store with fresh data
        setUser(freshUserData);

        let needsUsernameUpdate = false;
        let needsProfileUpdate = false;

        // Check if username contains @ or .com (indicating email was used as username)
        if (freshUserData.username && (freshUserData.username.includes("@") || freshUserData.username.includes(".com"))) {
          needsUsernameUpdate = true;
          setCurrentUsername(freshUserData.username);
        }

        // Check if profile is missing firstName or lastName, or contains invalid characters
        const firstNameValid = freshUserData.profile?.firstName && validateName(freshUserData.profile.firstName);
        const lastNameValid = freshUserData.profile?.lastName && validateName(freshUserData.profile.lastName);
        
        if (!firstNameValid || !lastNameValid) {
          needsProfileUpdate = true;
        }

        // Debug logging
        console.warn("Validation check:", {
          firstName: freshUserData.profile?.firstName,
          lastName: freshUserData.profile?.lastName,
          firstNameValid,
          lastNameValid,
          needsProfileUpdate,
          needsUsernameUpdate
        });

        // Determine validation type
        if (needsUsernameUpdate && needsProfileUpdate) {
          setValidationType("both");
          setNeedsValidation(true);
        } else if (needsUsernameUpdate) {
          setValidationType("username");
          setNeedsValidation(true);
        } else if (needsProfileUpdate) {
          setValidationType("profile");
          setNeedsValidation(true);
        } else {
          setValidationType(null);
          setNeedsValidation(false);
        }
      } catch (error) {
        console.error("Error fetching user data for validation:", error);
        // Fallback to store data if API fails
        let needsUsernameUpdate = false;
        let needsProfileUpdate = false;

        if (user.username && (user.username.includes("@") || user.username.includes(".com"))) {
          needsUsernameUpdate = true;
          setCurrentUsername(user.username);
        }

        // Check if profile is missing firstName or lastName, or contains invalid characters
        const firstNameValid = user.profile?.firstName && validateName(user.profile.firstName);
        const lastNameValid = user.profile?.lastName && validateName(user.profile.lastName);
        
        if (!firstNameValid || !lastNameValid) {
          needsProfileUpdate = true;
        }

        if (needsUsernameUpdate && needsProfileUpdate) {
          setValidationType("both");
          setNeedsValidation(true);
        } else if (needsUsernameUpdate) {
          setValidationType("username");
          setNeedsValidation(true);
        } else if (needsProfileUpdate) {
          setValidationType("profile");
          setNeedsValidation(true);
        } else {
          setValidationType(null);
          setNeedsValidation(false);
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Add a small delay to ensure API has updated data
    const timeoutId = setTimeout(checkUserValidation, 100);
    
    return () => clearTimeout(timeoutId);
  }, [user?._id, user?.profile?.firstName, user?.profile?.lastName, user?.username, setUser]);

  return {
    needsValidation,
    validationType,
    currentUsername,
    isLoading,
  };
}
