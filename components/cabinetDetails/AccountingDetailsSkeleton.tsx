/**
 * Accounting Details Skeleton Component
 * Loading skeleton for accounting details section.
 *
 * Features:
 * - Matches AccountingDetails layout structure
 * - Header, metrics grid, and content area skeletons
 */
export const AccountingDetailsSkeleton = () => (
  <div className="rounded-lg bg-white p-6 shadow-sm">
    <div className="skeleton-bg mb-4 h-8 w-48"></div>
    <div className="grid grid-cols-3 gap-4">
      <div className="skeleton-bg h-20"></div>
      <div className="skeleton-bg h-20"></div>
      <div className="skeleton-bg h-20"></div>
    </div>
    <div className="skeleton-bg my-4 h-8 w-48"></div>
    <div className="skeleton-bg h-40"></div>
  </div>
);

export default AccountingDetailsSkeleton;
