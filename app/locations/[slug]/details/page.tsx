"use client";

import React, { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { EditCabinetModal } from "@/components/ui/cabinets/EditCabinetModal";
import { DeleteCabinetModal } from "@/components/ui/cabinets/DeleteCabinetModal";
import { Button } from "@/components/ui/button";
import { useRouter, useParams, usePathname } from "next/navigation";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import LocationInfoSkeleton from "@/components/location/LocationInfoSkeleton";
import AccountingDetails from "@/components/cabinetDetails/AccountingDetails";
import { fetchLocationDetails, fetchCabinets } from "@/lib/helpers/locations";
import MetricsSummary from "@/components/locationDetails/MetricsSummary";
import CabinetFilterBar from "@/components/locationDetails/CabinetFilterBar";
import CabinetGrid from "@/components/locationDetails/CabinetGrid";
import { TimePeriod } from "@/lib/types/api";
import RefreshButton from "@/components/ui/RefreshButton";
import type { LocationInfo, ExtendedCabinetDetail } from "@/lib/types/pages";
import { fetchAllGamingLocations } from "@/lib/helpers/locations";
import { fetchLocationDetailsById } from "@/lib/helpers/locations";

export default function LocationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const pathname = usePathname();

  const {
    selectedLicencee,
    activeMetricsFilter,
    setActiveMetricsFilter,
    setSelectedLicencee,
  } = useDashBoardStore();

  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [cabinets, setCabinets] = useState<ExtendedCabinetDetail[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCabinets, setFilteredCabinets] = useState<
    ExtendedCabinetDetail[]
  >([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState("all");
  const itemsPerPage = 12;

  // State for AccountingDetails
  const [activeMetricsTabContent, setActiveMetricsTabContent] =
    useState("Range Metrics");
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [selectedCabinet, setSelectedCabinet] =
    useState<ExtendedCabinetDetail | null>(null);

  // Add refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Effect to handle licensee changes - refetch locations and update selection
  useEffect(() => {
    const handleLicenceeChange = async () => {
      try {
        // Check if current location exists for the new licensee by fetching location details
        const locationData = await fetchLocationDetailsById(
          slug,
          selectedLicencee
        );

        // If location data is null or the name is the slug (fallback), it means the location doesn't exist for this licensee
        if (!locationData.data || locationData.name === slug) {
          // Try to get the first available location for this licensee
          const formattedLocations = await fetchAllGamingLocations(
            selectedLicencee
          );

          if (formattedLocations.length > 0) {
            // Current location doesn't belong to new licensee, redirect to first available
            const firstLocation = formattedLocations[0];
            router.replace(`/locations/${firstLocation.id}/details`);
          } else {
            // No locations for this licensee, clear cabinets
            setCabinets([]);
            setFilteredCabinets([]);
            setSelectedCabinet(null);
          }
        }
      } catch (error) {
        console.error("Error handling licencee change:", error);
      }
    };

    // Only run if we have a licensee selected
    if (selectedLicencee) {
      handleLicenceeChange();
    }
  }, [selectedLicencee, router, slug]);

  // Use helpers to fetch data
  useEffect(() => {
    setMetricsLoading(true);

    const initializePage = async () => {
      try {
        // Get location name from the formatted locations list
        const formattedLocations = await fetchAllGamingLocations(
          selectedLicencee
        );

        // Find the current location in the list
        const currentLocation = formattedLocations.find(
          (loc) => loc.id === slug
        );

        const locationName = currentLocation ? currentLocation.name : slug;

        // Fetch location details and cabinets in parallel
        const [location, cabinets] = await Promise.all([
          fetchLocationDetails(slug, selectedLicencee),
          fetchCabinets(slug, activeMetricsFilter, selectedLicencee),
        ]);

        if (location) setLocationInfo(location);
        setCabinets(cabinets);
        setFilteredCabinets(cabinets);
        setSelectedCabinet(cabinets[0] || null);
      } catch (error) {
        console.error("Error initializing page:", error);
        // Set empty arrays on error to prevent loading states
        setCabinets([]);
        setFilteredCabinets([]);
        setSelectedCabinet(null);
      } finally {
        setMetricsLoading(false);
      }
    };

    initializePage();
  }, [slug, activeMetricsFilter, selectedLicencee]);

  // Add refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    setMetricsLoading(true);
    try {
      // Fetch location details and cabinets in parallel
      const [location, cabinets] = await Promise.all([
        fetchLocationDetails(slug, selectedLicencee),
        fetchCabinets(slug, activeMetricsFilter, selectedLicencee),
      ]);

      if (location) setLocationInfo(location);
      setCabinets(cabinets);
      setFilteredCabinets(cabinets);
      setSelectedCabinet(cabinets[0] || null);
    } catch (error) {
      console.error("Error refreshing data:", error);
      // Set empty arrays on error to prevent loading states
      setCabinets([]);
      setFilteredCabinets([]);
      setSelectedCabinet(null);
    } finally {
      setMetricsLoading(false);
      setRefreshing(false);
    }
  };

  return (
    <>
      <Sidebar pathname={pathname} />
      <EditCabinetModal />
      <DeleteCabinetModal />

      <div className="xl:w-full xl:mx-auto md:pl-36 min-h-screen bg-background flex overflow-hidden">
        <main className="flex flex-col flex-1 p-4 md:p-6 w-full max-w-full overflow-x-hidden">
          <Header
            selectedLicencee={selectedLicencee}
            setSelectedLicencee={setSelectedLicencee}
            pageTitle=""
            hideOptions={true}
            hideLicenceeFilter={false}
            disabled={metricsLoading || refreshing}
          />

          <div className="flex items-center mb-6">
            <Link href="/locations" className="mr-4">
              <Button
                variant="ghost"
                className="p-2 rounded-full border border-gray-200 hover:bg-gray-100"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Location Details</h1>
            <div className="ml-auto">
              <RefreshButton
                onClick={handleRefresh}
                isSyncing={refreshing}
                disabled={metricsLoading || refreshing}
                label="Refresh"
              />
            </div>
          </div>

          {/* Time Period Filter Buttons */}
          <div className="mb-6 overflow-x-auto hide-scrollbar">
            <div className="flex space-x-3">
              {[
                { label: "Today", value: "Today" as TimePeriod },
                { label: "Yesterday", value: "Yesterday" as TimePeriod },
                { label: "Last 7 days", value: "7d" as TimePeriod },
                { label: "30 days", value: "30d" as TimePeriod },
                { label: "All Time", value: "All Time" as TimePeriod },
                { label: "Custom", value: "Custom" as TimePeriod },
              ].map((filter) => (
                <Button
                  key={filter.label}
                  className={`px-4 py-2 rounded-full whitespace-nowrap ${
                    activeMetricsFilter === filter.value
                      ? "bg-buttonActive text-white"
                      : "bg-button text-white hover:bg-buttonActive"
                  } ${
                    metricsLoading || refreshing
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                  disabled={metricsLoading || refreshing}
                  onClick={() =>
                    !(metricsLoading || refreshing) &&
                    setActiveMetricsFilter(filter.value)
                  }
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>

          {locationInfo ? (
            <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <h2 className="text-lg font-semibold mb-4">
                    Location Information
                  </h2>
                  <div className="space-y-2">
                    <p>
                      <span className="font-medium">Name:</span>{" "}
                      {locationInfo.name}
                    </p>
                    <p>
                      <span className="font-medium">Address:</span>{" "}
                      {locationInfo.address || "-"}
                    </p>
                    <p>
                      <span className="font-medium">Licensee:</span>{" "}
                      {locationInfo.licencee || "-"}
                    </p>
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-semibold mb-4">Metrics</h2>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-500">Total Cabinets</p>
                      <p className="text-lg font-semibold">
                        {cabinets?.length || 0}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-500">Money In</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(locationInfo.moneyIn || 0)}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-500">Money Out</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(locationInfo.moneyOut || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-semibold mb-4">Performance</h2>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-500">Gross</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(locationInfo.gross || 0)}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-500">Net</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(locationInfo.net || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-semibold mb-4">Cabinet Status</h2>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-500">Online Cabinets</p>
                      <p className="text-lg font-semibold">
                        {cabinets?.filter((cabinet) => cabinet.isOnline)
                          .length || 0}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-500">Offline Cabinets</p>
                      <p className="text-lg font-semibold">
                        {cabinets?.filter((cabinet) => !cabinet.isOnline)
                          .length || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {!locationInfo && <LocationInfoSkeleton />}

          {!locationInfo && (
            <MetricsSummary location={locationInfo} cabinets={cabinets} />
          )}
          <CabinetFilterBar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            cabinets={cabinets}
            setFilteredCabinets={setFilteredCabinets}
            setCurrentPage={setCurrentPage}
          />
          <CabinetGrid
            filteredCabinets={filteredCabinets}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            router={router}
          />

          {selectedCabinet && (
            <AccountingDetails
              cabinet={selectedCabinet}
              loading={metricsLoading}
              activeMetricsTabContent={activeMetricsTabContent}
              setActiveMetricsTabContent={setActiveMetricsTabContent}
              activeMetricsFilter="All Time"
            />
          )}
        </main>
      </div>
    </>
  );
}
