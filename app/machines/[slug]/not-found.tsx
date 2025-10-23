"use client"; // Need client for hooks

import Header from "@/components/layout/Header";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { usePathname } from "next/navigation";
import NotFoundError from "@/components/ui/errors/NotFoundError";

export default function CabinetDetailNotFound() {
  const pathname = usePathname();
  const slug = pathname.split("/").pop() || "";
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
            title="Cabinet Not Found"
            message={`The cabinet with ID "${slug}" could not be found for the selected licensee.`}
            resourceType="cabinet"
            showRetry={false}
            customBackText="Back to Cabinets"
            customBackHref="/cabinets"
          />
        </main>
      </div>
    </>
  );
}
