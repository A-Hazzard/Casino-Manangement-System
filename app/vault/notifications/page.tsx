/**
 * Vault Notifications Page
 *
 * Dedicated page for Vault Managers to review all system alerts and operation notifications.
 */
import VaultNotificationsPanel from '@/components/VAULT/admin/VaultNotificationsPanel';
import VaultManagerHeader from '@/components/VAULT/layout/VaultManagerHeader';
import PageLayout from '@/components/shared/layout/PageLayout';

export const metadata = {
  title: 'Vault Notifications | Evolution One',
  description:
    'Review and manage vault system alerts and operational notifications.',
};

export default function VaultNotificationsPage() {
  return (
    <PageLayout>
      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
        <VaultManagerHeader
          title="Vault Notifications"
          description="Review and manage system alerts and operational messages for the vault."
        />
        <VaultNotificationsPanel />
      </div>
    </PageLayout>
  );
}
