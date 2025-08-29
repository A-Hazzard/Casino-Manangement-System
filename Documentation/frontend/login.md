# Login Page

**Author:** Aaron Hazzard - Senior Software Engineer

This page provides secure authentication for users accessing the casino management system.

- **File:** `app/(auth)/login/page.tsx`
- **URL Pattern:** `/login`

## Main Features
- **Login Form:**
  - Email and password input fields.
  - Show/hide password toggle.
  - Validation for email and password.
  - Error and success messages.
- **Authentication:**
  - Calls backend API to authenticate users.
  - Displays loading and redirecting states.
  - Handles authentication errors and feedback.
- **Branding:**
  - Displays company logo and casino imagery.
- **Responsive Layout:**
  - Optimized for both desktop and mobile devices.

## Technical Architecture

### Core Components
- **Main Page:** `app/(auth)/login/page.tsx` - Entry point with client-side rendering
- **Login Form:** `components/auth/LoginForm.tsx` - Reusable form component with validation
- **UI Components:** 
  - `components/ui/input.tsx` - Input field component
  - `components/ui/label.tsx` - Label component
  - `components/ui/button.tsx` - Button component
- **Visual Effects:** `components/ui/LiquidGradient.tsx` - Background gradient animation

### State Management
- **Local State:** React `useState` hooks for form data and UI state
- **User Store:** `lib/store/userStore.ts` - Zustand store for user authentication state
- **Key State Properties:**
  - `email`, `password` - Form input values
  - `showPassword` - Password visibility toggle
  - `errors` - Validation error messages
  - `loading`, `redirecting` - Loading states
  - `message`, `messageType` - Success/error feedback

### Data Flow
1. **Form Input:** User enters email and password
2. **Client Validation:** Validates email format and password length
3. **API Call:** Sends credentials to `/api/auth/login`
4. **Authentication:** Backend validates credentials and issues JWT token
5. **State Update:** Updates user store with authenticated user data
6. **Redirect:** Navigates to dashboard on success

### API Integration

#### Backend Endpoint
- **Login API:** `/api/auth/login` - POST endpoint for user authentication
  - **Request Body:** `{ emailAddress: string, password: string }`
  - **Response:** 
    - Success: `{ success: true, user: UserData, token: string }`
    - Error: `{ success: false, message: string }`
  - **Cookies:** Sets HTTP-only `token` cookie for session management

#### Authentication Process
- **Backend Helper:** `app/api/lib/helpers/auth.ts` - Core authentication logic
  - `authenticateUser()` - Validates credentials against database
  - JWT token generation using `jose` library
  - Password hashing with bcrypt
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
- **Auth Helper:** `lib/helpers/auth.ts` - Frontend authentication utilities
  - `loginUser()` - Handles login API call and user state update
  - `logoutUser()` - Handles logout and session cleanup
  - `sendForgotPasswordEmail()` - Password reset functionality
- **Validation Utils:** `lib/utils/validation.ts` - Client-side validation
  - `validateEmail()` - Email format validation
  - `validatePassword()` - Password strength validation

### Component Hierarchy
```
LoginPage (app/(auth)/login/page.tsx)
├── LiquidGradient (components/ui/LiquidGradient.tsx)
└── LoginForm (components/auth/LoginForm.tsx)
    ├── Input (components/ui/input.tsx)
    ├── Label (components/ui/label.tsx)
    ├── Button (components/ui/button.tsx)
    └── Eye/EyeOff Icons (lucide-react)
```

### Business Logic
- **Email Validation:** Regex pattern for email format validation
- **Password Requirements:** Minimum 6 characters
- **Session Management:** JWT tokens stored in HTTP-only cookies
- **Security:** CSRF protection, secure cookie settings
- **Error Handling:** Graceful degradation with user-friendly messages

### Security Features
- **Input Validation:** Both client and server-side validation
- **Password Security:** Bcrypt hashing on backend
- **Token Management:** HTTP-only cookies with secure flags
- **Session Expiry:** 48-hour token expiration
- **Error Sanitization:** Generic error messages to prevent information leakage

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