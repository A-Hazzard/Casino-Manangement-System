"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import type React from "react";

type AuthProviderProps = {
  children: React.ReactNode;
};

/**
 * AuthProvider component that provides authentication context
 * No redirect logic - that's handled by ProtectedRoute components
 */
export default function AuthProvider({ children }: AuthProviderProps) {
  // Just provide the auth context without redirects
  useAuth(); // Initialize auth but don't use the return values for redirects

  return <>{children}</>;
}
