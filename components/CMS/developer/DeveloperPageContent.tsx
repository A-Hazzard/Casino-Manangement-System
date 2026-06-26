/**
 * Developer Page Content Component
 *
 * Standalone developer-only DB explorer page. Reuses the same explorer rendered
 * inside the cabinet "Developer Options" tab, but unscoped — browse, edit, and
 * manage any registry collection across the whole database.
 */

'use client';

import PageLayout from '@/components/shared/layout/PageLayout';
import DevCollectionExplorer from '@/components/CMS/cabinets/details/developer/DevCollectionExplorer';
import { useDashBoardStore } from '@/lib/store/dashboardStore';

export default function DeveloperPageContent() {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const { selectedLicencee, setSelectedLicencee } = useDashBoardStore();

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <PageLayout
      headerProps={{ selectedLicencee, setSelectedLicencee }}
      hideOptions
      hideLicenceeFilter
      mainClassName="flex flex-col flex-1 p-4 md:p-6 overflow-x-hidden"
    >
      <div className="flex w-full min-w-0 flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Developer</h1>
          <p className="text-sm text-grayHighlight">
            Browse, edit, export, and delete raw database collections.
            Developer-only.
          </p>
        </div>

        <div className="rounded-lg bg-container p-4 shadow-md shadow-purple-200 md:p-6">
          <DevCollectionExplorer />
        </div>
      </div>
    </PageLayout>
  );
}
