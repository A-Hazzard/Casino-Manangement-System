import { redirect } from 'next/navigation';

export default function VaultCatchAllRedirect() {
  redirect('/vault/management');
}
