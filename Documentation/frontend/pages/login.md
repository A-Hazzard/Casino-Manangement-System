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

- `LoginForm` (`components/auth/LoginForm.tsx`) - Main login form component
- `Input`, `Label`, `Button` - UI components
- `Eye`, `EyeOff` icons (lucide-react) - Password visibility toggle
- `LiquidGradient` (`components/ui/LiquidGradient.tsx`) - Background gradient

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

- `PasswordUpdateModal` (`components/ui/PasswordUpdateModal.tsx`)

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

**Purpose:** Require users to complete their profile.

**Components Used:**

- `ProfileValidationModal` (`components/ui/ProfileValidationModal.tsx`)
- `ProfileValidationGate` (global provider in root layout)

**API Endpoints:**

- `PUT /api/profile` - Profile update

**Data Flow:**

1. User authenticates but profile is invalid
2. Modal automatically displayed (enforced)
3. User must fill all invalid fields
4. Real-time validation with debouncing
5. Modal closes on success

**State Management:**

- `showProfileValidationModal` - Modal visibility
- `invalidProfileFields` - Invalid field names
- `profileValidationReasons` - Validation failure reasons
- `currentUserData` - Current user profile data
- `profileUpdating` - Update operation loading

**Notes:**

- Modal cannot be closed until all fields are valid
- Required fields: username, firstName, lastName, emailAddress, phone, dateOfBirth, gender, otherName
- Admin/developer can update licensee and location assignments

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
