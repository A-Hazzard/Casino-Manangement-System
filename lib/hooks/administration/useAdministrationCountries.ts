/**
 * useAdministrationCountries Hook
 *
 * Manages state and handlers for the Countries section of the Administration page.
 */

'use client';

import { Country } from '@/lib/types/country';
import { useCallback, useEffect, useState } from 'react';

export function useAdministrationCountries() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCountries = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/countries');
      const data = await response.json();

      if (data.success) {
        setCountries(data.countries);
      } else {
        // Silently fail or use a toast if you want, but hooks usually just update state
        console.error('Failed to fetch countries');
      }
    } catch (error) {
      console.error('Error fetching countries:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);
  
  const openAddModal = useCallback(() => {
    setIsAddModalOpen(true);
  }, []);

  const closeAddModal = useCallback(() => {
    setIsAddModalOpen(false);
  }, []);

  const openEditModal = useCallback((country: Country) => {
    setSelectedCountry(country);
    setIsEditModalOpen(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setSelectedCountry(null);
  }, []);

  const openDeleteModal = useCallback((country: Country) => {
    setSelectedCountry(country);
    setIsDeleteModalOpen(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false);
    setSelectedCountry(null);
  }, []);

  return {
    isAddModalOpen,
    isEditModalOpen,
    isDeleteModalOpen,
    selectedCountry,
    countries,
    isLoading,
    refreshCountries: fetchCountries,
    openAddModal,
    closeAddModal,
    openEditModal,
    closeEditModal,
    openDeleteModal,
    closeDeleteModal,
  };
}
