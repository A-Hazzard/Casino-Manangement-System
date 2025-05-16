"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { useDashBoardStore } from "@/lib/store/dashboardStore";

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-4">404</h1>
          <h2 className="text-2xl font-semibold mb-2">Page Not Found</h2>
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
      <Sidebar />
      <div className="md:w-[80%] lg:w-full md:mx-auto md:pl-20 lg:pl-36 min-h-screen bg-background flex overflow-hidden">
        <main className="flex flex-col flex-1 p-4 md:p-6 overflow-x-hidden items-center justify-center">
          <Header
            selectedLicencee={selectedLicencee}
            setSelectedLicencee={setSelectedLicencee}
            pageTitle=""
            hideOptions={true}
            hideLicenceeFilter={true} // Hide licensee filter on 404
          />
          <div className="text-center">
            <h1 className="text-6xl font-bold text-buttonActive mb-4">404</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              Page Not Found
            </h2>
            <p className="text-gray-500 mb-6">
              Sorry, the page you are looking for does not exist.
            </p>
            <Link href="/dashboard">
              <Button className="bg-buttonActive hover:bg-buttonActive/90">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}
