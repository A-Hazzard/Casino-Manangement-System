'use client';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, BarChart3 } from 'lucide-react';
import type { MembersView, MembersTab } from '@/shared/types/entities';
import Image from 'next/image';
import { IMAGES } from '@/lib/constants/images';

type MembersNavigationProps = {
  availableTabs: MembersTab[];
  activeTab: MembersView;
  onTabChange: (tabId: string) => void;
  selectedLicencee?: string;
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

  return (
    <div className="border-b border-gray-200 bg-white px-6 py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Title and Description */}
        <div className="flex flex-col">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Members</h1>
            <Image
              src={IMAGES.membersIcon}
              alt="Members Icon"
              width={32}
              height={32}
              className="h-6 w-6 sm:h-8 sm:w-8"
            />
            {/* Preserve selected licencee context for a11y without showing a badge */}
            {selectedLicencee ? (
              <span className="sr-only">Selected licencee: {selectedLicencee}</span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-gray-600 text-left">
            Manage member profiles, sessions, and analytics
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex-shrink-0">
          <Tabs
            value={activeTab}
            onValueChange={onTabChange}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 bg-gray-100">
              {availableTabs.map(tab => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900"
                >
                  {getIcon(tab.icon)}
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
