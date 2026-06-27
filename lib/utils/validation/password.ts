/**
 * Password Validation
 *
 * Password strength validation, strength scoring, and label generation.
 *
 * @module lib/utils/validation/password
 */

// ============================================================================
// Types
// ============================================================================

export type PasswordStrengthResult = {
  isValid: boolean;
  score: number;
  feedback: string[];
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
};

// ============================================================================
// Password Validation
// ============================================================================

/**
 * Validates if a password meets strength requirements.
 *
 * @param password - The password to validate.
 * @returns True if valid, false otherwise.
 */
export function validatePassword(password: string | undefined | null): boolean {
  if (!password || typeof password !== 'string') {
    return false;
  }
  const strongPasswordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return strongPasswordRegex.test(password);
}

/**
 * Validates password strength and returns detailed feedback.
 *
 * @param password - The password to validate.
 * @returns Object with validation result and feedback.
 */
export function validatePasswordStrength(
  password: string
): PasswordStrengthResult {
  if (!password || typeof password !== 'string') {
    console.error(
      '[validatePasswordStrength] password is required and must be a string'
    );
    return {
      isValid: false,
      score: 0,
      feedback: ['Password is required'],
      requirements: {
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
      },
    };
  }

  const feedback: string[] = [];
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  let score = 0;

  if (requirements.length) {
    score++;
  } else {
    feedback.push('Password must be at least 8 characters long');
  }

  if (requirements.uppercase) {
    score++;
  } else {
    feedback.push('Password must contain at least one uppercase letter');
  }

  if (requirements.lowercase) {
    score++;
  } else {
    feedback.push('Password must contain at least one lowercase letter');
  }

  if (requirements.number) {
    score++;
  } else {
    feedback.push('Password must contain at least one number');
  }

  if (requirements.special) {
    score++;
  } else {
    feedback.push(
      'Password should contain at least one special character (@$!%*?&)'
    );
  }

  const isValid = score >= 4;

  return {
    isValid,
    score,
    feedback,
    requirements,
  };
}

/**
 * Gets password strength label based on score.
 *
 * @param score - Password strength score (0-4).
 * @returns String label for password strength.
 */
export function getPasswordStrengthLabel(score: number): string {
  switch (score) {
    case 0:
    case 1:
      return 'Very Weak';
    case 2:
      return 'Weak';
    case 3:
      return 'Good';
    case 4:
    case 5:
      return 'Strong';
    default:
      return 'Unknown';
  }
}
