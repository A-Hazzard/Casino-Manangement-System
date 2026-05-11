/**
 * Collection Report V2 — Status Badge
 *
 * Reusable badge component for machine status display.
 */

'use client';

type MachineStatus = 'pending' | 'captured' | 'confirmed' | 'skipped';

export default function StatusBadge({ status }: { status: MachineStatus }) {
  const styles: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    captured: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-green-100 text-green-700',
    skipped: 'bg-amber-100 text-amber-700',
  };
  const labels: Record<string, string> = {
    pending: 'Pending',
    captured: 'Captured',
    confirmed: 'Confirmed',
    skipped: 'Skipped',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
