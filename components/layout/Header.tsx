"use client";
import { HeaderProps } from "@/lib/types/componentProps";
import { ExitIcon } from "@radix-ui/react-icons";
import { PanelLeft } from "lucide-react";
import { usePathname, useParams, useRouter } from "next/navigation";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { filterValueMap } from "@/lib/constants/uiConstants";
import { handleFilterChange } from "@/lib/utils/metrics";
import { ActiveFilters } from "@/shared/types";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { logoutUser } from "@/lib/helpers/auth";
import LicenceeSelect from "@/components/ui/LicenceeSelect";
import CurrencySelector from "@/components/ui/CurrencySelector";
import { useCurrencyStore } from "@/lib/store/currencyStore";

export default function Header({
  selectedLicencee,
  pageTitle,
  setSelectedLicencee,
  hideOptions,
  hideLicenceeFilter,
  containerPaddingMobile,
  disabled = false,
}: HeaderProps) {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isOpen } = useSidebar();
  const { displayCurrency } = useCurrencyStore();

  const {
    activeFilters,
    setActiveFilters,
    activeMetricsFilter,
    setActiveMetricsFilter,
    setShowDatePicker,
  } = useDashBoardStore();

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
    <div className={`flex flex-col gap-2 ${containerPaddingMobile || ""}`}>
      <header className="flex flex-col p-0 w-full lg:pt-6 lg:pl-4">
        {/* Menu Button and Main Title Row */}
        <div className="flex items-center justify-start">
          {/* Mobile sidebar trigger uses the same icon as sidebar, layered under opened sidebar */}
          <SidebarTrigger
            className={cn(
              "md:hidden cursor-pointer text-foreground p-2 relative z-20",
              isOpen && "invisible"
            )}
            aria-label="Toggle sidebar"
          >
            <PanelLeft className="h-6 w-6" />
          </SidebarTrigger>
          <h1 className="text-base xl:text-xl ml-0 pl-2 text-left sm:ml-0 md:ml-0">
            Evolution CMS
          </h1>
          <div className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
            {displayCurrency}
          </div>

          {!hideLicenceeFilter && (
            <div className="xl:ml-2 flex-grow xl:flex-grow-0 flex justify-end xl:justify-start gap-2">
              <LicenceeSelect
                selected={selectedLicencee || ""}
                onChange={setSelectedLicencee || (() => {})}
                disabled={disabled}
              />
              <CurrencySelector />
            </div>
          )}
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 z-40"
                onClick={() => setMobileMenuOpen(false)}
              />
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "tween", duration: 0.3 }}
                className="fixed left-0 top-0 h-full w-80 bg-container shadow-xl z-[100] flex flex-col"
              >
                <div className="flex flex-col h-full p-6 space-y-4">
                  {/* Dashboard button */}
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

                  {/* Locations button */}
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

                  {/* Cabinets button */}
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

                  {/* Collection Reports button */}
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

                  {/* Administration button */}
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
                    <span className="text-lg font-medium">Administration</span>
                  </motion.button>

                  {/* Reports button */}
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

                  {/* Members button */}
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

                  {/* Members Summary button removed */}

                  {/* Sessions button */}
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
                </div>

                {/* Logout button */}
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  onClick={() => {
                    logoutUser();
                    setMobileMenuOpen(false);
                  }}
                  className="mt-auto mb-10 mx-auto p-4 flex items-center space-x-2 text-grayHighlight hover:text-buttonActive"
                  aria-label="Logout"
                >
                  <ExitIcon className="w-6 h-6" />
                  <span className="font-medium">Logout</span>
                </motion.button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {pageTitle && (
          <div className="flex flex-col space-y-6 xl:flex-row items-center justify-between">
            <div className="flex flex-col space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                {pageTitle}
              </h1>
              {isSpecificLocationPath && (
                <p className="text-sm text-gray-600">
                  Location ID: {params.slug}
                </p>
              )}
            </div>
            {!hideOptions && (
              <div className="hidden md:flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    setActiveFilters({
                      Today: true,
                      Yesterday: false,
                      last7days: false,
                      last30days: false,
                      Custom: false,
                    });
                    setActiveMetricsFilter("Today");
                  }}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "text-xs",
                    activeFilters.Today && activeMetricsFilter === "Today"
                      ? "bg-buttonActive text-white border-buttonActive"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  )}
                >
                  All
                </Button>
                {Object.entries(filterValueMap).map(([key, value]) => (
                  <Button
                    key={key}
                    onClick={() =>
                      handleFilterChange(
                        key as keyof ActiveFilters,
                        setActiveFilters,
                        setShowDatePicker,
                        setActiveMetricsFilter
                      )
                    }
                    variant="outline"
                    size="sm"
                    className={cn(
                      "text-xs",
                      activeFilters[key as keyof ActiveFilters]
                        ? "bg-buttonActive text-white border-buttonActive"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    {value}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </header>
    </div>
  );
}
