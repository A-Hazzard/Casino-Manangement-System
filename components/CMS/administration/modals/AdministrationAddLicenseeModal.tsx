/**
 * Add Licensee Modal Component
 * Modal for creating new licensees with country and date information.
 *
 * Features:
 * - Licensee name and description
 * - Country selection
 * - Start date and expiry date pickers
 * - Form validation
 * - GSAP animations
 * - Loading states for countries
 *
 * @param props - Component props
 */
'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { DateTimePicker } from '@/components/shared/ui/date-time-picker';
import { Info } from 'lucide-react';
import type { Country } from '@/lib/types/common';

type AdministrationAddLicenseeModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  formState: {
    name?: string;
    description?: string;
    country?: string;
    startDate?: Date | string;
    expiryDate?: Date | string;
  };
  setFormState: (data: {
    name?: string;
    description?: string;
    country?: string;
    startDate?: Date | string;
    expiryDate?: Date | string;
  }) => void;
  countries: Country[];
  countriesLoading?: boolean;
};

function AdministrationAddLicenseeModal({
  open,
  onClose,
  onSave,
  formState,
  setFormState,
  countries,
  countriesLoading = false,
}: AdministrationAddLicenseeModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { y: 80, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.35, ease: 'power2.out' }
      );
    }
  }, [open]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormState({ [e.target.name]: e.target.value });
  };

  const handleStartDateChange = (date: Date | undefined) => {
    setFormState({ startDate: date });
  };

  const handleExpiryDateChange = (date: Date | undefined) => {
    setFormState({ expiryDate: date });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name || !formState.country) {
      alert('Name and country are required');
      return;
    }
    onSave();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div
        ref={modalRef}
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-lg"
      >
        <button
          className="absolute right-3 top-3 text-gray-400 hover:text-gray-700"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="mb-4 text-2xl font-bold">New Licensee</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold">Name *</label>
            <input
              type="text"
              name="name"
              value={formState.name || ''}
              onChange={handleChange}
              className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">
              Description
            </label>
            <textarea
              name="description"
              value={formState.description || ''}
              onChange={handleChange}
              className="min-h-[80px] w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter description..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">
              Country *
            </label>
            <select
              name="country"
              value={formState.country || ''}
              onChange={handleChange}
              className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:bg-gray-100"
              required
              disabled={countriesLoading || countries.length === 0}
            >
              <option value="">
                {countriesLoading
                  ? 'Loading countries...'
                  : countries.length > 0
                    ? 'Select a country'
                    : 'No countries available'}
              </option>
              {countries.map(country => (
                <option key={country._id} value={country._id}>
                  {country.name}
                </option>
              ))}
            </select>
            {!countriesLoading && countries.length === 0 && (
              <p className="mt-1 text-xs text-red-500">
                No countries found. Please add countries before creating a
                licensee.
              </p>
            )}
          </div>

          {/* Date Automation Info */}
          <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm text-blue-700">
              <strong>Date Automation:</strong> If no start date is provided,
              today&apos;s date will be used. If no expiry date is provided, it
              will be set to 30 days from the start date.
            </p>
          </div>

          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-semibold">
              Start Date
              <div className="group relative">
                <Info className="h-4 w-4 cursor-help text-gray-400" />
                <div className="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  Defaults to today&apos;s date if left empty
                </div>
              </div>
            </label>
            <DateTimePicker
              date={
                formState.startDate ? new Date(formState.startDate) : undefined
              }
              setDate={handleStartDateChange}
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-semibold">
              Expiry Date
              <div className="group relative">
                <Info className="h-4 w-4 cursor-help text-gray-400" />
                <div className="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  Defaults to 30 days from start date if left empty
                </div>
              </div>
            </label>
            <DateTimePicker
              date={
                formState.expiryDate
                  ? new Date(formState.expiryDate)
                  : undefined
              }
              setDate={handleExpiryDateChange}
            />
          </div>

          <button
            type="submit"
            className="w-full rounded bg-button py-2 font-bold text-white transition hover:bg-buttonActive"
          >
            Create
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdministrationAddLicenseeModal;

