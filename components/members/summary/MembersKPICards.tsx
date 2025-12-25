/**
 * Members KPI Cards Component
 */

'use client';

import { Users, Calendar } from 'lucide-react';

type MembersKPICardsProps = {
  summaryStats: {
    totalMembers: number;
    activeMembers: number;
  } | null;
};

export default function MembersKPICards({ summaryStats }: MembersKPICardsProps) {
  if (!summaryStats) return null;

  const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';

  return (
    <div className={`mb-6 grid grid-cols-1 gap-4 ${isLocalhost ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center">
          <div className="rounded-lg bg-blue-100 p-2">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Members</p>
            <p className="text-2xl font-bold text-gray-900">{summaryStats.totalMembers}</p>
          </div>
        </div>
      </div>

      {isLocalhost && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center">
            <div className="rounded-lg bg-orange-100 p-2">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Members</p>
              <p className="text-2xl font-bold text-gray-900">{summaryStats.activeMembers}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

