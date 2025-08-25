"use client";

import Link from "next/link";
import Header from "@/components/layout/Header";

import { Button } from "@/components/ui/button";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { usePathname } from "next/navigation";

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
          <div className="text-center">
            <h1 className="text-6xl font-bold text-buttonActive mb-4">404</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              Location Not Found
            </h2>
            <p className="text-gray-500 mb-6">
              The location with ID{" "}
              <code className="bg-gray-200 px-1 rounded">{slug}</code> could not
              be found for the selected licensee.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/locations">
                <Button variant="outline">Back to Locations</Button>
              </Link>
              <Link href="/dashboard">
                <Button className="bg-buttonActive hover:bg-buttonActive/90">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
