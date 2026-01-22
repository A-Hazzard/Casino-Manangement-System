'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/shared/layout/Header';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import NotFoundError from '@/components/shared/ui/errors/NotFoundError';

export default function CollectionReportDetailNotFound() {
  // Add client-side initialization
  const [isMounted, setIsMounted] = useState(false);

  // Set mounted state on client-side only
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // If not mounted yet (server-side), render a minimal version
  if (!isMounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-6xl font-bold">404</h1>
          <h2 className="mb-2 text-2xl font-semibold">
            Collection Report Not Found
          </h2>
          <p className="mb-6">
            The collection report you are looking for could not be found.
          </p>
        </div>
      </div>
    );
  }

  return <CollectionReportDetailNotFoundContent />;
}

// Client component with store access
function CollectionReportDetailNotFoundContent() {
  const { selectedLicencee, setSelectedLicencee } = useDashBoardStore();

  return (
    <>
      <div className="flex min-h-screen overflow-hidden bg-background md:pl-36 xl:mx-auto xl:w-full">
        <main className="flex flex-1 flex-col items-center justify-center overflow-x-hidden p-4 md:p-6">
          <Header
            selectedLicencee={selectedLicencee}
            setSelectedLicencee={setSelectedLicencee}
            pageTitle=""
            hideOptions={true}
            hideLicenceeFilter={false}
          />
          <NotFoundError
            title="Collection Report Not Found"
            message="The collection report you are looking for could not be found. Please check the report ID and try again."
            resourceType="report"
            showRetry={false}
            customBackText="Back to Collection Reports"
            customBackHref="/collection-reports"
          />
        </main>
      </div>
    </>
  );
}

