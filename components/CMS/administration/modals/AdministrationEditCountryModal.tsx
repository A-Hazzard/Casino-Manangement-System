/**
 * Edit Country Modal Component
 * Modal for editing existing countries.
 */

'use client';

import type { Country } from '@/lib/types/country';
import { gsap } from 'gsap';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

type AdministrationEditCountryModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  country: Country | null;
};

export default function AdministrationEditCountryModal({
  open,
  onClose,
  onSave,
  country,
}: AdministrationEditCountryModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    alpha2: '',
    alpha3: '',
    isoNumeric: '',
  });

  useEffect(() => {
    if (country) {
      setFormData({
        name: country.name || '',
        alpha2: country.alpha2 || '',
        alpha3: country.alpha3 || '',
        isoNumeric: country.isoNumeric || '',
      });
    }
  }, [country]);

  useEffect(() => {
    if (open && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { y: 80, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.35, ease: 'power2.out' }
      );
    }
  }, [open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!country?._id) return;

    if (!formData.name || !formData.alpha2 || !formData.alpha3 || !formData.isoNumeric) {
      toast.error('All fields are required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/countries', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          _id: country._id,
          ...formData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Country updated successfully');
        onSave();
        onClose();
      } else {
        toast.error(data.error || 'Failed to update country');
      }
    } catch (error) {
      console.error('Error updating country:', error);
      toast.error('Failed to update country');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div
        ref={modalRef}
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-lg"
      >
        <button
          className="absolute right-3 top-3 text-2xl text-gray-400 hover:text-gray-700"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="mb-4 text-2xl font-bold">Edit Country</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold">Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-button"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold">Alpha-2 *</label>
              <input
                type="text"
                name="alpha2"
                value={formData.alpha2}
                onChange={handleChange}
                maxLength={2}
                className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-button uppercase"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Alpha-3 *</label>
              <input
                type="text"
                name="alpha3"
                value={formData.alpha3}
                onChange={handleChange}
                maxLength={3}
                className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-button uppercase"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">ISO Numeric *</label>
            <input
              type="text"
              name="isoNumeric"
              value={formData.isoNumeric}
              onChange={handleChange}
              className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-button"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-button py-2 font-bold text-white transition hover:bg-buttonActive disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
