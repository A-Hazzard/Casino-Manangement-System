/**
 * AdministrationCountriesSection Component
 *
 * Displays the Countries section of the Administration page.
 * Handles country listing, search, and CRUD operations.
 */

'use client';

import AdministrationCountrySearchBar from '@/components/CMS/administration/AdministrationCountrySearchBar';
import AdministrationCountryCard from '@/components/CMS/administration/cards/AdministrationCountryCard';
import AdministrationAddCountryModal from '@/components/CMS/administration/modals/AdministrationAddCountryModal';
import AdministrationDeleteCountryModal from '@/components/CMS/administration/modals/AdministrationDeleteCountryModal';
import AdministrationEditCountryModal from '@/components/CMS/administration/modals/AdministrationEditCountryModal';
import AdministrationCountryCardSkeleton from '@/components/CMS/administration/skeletons/AdministrationCountryCardSkeleton';
import AdministrationCountryTableSkeleton from '@/components/CMS/administration/skeletons/AdministrationCountryTableSkeleton';
import AdministrationCountryTable from '@/components/CMS/administration/tables/AdministrationCountryTable';
import type { Country } from '@/lib/types/country';
import { useEffect, useState } from 'react';

type AdministrationCountriesSectionProps = {
  isAddModalOpen: boolean;
  isEditModalOpen: boolean;
  setIsEditModalOpen: (country: Country) => void;
  isDeleteModalOpen: boolean;
  setIsDeleteModalOpen: (country: Country) => void;
  closeAddModal: () => void;
  closeEditModal: () => void;
  closeDeleteModal: () => void;
  selectedCountry: Country | null;
  countries: Country[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
};

export default function AdministrationCountriesSection({
  isAddModalOpen,
  isEditModalOpen,
  setIsEditModalOpen,
  isDeleteModalOpen,
  setIsDeleteModalOpen,
  closeAddModal,
  closeEditModal,
  closeDeleteModal,
  selectedCountry,
  countries,
  isLoading,
  onRefresh,
}: AdministrationCountriesSectionProps) {
  const [filteredCountries, setFilteredCountries] = useState<Country[]>([]);
  const [searchValue, setSearchValue] = useState('');

  // ============================================================================
  // Search Filtering
  // ============================================================================
  useEffect(() => {
    if (!searchValue.trim()) {
      setFilteredCountries(countries);
      return;
    }

    const searchLower = searchValue.toLowerCase();
    const filtered = countries.filter(
      (country) =>
        country.name.toLowerCase().includes(searchLower) ||
        country.alpha2.toLowerCase().includes(searchLower) ||
        country.alpha3.toLowerCase().includes(searchLower)
    );
    setFilteredCountries(filtered);
  }, [searchValue, countries]);

  // ============================================================================
  // CRUD Handlers
  // ============================================================================
  const handleEdit = (country: Country) => {
    setIsEditModalOpen(country);
  };

  const handleDelete = (country: Country) => {
    setIsDeleteModalOpen(country);
  };

  // ============================================================================
  // Render - Loading State
  // ============================================================================
  if (isLoading) {
    return (
      <>
        <div className="block lg:hidden">
          <AdministrationCountryCardSkeleton />
        </div>
        <div className="hidden lg:block">
          <AdministrationCountryTableSkeleton />
        </div>
      </>
    );
  }

  // ============================================================================
  // Render - Main Content
  // ============================================================================
  return (
    <>
      {countries.length > 20 && (
        <AdministrationCountrySearchBar
          searchValue={searchValue}
          setSearchValue={setSearchValue}
        />
      )}

      {/* Mobile Card View */}
      <div className="block lg:hidden">
        {filteredCountries.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredCountries.map(country => (
              <AdministrationCountryCard
                key={country._id}
                country={country}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-gray-500">
            No countries found.
          </p>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block">
        <AdministrationCountryTable
          countries={filteredCountries}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      {/* Modals */}
      <AdministrationAddCountryModal
        open={isAddModalOpen}
        onClose={closeAddModal}
        onSave={onRefresh}
      />

      <AdministrationEditCountryModal
        open={isEditModalOpen}
        onClose={closeEditModal}
        onSave={onRefresh}
        country={selectedCountry}
      />

      <AdministrationDeleteCountryModal
        open={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={onRefresh}
        country={selectedCountry}
      />
    </>
  );
}
