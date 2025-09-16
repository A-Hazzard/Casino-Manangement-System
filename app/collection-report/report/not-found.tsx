"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import NotFoundError from "@/components/ui/errors/NotFoundError";

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-4">404</h1>
          <h2 className="text-2xl font-semibold mb-2">
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
      <div className="xl:w-full xl:mx-auto md:pl-36 min-h-screen bg-background flex overflow-hidden">
        <main className="flex flex-col flex-1 p-4 md:p-6 overflow-x-hidden items-center justify-center">
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
