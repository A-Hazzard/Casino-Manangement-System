import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useReportsStore } from "@/lib/store/reportsStore";
import { useAuth } from "@/lib/hooks/useAuth";
import type { ReportView, ReportTab } from "@/lib/types/reports";

/**
 * Custom hook for managing reports navigation logic
 * Handles URL state management, permission checking, and tab switching
 */
export function useReportsNavigation(reportsTabsConfig: ReportTab[]) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canAccessReport } = useAuth();
  
  const {
    activeView,
    setActiveView,
    isLoading,
    setLoading,
  } = useReportsStore();

  // Filter tabs based on user permissions
  const availableTabs = reportsTabsConfig.filter((tab) =>
    canAccessReport(tab.requiredRoles, tab.requiredPermissions)
  );

  /**
   * Handle URL state management for tab selection
   */
  useEffect(() => {
    const section = searchParams?.get("section");
    if (section === "machines") {
      setActiveView("machines");
    } else if (section === "locations") {
      setActiveView("locations");
    } else if (section === "meters") {
      setActiveView("meters");
    } else if (section === "dashboard") {
      setActiveView("dashboard");
    } else {
      // Default to locations if no section specified
      setActiveView("locations");
    }
  }, [searchParams, setActiveView]);

  /**
   * Ensure user has access to current view, fallback to first available tab
   */
  useEffect(() => {
    if (availableTabs.length > 0) {
      const currentTabExists = availableTabs.some(
        (tab) => tab.id === activeView
      );
      if (!currentTabExists) {
        setActiveView(availableTabs[0].id);
      }
    }
  }, [availableTabs, activeView, setActiveView]);

  /**
   * Handle tab change with loading state and permission check
   */
  const handleTabChange = async (tabId: ReportView) => {
    if (tabId === activeView) return;

    // Check if user has access to this tab
    const targetTab = availableTabs.find((tab) => tab.id === tabId);
    if (!targetTab) {
      toast.error("You don't have permission to access this report");
      return;
    }

    setLoading(true);
    setActiveView(tabId);

    // Update URL based on tab selection
    const sectionMap: Record<ReportView, string> = {
      machines: "/reports?section=machines",
      locations: "/reports?section=locations", 
      meters: "/reports?section=meters",
      dashboard: "/reports?section=dashboard",
    };

    router.push(sectionMap[tabId]);

    // Simulate loading delay for better UX
    setTimeout(() => {
      setLoading(false);
      toast.success(`Switched to ${targetTab.label} view`);
    }, 300);
  };

  return {
    activeView,
    availableTabs,
    isLoading,
    handleTabChange,
  };
}
