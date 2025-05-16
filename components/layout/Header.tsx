"use client";
import { HeaderProps } from "@/lib/types/componentProps";
import {
  HamburgerMenuIcon,
  Cross2Icon,
  ExitIcon,
  DrawingPinFilledIcon,
} from "@radix-ui/react-icons";
import { usePathname, useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { filterValueMap } from "@/lib/constants/uiConstants";
import { handleFilterChange } from "@/lib/utils/metrics";
import { ActiveFilters } from "@/lib/types";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { logoutUser } from "@/lib/helpers/auth";
import LicenceeSelect from "@/components/ui/LicenceeSelect";

export default function Header({
  selectedLicencee,
  pageTitle,
  setSelectedLicencee,
  hideOptions,
  hideLicenceeFilter,
  containerPaddingMobile,
}: HeaderProps) {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const {
    activeFilters,
    setActiveFilters,
    activeMetricsFilter,
    setActiveMetricsFilter,
    loadingChartData,
    setLoadingChartData,
    setChartData,
    setShowDatePicker,
  } = useDashBoardStore();

  // Check if the current path is related to locations
  const isLocationPath =
    pathname === "/locations" || pathname.startsWith("/locations/");

  // Check if the current path is related to cabinets
  const isCabinetPath =
    pathname === "/cabinets" || pathname.startsWith("/cabinets/");

  // Check if the current path is the specific location details page
  const isSpecificLocationPath =
    pathname.startsWith("/locations/") &&
    params.slug &&
    !pathname.includes("/details");

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className={`flex flex-col gap-2 ${containerPaddingMobile || ""}`}>
      <header className="flex flex-col p-0 w-full lg:pt-6 lg:pl-4">
        {/* Menu Button and Main Title Row */}
        <div className="flex items-center justify-start">
          <button
            onClick={toggleMobileMenu}
            className="lg:hidden cursor-pointer text-grayHighlight p-0"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? (
              <Cross2Icon className="h-5 w-5" />
            ) : (
              <HamburgerMenuIcon className="h-5 w-5" />
            )}
          </button>

          <h1 className="text-base lg:text-xl ml-0 pl-2 text-left sm:ml-0 md:ml-0">
            Evolution CMS
          </h1>

          {!hideOptions && !hideLicenceeFilter && (
            <div className="lg:ml-2 flex-grow lg:flex-grow-0 flex justify-end lg:justify-start">
              <LicenceeSelect
                selected={selectedLicencee || ""}
                onChange={setSelectedLicencee || (() => {})}
              />
            </div>
          )}
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-30 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-0 max-w-[300px] bg-container z-40 lg:hidden shadow-lg"
            >
              <button
                className="absolute top-4 right-4 p-2 bg-muted rounded-full"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Cross2Icon className="w-4 h-4" />
              </button>
              <div className="flex flex-col h-full pt-20 px-6">
                <div className="flex flex-col items-center space-y-8 pt-10">
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

                  {/* Location button */}
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
                </div>

                {/* Logout button */}
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
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
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {pageTitle && (
        <div className="flex flex-col space-y-6 lg:flex-row items-center justify-between">
          <div className="flex flex-col lg:flex-row items-center gap-2 mx-auto lg:mx-0 w-fit">
            {isSpecificLocationPath && (
              <>
                {/* Icon above title on mobile */}
                <DrawingPinFilledIcon className="w-6 h-6 text-grayHighlight lg:hidden" />
                {/* Icon beside title on large screens */}
                <DrawingPinFilledIcon className="w-7 h-7 text-grayHighlight hidden lg:block" />
              </>
            )}
            <h1 className="text-3xl lg:text-4xl font-semibold text-center lg:text-left">
              {pageTitle}
            </h1>
            {(pathname === "/locations" || pathname === "/cabinets") && (
              <div className="hidden lg:flex space-between gap-3 ml-4">
                {Object.entries(activeFilters).map(([filter, value]) => (
                  <Button
                    key={filter}
                    disabled={loadingChartData}
                    className={cn(
                      "px-4 py-2 text-container rounded-full",
                      loadingChartData && "opacity-50 cursor-not-allowed",
                      filterValueMap[filter as keyof typeof filterValueMap] ===
                        activeMetricsFilter || value
                        ? "bg-buttonActive"
                        : "bg-button"
                    )}
                    onClick={async () => {
                      // Show skeleton in child components
                      setLoadingChartData(true);
                      setChartData([]);

                      // Only update filter states (no fetching) – fetching is handled by page.tsx
                      await handleFilterChange(
                        filter as keyof ActiveFilters,
                        setActiveFilters,
                        setShowDatePicker,
                        setActiveMetricsFilter
                      );
                    }}
                  >
                    {filter === "last7days"
                      ? "Last 7 Days"
                      : filter === "last30days"
                      ? "Last 30 Days"
                      : filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
