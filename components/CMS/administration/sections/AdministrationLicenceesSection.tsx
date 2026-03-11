/**
 * AdministrationLicenceesSection Component
 *
 * Displays the Licencees section of the Administration page.
 * Handles licencee listing, search, and CRUD operations.
 */

'use client';

import AdministrationLicenceeSearchBar from '@/components/CMS/administration/AdministrationLicenceeSearchBar';
import AdministrationLicenceeCard from '@/components/CMS/administration/cards/AdministrationLicenceeCard';
import AdministrationAddLicenceeModal from '@/components/CMS/administration/modals/AdministrationAddLicenceeModal';
import AdministrationDeleteLicenceeModal from '@/components/CMS/administration/modals/AdministrationDeleteLicenceeModal';
import AdministrationEditLicenceeModal from '@/components/CMS/administration/modals/AdministrationEditLicenceeModal';
import AdministrationLicenceeSuccessModal from '@/components/CMS/administration/modals/AdministrationLicenceeSuccessModal';
import AdministrationPaymentHistoryModal from '@/components/CMS/administration/modals/AdministrationPaymentHistoryModal';
import AdministrationPaymentStatusConfirmModal from '@/components/CMS/administration/modals/AdministrationPaymentStatusConfirmModal';
import AdministrationLicenceeCardSkeleton from '@/components/CMS/administration/skeletons/AdministrationLicenceeCardSkeleton';
import AdministrationLicenceeTableSkeleton from '@/components/CMS/administration/skeletons/AdministrationLicenceeTableSkeleton';
import AdministrationLicenceeTable from '@/components/CMS/administration/tables/AdministrationLicenceeTable';
import type { Country, Licencee } from '@/lib/types/common';
import type { AddLicenceeForm } from '@/lib/types/pages';

type AdministrationLicenceesSectionProps = {
  isLicenceesLoading: boolean;
  filteredLicencees: Licencee[];
  licenceeSearchValue: string;
  isAddLicenceeModalOpen: boolean;
  isEditLicenceeModalOpen: boolean;
  isDeleteLicenceeModalOpen: boolean;
  isPaymentHistoryModalOpen: boolean;
  isLicenceeSuccessModalOpen: boolean;
  isPaymentConfirmModalOpen: boolean;
  countries: Country[];
  isCountriesLoading: boolean;
  selectedLicencee: Licencee | null;
  licenceeForm: AddLicenceeForm;
  selectedLicenceeForPayment: Licencee | null;
  selectedLicenceeForPaymentChange: Licencee | null;
  createdLicencee: { name: string; licenceKey: string } | null;
  // Setters
  setLicenceeSearchValue: (value: string) => void;
  setIsAddLicenceeModalOpen: (open: boolean) => void;
  setIsEditLicenceeModalOpen: (open: boolean) => void;
  setIsDeleteLicenceeModalOpen: (open: boolean) => void;
  setIsPaymentHistoryModalOpen: (open: boolean) => void;
  setIsLicenceeSuccessModalOpen: (open: boolean) => void;
  setIsPaymentConfirmModalOpen: (open: boolean) => void;
  setSelectedLicencee: (licencee: Licencee | null) => void;
  setLicenceeForm: (form: AddLicenceeForm | ((prev: AddLicenceeForm) => AddLicenceeForm)) => void;
  setSelectedLicenceeForPayment: (licencee: Licencee | null) => void;
  setSelectedLicenceeForPaymentChange: (licencee: Licencee | null) => void;
  setCreatedLicencee: (licencee: { name: string; licenceKey: string } | null) => void;
  // Handlers
  handleOpenAddLicencee: () => void;
  handleSaveAddLicencee: () => Promise<void>;
  handleOpenEditLicencee: (licencee: Licencee) => void;
  handleSaveEditLicencee: () => Promise<void>;
  handleOpenDeleteLicencee: (licencee: Licencee) => void;
  handleDeleteLicencee: () => Promise<void>;
  handlePaymentHistory: (licencee: Licencee) => void;
  handleTogglePaymentStatus: (licencee: Licencee) => void;
  handleConfirmPaymentStatusChange: () => Promise<void>;
  refreshLicencees: () => Promise<void>;
};

export default function AdministrationLicenceesSection({
  isLicenceesLoading,
  filteredLicencees,
  licenceeSearchValue,
  isAddLicenceeModalOpen,
  isEditLicenceeModalOpen,
  isDeleteLicenceeModalOpen,
  isPaymentHistoryModalOpen,
  isLicenceeSuccessModalOpen,
  isPaymentConfirmModalOpen,
  countries,
  isCountriesLoading,
  selectedLicencee,
  licenceeForm,
  selectedLicenceeForPayment,
  selectedLicenceeForPaymentChange,
  createdLicencee,
  setLicenceeSearchValue,
  setIsAddLicenceeModalOpen,
  setIsEditLicenceeModalOpen,
  setIsDeleteLicenceeModalOpen,
  setIsPaymentHistoryModalOpen,
  setIsLicenceeSuccessModalOpen,
  setIsPaymentConfirmModalOpen,
  setLicenceeForm,
  setSelectedLicenceeForPayment,
  setSelectedLicenceeForPaymentChange,
  setCreatedLicencee,
  handleSaveAddLicencee,
  handleOpenEditLicencee,
  handleSaveEditLicencee,
  handleOpenDeleteLicencee,
  handleDeleteLicencee,
  handlePaymentHistory,
  handleTogglePaymentStatus,
  handleConfirmPaymentStatusChange,
  refreshLicencees,
}: AdministrationLicenceesSectionProps) {
  if (isLicenceesLoading) {
    return (
      <>
        <div className="block lg:hidden">
          <AdministrationLicenceeCardSkeleton />
        </div>
        <div className="hidden lg:block">
          <AdministrationLicenceeTableSkeleton />
        </div>
      </>
    );
  }

  return (
    <>
      <AdministrationLicenceeSearchBar
        searchValue={licenceeSearchValue}
        setSearchValue={setLicenceeSearchValue}
      />

      <div className="block lg:hidden">
        {filteredLicencees.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredLicencees.map(licencee => (
              <AdministrationLicenceeCard
                key={licencee._id}
                licencee={licencee}
                onEdit={handleOpenEditLicencee}
                onDelete={handleOpenDeleteLicencee}
                onPaymentHistory={handlePaymentHistory}
                onTogglePaymentStatus={handleTogglePaymentStatus}
              />
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-gray-500">
            No licencees found.
          </p>
        )}
      </div>
      <div className="hidden lg:block">
        <AdministrationLicenceeTable
          licencees={filteredLicencees}
          onEdit={handleOpenEditLicencee}
          onDelete={handleOpenDeleteLicencee}
          onPaymentHistory={handlePaymentHistory}
          onTogglePaymentStatus={handleTogglePaymentStatus}
        />
      </div>
      <AdministrationAddLicenceeModal
        open={isAddLicenceeModalOpen}
        onClose={async () => {
          setIsAddLicenceeModalOpen(false);
          await refreshLicencees();
        }}
        onSave={handleSaveAddLicencee}
        formState={licenceeForm}
        setFormState={data => setLicenceeForm(prev => ({ ...prev, ...data }))}
        countries={countries}
        countriesLoading={isCountriesLoading}
      />
      <AdministrationEditLicenceeModal
        open={isEditLicenceeModalOpen}
        onClose={async () => {
          setIsEditLicenceeModalOpen(false);
          await refreshLicencees();
        }}
        onSave={handleSaveEditLicencee}
        formState={licenceeForm}
        setFormState={data => setLicenceeForm(prev => ({ ...prev, ...data }))}
        countries={countries}
        countriesLoading={isCountriesLoading}
      />
      <AdministrationDeleteLicenceeModal
        open={isDeleteLicenceeModalOpen}
        onClose={() => setIsDeleteLicenceeModalOpen(false)}
        onDelete={handleDeleteLicencee}
        licencee={selectedLicencee}
      />
      <AdministrationPaymentHistoryModal
        open={isPaymentHistoryModalOpen}
        onClose={() => {
          setIsPaymentHistoryModalOpen(false);
          setSelectedLicenceeForPayment(null);
        }}
        licencee={selectedLicenceeForPayment}
      />
      <AdministrationLicenceeSuccessModal
        open={isLicenceeSuccessModalOpen}
        onClose={() => {
          setIsLicenceeSuccessModalOpen(false);
          setCreatedLicencee(null);
        }}
        licencee={createdLicencee}
      />
      <AdministrationPaymentStatusConfirmModal
        open={isPaymentConfirmModalOpen}
        onClose={() => {
          setIsPaymentConfirmModalOpen(false);
          setSelectedLicenceeForPaymentChange(null);
        }}
        onConfirm={handleConfirmPaymentStatusChange}
        currentStatus={
          selectedLicenceeForPaymentChange?.isPaid !== undefined
            ? selectedLicenceeForPaymentChange.isPaid
            : selectedLicenceeForPaymentChange?.expiryDate
              ? new Date(selectedLicenceeForPaymentChange.expiryDate) >
                new Date()
              : false
        }
        licenceeName={selectedLicenceeForPaymentChange?.name || ''}
        currentExpiryDate={selectedLicenceeForPaymentChange?.expiryDate}
      />
    </>
  );
}


