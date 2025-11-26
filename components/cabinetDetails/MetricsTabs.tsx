/**
 * Metrics Tabs Component
 * Tab navigation for cabinet metrics on mobile view.
 *
 * Features:
 * - Tab navigation (Metrics, Live Metrics, Bill Validator, Configurations)
 * - Active tab highlighting
 * - Mobile-only display
 * - Horizontal scrolling
 * - Tab switching functionality
 *
 * @param activeTab - Currently active tab
 * @param setActiveTab - Callback to change active tab
 */
import React from 'react';
import { Button } from '@/components/ui/button';

type ExtendedMetricsTabsProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

const MetricsTabs: React.FC<ExtendedMetricsTabsProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const tabs = ['Metrics', 'Live Metrics', 'Bill Validator', 'Configurations'];

  return (
    <div className="custom-scrollbar w-full touch-pan-x overflow-x-auto rounded-md p-2 pb-4 md:hidden">
      <div className="flex min-w-max space-x-2 px-1 pb-1">
        {tabs.map(tab => (
          <Button
            key={tab}
            className={`whitespace-nowrap px-4 py-2 ${
              activeTab === (tab === 'Metrics' ? 'Range Metrics' : tab)
                ? 'bg-purple-700 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
            onClick={() =>
              setActiveTab(tab === 'Metrics' ? 'Range Metrics' : tab)
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
