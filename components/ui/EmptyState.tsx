import type { EmptyStateProps } from '@/lib/types/components';

/**
 * A reusable empty state component for displaying when no data is available.
 * Shows an icon, title, and message in a centered layout.
 */
export const EmptyState = ({ icon, title, message }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-12">
    <div className="mb-4 text-4xl">{icon}</div>
    <p className="mb-2 text-lg font-semibold text-gray-600">{title}</p>
    <p className="text-sm text-gray-400">{message}</p>
  </div>
);
