import React from "react";
import { Button } from "@/components/ui/button";

type MetricsTabsProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

const MetricsTabs: React.FC<MetricsTabsProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const tabs = ["Metrics", "Live Metrics", "Bill Validator", "Configurations"];

  return (
    <div className="md:hidden overflow-x-auto touch-pan-x pb-4 custom-scrollbar w-full p-2 rounded-md">
      <div className="flex space-x-2 min-w-max px-1 pb-1">
        {tabs.map((tab) => (
          <Button
            key={tab}
            className={`whitespace-nowrap px-4 py-2 ${
              activeTab === (tab === "Metrics" ? "Range Metrics" : tab)
                ? "bg-purple-700 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
            onClick={() =>
              setActiveTab(tab === "Metrics" ? "Range Metrics" : tab)
            }
          >
            {tab}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default MetricsTabs;
