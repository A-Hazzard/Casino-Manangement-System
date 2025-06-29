import React from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import CabinetDetailsSkeleton from "@/components/ui/cabinets/CabinetDetailsSkeleton";

type CabinetDetailsLoadingStateProps = {
  pathname: string;
  selectedLicencee: string;
  setSelectedLicencee: (licencee: string) => void;
  error?: string | null;
};

/**
 * Loading state component for cabinet details page
 */
export const CabinetDetailsLoadingState = ({
  pathname,
  selectedLicencee,
  setSelectedLicencee,
  error,
}: CabinetDetailsLoadingStateProps) => (
  <>
    <Sidebar pathname={pathname} />
    <div className="md:w-[80%] lg:w-full md:mx-auto md:pl-20 lg:pl-36 min-h-screen bg-background flex">
      <main className="flex flex-col flex-1 p-6">
        <Header
          selectedLicencee={selectedLicencee}
          setSelectedLicencee={setSelectedLicencee}
          pageTitle="Cabinet Details"
          hideOptions={true}
          hideLicenceeFilter={false}
        />
        <CabinetDetailsSkeleton />
        {error && (
          <div className="mt-4 text-destructive text-center">{error}</div>
        )}
      </main>
    </div>
  </>
);

type CabinetDetailsErrorStateProps = {
  pathname: string;
  selectedLicencee: string;
  setSelectedLicencee: (licencee: string) => void;
  error: string;
  onRetry: () => void;
};

/**
 * Error state component for cabinet details page
 */
export const CabinetDetailsErrorState = ({
  pathname,
  selectedLicencee,
  setSelectedLicencee,
  error,
  onRetry,
}: CabinetDetailsErrorStateProps) => (
  <>
    <Sidebar pathname={pathname} />
    <div className="md:w-[80%] lg:w-full md:mx-auto md:pl-20 lg:pl-36 min-h-screen bg-background flex">
      <main className="flex flex-col flex-1 p-6">
        <Header
          selectedLicencee={selectedLicencee}
          setSelectedLicencee={setSelectedLicencee}
          pageTitle="Cabinet Details"
          hideOptions={true}
          hideLicenceeFilter={false}
        />
        <div className="p-6 bg-container rounded-lg shadow-sm">
          <h1 className="text-2xl font-bold mb-4">
            Error Loading Cabinet Details
          </h1>
          <p className="text-destructive">{error}</p>
          <Button onClick={onRetry} className="mt-4">
            Retry
          </Button>
        </div>
      </main>
    </div>
  </>
);
