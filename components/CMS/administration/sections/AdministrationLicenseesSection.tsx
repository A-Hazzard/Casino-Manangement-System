/**
 * AdministrationLicenseesSection Component
 *
 * Displays the Licensees section of the Administration page.
 * Handles licensee listing, search, and CRUD operations.
 */

'use client';

import AdministrationLicenseeSearchBar from '@/components/CMS/administration/AdministrationLicenseeSearchBar';
import AdministrationLicenseeCard from '@/components/CMS/administration/cards/AdministrationLicenseeCard';
import AdministrationLicenseeCardSkeleton from '@/components/CMS/administration/skeletons/AdministrationLicenseeCardSkeleton';
import AdministrationLicenseeTable from '@/components/CMS/administration/tables/AdministrationLicenseeTable';
import AdministrationLicenseeTableSkeleton from '@/components/CMS/administration/skeletons/AdministrationLicenseeTableSkeleton';
import AdministrationAddLicenseeModal from '@/components/CMS/administration/modals/AdministrationAddLicenseeModal';
import AdministrationEditLicenseeModal from '@/components/CMS/administration/modals/AdministrationEditLicenseeModal';
import AdministrationDeleteLicenseeModal from '@/components/CMS/administration/modals/AdministrationDeleteLicenseeModal';
import AdministrationPaymentHistoryModal from '@/components/CMS/administration/modals/AdministrationPaymentHistoryModal';
import AdministrationLicenseeSuccessModal from '@/components/CMS/administration/modals/AdministrationLicenseeSuccessModal';
import AdministrationPaymentStatusConfirmModal from '@/components/CMS/administration/modals/AdministrationPaymentStatusConfirmModal';
import type { Licensee } from '@/lib/types/common';
import type { Country } from '@/lib/types/common';
import type { AddLicenseeForm } from '@/lib/types/pages';

type AdministrationLicenseesSectionProps = {
  isLicenseesLoading: boolean;
  filteredLicensees: Licensee[];
  licenseeSearchValue: string;
  isAddLicenseeModalOpen: boolean;
  isEditLicenseeModalOpen: boolean;
  isDeleteLicenseeModalOpen: boolean;
  isPaymentHistoryModalOpen: boolean;
  isLicenseeSuccessModalOpen: boolean;
  isPaymentConfirmModalOpen: boolean;
  countries: Country[];
  isCountriesLoading: boolean;
  selectedLicensee: Licensee | null;
  licenseeForm: AddLicenseeForm;
  selectedLicenseeForPayment: Licensee | null;
  selectedLicenseeForPaymentChange: Licensee | null;
  createdLicensee: { name: string; licenseKey: string } | null;
  // Setters
  setLicenseeSearchValue: (value: string) => void;
  setIsAddLicenseeModalOpen: (open: boolean) => void;
  setIsEditLicenseeModalOpen: (open: boolean) => void;
  setIsDeleteLicenseeModalOpen: (open: boolean) => void;
  setIsPaymentHistoryModalOpen: (open: boolean) => void;
  setIsLicenseeSuccessModalOpen: (open: boolean) => void;
  setIsPaymentConfirmModalOpen: (open: boolean) => void;
  setSelectedLicensee: (licensee: Licensee | null) => void;
  setLicenseeForm: (form: AddLicenseeForm | ((prev: AddLicenseeForm) => AddLicenseeForm)) => void;
  setSelectedLicenseeForPayment: (licensee: Licensee | null) => void;
  setSelectedLicenseeForPaymentChange: (licensee: Licensee | null) => void;
  setCreatedLicensee: (licensee: { name: string; licenseKey: string } | null) => void;
  // Handlers
  handleOpenAddLicensee: () => void;
  handleSaveAddLicensee: () => Promise<void>;
  handleOpenEditLicensee: (licensee: Licensee) => void;
  handleSaveEditLicensee: () => Promise<void>;
  handleOpenDeleteLicensee: (licensee: Licensee) => void;
  handleDeleteLicensee: () => Promise<void>;
  handlePaymentHistory: (licensee: Licensee) => void;
  handleTogglePaymentStatus: (licensee: Licensee) => void;
  handleConfirmPaymentStatusChange: () => Promise<void>;
  refreshLicensees: () => Promise<void>;
};

export default function AdministrationLicenseesSection({
  isLicenseesLoading,
  filteredLicensees,
  licenseeSearchValue,
  isAddLicenseeModalOpen,
  isEditLicenseeModalOpen,
  isDeleteLicenseeModalOpen,
  isPaymentHistoryModalOpen,
  isLicenseeSuccessModalOpen,
  isPaymentConfirmModalOpen,
  countries,
  isCountriesLoading,
  selectedLicensee,
  licenseeForm,
  selectedLicenseeForPayment,
  selectedLicenseeForPaymentChange,
  createdLicensee,
  setLicenseeSearchValue,
  setIsAddLicenseeModalOpen,
  setIsEditLicenseeModalOpen,
  setIsDeleteLicenseeModalOpen,
  setIsPaymentHistoryModalOpen,
  setIsLicenseeSuccessModalOpen,
  setIsPaymentConfirmModalOpen,
  setLicenseeForm,
  setSelectedLicenseeForPayment,
  setSelectedLicenseeForPaymentChange,
  setCreatedLicensee,
  handleSaveAddLicensee,
  handleOpenEditLicensee,
  handleSaveEditLicensee,
  handleOpenDeleteLicensee,
  handleDeleteLicensee,
  handlePaymentHistory,
  handleTogglePaymentStatus,
  handleConfirmPaymentStatusChange,
  refreshLicensees,
}: AdministrationLicenseesSectionProps) {
  if (isLicenseesLoading) {
    return (
      <>
        <div className="block lg:hidden">
          <AdministrationLicenseeCardSkeleton />
        </div>
        <div className="hidden lg:block">
          <AdministrationLicenseeTableSkeleton />
        </div>
      </>
    );
  }

  return (
    <>
      <AdministrationLicenseeSearchBar
        searchValue={licenseeSearchValue}
        setSearchValue={setLicenseeSearchValue}
      />
      {!isCountriesLoading && countries.length === 0 && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          No countries are available. Please add countries first before creating
          or updating licensees.
        </p>
      )}
      <div className="block lg:hidden">
        {filteredLicensees.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredLicensees.map(licensee => (
              <AdministrationLicenseeCard
                key={licensee._id}
                licensee={licensee}
                onEdit={handleOpenEditLicensee}
                onDelete={handleOpenDeleteLicensee}
                onPaymentHistory={handlePaymentHistory}
                onTogglePaymentStatus={handleTogglePaymentStatus}
              />
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-gray-500">
            No licensees found.
          </p>
        )}
      </div>
      <div className="hidden lg:block">
        <AdministrationLicenseeTable
          licensees={filteredLicensees}
          onEdit={handleOpenEditLicensee}
          onDelete={handleOpenDeleteLicensee}
          onPaymentHistory={handlePaymentHistory}
          onTogglePaymentStatus={handleTogglePaymentStatus}
        />
      </div>
      <AdministrationAddLicenseeModal
        open={isAddLicenseeModalOpen}
        onClose={async () => {
          setIsAddLicenseeModalOpen(false);
          await refreshLicensees();
        }}
        onSave={handleSaveAddLicensee}
        formState={licenseeForm}
        setFormState={data => setLicenseeForm(prev => ({ ...prev, ...data }))}
        countries={countries}
        countriesLoading={isCountriesLoading}
      />
      <AdministrationEditLicenseeModal
        open={isEditLicenseeModalOpen}
        onClose={async () => {
          setIsEditLicenseeModalOpen(false);
          await refreshLicensees();
        }}
        onSave={handleSaveEditLicensee}
        formState={licenseeForm}
        setFormState={data => setLicenseeForm(prev => ({ ...prev, ...data }))}
        countries={countries}
        countriesLoading={isCountriesLoading}
      />
      <AdministrationDeleteLicenseeModal
        open={isDeleteLicenseeModalOpen}
        onClose={() => setIsDeleteLicenseeModalOpen(false)}
        onDelete={handleDeleteLicensee}
        licensee={selectedLicensee}
      />
      <AdministrationPaymentHistoryModal
        open={isPaymentHistoryModalOpen}
        onClose={() => {
          setIsPaymentHistoryModalOpen(false);
          setSelectedLicenseeForPayment(null);
        }}
        licensee={selectedLicenseeForPayment}
      />
      <AdministrationLicenseeSuccessModal
        open={isLicenseeSuccessModalOpen}
        onClose={() => {
          setIsLicenseeSuccessModalOpen(false);
          setCreatedLicensee(null);
        }}
        licensee={createdLicensee}
      />
      <AdministrationPaymentStatusConfirmModal
        open={isPaymentConfirmModalOpen}
        onClose={() => {
          setIsPaymentConfirmModalOpen(false);
          setSelectedLicenseeForPaymentChange(null);
        }}
        onConfirm={handleConfirmPaymentStatusChange}
        currentStatus={
          selectedLicenseeForPaymentChange?.isPaid !== undefined
            ? selectedLicenseeForPaymentChange.isPaid
            : selectedLicenseeForPaymentChange?.expiryDate
              ? new Date(selectedLicenseeForPaymentChange.expiryDate) >
                new Date()
              : false
        }
        licenseeName={selectedLicenseeForPaymentChange?.name || ''}
        currentExpiryDate={selectedLicenseeForPaymentChange?.expiryDate}
      />
    </>
  );
}


