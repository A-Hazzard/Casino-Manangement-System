/**
 * Custom hook for Edit Member form validation
 *
 * Handles all validation logic for the edit member form including:
 * - Field format validation
 * - Required field validation
 * - Uniqueness checks
 * - Debounced validation
 */

import { useDebounce } from '@/lib/utils/hooks';
import {
  containsEmailPattern,
  containsPhonePattern,
  isPlaceholderEmail,
  validateEmail,
  validateNameField,
  validatePhoneNumber,
  validateStreetAddress,
  validateUsername,
} from '@/lib/utils/validation';
import { useEffect, useState } from 'react';

type FormData = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phoneNumber: string;
  occupation: string;
  address: string;
  points: number;
  uaccount: number;
  gamingLocation: string;
};

type UseEditMemberValidationProps = {
  formData: FormData;
  selectedMemberId?: string;
};

/**
 * Custom hook for Edit Member validation
 */
export function useEditMemberValidation({
  formData,
  selectedMemberId,
}: UseEditMemberValidationProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [checkingUniqueness, setCheckingUniqueness] = useState<{
    username: boolean;
    email: boolean;
  }>({ username: false, email: false });

  const debouncedUsername = useDebounce(formData.username, 500);
  const debouncedEmail = useDebounce(formData.email, 500);

  // Debounced validation - only validate fields that have been touched or on submit
  useEffect(() => {
    const handler = setTimeout(() => {
      const newErrors: Record<string, string> = { ...errors }; // Preserve uniqueness errors
      const firstName = (formData.firstName || '').trim();
      const lastName = (formData.lastName || '').trim();
      const username = (formData.username || '').trim();
      const email = (formData.email || '').trim();
      const phoneNumber = (formData.phoneNumber || '').trim();
      const occupation = (formData.occupation || '').trim();
      const address = (formData.address || '').trim();

      // Only validate format/pattern errors if field has been touched (user typed something)
      // Required errors only show after submit attempt
      const shouldValidateFormat = (fieldName: string) => touched[fieldName];
      const shouldValidateRequired = () => submitAttempted;

      // Username validation
      if (shouldValidateRequired() && !username) {
        newErrors.username = 'Username is required.';
      } else if (shouldValidateFormat('username') && username) {
        if (username.length < 3) {
          newErrors.username = 'Username must be at least 3 characters.';
        } else if (containsEmailPattern(username)) {
          newErrors.username = 'Username cannot look like an email address.';
        } else if (containsPhonePattern(username)) {
          newErrors.username = 'Username cannot look like a phone number.';
        } else if (!validateUsername(username)) {
          newErrors.username =
            'Username may only contain letters, numbers, spaces, hyphens, and apostrophes.';
        } else if (email && username.toLowerCase() === email.toLowerCase()) {
          newErrors.username =
            'Username must be different from your email address.';
        }
        // Uniqueness check is handled separately via debounced effect
      }

      // First name validation
      if (shouldValidateRequired() && !firstName) {
        newErrors.firstName = 'First name is required.';
      } else if (shouldValidateFormat('firstName') && firstName) {
        if (firstName.length < 2) {
          newErrors.firstName = 'First name must be at least 2 characters.';
        } else if (!validateNameField(firstName)) {
          newErrors.firstName =
            'First name may only contain letters and spaces and cannot look like a phone number.';
        }
      }

      // Last name validation
      if (shouldValidateRequired() && !lastName) {
        newErrors.lastName = 'Last name is required.';
      } else if (shouldValidateFormat('lastName') && lastName) {
        if (lastName.length < 2) {
          newErrors.lastName = 'Last name must be at least 2 characters.';
        } else if (!validateNameField(lastName)) {
          newErrors.lastName =
            'Last name may only contain letters and spaces and cannot look like a phone number.';
        }
      }

      // Email validation (optional but must be valid if provided)
      if (email && shouldValidateFormat('email')) {
        if (!validateEmail(email)) {
          newErrors.email = 'Provide a valid email address.';
        } else if (isPlaceholderEmail(email)) {
          newErrors.email =
            'Please use a real email address. Placeholder emails like example@example.com are not allowed.';
        } else if (containsPhonePattern(email)) {
          newErrors.email = 'Email address cannot resemble a phone number.';
        } else if (username && email.toLowerCase() === username.toLowerCase()) {
          newErrors.email = 'Email address must differ from your username.';
        }
        // Uniqueness check is handled separately via debounced effect
      }

      // Phone number validation (optional but must be valid if provided)
      if (phoneNumber && shouldValidateFormat('phoneNumber')) {
        if (!validatePhoneNumber(phoneNumber)) {
          newErrors.phoneNumber =
            'Provide a valid phone number (7-20 digits, may include spaces, hyphens, parentheses, and leading +).';
        }
      }

      // Address validation (optional but must be valid if provided)
      if (address && shouldValidateFormat('address')) {
        if (address.length < 3) {
          newErrors.address = 'Address must be at least 3 characters.';
        } else if (!validateStreetAddress(address)) {
          newErrors.address =
            'Address may only contain letters, numbers, spaces, commas, and full stops.';
        }
      }

      // Occupation validation (optional but must be valid if provided)
      if (occupation && shouldValidateFormat('occupation')) {
        if (occupation.length < 2) {
          newErrors.occupation = 'Occupation must be at least 2 characters.';
        } else if (containsPhonePattern(occupation)) {
          newErrors.occupation = 'Occupation cannot look like a phone number.';
        }
      }

      setErrors(newErrors);
    }, 300);

    return () => clearTimeout(handler);
  }, [
    formData.firstName,
    formData.lastName,
    formData.username,
    formData.email,
    formData.phoneNumber,
    formData.occupation,
    formData.address,
    touched,
    submitAttempted,
    errors, // Include errors to preserve uniqueness errors
  ]);

  // Debounced uniqueness check for username and email
  useEffect(() => {
    const checkUniqueness = async () => {
      if (!selectedMemberId) return;

      const trimmedUsername = debouncedUsername.trim();
      const trimmedEmail = debouncedEmail.trim();

      // Only check if field is touched and has valid format
      const shouldCheckUsername =
        touched.username &&
        trimmedUsername.length >= 3 &&
        validateUsername(trimmedUsername) &&
        !containsEmailPattern(trimmedUsername) &&
        !containsPhonePattern(trimmedUsername);

      const shouldCheckEmail =
        touched.email &&
        trimmedEmail &&
        validateEmail(trimmedEmail) &&
        !isPlaceholderEmail(trimmedEmail) &&
        !containsPhonePattern(trimmedEmail);

      if (!shouldCheckUsername && !shouldCheckEmail) {
        return;
      }

      try {
        setCheckingUniqueness(prev => ({
          username: shouldCheckUsername || prev.username,
          email: shouldCheckEmail || prev.email,
        }));

        const params = new URLSearchParams();
        if (shouldCheckUsername) {
          params.append('username', trimmedUsername);
        }
        if (shouldCheckEmail) {
          params.append('email', trimmedEmail);
        }
        if (selectedMemberId) {
          params.append('excludeId', selectedMemberId);
        }

        const response = await fetch(
          `/api/members/check-unique?${params.toString()}`
        );
        const data = await response.json();

        setErrors(prev => {
          const newErrors = { ...prev };
          if (shouldCheckUsername) {
            if (!data.usernameAvailable) {
              newErrors.username = 'This username is already taken.';
            } else {
              if (newErrors.username === 'This username is already taken.') {
                delete newErrors.username;
              }
            }
          }
          if (shouldCheckEmail) {
            if (!data.emailAvailable) {
              newErrors.email = 'This email address is already in use.';
            } else {
              if (newErrors.email === 'This email address is already in use.') {
                delete newErrors.email;
              }
            }
          }
          return newErrors;
        });
      } catch (error) {
        console.error('Error checking uniqueness:', error);
      } finally {
        setCheckingUniqueness(prev => ({
          username: shouldCheckUsername ? false : prev.username,
          email: shouldCheckEmail ? false : prev.email,
        }));
      }
    };

    checkUniqueness();
  }, [
    debouncedUsername,
    debouncedEmail,
    touched.username,
    touched.email,
    selectedMemberId,
  ]);

  return {
    errors,
    touched,
    submitAttempted,
    checkingUniqueness,
    setTouched,
    setSubmitAttempted,
    setErrors,
  };
}
