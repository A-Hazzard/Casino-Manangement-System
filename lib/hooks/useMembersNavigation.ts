import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";
import type { MembersView, MembersTab } from "@/lib/types/members";

/**
 * Custom hook for managing members navigation logic
 * Handles URL state management, permission checking, and tab switching
 */
export function useMembersNavigation(membersTabsConfig: MembersTab[]) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();

  // Get current section from URL or default to "members"
  const currentSection = searchParams?.get("section") || "members";
  const [activeTab, setActiveTab] = useState<MembersView>(
    (currentSection as MembersView) || "members"
  );

  /**
   * Update URL when tab changes
   */
  const handleTabChange = useCallback(
    (value: string) => {
      const newSection = value as MembersView;
      setActiveTab(newSection);

      // Update URL with section parameter
      const params = new URLSearchParams(searchParams?.toString() || "");
      if (newSection === "members") {
        params.delete("section"); // Remove section param for default
      } else {
        params.set("section", newSection);
      }

      const newUrl = `${pathname}?${params.toString()}`;
      router.push(newUrl, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  /**
   * Update active tab when URL changes
   */
  useEffect(() => {
    const section = searchParams?.get("section");
    if (section === "summary-report") {
      setActiveTab("summary-report");
    } else {
      setActiveTab("members");
    }
  }, [searchParams]);

  /**
   * Check user permissions for available tabs
   */
  const availableTabs = useMemo(() => {
    if (!isAuthenticated || !user) return [];

    return membersTabsConfig.filter(() => {
      // For now, allow access if user is authenticated
      // TODO: Implement proper role/permission checking when auth system is ready
      return true;

      // Commented out strict permission checking for now
      // // Check roles
      // if (tab.requiredRoles && tab.requiredRoles.length > 0) {
      //   if (
      //     !user.roles ||
      //     !tab.requiredRoles.some((role) => user.roles.includes(role))
      //   ) {
      //     return false;
      //   }
      // }

      // // Check permissions
      // if (tab.requiredPermissions && tab.requiredPermissions.length > 0) {
      //   if (
      //     !user.permissions ||
      //     !tab.requiredPermissions.some((permission) =>
      //       user.permissions.includes(permission)
      //     )
      //   ) {
      //     return false;
      //   }
      // }

      // return true;
    });
  }, [isAuthenticated, user, membersTabsConfig]);

  /**
   * Handle tab click with permission check
   */
  const handleTabClick = useCallback(
    (tabId: string) => {
      const targetTab = availableTabs.find((tab) => tab.id === tabId);
      if (!targetTab) {
        toast.error("You don't have permission to access this section");
        return;
      }
      handleTabChange(tabId);
    },
    [availableTabs, handleTabChange]
  );

  return {
    activeTab,
    availableTabs,
    handleTabClick,
    handleTabChange,
  };
}
