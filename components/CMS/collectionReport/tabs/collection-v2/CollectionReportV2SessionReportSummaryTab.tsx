/**
 * Collection Report V2 — Session Report Summary Tab
 *
 * Displays aggregated session-level statistics for a submitted session.
 */

'use client';

type SessionDetail = {
  sessionId: string;
  sessionStatus: 'in-progress' | 'submitted';
  locationId: string;
  locationName: string;
  licencee: string;
  collector: string;
  collectorName: string;
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
  systemMetersIn: number;
  systemMetersOut: number;
  sasStartTime?: string;
  sasEndTime?: string;
  imageData?: string;
  imageFileId?: string;
  imageName?: string;
  metersMatch?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type SummaryTabProps = {
  session: SessionDetail;
};

export default function CollectionReportV2SessionReportSummaryTab({
  session,
}: SummaryTabProps) {
  const withPhotos = session.machines.filter(m => m.imageData).length;
  const withoutPhotos = session.machinesTotal - withPhotos;
  const capturedCount = session.machinesCaptured - session.machinesConfirmed;

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

  return (
    <div className="space-y-6">
      <h2 className="mb-4 text-center text-xl font-bold lg:hidden">
        Summary
      </h2>

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
          <div className="flex justify-between">
            <span className="text-gray-500">Submitted</span>
            <span className="font-medium text-gray-900">
              {formatDate(session.createdAt)}
            </span>
          </div>
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
              {session.machinesTotal}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Confirmed</span>
            <span className="font-medium text-green-700">
              {session.machinesConfirmed}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Captured (manual entry)</span>
            <span className="font-medium text-blue-700">{capturedCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Skipped</span>
            <span className="font-medium text-amber-700">
              {session.machinesSkipped}
            </span>
          </div>
          <div className="flex justify-between border-t border-gray-100 pt-2">
            <span className="text-gray-500">Machines with photos</span>
            <span className="font-medium text-gray-900">{withPhotos}</span>
          </div>
          {withoutPhotos > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Without photos</span>
              <span className="font-medium text-gray-500">
                {withoutPhotos}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
