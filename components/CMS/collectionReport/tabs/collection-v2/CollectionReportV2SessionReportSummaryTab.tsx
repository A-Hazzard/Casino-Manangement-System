/**
 * Collection Report V2 — Session Report Summary Tab
 *
 * Displays aggregated session-level statistics for a submitted session.
 */

'use client';

import { useState } from 'react';
import CabinetsDetailsUnifiedBillValidator from '@/components/CMS/cabinets/details/CabinetsDetailsUnifiedBillValidator';
import { TimePeriod } from '@/shared/types/common';

type SessionDetail = {
  sessionId: string;
  sessionStatus: 'in-progress' | 'submitted';
  locationId: string;
  locationName: string;
  noSMIBLocation?: boolean;
  licencee: string;
  collector: string;
  collectorName: string;
  sessionStartTime?: string;
  sessionEndTime?: string;
  machinesTotal: number;
  machinesCaptured: number;
  machinesConfirmed: number;
  machinesSkipped: number;
  createdAt: string;
  machines: SessionMachine[];
};

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
  manualMetersIn?: number;
  manualMetersOut?: number;
  sasStartTime?: string;
  sasEndTime?: string;
  sessionStartTime?: string;
  sessionEndTime?: string;
  imageData?: string;
  metersMatch?: boolean;
  machineGross?: number;
  sasGross?: number;
  variation?: number;
  hasRelay?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type SummaryTabProps = {
  session: SessionDetail;
};

export default function CollectionReportV2SessionReportSummaryTab({
  session,
}: SummaryTabProps) {
  // ============================================================================
  // Computed
  // ============================================================================
  const withPhotos = session.machines.filter(machine => machine.imageData).length;
  const withoutPhotos = session.machinesTotal - withPhotos;

  // Compute machine breakdown from individual machine statuses
  const confirmedCount = session.machines.filter(
    m => m.status === 'confirmed'
  ).length;
  const capturedCount = session.machines.filter(
    m => m.status === 'captured'
  ).length;
  const skippedCount = session.machines.filter(
    m => m.status === 'skipped'
  ).length;

  // Compute the SAS collection period from individual machine times
  const sasStartTimes = session.machines
    .map(machine => machine.sasStartTime)
    .filter((timeString): timeString is string => !!timeString)
    .map(timeString => new Date(timeString).getTime());
  const sasEndTimes = session.machines
    .map(machine => machine.sasEndTime)
    .filter((timeString): timeString is string => !!timeString)
    .map(timeString => new Date(timeString).getTime());

  const earliestSasStart =
    sasStartTimes.length > 0
      ? new Date(Math.min(...sasStartTimes)).toISOString()
      : null;
  const latestSasEnd =
    sasEndTimes.length > 0
      ? new Date(Math.max(...sasEndTimes)).toISOString()
      : null;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="space-y-6">
      <h2 className="mb-4 text-center text-xl font-bold lg:hidden">Summary</h2>

      {/* Session Info */}
      <div className="rounded-lg bg-white p-5 shadow">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Session Info
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Location</span>
            <span className="font-medium text-gray-900">
              {session.locationName}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Collector</span>
            <span className="font-medium text-gray-900">
              {session.collectorName || session.collector}
            </span>
          </div>
          {earliestSasStart && (
            <div className="flex justify-between">
              <span className="text-gray-500">SAS Start</span>
              <span className="font-medium text-gray-900">
                {formatDate(earliestSasStart)}
              </span>
            </div>
          )}
          {latestSasEnd && (
            <div className="flex justify-between">
              <span className="text-gray-500">SAS End</span>
              <span className="font-medium text-gray-900">
                {formatDate(latestSasEnd)}
              </span>
            </div>
          )}
          {session.sessionEndTime && (
            <div className="flex justify-between">
              <span className="text-gray-500">Submitted</span>
              <span className="font-medium text-gray-900">
                {formatDate(session.sessionEndTime)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Machine Stats */}
      <div className="rounded-lg bg-white p-5 shadow">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Machine Breakdown
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-gray-100 pb-2">
            <span className="text-gray-500">Total Machines</span>
            <span className="font-bold text-gray-900">
              {session.machines.length}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Confirmed</span>
            <span className="font-medium text-green-700">{confirmedCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Captured (manual entry)</span>
            <span className="font-medium text-blue-700">{capturedCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Skipped</span>
            <span className="font-medium text-amber-700">{skippedCount}</span>
          </div>
          <div className="flex justify-between border-t border-gray-100 pt-2">
            <span className="text-gray-500">Machines with photos</span>
            <span className="font-medium text-gray-900">{withPhotos}</span>
          </div>
          {withoutPhotos > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Without photos</span>
              <span className="font-medium text-gray-500">{withoutPhotos}</span>
            </div>
          )}
        </div>
      </div>

      {/* Gross Summary */}
      {(session.machines.some(machine => machine.machineGross !== undefined) ||
        (!session.noSMIBLocation &&
          session.machines.some(machine => machine.sasGross !== undefined))) && (
        <GrossSummary session={session} />
      )}

      {/* Bill Validator */}
      {!session.noSMIBLocation &&
        session.machines.some(m => m.hasRelay) && (
          <BillValidatorSection machines={session.machines} />
        )}
    </div>
  );
}

function BillValidatorSection({ machines }: { machines: SessionMachine[] }) {
  // ============================================================================
  // State
  // ============================================================================
  const smibMachines = machines.filter(m => m.hasRelay);
  const [selectedMachineId, setSelectedMachineId] = useState<string>(
    smibMachines[0]?.machineId ?? ''
  );
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('All Time');

  if (smibMachines.length === 0 || !selectedMachineId) return null;

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="rounded-lg bg-white p-5 shadow">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Bill Validator
      </h3>
      {smibMachines.length > 1 && (
        <div className="mb-4">
          <select
            value={selectedMachineId}
            onChange={e => setSelectedMachineId(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            {smibMachines.map(m => (
              <option key={m.machineId} value={m.machineId}>
                {m.machineCustomName || m.machineName}
              </option>
            ))}
          </select>
        </div>
      )}
      <CabinetsDetailsUnifiedBillValidator
        machineId={selectedMachineId}
        timePeriod={timePeriod}
        onTimePeriodChange={setTimePeriod}
      />
    </div>
  );
}

function GrossSummary({ session }: { session: SessionDetail }) {
  // ============================================================================
  // Computed
  // ============================================================================
  const totalMachineGross = session.machines.reduce(
    (sum, m) => sum + (m.machineGross ?? 0),
    0
  );
  const totalSasGross = session.machines.reduce(
    (sum, m) => sum + (m.sasGross ?? 0),
    0
  );
  const totalDifference =
    totalMachineGross === 0 ? 0 : totalMachineGross - totalSasGross;

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="rounded-lg bg-white p-5 shadow">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Gross Summary
      </h3>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between border-b border-gray-100 pb-2">
          <span className="text-gray-500">Total Machine Gross</span>
          <span className="font-bold text-gray-900">
            {totalMachineGross?.toLocaleString() ?? '0'}
          </span>
        </div>
        {!session.noSMIBLocation && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-500">Total SAS Gross</span>
              <span className="font-bold text-gray-900">
                {totalSasGross?.toLocaleString() ?? '0'}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2">
              <span className="text-gray-500">Total Variation</span>
              <span
                className={`font-bold ${
                  totalDifference === 0 ? 'text-green-700' : 'text-red-600'
                }`}
              >
                {totalDifference?.toLocaleString() ?? '0'}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
