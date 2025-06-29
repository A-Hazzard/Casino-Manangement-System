import type { EmptyStateProps } from "@/lib/types/components";

/**
 * A reusable empty state component for displaying when no data is available.
 * Shows an icon, title, and message in a centered layout.
 */
export const EmptyState = ({ icon, title, message }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-12">
    <div className="text-4xl mb-4">{icon}</div>
    <p className="text-lg text-gray-600 font-semibold mb-2">{title}</p>
    <p className="text-sm text-gray-400">{message}</p>
  </div>
);
