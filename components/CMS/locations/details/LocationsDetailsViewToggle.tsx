/**
 * Locations Details View Toggle Component
 */

import { MonitorOff, Server, Users } from 'lucide-react';
import type { AggregatedLocation } from '@/shared/types';

type LocationsDetailsViewToggleProps = {
  activeView: 'machines' | 'members';
  showMembersTab: boolean;
  onViewChange: (view: 'machines' | 'members') => void;
  locationData?: AggregatedLocation | null;
};

function SmibTypeBadge({
  locationData,
}: {
  locationData: AggregatedLocation | null;
}) {
  if (!locationData) return null;
  if (locationData.fullSMIBs) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
        <Server className="h-2.5 w-2.5" />
        Full SMIB
      </span>
    );
  }
  if (locationData.semiSMIBs) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
        <Server className="h-2.5 w-2.5" />
        Semi SMIB
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
      <MonitorOff className="h-2.5 w-2.5" />
      No SMIB
    </span>
  );
}

export default function LocationsDetailsViewToggle({
  activeView,
  showMembersTab,
  onViewChange,
  locationData,
}: LocationsDetailsViewToggleProps) {
  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="mb-6 flex w-full border-b border-gray-200">
      <button
        onClick={() => onViewChange('machines')}
        className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors sm:px-6 ${
          activeView === 'machines'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        }`}
      >
        {activeView === 'machines' && locationData ? (
          <SmibTypeBadge locationData={locationData} />
        ) : (
          <>
            <Server className="h-4 w-4" />
            Machines
          </>
        )}
      </button>
      {showMembersTab && (
        <button
          onClick={() => onViewChange('members')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors sm:px-6 ${
            activeView === 'members'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="h-4 w-4" />
          Members
        </button>
      )}
    </div>
  );
}
