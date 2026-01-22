/**
 * Dashboard Top Performing Section Component
 * Displays top performing locations or cabinets with tab switching and pie chart visualization.
 *
 * @module components/dashboard/sections/DashboardTopPerformingSection
 */

'use client';

import { DashboardTopPerformingSkeleton } from '@/components/shared/ui/skeletons/DashboardSkeletons';
import type { ActiveTab, TopPerformingItem } from '@/lib/types';
import type { CustomizedLabelProps } from '@/lib/types/components/props';
import { ExternalLink } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

export type DashboardTopPerformingSectionProps = {
  loadingTopPerforming: boolean;
  hasTopPerformingFetched: boolean;
  topPerformingData: TopPerformingItem[];
  activeTab: ActiveTab;
  setActiveTab: (tab: 'locations' | 'Cabinets') => void;
  selectedLicencee?: string;
  licenseeName: string;
  renderCustomizedLabel: (props: CustomizedLabelProps) => React.ReactNode;
  onViewMachine?: (item: TopPerformingItem) => void;
  onViewLocation?: (item: TopPerformingItem) => void;
};

/**
 * Dashboard Top Performing Section
 */
export function DashboardTopPerformingSection({
  loadingTopPerforming,
  hasTopPerformingFetched,
  topPerformingData,
  activeTab,
  setActiveTab,
  selectedLicencee,
  licenseeName,
  renderCustomizedLabel,
  onViewMachine,
  onViewLocation,
}: DashboardTopPerformingSectionProps) {
  const NoDataMessage = ({ message }: { message: string }) => (
    <div
      className="flex flex-col items-center justify-center rounded-lg bg-container p-8 shadow-md"
      suppressHydrationWarning
    >
      <div className="mb-2 text-lg text-gray-500">No Data Available</div>
      <div className="text-center text-sm text-gray-400">{message}</div>
    </div>
  );

  if (
    loadingTopPerforming ||
    (!hasTopPerformingFetched && topPerformingData.length === 0)
  ) {
    return <DashboardTopPerformingSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Top Performing</h2>
      </div>

      {/* Tabs with Curved Design */}
      <div
        className={`relative flex flex-col ${
          activeTab === 'locations' ? 'bg-container' : 'bg-buttonActive'
        } w-full rounded-lg rounded-tl-3xl rounded-tr-3xl shadow-md`}
      >
        {/* Tab Buttons */}
        <div className="flex">
          <button
            className={`w-full rounded-tl-xl rounded-tr-3xl px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'locations'
                ? 'bg-buttonActive text-white'
                : 'bg-container text-gray-700'
            } ${
              activeTab !== 'locations' && loadingTopPerforming
                ? 'cursor-not-allowed opacity-50'
                : ''
            }`}
            onClick={() => {
              if (activeTab !== 'locations' && loadingTopPerforming) return;
              setActiveTab('locations');
            }}
          >
            Locations
          </button>
          <button
            className={`w-full rounded-tr-3xl px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'Cabinets'
                ? 'bg-buttonActive text-white'
                : 'bg-container text-gray-700'
            } ${
              activeTab !== 'Cabinets' && loadingTopPerforming
                ? 'cursor-not-allowed opacity-50'
                : ''
            }`}
            onClick={() => {
              if (activeTab !== 'Cabinets' && loadingTopPerforming) return;
              setActiveTab('Cabinets');
            }}
          >
            Cabinets
          </button>
        </div>

        {/* Content Area */}
        <div className="mb-0 rounded-lg rounded-tl-none rounded-tr-3xl bg-container p-6 shadow-sm">
          {topPerformingData.length === 0 ? (
            <NoDataMessage
              message={`No metrics found for ${selectedLicencee === 'all' ? 'any licensee' : licenseeName}`}
            />
          ) : (
            // List items with pie charts
            <div className="flex flex-col items-center gap-6 xl:flex-row xl:items-center xl:justify-between">
              {/* Items List */}
              <ul className="w-full flex-1 space-y-2 lg:w-auto">
                {topPerformingData.map((item, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    {/* Colored Dot */}
                    <div
                      className="h-4 w-4 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    ></div>

                    {/* Conditional Rendering */}
                    {activeTab === 'Cabinets' && item.machineId ? (
                      <>
                        <span className="flex-1 text-gray-700">
                          {item.name}
                        </span>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onViewMachine?.(item);
                          }}
                          className="flex-shrink-0"
                          title="View machine preview"
                        >
                          <ExternalLink className="h-3.5 w-3.5 cursor-pointer text-gray-500 transition-transform hover:scale-110 hover:text-blue-600" />
                        </button>
                      </>
                    ) : activeTab === 'locations' && item.locationId ? (
                      <>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onViewLocation?.(item);
                          }}
                          className="flex-1 cursor-pointer text-left text-gray-700 hover:text-blue-600 hover:underline"
                          title="View location preview"
                        >
                          {item.name}
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onViewLocation?.(item);
                          }}
                          className="flex-shrink-0"
                          title="View location preview"
                        >
                          <ExternalLink className="h-3.5 w-3.5 cursor-pointer text-gray-500 transition-transform hover:scale-110 hover:text-blue-600" />
                        </button>
                      </>
                    ) : (
                      <span className="flex-1 text-gray-700">{item.name}</span>
                    )}
                  </li>
                ))}
              </ul>

              {/* Pie Chart */}
              <div className="h-40 min-h-[160px] w-40 min-w-[160px] flex-shrink-0 md:mx-auto lg:mx-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topPerformingData}
                      dataKey="totalDrop"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      labelLine={false}
                      label={renderCustomizedLabel}
                    >
                      {topPerformingData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
