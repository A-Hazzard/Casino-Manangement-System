/**
 * Empty State Component
 * Reusable empty state component for displaying when no data is available.
 *
 * Features:
 * - Icon display
 * - Title and message text
 * - Centered layout
 * - Consistent styling
 *
 * @param icon - Icon element to display
 * @param title - Title text
 * @param message - Message/description text
 */
import type { EmptyStateProps } from '@/lib/types/components';

export const EmptyState = ({ icon, title, message }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-12">
    <div className="mb-4 text-4xl">{icon}</div>
    <p className="mb-2 text-lg font-semibold text-gray-600">{title}</p>
    <p className="text-sm text-gray-400">{message}</p>
  </div>
);
