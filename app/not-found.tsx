/**
 * Global Not Found Page
 *
 * Displays a 404 error page when a user navigates to a non-existent route.
 * Handles client-side mounting to prevent hydration issues and provides
 * navigation options back to the dashboard.
 *
 * Features:
 * - 404 error display
 * - Client-side mounting handling
 * - Navigation back to dashboard
 * - Consistent layout with header
 * - Hydration-safe rendering
 */

'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import NotFoundError from '@/components/ui/errors/NotFoundError';

export default function NotFound() {
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
          <h2 className="mb-2 text-2xl font-semibold">Page Not Found</h2>
          <p className="mb-6">
            Sorry, the page you are looking for does not exist.
          </p>
        </div>
      </div>
    );
  }

  return <NotFoundContent />;
}

// Client component with store access
function NotFoundContent() {
  // Need to initialize store hooks even if not directly used for layout consistency
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
            hideLicenceeFilter={true} // Hide licensee filter on 404
          />
          <NotFoundError
            title="Page Not Found"
            message="Sorry, the page you are looking for does not exist."
            resourceType="page"
            showRetry={false}
            customBackText="Go to Dashboard"
            customBackHref="/"
          />
        </main>
      </div>
    </>
  );
}
