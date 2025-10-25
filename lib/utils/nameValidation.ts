/**
 * Validates that a name contains only valid characters
 * @param name - The name to validate
 * @returns true if the name is valid, false otherwise
 */
export function validateName(name: string): boolean {
  // Check if name contains special characters (only allow letters, spaces, hyphens, and apostrophes)
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  return nameRegex.test(name) && name.trim().length > 0;
}

/**
 * Validates that a name contains only valid characters and provides a user-friendly error message
 * @param name - The name to validate
 * @returns An object with isValid boolean and error message if invalid
 */
export function validateNameWithMessage(name: string): {
  isValid: boolean;
  error?: string;
} {
  if (!name.trim()) {
    return { isValid: false, error: 'Name is required' };
  }

  if (!validateName(name)) {
    return {
      isValid: false,
      error: 'Name can only contain letters, spaces, hyphens, and apostrophes',
    };
  }

  return { isValid: true };
}
