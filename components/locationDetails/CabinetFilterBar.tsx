import React from "react";
import { Button } from "@/components/ui/button";
import type { ExtendedCabinetDetail } from "@/lib/types/pages";

type ExtendedCabinetFilterBarProps = {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  cabinets: ExtendedCabinetDetail[];
  setFilteredCabinets: React.Dispatch<
    React.SetStateAction<ExtendedCabinetDetail[]>
  >;
  setCurrentPage: (page: number) => void;
};

export default function CabinetFilterBar({
  searchTerm,
  setSearchTerm,
  activeFilter,
  setActiveFilter,
  cabinets,
  setFilteredCabinets,
  setCurrentPage,
}: ExtendedCabinetFilterBarProps) {
  return (
    <div className="w-full md:w-auto flex flex-col md:flex-row items-start md:items-center space-y-3 md:space-y-0 space-x-0 md:space-x-3 mt-2 md:mt-0">
      <div className="flex items-center w-full md:w-auto">
        <input
          type="text"
          placeholder="Search cabinets..."
          className="border border-gray-300 rounded-full py-2 px-4 flex-grow md:flex-grow-0 md:w-60"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            const filtered = cabinets.filter((cabinet) =>
              cabinet.serialNumber
                .toLowerCase()
                .includes(e.target.value.toLowerCase())
            );
            setFilteredCabinets(filtered);
            setCurrentPage(0);
          }}
        />
        <div className="flex ml-3 space-x-2">
          <Button
            className={`px-3 py-1 rounded-full text-sm ${
              activeFilter === "all"
                ? "bg-buttonActive text-white"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
            onClick={() => {
              setActiveFilter("all");
              setFilteredCabinets(cabinets);
              setCurrentPage(0);
            }}
          >
            All
          </Button>
          <Button
            className={`px-3 py-1 rounded-full text-sm ${
              activeFilter === "online"
                ? "bg-buttonActive text-white"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
            onClick={() => {
              setActiveFilter("online");
              const filtered = cabinets.filter((cabinet) => cabinet.isOnline);
              setFilteredCabinets(filtered);
              setCurrentPage(0);
            }}
          >
            Online
          </Button>
          <Button
            className={`px-3 py-1 rounded-full text-sm ${
              activeFilter === "offline"
                ? "bg-buttonActive text-white"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
            onClick={() => {
              setActiveFilter("offline");
              const filtered = cabinets.filter((cabinet) => !cabinet.isOnline);
              setFilteredCabinets(filtered);
              setCurrentPage(0);
            }}
          >
            Offline
          </Button>
        </div>
      </div>
    </div>
  );
}
