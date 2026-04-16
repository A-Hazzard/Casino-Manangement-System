/**
 * Locations Details View Toggle Component
 */

import { Server, Users } from 'lucide-react';

type LocationsDetailsViewToggleProps = {
  activeView: 'machines' | 'members';
  showMembersTab: boolean;
  onViewChange: (view: 'machines' | 'members') => void;
};

export default function LocationsDetailsViewToggle({
  activeView,
  showMembersTab,
  onViewChange,
}: LocationsDetailsViewToggleProps) {
  return (
    <div className="mb-6 flex w-full border-b border-gray-200">
      <button
        onClick={() => onViewChange('machines')}
        className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-medium transition-colors ${
          activeView === 'machines'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        }`}
      >
        <Server className="h-4 w-4" />
        Machines
      </button>
      {showMembersTab && (
        <button
          onClick={() => onViewChange('members')}
          className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-medium transition-colors ${
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
