import PageLayout from '@/components/shared/layout/PageLayout';
import VaultManagerHeader from '@/components/VAULT/layout/VaultManagerHeader';

export default function VaultCashDesksPageContent() {
  return (
    <PageLayout showHeader={false}>
      <div className="space-y-6">
        <VaultManagerHeader
          title="Cash Desks"
          description="Manage and monitor cashier stations"
        />

        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Feature Coming Soon
            </h2>
            <p className="mt-2 max-w-md text-gray-600">
              The Cash Desk management interface is currently under development.
              In the meantime, you can monitor desk balances from the Vault
              Dashboard.
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
