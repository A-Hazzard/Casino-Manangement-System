/**
 * Vault Catch-All Redirect Page
 *
 * Catches any unmatched vault sub-paths and redirects to the default
 * vault management view at `/vault/management`.
 */

import { redirect } from 'next/navigation';

export default function VaultCatchAllRedirect() {
  redirect('/vault/management');
}
