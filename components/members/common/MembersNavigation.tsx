"use client";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, BarChart3 } from "lucide-react";
import type { MembersView, MembersTab } from "@/lib/types/members";
import Image from "next/image";
import { IMAGES } from "@/lib/constants/images";

type MembersNavigationProps = {
  availableTabs: MembersTab[];
  activeTab: MembersView;
  onTabChange: (tabId: string) => void;
  selectedLicencee?: string;
}

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
      case "users":
        return <Users className="w-4 h-4" />;
      case "bar-chart":
        return <BarChart3 className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Title and Description */}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          <Image
            src={IMAGES.membersIcon}
            alt="Members Icon"
            width={32}
            height={32}
            className="w-6 h-6 sm:w-8 sm:h-8"
          />
          <p className="text-sm text-gray-600 mt-1">
            Manage member profiles, sessions, and analytics
          </p>
          {selectedLicencee && (
            <Badge variant="outline" className="mt-2">
              Licensee: {selectedLicencee}
            </Badge>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex-shrink-0">
          <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100">
              {availableTabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900"
                >
                  {getIcon(tab.icon)}
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
