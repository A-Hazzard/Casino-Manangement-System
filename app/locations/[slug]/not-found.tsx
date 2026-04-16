'use client';

import Header from '@/components/shared/layout/Header';
import NotFoundError from '@/components/shared/ui/errors/NotFoundError';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { usePathname } from 'next/navigation';

export default function LocationDetailNotFound() {
  const pathname = usePathname();
  const slug = pathname.split('/')[2] || ''; // Get the location slug
  const { selectedLicencee, setSelectedLicencee } = useDashBoardStore();

  return (
    <>
      <div className="flex min-h-screen overflow-hidden bg-background md:pl-36 xl:mx-auto xl:w-full">
        <main className="flex flex-1 flex-col items-center justify-center overflow-x-hidden p-4 md:p-6">
          <Header
            selectedLicencee={selectedLicencee}
            setSelectedLicencee={setSelectedLicencee}
            
            hideOptions={true}
            hideLicenceeFilter={false}
          />
          <NotFoundError
            title="Location Not Found"
            message={`The location with ID "${slug}" could not be found for the selected licencee.`}
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
