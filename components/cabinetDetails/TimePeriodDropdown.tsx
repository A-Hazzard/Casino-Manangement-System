import React from "react";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import type { TimePeriod } from "@/lib/types/api";

type TimePeriodDropdownProps = {
  selectedPeriod: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
  disabled?: boolean;
};

const TimePeriodDropdown: React.FC<TimePeriodDropdownProps> = ({
  selectedPeriod,
  onPeriodChange,
  disabled,
}) => {
  const timeFilters = [
    { label: "Today", value: "Today" as TimePeriod },
    { label: "Yesterday", value: "Yesterday" as TimePeriod },
    { label: "Last 7 days", value: "7d" as TimePeriod },
    { label: "30 days", value: "30d" as TimePeriod },
    { label: "Custom", value: "Custom" as TimePeriod },
  ];

  return (
    <div className="md:hidden flex justify-center mb-4">
      <div className="relative inline-block w-full max-w-[200px]">
        <button
          className="w-full flex items-center justify-between gap-2 px-4 py-2 bg-purple-700 text-white rounded-full shadow-sm"
          onClick={() => {
            const dropdown = document.getElementById("mobile-filter-dropdown");
            if (dropdown) {
              dropdown.classList.toggle("hidden");
            }
          }}
        >
          <span>Sort by: {selectedPeriod}</span>
          <ChevronDownIcon className="h-4 w-4" />
        </button>
        <div
          id="mobile-filter-dropdown"
          className="hidden absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg py-1"
        >
          {timeFilters.map((filter) => (
            <button
              key={filter.label}
              className={`block w-full text-left px-4 py-2 text-sm ${
                selectedPeriod === filter.value
                  ? "bg-purple-50 text-purple-700 font-medium"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              onClick={() => {
                // Don't update if already selected or loading
                if (selectedPeriod === filter.value || disabled) {
                  document
                    .getElementById("mobile-filter-dropdown")
                    ?.classList.add("hidden");
                  return;
                }

                onPeriodChange(filter.value);

                // Ensure the dropdown is hidden
                document
                  .getElementById("mobile-filter-dropdown")
                  ?.classList.add("hidden");
              }}
              disabled={disabled}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TimePeriodDropdown;
