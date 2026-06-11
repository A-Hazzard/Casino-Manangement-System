/**
 * Installation Page
 *
 * First-time system setup and database seeding entry point.
 * Delegates all UI and initialization logic to InstallPageContent.
 *
 * @module app/install/page
 */

import InstallPageContent from '@/components/CMS/install/InstallPageContent';

export default function InstallPage() {
  return <InstallPageContent />;
}
