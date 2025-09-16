"use client";

import Header from "@/components/layout/Header";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { usePathname } from "next/navigation";
import NotFoundError from "@/components/ui/errors/NotFoundError";

export default function LocationDetailNotFound() {
  const pathname = usePathname();
  const slug = pathname.split("/")[2] || ""; // Get the location slug
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
            title="Location Not Found"
            message={`The location with ID "${slug}" could not be found for the selected licensee.`}
            resourceType="location"
            showRetry={false}
            customBackText="Back to Locations"
            customBackHref="/locations"
          />
        </main>
      </div>
    </>
  );
}
