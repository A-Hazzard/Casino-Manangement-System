import React from 'react';
import { Button } from '@/components/ui/button';
import type { ExtendedCabinetDetail } from '@/lib/types/pages';

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
    <div className="mt-2 flex w-full flex-col items-start space-x-0 space-y-3 md:mt-0 md:w-auto md:flex-row md:items-center md:space-x-3 md:space-y-0">
      <div className="flex w-full items-center md:w-auto">
        <input
          type="text"
          placeholder="Search cabinets..."
          className="flex-grow rounded-full border border-gray-300 px-4 py-2 md:w-60 md:flex-grow-0"
          value={searchTerm}
          onChange={e => {
            setSearchTerm(e.target.value);
            const filtered = cabinets.filter(cabinet =>
              cabinet.serialNumber
                .toLowerCase()
                .includes(e.target.value.toLowerCase())
            );
            setFilteredCabinets(filtered);
            setCurrentPage(0);
          }}
        />
        <div className="ml-3 flex space-x-2">
          <Button
            className={`rounded-full px-3 py-1 text-sm ${
              activeFilter === 'all'
                ? 'bg-buttonActive text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
            onClick={() => {
              setActiveFilter('all');
              setFilteredCabinets(cabinets);
              setCurrentPage(0);
            }}
          >
            All
          </Button>
          <Button
            className={`rounded-full px-3 py-1 text-sm ${
              activeFilter === 'online'
                ? 'bg-buttonActive text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
            onClick={() => {
              setActiveFilter('online');
              const filtered = cabinets.filter(cabinet => cabinet.isOnline);
              setFilteredCabinets(filtered);
              setCurrentPage(0);
            }}
          >
            Online
          </Button>
          <Button
            className={`rounded-full px-3 py-1 text-sm ${
              activeFilter === 'offline'
                ? 'bg-buttonActive text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
            onClick={() => {
              setActiveFilter('offline');
              const filtered = cabinets.filter(cabinet => !cabinet.isOnline);
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
