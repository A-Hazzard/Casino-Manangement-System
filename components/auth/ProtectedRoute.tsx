"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/lib/store/userStore";
import { PageName } from "@/lib/utils/permissions";
import { hasAdminAccessDb, hasPageAccessDb } from "@/lib/utils/permissionsDb";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdminAccess?: boolean;
  requiredPage?: PageName;
}

export default function ProtectedRoute({
  children,
  requireAdminAccess = false,
  requiredPage,
}: ProtectedRouteProps) {
  const { user, setUser } = useUserStore();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [hasHydrated, setHasHydrated] = useState(false);

  // Wait for Zustand to hydrate from localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasHydrated(true);
    }, 100); // Small delay to allow Zustand to hydrate

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return; // Don't check until hydrated

    const checkAuthentication = async () => {
      // First check if user is logged in
      if (!user) {
        router.push("/login");
        return;
      }

      // Then check permissions against database for current data
      try {
        // Check admin access if required
        if (requireAdminAccess) {
          const hasAdmin = await hasAdminAccessDb();
          if (!hasAdmin) {
            router.push("/"); // Redirect to dashboard if not admin
            return;
          }
        }

        // Check page access if required
        if (requiredPage) {
          const hasPage = await hasPageAccessDb(requiredPage);
          if (!hasPage) {
            router.push("/unauthorized"); // Redirect to unauthorized page
            return;
          }
        }

        setIsChecking(false);
        return;
      } catch (error) {
        console.error("Error checking permissions:", error);
        router.push("/login");
        return;
      }
    };

    checkAuthentication();
  }, [user, router, hasHydrated, setUser, requireAdminAccess, requiredPage]);

  // Show loading while checking authentication or waiting for hydration
  if (isChecking || !hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return <>{children}</>;
}
