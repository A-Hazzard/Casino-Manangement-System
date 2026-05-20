/**
 * Collection Report V2 — Start Session Dialog
 *
 * Modal dialog for starting a new capture session.
 * User selects a location, then the session is created
 * and the user is redirected to the session detail page.
 */

'use client';

import axios from 'axios';
import { useState } from 'react';

type LocationItem = {
  _id: string;
  name: string;
};

type StartSessionDialogProps = {
  locations: LocationItem[];
  onClose: () => void;
  /** Called with the new sessionId after the session is created. */
  onSessionCreated?: (sessionId: string) => void;
};

export default function CollectionReportV2StartSessionDialog({
  locations,
  onClose,
  onSessionCreated,
}: StartSessionDialogProps) {
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedLocation = locations.find(l => l._id === selectedLocationId);

  const handleStart = async () => {
    if (!selectedLocationId || !selectedLocation) return;
    setCreating(true);
    setError(null);

    try {
      const res = await axios.post('/api/collection-reports-v2/sessions', {
        locationId: selectedLocationId,
        locationName: selectedLocation.name,
      });

      if (res.data?.success) {
        const newSessionId = res.data.data.sessionId as string;
        onClose();
        onSessionCreated?.(newSessionId);
      } else {
        setError(res.data?.error || 'Failed to start session');
      }
    } catch (err) {
      setError('Failed to start session. Please try again.');
      console.error('[StartSession] Error:', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Start Collection Report
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <p className="text-sm text-gray-600">
            Select a location to begin a new collection capture session.
          </p>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Location
            </label>
            <select
              value={selectedLocationId}
              onChange={e => setSelectedLocationId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select a location...</option>
              {locations.map(location => (
                <option key={location._id} value={location._id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStart}
            disabled={!selectedLocationId || creating}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? 'Starting...' : 'Start Collection Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
