"use client";
import { HeaderProps } from "@/lib/types/componentProps";
import { ExitIcon } from "@radix-ui/react-icons";
import { PanelLeft } from "lucide-react";
import { usePathname, useParams, useRouter } from "next/navigation";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { logoutUser } from "@/lib/helpers/clientAuth";
import LicenceeSelect from "@/components/ui/LicenceeSelect";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { fetchMetricsData } from "@/lib/helpers/dashboard";
import { ClientOnly } from "@/components/ui/ClientOnly";
import { useUserStore } from "@/lib/store/userStore";
import { shouldShowNavigationLink } from "@/lib/utils/permissions";
import { useCurrency } from "@/lib/contexts/CurrencyContext";
import CurrencyFilter from "@/components/filters/CurrencyFilter";

export default function Header({
  selectedLicencee,
  pageTitle,
  setSelectedLicencee,
  hideOptions: _hideOptions,
  hideLicenceeFilter,
  containerPaddingMobile,
  disabled = false,
}: HeaderProps) {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isOpen } = useSidebar();
  const { user, clearUser } = useUserStore();
  const {
    activeMetricsFilter,
    customDateRange,
    setTotals,
    setChartData,
    setActiveFilters,
    setShowDatePicker,
    setLoadingChartData,
  } = useDashBoardStore();
  const {
    isAllLicensee: _isAllLicensee,
    displayCurrency,
    setDisplayCurrency,
  } = useCurrency();

  // Get user roles for permission checking
  const userRoles = user?.roles || [];

  // Wrapper function to handle licensee changes
  const handleLicenseeChange = async (newLicensee: string) => {
    if (setSelectedLicencee) {
      setSelectedLicencee(newLicensee);
    }

    // Update currency context based on licensee selection
    const isAllLicensee =
      !newLicensee || newLicensee === "all" || newLicensee === "";
    if (isAllLicensee) {
      // Reset to USD when "All Licensee" is selected
      setDisplayCurrency("USD");
    }

    // If we're on the dashboard and have an active filter, refresh data
    if (pathname === "/" && activeMetricsFilter) {
      setLoadingChartData(true);
      try {
        await fetchMetricsData(
          activeMetricsFilter,
          customDateRange,
          newLicensee,
          setTotals,
          setChartData,
          setActiveFilters,
          setShowDatePicker,
          displayCurrency
        );
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Error refreshing data after licensee change:", error);
        }
      } finally {
        setLoadingChartData(false);
      }
    }
  };

  // Check if the current path is related to locations
  const isLocationPath =
    pathname === "/locations" || pathname.startsWith("/locations/");

  // Check if the current path is related to cabinets
  const isCabinetPath =
    pathname === "/cabinets" || pathname.startsWith("/cabinets/");

  // Check if the current path is related to reports
  const isReportsPath =
    pathname === "/reports" || pathname.startsWith("/reports/");

  // Check if the current path is related to members
  const isMembersPath =
    pathname === "/members" || pathname.startsWith("/members/");

  // Check if the current path is related to sessions
  const isSessionsPath =
    pathname === "/sessions" || pathname.startsWith("/sessions/");

  // Check if the current path is the specific location details page
  const isSpecificLocationPath =
    pathname.startsWith("/locations/") &&
    params.slug &&
    !pathname.includes("/details");

  return (
    <ClientOnly fallback={<div className="h-16 bg-gray-100 animate-pulse" />}>
      <div className={`flex flex-col gap-2 ${containerPaddingMobile || ""}`}>
        {/* Header Section: Main header with title and licensee selector */}
        <header className="flex flex-col p-0 w-full">
          {/* Menu Button and Main Title Row: Mobile sidebar trigger and title */}
          <div className="flex items-center justify-between w-full">
            {/* Left side: Menu button and title */}
            <div className="flex items-center">
              {/* Mobile sidebar trigger uses the same icon as sidebar, layered under opened sidebar */}
              <SidebarTrigger
                className={cn(
                  "md:hidden cursor-pointer text-foreground p-2 relative z-20",
                  isOpen && "invisible"
                )}
                aria-label="Toggle sidebar"
              >
                <PanelLeft className="h-6 w-6" suppressHydrationWarning />
              </SidebarTrigger>
              <h1 className="text-base xl:text-xl ml-0 pl-2 text-left sm:ml-0 md:ml-0">
                Evolution CMS
              </h1>
            </div>

            {/* Right side: Filters */}
            {!hideLicenceeFilter && (
              <div className="flex items-center gap-2">
                <LicenceeSelect
                  selected={selectedLicencee || ""}
                  onChange={handleLicenseeChange}
                  disabled={disabled}
                />
                {/* Currency selector - only show when "All Licensee" is selected */}
                <CurrencyFilter
                  className="hidden md:flex"
                  disabled={disabled}
                  onCurrencyChange={() => {
                    // Trigger data refresh when currency changes
                    if (pathname === "/" && activeMetricsFilter) {
                      setLoadingChartData(true);
                      fetchMetricsData(
                        activeMetricsFilter,
                        customDateRange,
                        selectedLicencee,
                        setTotals,
                        setChartData,
                        setActiveFilters,
                        setShowDatePicker,
                        displayCurrency
                      ).finally(() => setLoadingChartData(false));
                    }
                  }}
                />
                {/* Mobile Currency selector - show on small screens */}
                <CurrencyFilter
                  className="flex md:hidden"
                  disabled={disabled}
                  onCurrencyChange={() => {
                    // Trigger data refresh when currency changes
                    if (pathname === "/" && activeMetricsFilter) {
                      setLoadingChartData(true);
                      fetchMetricsData(
                        activeMetricsFilter,
                        customDateRange,
                        selectedLicencee,
                        setTotals,
                        setChartData,
                        setActiveFilters,
                        setShowDatePicker,
                        displayCurrency
                      ).finally(() => setLoadingChartData(false));
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* Mobile Menu Overlay Section: Full-screen mobile navigation menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <>
                {/* Mobile Menu Backdrop: Overlay background for mobile menu */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black bg-opacity-50 z-40"
                  onClick={() => setMobileMenuOpen(false)}
                />
                {/* Mobile Menu Panel: Slide-out navigation menu */}
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "tween", duration: 0.3 }}
                  className="fixed left-0 top-0 h-full w-80 bg-container shadow-xl z-[100] flex flex-col"
                >
                  {/* Mobile Navigation Menu: Navigation buttons for mobile users */}
                  <div className="flex flex-col h-full p-6 space-y-4">
                    {/* Dashboard Navigation Button */}
                    {shouldShowNavigationLink(userRoles, "dashboard") && (
                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className={`flex items-center justify-center w-full p-4 rounded-lg ${
                          pathname === "/"
                            ? "bg-buttonActive text-container shadow-md"
                            : "bg-muted text-foreground hover:bg-accent"
                        }`}
                        onClick={() => {
                          router.push("/");
                          setMobileMenuOpen(false);
                        }}
                      >
                        <span className="text-lg font-medium">Dashboard</span>
                      </motion.button>
                    )}

                    {/* Locations button */}
                    {shouldShowNavigationLink(userRoles, "locations") && (
                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className={`flex items-center justify-center w-full p-4 rounded-lg ${
                          isLocationPath
                            ? "bg-buttonActive text-container shadow-md"
                            : "bg-muted text-foreground hover:bg-accent"
                        }`}
                        onClick={() => {
                          router.push("/locations");
                          setMobileMenuOpen(false);
                        }}
                      >
                        <span className="text-lg font-medium">Locations</span>
                      </motion.button>
                    )}

                    {/* Cabinets button */}
                    {shouldShowNavigationLink(userRoles, "machines") && (
                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className={`flex items-center justify-center w-full p-4 rounded-lg ${
                          isCabinetPath
                            ? "bg-buttonActive text-container shadow-md"
                            : "bg-muted text-foreground hover:bg-accent"
                        }`}
                        onClick={() => {
                          router.push("/cabinets");
                          setMobileMenuOpen(false);
                        }}
                      >
                        <span className="text-lg font-medium">Cabinets</span>
                      </motion.button>
                    )}

                    {/* Collection Reports button */}
                    {shouldShowNavigationLink(
                      userRoles,
                      "collection-report"
                    ) && (
                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className={`flex items-center justify-center w-full p-4 rounded-lg ${
                          pathname === "/collection-report"
                            ? "bg-buttonActive text-container shadow-md"
                            : "bg-muted text-foreground hover:bg-accent"
                        }`}
                        onClick={() => {
                          router.push("/collection-report");
                          setMobileMenuOpen(false);
                        }}
                      >
                        <span className="text-lg font-medium">
                          Collection Reports
                        </span>
                      </motion.button>
                    )}

                    {/* Administration button */}
                    {shouldShowNavigationLink(userRoles, "administration") && (
                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className={`flex items-center justify-center w-full p-4 rounded-lg ${
                          pathname === "/administration"
                            ? "bg-buttonActive text-container shadow-md"
                            : "bg-muted text-foreground hover:bg-accent"
                        }`}
                        onClick={() => {
                          router.push("/administration");
                          setMobileMenuOpen(false);
                        }}
                      >
                        <span className="text-lg font-medium">
                          Administration
                        </span>
                      </motion.button>
                    )}

                    {/* Reports button */}
                    {shouldShowNavigationLink(userRoles, "dashboard") && (
                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className={`flex items-center justify-center w-full p-4 rounded-lg ${
                          isReportsPath
                            ? "bg-buttonActive text-container shadow-md"
                            : "bg-muted text-foreground hover:bg-accent"
                        }`}
                        onClick={() => {
                          router.push("/reports");
                          setMobileMenuOpen(false);
                        }}
                      >
                        <span className="text-lg font-medium">Reports</span>
                      </motion.button>
                    )}

                    {/* Members button */}
                    {shouldShowNavigationLink(userRoles, "members") && (
                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className={`flex items-center justify-center w-full p-4 rounded-lg ${
                          isMembersPath
                            ? "bg-buttonActive text-container shadow-md"
                            : "bg-muted text-foreground hover:bg-accent"
                        }`}
                        onClick={() => {
                          router.push("/members");
                          setMobileMenuOpen(false);
                        }}
                      >
                        <span className="text-lg font-medium">Members</span>
                      </motion.button>
                    )}

                    {/* Members Summary button removed */}

                    {/* Sessions button */}
                    {shouldShowNavigationLink(userRoles, "sessions") && (
                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        className={`flex items-center justify-center w-full p-4 rounded-lg ${
                          isSessionsPath
                            ? "bg-buttonActive text-container shadow-md"
                            : "bg-muted text-foreground hover:bg-accent"
                        }`}
                        onClick={() => {
                          router.push("/sessions");
                          setMobileMenuOpen(false);
                        }}
                      >
                        <span className="text-lg font-medium">Sessions</span>
                      </motion.button>
                    )}

                    {/* Mobile Currency Selector - only show when "All Licensee" is selected */}
                    <div className="mt-6 p-4 border-t border-gray-200">
                      <CurrencyFilter
                        className="w-full"
                        disabled={disabled}
                        onCurrencyChange={() => {
                          // Trigger data refresh when currency changes
                          if (pathname === "/" && activeMetricsFilter) {
                            setLoadingChartData(true);
                            fetchMetricsData(
                              activeMetricsFilter,
                              customDateRange,
                              selectedLicencee,
                              setTotals,
                              setChartData,
                              setActiveFilters,
                              setShowDatePicker,
                              displayCurrency
                            ).finally(() => setLoadingChartData(false));
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Logout Button Section: User logout functionality */}
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    onClick={async () => {
                      await logoutUser();
                      clearUser();
                      setMobileMenuOpen(false);
                      router.push("/login");
                    }}
                    className="mt-auto mb-10 mx-auto p-4 flex items-center space-x-2 text-grayHighlight hover:text-buttonActive"
                    aria-label="Logout"
                  >
                    <ExitIcon className="w-6 h-6" suppressHydrationWarning />
                    <span className="font-medium">Logout</span>
                  </motion.button>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Page Title Section: Dynamic page title and location information */}
          {pageTitle && (
            <div className="flex flex-col space-y-6 xl:flex-row">
              <div className="flex flex-col space-y-2">
                <h1 className="mb-2 text-2xl sm:text-3xl font-bold text-gray-800">
                  {pageTitle}
                </h1>
                {isSpecificLocationPath && (
                  <p className="text-sm text-gray-600">
                    Location ID: {params.slug}
                  </p>
                )}
              </div>
            </div>
          )}
        </header>
      </div>
    </ClientOnly>
  );
}
