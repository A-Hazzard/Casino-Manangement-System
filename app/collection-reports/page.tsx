"use client";

import React, { useState } from "react";
import Image from "next/image";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import CollectionReportCards from "@/components/collectionReport/CollectionReportCards";
import CollectionReportTable from "@/components/collectionReport/CollectionReportTable";
import { Button } from "@/components/ui/button";
import type { CollectionReportRow } from "@/lib/types/componentProps";

// Tab options for the report section
const TABS = [
  { label: "Collection Reports", value: "collection" },
  { label: "Monthly Report", value: "monthly" },
  { label: "Manager Schedule", value: "manager" },
  { label: "Collectors Schedule", value: "collectors" },
];

// Mock data for demonstration (replace with real data fetching logic)
const MOCK_DATA: CollectionReportRow[] = [
  {
    collector: "collector1@evo",
    location: "Dev Lab2, Trinidad and Tobago",
    gross: 31781,
    machines: "2/2",
    collected: 2223,
    uncollected: "-",
    locationRevenue: 15890,
    time: "Apr 30, 11:38:07",
  },
  {
    collector: "collector2@evo",
    location: "Purple Heart Hotel, Guyana",
    gross: 11642,
    machines: "6/6",
    collected: 1111,
    uncollected: "-",
    locationRevenue: 5821,
    time: "Apr 29, 16:14:01",
  },
];

/**
 * Renders the tab switcher for desktop (green tabs) and mobile (purple dropdown).
 * @param activeTab The currently selected tab value.
 * @param setActiveTab Function to update the active tab.
 * @param showDropdown Boolean for dropdown open state (mobile).
 * @param setShowDropdown Function to toggle dropdown (mobile).
 */
function ReportTabs({
  activeTab,
  setActiveTab,
  showDropdown,
  setShowDropdown,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  showDropdown: boolean;
  setShowDropdown: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <>
      <div className="lg:hidden w-full flex justify-center mt-2 mb-2">
        <div className="relative w-64">
          <button
            className="w-full bg-button text-white rounded-md px-4 py-2 flex items-center justify-between"
            onClick={() => setShowDropdown((v: boolean) => !v)}
          >
            <span>{TABS.find((t) => t.value === activeTab)?.label}</span>
            <svg
              className="ml-2 w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {showDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200">
              {TABS.map((tab) => (
                <button
                  key={tab.value}
                  className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                    activeTab === tab.value ? "bg-gray-100 font-semibold" : ""
                  }`}
                  onClick={() => {
                    setActiveTab(tab.value);
                    setShowDropdown(false);
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Desktop green tabs */}
      <div className="hidden lg:flex gap-2 mt-2 mb-2">
        {TABS.map((tab) => (
          <Button
            key={tab.value}
            className={`rounded-md px-6 py-2 font-semibold ${
              activeTab === tab.value
                ? "bg-button text-white"
                : "bg-lighterGreenHighlight text-black"
            }`}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>
    </>
  );
}

export default function CollectionReportsPage() {
  // State for active tab and dropdown
  const [activeTab, setActiveTab] = useState<string>(TABS[0].value);
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState("");
  const [showUncollectedOnly, setShowUncollectedOnly] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("Select Location");

  /**
   * Handles search input changes.
   * @param e React.ChangeEvent<HTMLInputElement>
   */
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  /**
   * Handles toggling the 'Show Uncollected Only' filter.
   */
  const handleUncollectedToggle = () => {
    setShowUncollectedOnly((prev) => !prev);
  };

  // Filtered data (mock logic)
  const filteredData = MOCK_DATA.filter((row) => {
    const matchesSearch =
      row.collector.toLowerCase().includes(search.toLowerCase()) ||
      row.location.toLowerCase().includes(search.toLowerCase());
    const matchesUncollected = !showUncollectedOnly || row.uncollected !== "-";
    return matchesSearch && matchesUncollected;
  });

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col w-full max-w-full">
        <Header
          selectedLicencee={"All Licensees"}
          setSelectedLicencee={() => {}}
          pageTitle=""
          hideOptions={true}
          hideLicenceeFilter={false}
        />
        <main className="flex flex-col flex-1 p-4 md:p-6 w-full max-w-full overflow-x-hidden">
          {/* Collections header with icon and plus button */}
          <div className="flex items-center gap-2 mt-2 mb-2">
            <Image
              src="/details.svg"
              alt="Collections"
              width={32}
              height={32}
            />
            <h1 className="text-2xl font-bold">Collections</h1>
            <Button
              className="ml-2 bg-green-600 hover:bg-green-700 text-white rounded-full px-2 py-2 text-lg flex items-center justify-center"
              aria-label="Add New Collection"
            >
              <span className="text-2xl leading-none">+</span>
            </Button>
          </div>
          {/* Tab switcher */}
          <ReportTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            showDropdown={showDropdown}
            setShowDropdown={setShowDropdown}
          />
          {/* Filters and search */}
          <div className="bg-buttonActive rounded-lg p-4 flex flex-col gap-4 mb-4 w-full">
            <div className="flex flex-col md:flex-row md:items-center gap-4 w-full">
              <input
                type="text"
                placeholder="Search Collector or Location..."
                className="flex-1 px-4 py-2 rounded-md border-none outline-none text-sm"
                value={search}
                onChange={handleSearchChange}
              />
              <select
                className="px-4 py-2 rounded-md text-sm w-full md:w-auto"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
              >
                <option>Select Location</option>
                <option>Dev Lab2, Trinidad and Tobago</option>
                <option>Purple Heart Hotel, Guyana</option>
              </select>
            </div>
            <div className="flex items-center mt-2">
              <label className="flex items-center gap-2 text-white font-medium">
                <input
                  type="checkbox"
                  className="accent-buttonActive"
                  checked={showUncollectedOnly}
                  onChange={handleUncollectedToggle}
                />{" "}
                Show Uncollected Only
              </label>
            </div>
          </div>
          {/* Date range buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button className="bg-buttonActive text-white px-3 py-1 rounded-full text-xs">
              Today
            </Button>
            <Button className="bg-button text-white px-3 py-1 rounded-full text-xs">
              Yesterday
            </Button>
            <Button className="bg-button text-white px-3 py-1 rounded-full text-xs">
              Last 7 days
            </Button>
            <Button className="bg-button text-white px-3 py-1 rounded-full text-xs">
              30 days
            </Button>
            <Button className="bg-button text-white px-3 py-1 rounded-full text-xs">
              Custom
            </Button>
          </div>
          {/* Cards (mobile) and Table (desktop) */}
          <CollectionReportCards data={filteredData} />
          <CollectionReportTable data={filteredData} />
        </main>
      </div>
    </div>
  );
}
