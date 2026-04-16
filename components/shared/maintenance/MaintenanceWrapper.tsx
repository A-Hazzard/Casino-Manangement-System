'use client';

import { type ReactNode } from 'react';
import { isPageAvailable } from '@/lib/constants/maintenance';
import MaintenancePage from './MaintenancePage';

type Props = {
  pageKey: Parameters<typeof isPageAvailable>[0];
  children: ReactNode;
};

/**
 * MaintenanceWrapper
 * Wraps a page's content and shows MaintenancePage when the page is under maintenance.
 * Place this between <ProtectedRoute> and the page content / <Suspense> boundary.
 *
 * Usage:
 *   <ProtectedRoute requiredPage="administration">
 *     <MaintenanceWrapper pageKey="administration">
 *       <Suspense fallback={<Skeleton />}>
 *         <AdministrationPageContent />
 *       </Suspense>
 *     </MaintenanceWrapper>
 *   </ProtectedRoute>
 *
 * Controlled by the NEXT_PUBLIC_<PAGE> environment variable.
 * Set to "false" to put the page under maintenance.
 */
export default function MaintenanceWrapper({ pageKey, children }: Props) {
  if (!isPageAvailable(pageKey)) {
    return <MaintenancePage />;
  }
  return <>{children}</>;
}
