'use client';

import { useState } from 'react';

import type { AddCountryModalProps } from '@/lib/types/components';

export default function AddCountryModal({
  isOpen,
  onClose,
}: AddCountryModalProps) {
  const [formState, setFormState] = useState({
    name: '',
    alpha2: '',
    alpha3: '',
    isoNumeric: '',
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState({ ...formState, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formState.name ||
      !formState.alpha2 ||
      !formState.alpha3 ||
      !formState.isoNumeric
    ) {
      alert('All fields are required');
      return;
    }
    // Handle save logic here
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <button
          className="absolute right-3 top-3 text-gray-400 hover:text-gray-700"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="mb-4 text-2xl font-bold">Add Country</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold">Name</label>
            <input
              type="text"
              name="name"
              value={formState.name || ''}
              onChange={handleChange}
              className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-semibold">
                Alpha 2
              </label>
              <input
                type="text"
                name="alpha2"
                value={formState.alpha2 || ''}
                onChange={handleChange}
                className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                maxLength={2}
                required
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-semibold">
                Alpha 3
              </label>
              <input
                type="text"
                name="alpha3"
                value={formState.alpha3 || ''}
                onChange={handleChange}
                className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                maxLength={3}
                required
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-semibold">ISO</label>
              <input
                type="text"
                name="isoNumeric"
                value={formState.isoNumeric || ''}
                onChange={handleChange}
                className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                maxLength={3}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full rounded bg-button py-2 font-bold text-white transition hover:bg-button"
          >
            Add Country
          </button>
        </form>
      </div>
    </div>
  );
}
