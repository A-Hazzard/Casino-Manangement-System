# Login Page

## Table of Contents

- [Overview](#overview)
- [Main Features](#main-features)
- [Technical Architecture](#technical-architecture)
- [Authentication Flow](#authentication-flow)
- [Security Features](#security-features)
- [API Integration](#api-integration)
- [State Management](#state-management)
- [Performance Optimization](#performance-optimization)
- [Error Handling](#error-handling)
- [Accessibility](#accessibility)

## Overview

The Login page provides secure authentication for users accessing the casino management system. This page serves as the entry point for all authenticated users and implements robust security measures.

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** December 2025  
**Version:** 2.2.0

### File Information

- **File:** `app/(auth)/login/page.tsx`
- **URL Pattern:** `/login`
- **Component Type:** Authentication Page
- **Authentication:** Not Required (Public Access)

## Main Features

- **Login Form:**
  - Email/username identifier and password input fields (identifier accepts email or username).
  - Show/hide password toggle.
  - "Remember Me" checkbox for persistent identifier storage.
  - Validation for identifier and password.
  - Error and success messages (including "Logout Successful" message from URL parameter).
  - **Email as Username Support:** Users can log in with email address even if it's set as their username (prompted to change via ProfileValidationModal).
- **Authentication:**
  - Calls backend API to authenticate users (supports email or username as identifier).
  - Displays loading and redirecting states.
  - Handles authentication errors and feedback.
  - Database environment mismatch detection and handling.
  - **Hard Delete Detection:** Users automatically logged out if account is hard-deleted from database.
  - **URL Parameter Handling:** Parses `logout=success`, `error`, and `message` parameters to display appropriate messages.
- **Profile Validation Gate:**
  - **Mandatory Profile Validation:** After successful login, users with invalid profile data are required to update their profile before accessing the application.
  - **ProfileValidationGate Component:** Global provider in root layout that monitors user profile validation status.
  - **ProfileValidationModal:** Displays when profile fields (username, firstName, lastName, emailAddress, phone, dateOfBirth, gender, otherName) fail validation.
  - **Enforced Updates:** Modal cannot be closed until all invalid fields are corrected.
  - **Real-time Validation:** Client-side validation with debouncing (300ms) for immediate feedback.
  - **Role-based Fields:** Admin/developer roles can also update licensee and location assignments.
- **Password Update Flow:**
  - **PasswordUpdateModal:** Displays when password strength requirements are not met.
  - **Password Strength Validation:** Validates password meets security requirements before allowing access.
- **Role-based Redirects:**
  - Automatically redirects users to appropriate dashboard based on their roles.
  - Prevents redirect loops and handles edge cases.
- **Branding:**
  - Displays company logo and casino imagery.
- **Responsive Layout:**
  - Optimized for both desktop and mobile devices.

## Technical Architecture

### Core Components

- **Main Page:** `app/(auth)/login/page.tsx` - Entry point with client-side rendering
- **Login Form:** `components/auth/LoginForm.tsx` - Reusable form component with validation
- **Profile Validation:**
  - `components/providers/ProfileValidationGate.tsx` - Global profile validation gate (in root layout)
  - `components/ui/ProfileValidationModal.tsx` - Mandatory profile update modal
- **Password Management:**
  - `components/ui/PasswordUpdateModal.tsx` - Password strength update modal
- **UI Components:**
  - `components/ui/input.tsx` - Input field component
  - `components/ui/label.tsx` - Label component
  - `components/ui/button.tsx` - Button component
  - `components/ui/skeletons/LoginSkeletons.tsx` - Loading skeleton component
- **Visual Effects:** `components/ui/LiquidGradient.tsx` - Background gradient animation

### State Management

- **Local State:** React `useState` hooks for form data and UI state
- **User Store:** `lib/store/userStore.ts` - Zustand store for user authentication state
- **Auth Session Store:** `lib/store/authSessionStore.ts` - Temporary storage for login password (ephemeral, cleared after validation)
- **Key State Properties:**
  - `identifier`, `password` - Form input values (identifier accepts email or username)
  - `rememberMe` - Remember identifier checkbox state
  - `showPassword` - Password visibility toggle
  - `errors` - Validation error messages
  - `loading`, `redirecting` - Loading states
  - `message`, `messageType` - Success/error feedback
  - `showPasswordUpdateModal` - Password update modal visibility
  - `showProfileValidationModal` - Profile validation modal visibility
  - `invalidProfileFields` - Fields that failed validation
  - `profileValidationReasons` - Detailed reasons for validation failures
  - `currentUserData` - Current user profile data for validation modal
  - `profileUpdating` - Profile update operation loading state
  - `hasRedirected` - Prevents redirect loops

### Data Flow

1. **Form Input:** User enters identifier (email or username) and password
2. **Client Validation:** Validates identifier format and password presence
3. **Database Mismatch Check:** Verifies database environment hasn't changed
4. **URL Parameter Check:** Parses URL parameters (`logout=success`, `error`, `message`) and displays appropriate messages
5. **API Call:** Sends credentials to `/api/auth/login`
6. **Authentication:** Backend validates credentials (checks both email and username if identifier looks like email) and issues JWT token
7. **User Status Check:** Backend verifies user exists, is not deleted, and account is enabled
8. **Password Storage:** Temporarily stores plaintext password in `authSessionStore` for profile validation
9. **Profile Validation Check:** Backend returns `invalidProfileFields` and `invalidProfileReasons` if profile data is invalid
10. **Conditional Modals:**
    - If `requiresPasswordUpdate`: Shows `PasswordUpdateModal`
    - If `requiresProfileUpdate`: Shows `ProfileValidationModal` (enforced, cannot close)
11. **State Update:** Updates user store with authenticated user data
12. **Token Verification:** Verifies JWT cookie was set correctly via `/api/test-current-user`
13. **Role-based Redirect:** Navigates to appropriate dashboard based on user roles
14. **ProfileValidationGate:** Global gate in root layout continues monitoring profile validation status

### API Integration

#### Backend Endpoint

- **Login API:** `/api/auth/login` - POST endpoint for user authentication
  - **Request Body:** `{ identifier: string, password: string }` (identifier can be email or username)
  - **Response:**
    - Success: `{ success: true, data: { user: UserData, token: string, refreshToken: string, expiresAt: string, requiresPasswordUpdate?: boolean, requiresProfileUpdate?: boolean, invalidProfileFields?: InvalidProfileFields, invalidProfileReasons?: ProfileValidationReasons } }`
    - Error: `{ success: false, message: string }` (specific messages for `user_not_found`, `user_deleted`, `account_disabled`)
  - **Cookies:** Sets HTTP-only `token` and `refreshToken` cookies for session management
  - **Profile Validation:** Returns validation flags if profile data is invalid or missing required fields
  - **User Status Validation:** Checks for hard-deleted users, soft-deleted users, and disabled accounts
  - **Last Login Update:** Updates `lastLoginAt` timestamp on successful login

#### Authentication Process

- **Backend Helper:** `app/api/lib/helpers/auth.ts` - Core authentication logic
  - `authenticateUser()` - Validates credentials against database (checks both email and username if identifier looks like email)
  - JWT token generation using `jose` library
  - Password hashing with bcrypt
  - User status validation (existence, soft-delete, disabled status)
- **Validation:** `app/api/lib/utils/validation.ts` - Server-side validation
  - Email format validation
  - Password strength requirements

### Key Dependencies

#### Frontend Libraries

- **React Hooks:** `useState`, `useEffect` - State management
- **Next.js:** `useRouter`, `Image` - Navigation and image optimization
- **Axios:** HTTP client for API calls
- **Sonner:** Toast notifications for user feedback
- **Lucide React:** `Eye`, `EyeOff` - Password visibility icons

#### Type Definitions

- **Shared Types:** `@shared/types/auth.ts` - Authentication-related types
  - `LoginFormProps` - Form component props type
- **API Types:** `app/api/lib/types/index.ts` - Backend type definitions
  - `LoginRequestBody`, `AuthResult`, `UserData`

#### Utility Functions

- **Auth Helper:** `lib/helpers/clientAuth.ts` - Frontend authentication utilities
  - `loginUser()` - Handles login API call and user state update, returns profile validation flags
  - `logoutUser()` - Handles logout and session cleanup
  - `sendForgotPasswordEmail()` - Password reset functionality
- **Validation Utils:** `lib/utils/validation.ts` - Client-side validation
  - `validateEmail()` - Email format validation
  - `validatePasswordStrength()` - Password strength validation with detailed feedback
- **Database Utils:** `lib/utils/databaseMismatch.ts` - Database environment checking
  - `checkForDatabaseMismatch()` - Detects if database connection string has changed
- **Redirect Utils:** `lib/utils/roleBasedRedirect.ts` - Role-based navigation
  - `getDefaultRedirectPathFromRoles()` - Returns appropriate dashboard path based on user roles

### Component Hierarchy

```
RootLayout (app/layout.tsx)
└── ProfileValidationGate (components/providers/ProfileValidationGate.tsx)
    └── ProfileValidationModal (components/ui/ProfileValidationModal.tsx)

LoginPage (app/(auth)/login/page.tsx)
├── LiquidGradient (components/ui/LiquidGradient.tsx)
├── LoginForm (components/auth/LoginForm.tsx)
│   ├── Input (components/ui/input.tsx)
│   ├── Label (components/ui/label.tsx)
│   ├── Button (components/ui/button.tsx)
│   └── Eye/EyeOff Icons (lucide-react)
├── PasswordUpdateModal (components/ui/PasswordUpdateModal.tsx)
└── ProfileValidationModal (components/ui/ProfileValidationModal.tsx)
```

### Business Logic

- **Identifier Validation:** Accepts email or username for login (backend checks both fields if identifier looks like email)
- **Password Requirements:** Strong password requirements (8+ chars, uppercase, lowercase, number, special char)
- **Session Management:** JWT tokens stored in HTTP-only cookies with 48-hour expiration
- **Profile Validation:** Mandatory validation of username, firstName, lastName, emailAddress, phone, dateOfBirth, gender, otherName
- **Password Storage:** Plaintext password temporarily stored in `authSessionStore` for profile validation, cleared after use
- **Database Environment Check:** Verifies database connection hasn't changed on page load
- **URL Parameter Handling:** Parses and displays messages from URL parameters (`logout=success`, `error`, `message`)
- **Hard Delete Detection:** Users automatically logged out if account is hard-deleted from database
- **Role-based Navigation:** Redirects users to appropriate dashboard based on roles
- **Security:** CSRF protection, secure cookie settings, token verification
- **Error Handling:** Graceful degradation with user-friendly messages

### Security Features

- **Input Validation:** Both client and server-side validation
- **Password Security:** Bcrypt hashing on backend, strong password requirements
- **Token Management:** HTTP-only cookies with secure flags, refresh token support
- **Session Expiry:** 48-hour token expiration
- **Profile Validation Enforcement:** Users cannot access application until profile meets security compliance requirements
- **Password Storage:** Ephemeral storage in memory only, never persisted or logged
- **Database Environment Verification:** Prevents session hijacking from database changes
- **Error Sanitization:** Generic error messages to prevent information leakage
- **Specific Error Messages:** Displays specific messages for `user_not_found`, `user_deleted`, and `account_disabled` scenarios

### Error Handling

- **Network Errors:** Fallback error messages for API failures
- **Validation Errors:** Real-time feedback for invalid inputs
- **Authentication Errors:** Clear messaging for invalid credentials
- **Loading States:** Visual feedback during authentication process

### Performance Optimizations

- **Client-Side Rendering:** Prevents hydration issues with authentication state
- **Image Optimization:** Next.js Image component for logo and background
- **Form Validation:** Immediate feedback without API calls
- **State Management:** Efficient Zustand store for user data

## Data Flow

- Validates user input on the client.
- Sends login request to backend and handles response.
- Uses router to redirect on successful login.
- Displays error messages for failed attempts.

## UI

- Clean, modern design with Tailwind CSS.
- Accessible form controls and feedback.
- Visual branding and engaging imagery.
