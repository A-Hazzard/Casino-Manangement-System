/**
 * Vault Page (Root)
 *
 * Redirects the root `/vault` path to the default vault management view
 * at `/vault/management`.
 */

import { redirect } from 'next/navigation';

export default function VaultRootPage() {
  redirect('/vault/management');
}
