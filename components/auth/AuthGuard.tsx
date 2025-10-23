"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUserStore } from "@/lib/store/userStore";
import type React from "react";

type AuthGuardProps = {
  children: React.ReactNode;
};

/**
 * Global authentication guard that redirects to login if user is null
 * Prevents access to protected routes when user is not authenticated
 */
export default function AuthGuard({ children }: AuthGuardProps) {
  const { user } = useUserStore();
  const router = useRouter();
  const pathname = usePathname();

  // Routes that don't require authentication
  const publicRoutes = ["/login", "/unauthorized"];
  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    // Only check authentication on client side
    if (typeof window === "undefined") return;

    // Allow access to public routes
    if (isPublicRoute) {
      return;
    }

    // Redirect to login if user is null
    if (!user) {
      console.warn("User not authenticated, redirecting to login");
      router.push("/login");
      return;
    }
  }, [user, router, pathname, isPublicRoute]);

  // Don't render children if user is null and not on a public route
  if (!user && !isPublicRoute) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return <>{children}</>;
}
