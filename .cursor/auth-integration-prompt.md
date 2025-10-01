# Authentication System Integration Guide

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** September 25th, 2025  
**Version:** 2.0.0

## Overview

This guide provides a simplified authentication system with automatic logout, database context validation, and robust token management. The system ensures users are automatically logged out when their tokens don't match the current database state.

## Core Features

- **JWT Token Management** with HTTP-only cookies
- **Database Context Validation** - Auto-logout when database changes
- **Zustand State Management** for user persistence
- **Automatic Logout** on invalid tokens or database mismatches
- **Multi-database Support** with context validation
- **User Profile Validation** - Automatic prompts for profile updates
- **Password Strength Validation** - Weak password detection and updates
- **TypeScript-first** implementation
- **Simplified Auth** - No role-based permissions, just user authentication

## File Structure

```
├── .env                          # Environment variables
├── middleware.ts                 # Next.js middleware for auth
├── lib/
│   ├── store/
│   │   └── userStore.ts         # Zustand user state management
│   ├── hooks/
│   │   └── useAuth.ts           # Main auth hook
│   ├── helpers/
│   │   ├── user.ts              # Client-side user helpers
│   │   └── clientAuth.ts        # Client auth functions
│   ├── utils/
│   │   ├── auth.ts              # Auth utilities (JWT secret, DB context)
│   │   └── validation.ts        # Password and profile validation
│   └── types/
│       ├── auth.ts              # Auth type definitions
│       └── store.ts             # Store type definitions
└── app/
    ├── api/
    │   ├── auth/
    │   │   ├── login/route.ts   # Login endpoint
    │   │   ├── logout/route.ts  # Logout endpoint
    │   │   └── token/route.ts   # Token validation endpoint
    │   ├── users/[id]/route.ts  # User CRUD endpoints
    │   └── lib/
    │       ├── helpers/
    │       │   ├── auth.ts      # Server-side auth helpers
    │       │   └── users.ts     # User database helpers
    │       ├── models/
    │       │   └── user.ts      # User Mongoose model
    │       └── middleware/
    │           └── db.ts        # Database connection
    └── (auth)/
        └── login/
            └── page.tsx         # Login page
└── components/
    └── ui/
        ├── PasswordUpdateModal.tsx    # Password update modal
        └── ProfileValidationModal.tsx # Profile validation modal
```

## Implementation Steps

### 1. Environment Variables

```env
# Database
MONGO_URI=mongodb://username:password@host:port/database?authSource=admin
# Alternative: MONGODB_URI=mongodb://...

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-here

# Optional: API Base URL
API_BASE_URL=http://localhost:3000
```

### 2. Core Auth Utilities

**`lib/utils/auth.ts`**
```typescript
/**
 * Centralized auth utilities for JWT secret and database context
 */

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || "development-secret";
  if (!secret) {
    return "development-secret";
  }
  return secret;
}

export function getCurrentDbConnectionString(): string {
  // Support either env var name
  return process.env.MONGODB_URI || process.env.MONGO_URI || "";
}
```

### 3. User Store (Zustand)

**`lib/store/userStore.ts`**
```typescript
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { UserAuthPayload } from "@/lib/types/auth";

type UserStore = {
  user: UserAuthPayload | null;
  setUser: (user: UserAuthPayload | null) => void;
  clearUser: () => void;
};

// SSR-safe store creation
const createStore = () => {
  return create<UserStore>()(
    persist(
      (set) => ({
        user: null,
        setUser: (user) => set({ user }),
        clearUser: () => set({ user: null }),
      }),
      {
        name: "user-auth-store", // Customize this name
        storage: createJSONStorage(() => {
          if (typeof window !== "undefined") {
            return localStorage;
          }
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }),
      }
    )
  );
};

let storeInstance: ReturnType<typeof createStore> | null = null;

const getClientStore = () => {
  if (!storeInstance) {
    storeInstance = createStore();
  }
  return storeInstance;
};

export const useUserStore =
  typeof window !== "undefined"
    ? getClientStore()!
    : create<UserStore>(() => ({ user: null, setUser: () => {}, clearUser: () => {} }));
```

### 4. Auth Types

**`lib/types/auth.ts`**
```typescript
export type UserAuthPayload = {
  _id: string;
  emailAddress: string;
  username: string;
  isEnabled: boolean;
  profile?: {
    firstName?: string;
    lastName?: string;
    middleName?: string;
    otherName?: string;
    gender?: string;
    address?: {
      street?: string;
      town?: string;
      region?: string;
      country?: string;
      postalCode?: string;
    };
    identification?: {
      dateOfBirth?: string;
      idType?: string;
      idNumber?: string;
      notes?: string;
    };
  };
  // Enhanced security fields
  lastLoginAt?: Date;
  loginCount?: number;
  isLocked?: boolean;
  lockedUntil?: Date;
  failedLoginAttempts?: number;
  // Validation flags
  requiresPasswordUpdate?: boolean;
  requiresProfileUpdate?: boolean;
  invalidProfileFields?: {
    username?: boolean;
    firstName?: boolean;
    lastName?: boolean;
  };
};

export type AuthResult = {
  success: boolean;
  message?: string;
  token?: string;
  refreshToken?: string;
  user?: UserAuthPayload;
  expiresAt?: string;
  requiresPasswordUpdate?: boolean;
  requiresProfileUpdate?: boolean;
  invalidProfileFields?: {
    username?: boolean;
    firstName?: boolean;
    lastName?: boolean;
  };
};

export type LoginRequestBody = {
  identifier: string; // email or username
  password: string;
};
```

### 5. Server-Side Auth Helpers

**`app/api/lib/helpers/auth.ts`**
```typescript
import { SignJWT } from "jose";
import { getUserByEmail, getUserByUsername } from "./users";
import { comparePassword } from "../utils/validation";
import type { AuthResult } from "../types/auth";
import { getJwtSecret, getCurrentDbConnectionString } from "@/lib/utils/auth";
import type { UserAuthPayload } from "@/lib/types/auth";

/**
 * Validates user credentials and generates a JWT token
 */
export async function authenticateUser(
  identifier: string,
  password: string
): Promise<AuthResult> {
  // Accept either email or username
  const user = /\S+@\S+\.\S+/.test(identifier)
    ? await getUserByEmail(identifier)
    : await getUserByUsername(identifier);
  
  if (!user) return { success: false, message: "User not found." };

  const isMatch = await comparePassword(password, user.password || "");
  if (!isMatch) return { success: false, message: "Incorrect password." };

  const userObject = user.toObject({ getters: true });

  // Include database context in JWT payload
  const jwtPayload = {
    _id: userObject._id.toString(),
    emailAddress: userObject.emailAddress,
    username: String(userObject.username || ""),
    isEnabled: userObject.isEnabled,
    sessionId: userObject._id.toString(),
    dbContext: {
      connectionString: getCurrentDbConnectionString(),
      timestamp: Date.now(),
    },
  };

  const token = await new SignJWT(jwtPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("48h")
    .sign(new TextEncoder().encode(getJwtSecret()));

  const userPayload: UserAuthPayload = {
    _id: userObject._id.toString(),
    emailAddress: userObject.emailAddress,
    username: String(userObject.username || ""),
    isEnabled: userObject.isEnabled,
    profile: userObject.profile || undefined,
    lastLoginAt: new Date(),
    loginCount: (Number(userObject.loginCount) || 0) + 1,
    isLocked: false,
    lockedUntil: undefined,
    failedLoginAttempts: 0,
  };

  return { success: true, token, user: userPayload };
}
```

### 6. User Database Helpers

**`app/api/lib/helpers/users.ts`**
```typescript
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { JWTPayload, jwtVerify } from "jose";
import UserModel from "../models/user";
import { getJwtSecret, getCurrentDbConnectionString } from "@/lib/utils/auth";

/**
 * Validates database context from JWT token
 */
function validateDatabaseContext(tokenPayload: Record<string, unknown>): boolean {
  if (!tokenPayload.dbContext) {
    console.warn("JWT token missing database context - forcing re-authentication");
    return false;
  }

  const currentDbContext = {
    connectionString: getCurrentDbConnectionString(),
  };

  const tokenDbContext = tokenPayload.dbContext as { connectionString?: string };

  if (tokenDbContext.connectionString !== currentDbContext.connectionString) {
    console.warn("Database context mismatch - forcing re-authentication", {
      tokenContext: tokenDbContext,
      currentContext: currentDbContext,
    });
    return false;
  }

  return true;
}

/**
 * Gets user ID from server-side JWT token with database context validation
 */
export async function getUserIdFromServer(): Promise<string | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return null;
    }

    const JWT_SECRET = getJwtSecret();
    if (!JWT_SECRET) {
      console.error("JWT_SECRET is empty");
      return null;
    }

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(JWT_SECRET)
    );

    // Validate database context
    if (!validateDatabaseContext(payload)) {
      return null;
    }

    return payload._id as string;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

/**
 * Retrieves a user by ID with multiple query strategies
 */
export async function getUserById(userId: string) {
  try {
    console.log("getUserById called with userId:", userId);
    
    // Try multiple approaches to find the user
    let user = await UserModel.findById(userId, "-password");
    
    // If findById doesn't work, try findOne with ObjectId
    if (!user) {
      const mongoose = require("mongoose");
      const ObjectId = mongoose.Types.ObjectId;
      user = await UserModel.findOne(
        { _id: new ObjectId(userId) },
        "-password"
      );
    }
    
    // If still not found, try findOne with string _id
    if (!user) {
      user = await UserModel.findOne({ _id: userId }, "-password");
    }
    
    console.log("getUserById result:", user ? "found" : "not found");
    return user;
  } catch (error) {
    console.error("getUserById error:", error);
    throw error;
  }
}

export async function getUserByEmail(emailAddress: string) {
  try {
    const user = await UserModel.findOne({
      emailAddress: { $regex: new RegExp(`^${emailAddress}$`, "i") },
    });
    return user;
  } catch (error) {
    console.error("getUserByEmail error:", error);
    throw error;
  }
}

export async function getUserByUsername(username: string) {
  try {
    const user = await UserModel.findOne({
      username: { $regex: new RegExp(`^${username}$`, "i") },
    });
    return user;
  } catch (error) {
    console.error("getUserByUsername error:", error);
    throw error;
  }
}
```

### 7. Next.js Middleware

**`middleware.ts`**
```typescript
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getJwtSecret, getCurrentDbConnectionString } from "@/lib/utils/auth";

const publicPaths = ["/login", "/forgot-password", "/reset-password"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API requests & public assets
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|bmp|tiff|pdf|txt|css|js|woff|woff2|ttf|eot)$/i)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("token")?.value;
  let isAuthenticated = false;
  let userPayload: JwtPayload | null = null;

  if (token) {
    try {
      const payload = await verifyAccessToken(token);

      if (payload) {
        // Check if user is enabled
        if (!payload.isEnabled) {
          console.warn("User account is disabled");
          return createLogoutResponse(request, "account_disabled");
        }

        isAuthenticated = true;
        userPayload = payload;
      }
    } catch (err) {
      console.error("JWT verification failed:", err);
      return createLogoutResponse(request, "invalid_token");
    }
  }

  const isPublicPath = publicPaths.includes(pathname);

  // Redirect logged-in users away from public pages
  if (isAuthenticated && isPublicPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Redirect unauthenticated users away from protected pages
  if (!isAuthenticated && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.|api/).*)"],
};
```

### 8. Client-Side Auth Hook

**`lib/hooks/useAuth.ts`**
```typescript
import { useEffect, useState } from "react";
import { useUserStore } from "@/lib/store/userStore";
import { fetchUserId } from "@/lib/helpers/user";
import axios from "axios";
import type { UserAuthPayload } from "@/lib/types/auth";

export function useAuth() {
  const { user, setUser } = useUserStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      if (!user) {
        try {
          const userId = await fetchUserId();
          if (userId) {
            const response = await axios.get(`/api/users/${userId}`);
            if (response.data.success) {
              const userData: UserAuthPayload = {
                _id: response.data.user._id,
                emailAddress: response.data.user.email,
                username: response.data.user.username || "",
                isEnabled: response.data.user.enabled,
                profile: response.data.user.profile || undefined,
              };
              setUser(userData);
            }
          }
        } catch (error) {
          console.error("Failed to initialize auth:", error);
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, [user, setUser]);

  return {
    user: user as UserAuthPayload | null,
    isLoading,
    isAuthenticated: !!user && user.isEnabled,
  };
}
```

### 9. Client Auth Helpers

**`lib/helpers/clientAuth.ts`**
```typescript
import type { AuthResult } from "../types/auth";

export async function loginUser(credentials: {
  identifier: string;
  password: string;
}): Promise<AuthResult> {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      let errorMessage = "Login failed";
      if (response.status === 401) {
        errorMessage = data.message || "Invalid credentials";
      } else if (response.status === 500) {
        errorMessage = "Server error. Please try again later";
      }
      return { success: false, message: errorMessage };
    }

    return data;
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      message: "Network error occurred. Please check your connection",
    };
  }
}

export async function logoutUser(): Promise<AuthResult> {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Clear client-side storage regardless of API response
    if (typeof window !== "undefined") {
      localStorage.removeItem("user-auth-store");
      sessionStorage.clear();
    }

    if (!response.ok) {
      return { success: false, message: "Logout failed" };
    }

    return { success: true, message: "Logged out successfully" };
  } catch (error) {
    console.error("Logout error:", error);
    if (typeof window !== "undefined") {
      localStorage.removeItem("user-auth-store");
      sessionStorage.clear();
    }
    return { success: true, message: "Logged out locally" };
  }
}
```

**`lib/helpers/user.ts`**
```typescript
import axios from "axios";

export async function fetchUserId(): Promise<string | null> {
  try {
    const response = await axios.get<{ userId: string }>("/api/auth/token");
    return response.data.userId;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      console.warn("Token API returned 401 - auto-logging out and redirecting to /login");
      try {
        const { logoutUser } = await import("./clientAuth");
        await logoutUser();
      } finally {
        if (typeof window !== "undefined") {
          window.location.replace("/login");
        }
      }
    } else {
      console.error("Failed to fetch userId:", error);
    }
    return null;
  }
}
```

### 10. API Routes

**`app/api/auth/login/route.ts`**
```typescript
import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/app/api/lib/helpers/auth";
import { validatePassword } from "@/lib/utils/validation";
import { connectDB } from "@/app/api/lib/middleware/db";
import type { LoginRequestBody, AuthResult } from "@/lib/types/auth";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { identifier, password } = (await request.json()) as LoginRequestBody;

    const isEmail = /\S+@\S+\.\S+/.test(identifier);
    const isUsername =
      !isEmail &&
      typeof identifier === "string" &&
      identifier.trim().length >= 3;
      
    if (!(isEmail || isUsername) || !validatePassword(password)) {
      return NextResponse.json(
        { success: false, message: "Invalid identifier or password format." },
        { status: 400 }
      );
    }

    const result: AuthResult = await authenticateUser(identifier, password);
    if (!result.success || !result.user || !result.token) {
      return NextResponse.json(
        { success: false, message: result.message || "Invalid credentials." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      user: result.user,
      token: result.token,
    });

    response.cookies.set("token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 172800, // 48 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
```

**`app/api/auth/token/route.ts`**
```typescript
import { NextResponse } from "next/server";
import { getUserIdFromServer } from "@/app/api/lib/helpers/users";

export async function GET() {
  try {
    const userId = await getUserIdFromServer();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ userId });
  } catch (error) {
    console.error("Token validation error:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
```

**`app/api/users/[id]/route.ts`**
```typescript
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { getUserById } from "@/app/api/lib/helpers/users";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    await connectDB();
    const resolvedParams = await params;
    const userId = resolvedParams.id;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    const user = await getUserById(userId);
    if (!user) {
      // Return 401 to trigger auto-logout on frontend
      return NextResponse.json(
        { success: false, message: "User not found - session invalid" },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true, user });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, message: "Failed to fetch user", error: errorMsg },
      { status: 500 }
    );
  }
}
```

### 11. Login Page Integration

**`app/(auth)/login/page.tsx`**
```typescript
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "@/lib/helpers/clientAuth";
import { validatePassword } from "@/lib/utils/validation";
import { useUserStore } from "@/lib/store/userStore";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success" | "info" | undefined>();

  const router = useRouter();
  const setUser = useUserStore((state) => state.setUser);

  useEffect(() => {
    // Handle database mismatch error from URL
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get("error");

    if (error === "database_mismatch") {
      setMessage("Database environment has changed. Please login again to continue.");
      setMessageType("info");
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (!identifier || !validatePassword(password)) {
      setMessage("Please enter valid credentials");
      setMessageType("error");
      return;
    }

    setLoading(true);
    try {
      const response = await loginUser({ identifier, password });
      if (response.success && response.user) {
        // Save user data to Zustand store
        setUser(response.user);
        setMessage("Login successful. Redirecting...");
        setMessageType("success");
        router.push("/");
      } else {
        setMessage(response.message || "Invalid credentials");
        setMessageType("error");
      }
    } catch {
      setMessage("An unexpected error occurred. Please try again.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address or username"
              />
            </div>
            <div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          {message && (
            <div className={`text-sm ${messageType === "error" ? "text-red-600" : "text-green-600"}`}>
              {message}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

## Key Features

### 1. **Database Context Validation**
- JWT tokens include database connection string
- Auto-logout when database environment changes
- Prevents cross-database session issues

### 2. **Automatic Logout System**
- 401 responses trigger automatic logout
- Clears all client-side storage
- Redirects to login page
- Prevents infinite redirect loops

### 3. **User Profile Validation**
- Automatic detection of invalid profile fields
- Prompts for username updates (no email patterns or no username provided(has no value))
- Validates first/last names (no special characters or if firstName or lastName weren't provided(has no value))
- Detects phone number patterns in profile fields

### 4. **Password Strength Validation**
- Weak password detection during login
- Automatic prompts for password updates
- Secure password requirements enforcement like the new user modal on the administration page

### 5. **Robust User Lookup**
- Multiple query strategies for finding users
- Handles both ObjectId and string IDs
- Comprehensive error handling

### 6. **State Management**
- Zustand for client-side user state
- Persistent storage in localStorage
- SSR-safe implementation

### 7. **Security Features**
- HTTP-only cookies for tokens
- Database context validation
- Automatic token expiration
- Secure cookie settings

## User Validation Modals

### Password Update Modal

**`components/ui/PasswordUpdateModal.tsx`**
```typescript
"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Eye, EyeOff } from "lucide-react";
import { validatePasswordStrength } from "@/lib/utils/validation";

type PasswordUpdateModalProps = {
  open: boolean;
  onClose: () => void;
  onUpdate: (newPassword: string) => void;
  loading?: boolean;
};

export default function PasswordUpdateModal({
  open,
  onClose,
  onUpdate,
  loading = false,
}: PasswordUpdateModalProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      setErrors({
        password: passwordValidation.errors.join(", "),
      });
      return;
    }

    // Check password confirmation
    if (newPassword !== confirmPassword) {
      setErrors({
        confirmPassword: "Passwords do not match",
      });
      return;
    }

    onUpdate(newPassword);
  };

  const handleClose = () => {
    setNewPassword("");
    setConfirmPassword("");
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Update Your Password
          </DialogTitle>
          <DialogDescription>
            Your current password is weak and needs to be updated for security purposes.
            Please choose a stronger password.
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <strong>Password Requirements:</strong>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>At least 8 characters long</li>
              <li>Contains uppercase and lowercase letters</li>
              <li>Contains at least one number</li>
              <li>Contains at least one special character</li>
            </ul>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                disabled={loading}
                className={errors.password ? "border-red-500" : ""}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-500 mt-1">{errors.password}</p>
            )}
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                disabled={loading}
                className={errors.confirmPassword ? "border-red-500" : ""}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-500 mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword}
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### Profile Validation Modal

**`components/ui/ProfileValidationModal.tsx`**
```typescript
"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { validateProfileField, validateNameField, containsPhonePattern } from "@/lib/utils/validation";

type ProfileValidationModalProps = {
  open: boolean;
  onClose: () => void;
  onUpdate: (data: { username: string; firstName: string; lastName: string }) => void;
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
  const [errors, setErrors] = useState<{
    username?: string;
    firstName?: string;
    lastName?: string;
  }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: typeof errors = {};

    // Validate username
    if (!formData.username) {
      newErrors.username = "Username is required";
    } else if (!validateProfileField(formData.username)) {
      if (containsPhonePattern(formData.username)) {
        newErrors.username = "Username cannot be a phone number. Please use a proper username.";
      } else {
        newErrors.username = "Username contains invalid characters. Only letters, numbers, spaces, hyphens, and apostrophes are allowed.";
      }
    }

    // Validate first name
    if (!formData.firstName) {
      newErrors.firstName = "First name is required";
    } else if (!validateNameField(formData.firstName)) {
      if (containsPhonePattern(formData.firstName)) {
        newErrors.firstName = "First name cannot be a phone number. Please use your actual first name.";
      } else {
        newErrors.firstName = "First name contains invalid characters. Only letters, spaces, hyphens, and apostrophes are allowed.";
      }
    }

    // Validate last name
    if (!formData.lastName) {
      newErrors.lastName = "Last name is required";
    } else if (!validateNameField(formData.lastName)) {
      if (containsPhonePattern(formData.lastName)) {
        newErrors.lastName = "Last name cannot be a phone number. Please use your actual last name.";
      } else {
        newErrors.lastName = "Last name contains invalid characters. Only letters, spaces, hyphens, and apostrophes are allowed.";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onUpdate(formData);
  };

  const handleClose = () => {
    setFormData(currentData);
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
            Update Your Profile
          </DialogTitle>
          <DialogDescription>
            Your profile contains special characters or phone number patterns that are not allowed. Please update the following fields:
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <strong>Profile Requirements:</strong>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>Username: No email patterns (@, .com) or phone numbers</li>
              <li>First/Last Name: Only letters, spaces, hyphens, and apostrophes</li>
              <li>No special characters, numbers, or symbols</li>
            </ul>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="Enter username"
              disabled={loading}
              className={getFieldError("username") ? "border-red-500" : ""}
            />
            {getFieldError("username") && (
              <p className="text-sm text-red-500 mt-1">{getFieldError("username")}</p>
            )}
          </div>

          <div>
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="Enter first name"
              disabled={loading}
              className={getFieldError("firstName") ? "border-red-500" : ""}
            />
            {getFieldError("firstName") && (
              <p className="text-sm text-red-500 mt-1">{getFieldError("firstName")}</p>
            )}
          </div>

          <div>
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="Enter last name"
              disabled={loading}
              className={getFieldError("lastName") ? "border-red-500" : ""}
            />
            {getFieldError("lastName") && (
              <p className="text-sm text-red-500 mt-1">{getFieldError("lastName")}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Profile"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

## Usage in Components

```typescript
import { useAuth } from "@/lib/hooks/useAuth";

function MyComponent() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please login</div>;

  return (
    <div>
      <h1>Welcome, {user?.username}!</h1>
      <p>Email: {user?.emailAddress}</p>
      {user?.profile?.firstName && (
        <p>Name: {user.profile.firstName} {user.profile.lastName}</p>
      )}
    </div>
  );
}
```

## Testing the System

1. **Login with valid credentials**
2. **Test weak password detection** - should prompt for password update
3. **Test profile validation** - should prompt for profile updates
4. **Switch database in .env** - should auto-logout
5. **Clear localStorage** - should redirect to login
6. **Use expired token** - should auto-logout

## Customization

- **Change store name**: Update `name` in `userStore.ts`
- **Modify token expiration**: Update `maxAge` in login route
- **Add custom fields**: Extend `UserAuthPayload` type
- **Custom validation**: Modify validation functions in `lib/utils/validation.ts`
- **Password requirements**: Update `validatePasswordStrength` function
- **Profile requirements**: Update `validateProfileField` and `validateNameField` functions

## Implementation Notes

### User Validation Flow
1. **Login Success**: Check for weak password and invalid profile fields
2. **Password Update**: Show `PasswordUpdateModal` if password is weak
3. **Profile Update**: Show `ProfileValidationModal` if profile has invalid fields
4. **Validation Rules**:
   - Username: No email patterns (@, .com) or phone numbers
   - First/Last Name: Only letters, spaces, hyphens, apostrophes
   - Password: 8+ chars, uppercase, lowercase, number, special character

### Database Context Validation
- JWT tokens include database connection string
- Middleware validates context on every request
- Auto-logout when database environment changes
- Prevents cross-database session issues

### Security Features
- HTTP-only cookies for tokens
- Automatic token expiration (48 hours)
- Secure cookie settings (production)
- Database context validation
- Rate limiting for login attempts

This system provides enterprise-grade authentication with automatic session management, database context validation, and comprehensive user profile validation.
