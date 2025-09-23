import { useEffect, useState } from "react";
import { useUserStore } from "@/lib/store/userStore";
import { fetchUserId } from "@/lib/helpers/user";
import axios from "axios";
import type { UserAuthPayload } from "@/lib/types/auth";

import type { AuthState } from "@/lib/types/hooks";

// Re-export frontend-specific types for convenience
export type { AuthState };

/**
 * Custom hook for authentication and role-based access control.
 * 
 * Provides user authentication state and permission checking functions
 * specifically designed for the reports module's role-based access control.
 * 
 * @returns AuthState object with user data and permission checking functions
 */
export function useAuth(): AuthState {
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
                roles: response.data.user.roles || [],
                permissions: response.data.user.permissions || [],
                resourcePermissions: response.data.user.resourcePermissions || {},
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

  const hasRole = (role: string): boolean => {
    return user?.roles?.includes(role) || false;
  };

  const hasPermission = (permission: string): boolean => {
    return user?.permissions?.includes(permission) || false;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    if (!user?.roles || roles.length === 0) return false;
    return roles.some(role => user.roles.includes(role));
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user?.permissions || permissions.length === 0) return false;
    return permissions.some(permission => user.permissions.includes(permission));
  };

  const hasLocationAccess = (locationId: string): boolean => {
    if (!user?.resourcePermissions) return false;
    const gamingLocations = user.resourcePermissions["gaming-locations"];
    if (!gamingLocations) return false;
    return gamingLocations.resources.includes(locationId);
  };

  const getUserLocationIds = (): string[] => {
    if (!user?.resourcePermissions) return [];
    const gamingLocations = user.resourcePermissions["gaming-locations"];
    return gamingLocations?.resources || [];
  };

  const canAccessReport = (requiredRoles?: string[], requiredPermissions?: string[]): boolean => {
    // Admin role has access to all reports
    if (hasRole("admin")) return true;

    // Check if user has any of the required roles
    if (requiredRoles && requiredRoles.length > 0) {
      if (!hasAnyRole(requiredRoles)) return false;
    }

    // Check if user has any of the required permissions
    if (requiredPermissions && requiredPermissions.length > 0) {
      if (!hasAnyPermission(requiredPermissions)) return false;
    }

    return true;
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user && user.isEnabled,
    hasRole,
    hasPermission,
    hasAnyRole,
    hasAnyPermission,
    hasLocationAccess,
    getUserLocationIds,
    canAccessReport,
  };
} 