import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserStore } from "@/lib/store/userStore";
import { hasPageAccess, PageName } from "@/lib/utils/permissions";
import { hasPageAccessDb, hasTabAccessDb } from "@/lib/utils/permissionsDb";

interface UrlProtectionOptions {
  page: string;
  allowedTabs?: string[];
  defaultTab?: string;
  redirectPath?: string;
}

/**
 * Hook to protect URL parameters and redirect unauthorized users
 * Prevents direct URL access to unauthorized tabs/pages
 */
export function useUrlProtection({
  page,
  allowedTabs = [],
  defaultTab,
  redirectPath,
}: UrlProtectionOptions) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUserStore();

  // Memoize userRoles to prevent unnecessary re-renders
  const userRoles = useMemo(() => user?.roles || [], [user?.roles]);

  useEffect(() => {
    if (!user) return; // Wait for user to be loaded

    const checkPermissions = async () => {
      try {
        // Check if user has access to the page itself (database query)
        const hasPage = await hasPageAccessDb(page as PageName);
        if (!hasPage) {
          router.push(redirectPath || "/unauthorized");
          return;
        }

        // If no tabs to check, user has page access
        if (allowedTabs.length === 0) {
          return;
        }

        // Check URL parameters for tab access
        const currentSection =
          searchParams?.get("section") ||
          searchParams?.get("mtab") ||
          searchParams?.get("tab");

        if (currentSection) {
          // Check if the current tab is in the allowed tabs
          const isTabAllowed = allowedTabs.includes(currentSection);

          if (!isTabAllowed) {
            // User doesn't have access to this tab, redirect to default or first allowed tab
            const fallbackTab = defaultTab || allowedTabs[0];
            if (fallbackTab) {
              const params = new URLSearchParams(
                searchParams?.toString() || ""
              );
              params.set("section", fallbackTab);
              router.replace(
                `${window.location.pathname}?${params.toString()}`
              );
            } else {
              router.push(redirectPath || "/unauthorized");
            }
            return;
          }

          // Check if user has permission for this specific tab (database query)
          // Map currentSection to proper TabName format
          let tabName: string;
          if (page === "administration") {
            if (currentSection === "users") tabName = "administration-users";
            else if (currentSection === "licensees")
              tabName = "administration-licensees";
            else if (currentSection === "activity-logs")
              tabName = "administration-activity-logs";
            else return; // Unknown tab, skip permission check
          } else if (page === "collection-report") {
            if (currentSection === "monthly")
              tabName = "collection-reports-monthly";
            else if (currentSection === "manager")
              tabName = "collection-reports-manager-schedules";
            else if (currentSection === "collector")
              tabName = "collection-reports-collector-schedules";
            else return; // Unknown tab, skip permission check
          } else {
            return; // No tab permissions for this page
          }

          const hasPermission = await hasTabAccessDb(
            page as PageName,
            tabName as
              | "administration-users"
              | "administration-licensees"
              | "administration-activity-logs"
              | "collection-reports-monthly"
              | "collection-reports-manager-schedules"
              | "collection-reports-collector-schedules"
          );

          if (!hasPermission) {
            // User doesn't have permission for this tab, redirect to default or first allowed tab
            const fallbackTab = defaultTab || allowedTabs[0];
            if (fallbackTab) {
              const params = new URLSearchParams(
                searchParams?.toString() || ""
              );
              params.set("section", fallbackTab);
              router.replace(
                `${window.location.pathname}?${params.toString()}`
              );
            } else {
              router.push(redirectPath || "/unauthorized");
            }
            return;
          }
        } else if (defaultTab) {
          // No section specified, redirect to default tab
          const params = new URLSearchParams(searchParams?.toString() || "");
          params.set("section", defaultTab);
          router.replace(`${window.location.pathname}?${params.toString()}`);
        }
      } catch (error) {
        console.error("Error checking permissions:", error);
        router.push(redirectPath || "/unauthorized");
      }
    };

    checkPermissions();
  }, [user, searchParams, router, page, allowedTabs, defaultTab, redirectPath]);

  return {
    hasAccess: hasPageAccess(userRoles, page as PageName),
    userRoles,
  };
}
