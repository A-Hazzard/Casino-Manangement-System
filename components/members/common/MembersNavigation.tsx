'use client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { MembersTab, MembersView } from '@/shared/types/entities';
import { BarChart3, RefreshCw, Users } from 'lucide-react';

type MembersNavigationProps = {
  availableTabs: MembersTab[];
  activeTab: MembersView;
  onTabChange: (tabId: string) => void;
  selectedLicencee?: string;
  onRefresh?: () => void;
  onNewMember?: () => void;
  refreshing?: boolean;
  locationName?: string;
};

/**
 * Members Navigation Component
 * Handles tab navigation for the members page
 */
export default function MembersNavigation({
  availableTabs,
  activeTab,
  onTabChange,
  selectedLicencee,
  onRefresh,
  onNewMember: _onNewMember,
  refreshing = false,
  locationName,
}: MembersNavigationProps) {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'users':
        return <Users className="h-4 w-4" />;
      case 'bar-chart':
        return <BarChart3 className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const activeTabConfig = availableTabs.find(tab => tab.id === activeTab);

  return (
    <div className="border-b border-gray-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex flex-col gap-3 sm:gap-4">
        {/* Description */}
        <p className="hidden text-sm text-gray-600 md:block">
          Manage member profiles, sessions, and analytics
        </p>

        {/* Tab Navigation with Title and Actions */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
            {/* Tab Title */}
            <div className="flex items-center gap-2">
              {activeTabConfig && getIcon(activeTabConfig.icon)}
              <h1 className="text-lg font-bold text-gray-900 sm:text-2xl">
                {locationName
                  ? `${activeTabConfig?.label || 'Members'} For ${locationName}`
                  : activeTabConfig?.label || 'Members'}
              </h1>
              {selectedLicencee && !locationName && (
                <span className="max-w-[140px] truncate text-xs text-gray-500 sm:max-w-xs">
                  ({selectedLicencee})
                </span>
              )}
            </div>

            {/* Tab Navigation */}
            <div className="w-full flex-shrink-0 sm:w-auto">
              <Tabs
                value={activeTab}
                onValueChange={onTabChange}
                className="w-full"
              >
                <TabsList className="grid grid-cols-2 bg-gray-100">
                  {availableTabs.map(tab => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="flex items-center gap-1.5 text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 sm:gap-2 sm:text-sm"
                    >
                      {getIcon(tab.icon)}
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">
                        {tab.label.split(' ')[0]}
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button
                onClick={e => {
                  e.preventDefault();
                  if (typeof onRefresh === 'function') {
                    onRefresh();
                  }
                }}
                disabled={refreshing}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                title="Refresh data"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            )}
            {/* {onNewMember && (
              <Button
                onClick={e => {
                  e.preventDefault();
                  if (typeof onNewMember === 'function') {
                    onNewMember();
                  }
                }}
                variant="default"
                size="sm"
                className="flex items-center gap-2 bg-button hover:bg-buttonActive"
              >
                <PlusCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Create New Member</span>
                <span className="sm:hidden">New</span>
              </Button>
            )} */}
          </div>
        </div>
      </div>
    </div>
  );
}
