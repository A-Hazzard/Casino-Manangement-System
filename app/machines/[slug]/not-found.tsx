'use client'; // Need client for hooks

import Header from '@/components/shared/layout/Header';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { usePathname } from 'next/navigation';
import NotFoundError from '@/components/shared/ui/errors/NotFoundError';

export default function CabinetDetailNotFound() {
  const pathname = usePathname();
  const slug = pathname.split('/').pop() || '';
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
