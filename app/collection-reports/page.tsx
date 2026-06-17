/**
 * Collection Reports Redirect Page
 *
 * Redirects legacy `/collection-reports` URL to the canonical
 * `/collection-report` path.
 */

import { redirect } from 'next/navigation';
export default function Page() {
  redirect('/collection-report');
  return null;
}
