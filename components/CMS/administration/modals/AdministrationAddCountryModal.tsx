/**
 * Add Country Modal Component
 * Modal for creating new countries with alphabetical and numeric codes.
 */

'use client';

import { gsap } from 'gsap';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

type AdministrationAddCountryModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
};

export default function AdministrationAddCountryModal({
  open,
  onClose,
  onSave,
}: AdministrationAddCountryModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    alpha2: '',
    alpha3: '',
    isoNumeric: '',
  });

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
    if (!formData.name || !formData.alpha2 || !formData.alpha3 || !formData.isoNumeric) {
      toast.error('All fields are required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/countries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Country added successfully');
        setFormData({ name: '', alpha2: '', alpha3: '', isoNumeric: '' });
        onSave();
        onClose();
      } else {
        toast.error(data.error || 'Failed to add country');
      }
    } catch (error) {
      console.error('Error adding country:', error);
      toast.error('Failed to add country');
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
        <h2 className="mb-4 text-2xl font-bold">Add New Country</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold">Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. South Africa"
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
                placeholder="e.g. ZA"
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
                placeholder="e.g. ZAF"
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
              placeholder="e.g. 710"
              className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-button"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-button py-2 font-bold text-white transition hover:bg-buttonActive disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Country'}
          </button>
        </form>
      </div>
    </div>
  );
}
