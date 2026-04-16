'use client';

import { Wrench } from 'lucide-react';

/**
 * MaintenancePage
 * Full-page maintenance UI shown when a page or section is temporarily offline.
 * Drop this inside any layout that needs a maintenance state.
 */
export default function MaintenancePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      {/* Icon */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
        <Wrench className="h-9 w-9 text-blue-400" strokeWidth={1.75} />
      </div>

      {/* Heading */}
      <h1 className="mb-3 max-w-xs text-xl font-semibold text-gray-800">
        This page is currently under maintenance
      </h1>

      {/* Sub-text */}
      <p className="mb-8 max-w-sm text-sm leading-relaxed text-gray-500">
        We&apos;re working to resolve this as quickly as possible. Please try again in a few
        moments or contact support if the issue persists.
      </p>

      {/* Try again */}
      <button
        onClick={() => window.location.reload()}
        className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        Try again
      </button>
    </div>
  );
}
