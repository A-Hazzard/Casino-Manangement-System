# Login Page

## Table of Contents

- [Overview](#overview)
- [File Information](#file-information)
- [Page Sections](#page-sections)
  - [Login Form Section](#login-form-section)
  - [Visual Branding Section](#visual-branding-section)
  - [Password Update Modal](#password-update-modal)
  - [Profile Validation Modal](#profile-validation-modal)
- [API Endpoints](#api-endpoints)
- [State Management](#state-management)
- [Key Functions](#key-functions)

## Overview

The Login page provides secure authentication for users accessing the casino management system. This page serves as the entry point for all authenticated users and implements robust security measures including password validation, profile validation gates, and role-based redirects.

Key features include:

- Email or username login (identifier accepts both)
- Password strength validation
- Profile validation gate (mandatory profile updates)
- Remember me functionality
- Role-based redirects after login
- Password update modal for weak passwords
- Profile validation modal for incomplete profiles

## File Information

- **File:** `app/(auth)/login/page.tsx`
- **URL Pattern:** `/login`
- **Authentication:** Not Required (Public Access)
- **Access Level:** Public (all users can access)
- **Main Component:** `LoginPageContent` (within `app/(auth)/login/page.tsx`)

## Page Sections

### Login Form Section

**Purpose:** Display login form with identifier (email/username) and password fields, validation, and submission handling.

**Components Used:**

- `LoginForm` (`components/shared/auth/LoginForm.tsx`) - Main login form component
- `Input`, `Label`, `Button` - UI components
- `Eye`, `EyeOff` icons (lucide-react) - Password visibility toggle
- `LiquidGradient` (`components/shared/ui/LiquidGradient.tsx`) - Background gradient

**API Endpoints:**

- `POST /api/auth/login` - User authentication

**Data Flow:**

1. User enters identifier and password
2. Form validates input on client side
3. API call to `/api/auth/login`
4. Backend validates credentials (checks both email and username)
5. Token stored in HTTP-only cookie
6. Check for password/profile updates
7. Redirect to appropriate dashboard

**Key Functions:**

- `handleLogin` - Form submission handler
- `loginUser` - API call helper

**State Management:**

- `identifier`, `password` - Form inputs
- `showPassword` - Password visibility toggle
- `rememberMe` - Remember me checkbox
- `errors`, `message`, `messageType` - Validation and feedback
- `loading`, `redirecting` - Loading states

**Notes:**

- Identifier accepts email or username
- Password has show/hide toggle
- Remember me stores identifier in localStorage
- URL parameters parsed for logout messages

---

### Visual Branding Section

**Purpose:** Display company logo and casino imagery.

**Components Used:**

- Company logo image (`/public/EOS_Logo.png`)
- Casino slot machine image (`/public/slotMachine.png`)

**Notes:**

- Logo at top of form
- Slot machine image in right panel (desktop) or below form (mobile)
- Responsive layout

---

### Password Update Modal

**Purpose:** Require users to update weak passwords.

**Components Used:**

- `PasswordUpdateModal` (`components/shared/ui/PasswordUpdateModal.tsx`)

**API Endpoints:**

- `PUT /api/auth/update-password` - Password update

**Data Flow:**

1. User authenticates but password is weak
2. Modal automatically displayed
3. User updates password
4. Modal closes on success

**State Management:**

- `showPasswordUpdateModal` - Modal visibility
- `loading` - Update operation loading

---

### Profile Validation Modal

**Purpose:** To enforce users to complete or update their profile information to meet system requirements. This modal automatically appears and blocks user interaction until critical profile fields are valid.

**Components Used:**

-   `ProfileValidationModal` (`components/shared/ui/ProfileValidationModal.tsx`)
-   `ProfileValidationGate` (`components/shared/providers/ProfileValidationGate.tsx`) - A global provider typically in the root layout (`app/layout.tsx` or similar) that orchestrates the validation process.

**API Endpoints:**

-   `PUT /api/profile` - Profile update (used by `ProfileValidationModal` to submit changes)

**Data Flow:**

1.  **Gate Activation:** The `ProfileValidationGate` component, on mount or user data change, evaluates the `user.invalidProfileFields` and `user.invalidProfileReasons` flags received from the server (e.g., during login or `currentUser` refetch).
2.  **Exemptions:** Users with 'admin' or 'developer' roles are automatically exempted from this validation. The `dateOfBirth` field is also exempted from triggering the modal.
3.  **Password Re-validation:** If the `password` field is marked as invalid by the server, `ProfileValidationGate` attempts to re-validate the `lastLoginPassword` (stored temporarily in `useAuthSessionStore`). If it now meets strength requirements, the password invalidation is cleared, preventing the modal from prompting for a new password unnecessarily.
4.  **Modal Display:** If any `invalidProfileFields` remain (excluding exempted ones), `ProfileValidationGate` automatically sets `open=true` to display the `ProfileValidationModal`.
5.  **User Update:** The user must interact with `ProfileValidationModal` to correct the identified `invalidFields`. Real-time validation, toast notifications, and loading states are managed within the modal.
6.  **Forced Re-login:** After a successful profile update via `PUT /api/profile`, the user is *always* forced to log out and re-login. This is because the `sessionVersion` is incremented on the server, invalidating the current JWT token to ensure security and consistency. A success toast informs the user, and they are redirected to the login page.
7.  **Prevention of Re-opening:** A `justUpdatedRef` flag ensures that the `ProfileValidationGate` does not immediately re-evaluate and re-open the modal after a successful update and forced logout/redirect.

**State Management:**

-   `open` (state in `ProfileValidationGate`) - Controls modal visibility.
-   `loading` (state in `ProfileValidationGate`) - Indicates profile update in progress.
-   `invalidFields` (state in `ProfileValidationGate`) - Object mapping field names to boolean true if invalid.
-   `fieldReasons` (state in `ProfileValidationGate`) - Object mapping field names to strings describing validation failures.
-   `currentData` (state in `ProfileValidationGate`) - Populated with current user profile data for the modal form.
-   `justUpdatedRef` (ref in `ProfileValidationGate`) - Prevents modal re-opening after a successful update.
-   `lastLoginPassword` (from `useAuthSessionStore`) - Used for password re-validation.

**Notes:**

-   The `ProfileValidationGate` acts as a crucial security measure to ensure data integrity and user compliance.
-   The modal cannot be closed or bypassed until all *required* invalid fields are corrected, or the user logs out manually.
-   The `context` prop (`CMS` | `VAULT`) on `ProfileValidationGate` is reserved for future use, allowing for differentiated validation rules between application contexts.
-   Activity is logged for profile update actions.

---

## API Endpoints

### Authentication

- **POST `/api/auth/login`**
  - Authenticate user and issue JWT token
  - Request: `{ identifier: string, password: string }`
  - Response: `{ success: true, data: { user, token, refreshToken, expiresAt, requiresPasswordUpdate?, requiresProfileUpdate?, invalidProfileFields?, invalidProfileReasons? } }`
  - Sets HTTP-only cookies for token storage
  - Checks both email and username if identifier looks like email

- **PUT `/api/auth/update-password`**
  - Update user password
  - Request: `{ currentPassword: string, newPassword: string }`

- **PUT `/api/profile`**
  - Update user profile data
  - Request: Profile update payload

- **GET `/api/auth/current-user`** or **GET `/api/test-current-user`**
  - Verify JWT token and get current user data

---

## State Management

### Hooks

- **`useLoginPageData`** (`lib/hooks/auth/useLoginPageData.ts`)
  - Main authentication logic and state management
  - Provides: Form state, loading states, modal states, handlers

- **`useAuth`** (`lib/hooks/useAuth.ts`)
  - Authentication status check
  - Provides: `isLoading: authLoading`

### Stores

- **`useUserStore`** (`lib/store/userStore.ts`) - Zustand
  - `user`, `setUser`, `clearUser`

- **`useAuthSessionStore`** (`lib/store/authSessionStore.ts`) - Zustand
  - Temporarily stores plaintext password for profile validation
  - `setLastLoginPassword`, `clearLastLoginPassword`

---

## Key Functions

### Authentication

- **`handleLogin`** - Form submission handler
- **`loginUser`** (`lib/helpers/clientAuth.ts`) - API call helper
- **`handlePasswordUpdate`** - Password update handler
- **`handleProfileUpdate`** - Profile update handler

### Navigation

- **`getDefaultRedirectPathFromRoles`** (`lib/utils/roleBasedRedirect.ts`)
  - Determines redirect path based on user roles

### Validation

- **`validateEmail`** (`lib/utils/validation.ts`) - Email format validation
- **`validatePasswordStrength`** (`lib/utils/validation.ts`) - Password strength validation

---

## Additional Notes

### URL Parameters

- `?logout=success` - Shows "Logout Successful" message
- `?error=<message>` - Shows error message
- `?message=<message>` - Shows info message

### Remember Me

- Stores identifier in localStorage when checked
- Auto-populates identifier on page load

### Profile Validation Gate

- Global component in root layout monitors profile validation
- Prevents access if profile is invalid
- Continues validation checks throughout session

### Security Features

- HTTP-only cookies for tokens
- Password hashing with bcrypt
- 48-hour token expiration
- Database environment verification
- CSRF protection
- Error sanitization

### Role-Based Redirects

- Admin/Developer → Dashboard
- Manager → Dashboard (with licensee filtering)
- Collector/Location Admin → Dashboard (with location filtering)
- Technician → Cabinets page
