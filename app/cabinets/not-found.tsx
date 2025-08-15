"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { usePathname } from "next/navigation";

export default function CabinetsNotFound() {
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
            Cabinets Page Not Found
          </h2>
          <p className="mb-6">
            The page you are looking for could not be found.
          </p>
        </div>
      </div>
    );
  }

  return <CabinetsNotFoundContent />;
}

// Client component with store access
function CabinetsNotFoundContent() {
  const { selectedLicencee, setSelectedLicencee } = useDashBoardStore();
  const pathname = usePathname();

  return (
    <>
      <Sidebar pathname={pathname} />
      <div className="xl:w-full xl:mx-auto md:pl-36 min-h-screen bg-background flex overflow-hidden">
        <main className="flex flex-col flex-1 p-4 md:p-6 overflow-x-hidden items-center justify-center">
          <Header
            selectedLicencee={selectedLicencee}
            setSelectedLicencee={setSelectedLicencee}
            pageTitle=""
            hideOptions={true}
            hideLicenceeFilter={false} // Can show licensee filter here
          />
          <div className="text-center">
            <h1 className="text-6xl font-bold text-buttonActive mb-4">404</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              Cabinets Page Not Found
            </h2>
            <p className="text-gray-500 mb-6">
              The main cabinets page could not be loaded. Try selecting a
              different licensee or returning to the dashboard.
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
