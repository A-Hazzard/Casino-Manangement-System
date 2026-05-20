'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CollectionReportV2SessionReportMachinesTab from './CollectionReportV2SessionReportMachinesTab';
import CollectionReportV2SessionReportSummaryTab from './CollectionReportV2SessionReportSummaryTab';

type SessionMachine = {
  reportedMachineId: string;
  machineId: string;
  machineName: string;
  machineCustomName: string;
  serialNumber: string;
  manufacturer: string;
  game?: string;
  status: 'pending' | 'captured' | 'confirmed' | 'skipped';
  sequenceOrder: number;
  sasMetersIn: number | null;
  sasMetersOut: number | null;
  sasGross?: number;
  manualMetersIn?: number;
  manualMetersOut?: number;
  sasStartTime?: string;
  sasEndTime?: string;
  sessionStartTime?: string;
  sessionEndTime?: string;
  imageData?: string;
  metersMatch?: boolean;
  machineGross?: number;
  grossDifference?: number;
  movement?: {
    manualMetersIn?: number;
    manualMetersOut?: number;
    machineGross?: number;
  };
  createdAt?: string;
  updatedAt?: string;
};

type SessionDetail = {
  sessionId: string;
  sessionStatus: 'in-progress' | 'submitted';
  locationId: string;
  locationName: string;
  noSMIBLocation?: boolean;
  licencee: string;
  collector: string;
  collectorName: string;
  collectorFirstName?: string;
  collectorLastName?: string;
  collectorEmail?: string;
  sessionStartTime?: string;
  sessionEndTime?: string;
  machinesTotal: number;
  machinesCaptured: number;
  machinesConfirmed: number;
  machinesSkipped: number;
  createdAt: string;
  machines: SessionMachine[];
};

type ReportProps = {
  session: SessionDetail;
  router: ReturnType<typeof useRouter>;
  onEdit?: () => void;
  /** Override for the Back button — when omitted uses router.push('/collection-report') */
  onBack?: () => void;
};

export default function CollectionReportV2SessionReport({
  session,
  router,
  onEdit,
  onBack,
}: ReportProps) {
  const [activeTab, setActiveTab] = useState<'machines' | 'summary'>(
    'machines'
  );

  // ============================================================================
  // Format
  // ============================================================================

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const capturedCount =
    session.machinesCaptured - session.machinesConfirmed;

  // ============================================================================
  // Tabs
  // ============================================================================

  const tabs = [
    { id: 'machines' as const, label: 'Machines' },
    { id: 'summary' as const, label: 'Summary' },
  ];

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Back button + Edit */}
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() =>
              onBack ? onBack() : router.push('/collection-report')
            }
            className="flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <svg
              className="mr-1 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Close
          </button>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Edit Session
            </button>
          )}
        </div>

        {/* Header card */}
        <div className="mb-6 rounded-lg bg-white py-4 text-center shadow lg:border-t-4 lg:border-lighterBlueHighlight lg:bg-container lg:py-8">
          <div className="px-4 py-2 lg:py-4">
            <div className="mb-2 text-xs text-gray-500 lg:hidden">
              SESSION REPORT
            </div>
            <h1 className="mb-2 text-2xl font-bold text-gray-800 lg:text-4xl">
              {session.locationName}
            </h1>
            <p className="mb-2 text-sm text-gray-600 lg:text-base">
              Collector:{' '}
              <span className="group relative">
                <span className="cursor-help border-b border-dotted border-gray-400">
                  {session.collectorName || session.collector}
                </span>
                <span className="absolute left-0 top-full z-50 mt-1 hidden w-max max-w-xs rounded bg-gray-800 px-3 py-2 text-xs text-white shadow-lg group-hover:block">
                  <span className="space-y-1">
                    {(session.collectorFirstName || session.collectorLastName) && (
                      <span className="block font-semibold">
                        {[session.collectorFirstName, session.collectorLastName]
                          .filter(Boolean)
                          .join(' ')}
                      </span>
                    )}
                    {session.collector && (
                      <span className="block text-gray-300">ID: {session.collector}</span>
                    )}
                    {session.collectorEmail && (
                      <span className="block text-gray-300">{session.collectorEmail}</span>
                    )}
                  </span>
                </span>
              </span>
              {' · '}
              {formatDate(session.createdAt)}
            </p>

            <p className="text-sm text-gray-500">
              <span className="font-medium text-green-700">
                {session.machinesConfirmed}
              </span>{' '}
              confirmed{' · '}
              <span className="font-medium text-blue-700">{capturedCount}</span>{' '}
              captured{' · '}
              <span className="font-medium text-amber-700">
                {session.machinesSkipped}
              </span>{' '}
              skipped{' · '}
              <span className="font-medium text-gray-700">
                {session.machinesTotal}
              </span>{' '}
              total
            </p>
          </div>
        </div>

        {/* Desktop layout */}
        <div className="hidden lg:flex lg:flex-row lg:space-x-6">
          {/* Sidebar */}
          <div className="lg:w-1/4">
            <div className="space-y-2 rounded-lg bg-white p-3 shadow">
              <h3 className="mb-4 px-2 text-lg font-semibold text-gray-800">
                Sections
              </h3>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full rounded-md px-4 py-3 text-left text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-buttonActive text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main content */}
          <div className="lg:w-3/4">
            {activeTab === 'machines' && (
              <CollectionReportV2SessionReportMachinesTab
                machines={session.machines}
                noSMIBLocation={session.noSMIBLocation}
              />
            )}
            {activeTab === 'summary' && (
              <CollectionReportV2SessionReportSummaryTab session={session} />
            )}
          </div>
        </div>

        {/* Mobile layout */}
        <div className="space-y-4 lg:hidden">
          {/* Tab selector */}
          <select
            value={activeTab}
            onChange={e =>
              setActiveTab(e.target.value as 'machines' | 'summary')
            }
            className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-3 text-base font-semibold text-gray-700 shadow-sm focus:border-buttonActive focus:ring-buttonActive"
          >
            {tabs.map(tab => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>

          {/* Tab content */}
          {activeTab === 'machines' && (
            <CollectionReportV2SessionReportMachinesTab
              machines={session.machines}
              noSMIBLocation={session.noSMIBLocation}
            />
          )}
          {activeTab === 'summary' && (
            <CollectionReportV2SessionReportSummaryTab session={session} />
          )}
        </div>
      </div>
    </div>
  );
}
