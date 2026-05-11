/**
 * Collection Report V2 — Session Detail with Capture Wizard
 *
 * Wizard-style flow: step through each machine to capture photo + meters,
 * then review everything before submitting. Images stored as base64.
 */

'use client';

import axios from 'axios';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import CameraOverlay from './CameraOverlay';
import CollectionReportV2SessionDetailSkeleton from '@/components/ui/skeletons/CollectionReportV2SessionDetailSkeleton';
import CollectionReportV2SessionReport from './CollectionReportV2SessionReport';
import StatusBadge from './CollectionReportV2StatusBadge';

// ============================================================================
// Types
// ============================================================================

type WizardMode = 'capture' | 'review';

type SessionMachine = {
  reportedMachineId: string;
  machineId: string;
  machineName: string;
  machineCustomName: string;
  serialNumber: string;
  manufacturer: string;
  game?: string;
  status: 'pending' | 'captured' | 'confirmed' | 'skipped';
  sequenceOrder: number;
  systemMetersIn: number;
  systemMetersOut: number;
  sasStartTime?: string;
  sasEndTime?: string;
  imageData?: string;
  imageFileId?: string;
  imageName?: string;
  metersMatch?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type SessionDetail = {
  sessionId: string;
  sessionStatus: 'in-progress' | 'submitted';
  locationId: string;
  locationName: string;
  licencee: string;
  collector: string;
  collectorName: string;
  machinesTotal: number;
  machinesCaptured: number;
  machinesConfirmed: number;
  machinesSkipped: number;
  createdAt: string;
  machines: SessionMachine[];
};

type CaptureState = {
  imageData: string | null;
  metersMatch: boolean | null;
  manualMetersIn: string;
  manualMetersOut: string;
};

// ============================================================================
// Component
// ============================================================================

export default function CollectionReportV2SessionDetail() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.sessionId as string;

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<WizardMode>('capture');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Current capture state for the active machine
  const [captureState, setCaptureState] = useState<CaptureState>({
    imageData: null,
    metersMatch: null,
    manualMetersIn: '',
    manualMetersOut: '',
  });

  // ============================================================================
  // Fetch
  // ============================================================================

  const fetchSession = useCallback(
    async (background = false) => {
      if (!sessionId) return;
      if (!background) setLoading(true);
      if (!background) setError(null);
      try {
        const res = await axios.get(
          `/api/collection-reports-v2/sessions/${sessionId}`
        );
        if (res.data?.success) {
          setSession(res.data.data);
        } else {
          if (!background) setError(res.data?.error || 'Failed to load session');
        }
      } catch (_id) {
        if (!background) setError('Failed to load session details');
      } finally {
        if (!background) setLoading(false);
      }
    },
    [sessionId]
  );

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Reset capture state when current index changes
  const currentMachine = session?.machines[currentIndex];

  // Pre-fill capture state from existing data
  useEffect(() => {
    if (currentMachine) {
      setCaptureState({
        imageData: currentMachine.imageData ?? null,
        metersMatch: currentMachine.metersMatch ?? null,
        manualMetersIn:
          currentMachine.metersMatch === false
            ? String(currentMachine.systemMetersIn)
            : '',
        manualMetersOut:
          currentMachine.metersMatch === false
            ? String(currentMachine.systemMetersOut)
            : '',
      });
    }
  }, [currentIndex, currentMachine?.reportedMachineId]);

  // ============================================================================
  // Image Handling (camera overlay)
  // ============================================================================

  const handleCameraCapture = (imageData: string) => {
    setCaptureState(prev => ({ ...prev, imageData }));
    setShowCamera(false);
  };

  // ============================================================================
  // Back Navigation
  // ============================================================================

  const handleBack = () => {
    if (currentIndex <= 0 || !session) return;
    const prevIndex = currentIndex - 1;
    const prevMachine = session.machines[prevIndex];
    if (!prevMachine) return;
    setCaptureState({
      imageData: prevMachine.imageData ?? null,
      metersMatch: prevMachine.metersMatch ?? null,
      manualMetersIn:
        prevMachine.metersMatch === false
          ? String(prevMachine.systemMetersIn)
          : '',
      manualMetersOut:
        prevMachine.metersMatch === false
          ? String(prevMachine.systemMetersOut)
          : '',
    });
    setCurrentIndex(prevIndex);
  };

  // ============================================================================
  // Next (pure navigation, no save)
  // ============================================================================

  const handleNext = () => {
    if (!session) return;
    const machines = session.machines;
    const nextIndex = findNextPending(currentIndex + 1);
    if (nextIndex !== -1) {
      const nextMachine = machines[nextIndex];
      setCaptureState({
        imageData: nextMachine.imageData ?? null,
        metersMatch: nextMachine.metersMatch ?? null,
        manualMetersIn:
          nextMachine.metersMatch === false
            ? String(nextMachine.systemMetersIn)
            : '',
        manualMetersOut:
          nextMachine.metersMatch === false
            ? String(nextMachine.systemMetersOut)
            : '',
      });
      setCurrentIndex(nextIndex);
    } else {
      setMode('review');
    }
  };

  // ============================================================================
  // Save & Next
  // ============================================================================

  const handleSaveAndNext = async () => {
    if (!currentMachine) return;
    setSaving(true);
    setSaveError(null);

    try {
      const isMatch = captureState.metersMatch;
      const status = isMatch === false ? 'captured' : 'confirmed';

      const payload: Record<string, unknown> = {
        metersMatch: isMatch,
        status,
        imageData: captureState.imageData || undefined,
        imageCapturedAt: captureState.imageData
          ? new Date().toISOString()
          : undefined,
      };

      if (isMatch === false) {
        payload.systemMetersIn =
          Number(captureState.manualMetersIn) || currentMachine.systemMetersIn;
        payload.systemMetersOut =
          Number(captureState.manualMetersOut) ||
          currentMachine.systemMetersOut;
      }

      if (currentMachine.reportedMachineId) {
        await axios.patch(
          `/api/collection-reports-v2/machines?id=${currentMachine.reportedMachineId}`,
          payload
        );
      } else {
        payload.sessionId = sessionId;
        payload.machineId = currentMachine.machineId;
        payload.machineName = currentMachine.machineName;
        payload.machineCustomName = currentMachine.machineCustomName;
        payload.serialNumber = currentMachine.serialNumber;
        payload.manufacturer = currentMachine.manufacturer;
        payload.game = currentMachine.game || '';
        payload.locationId = session?.locationId || '';
        payload.locationName = session?.locationName || '';
        payload.sequenceOrder = currentMachine.sequenceOrder;
        payload.collector = session?.collector || '';
        payload.collectorName = session?.collectorName || '';
        payload.systemMetersIn = currentMachine.systemMetersIn;
        payload.systemMetersOut = currentMachine.systemMetersOut;

        await axios.post('/api/collection-reports-v2/machines', payload);
      }

      const res = await axios.get(
        `/api/collection-reports-v2/sessions/${sessionId}`
      );
      const newSession = res.data?.data;
      if (newSession) {
        setSession(newSession);
      }
      setSaveError(null);

      // Advance to next pending machine or go to review.
      // Use newSession directly (not React state closure) to avoid stale data.
      const machines = newSession?.machines ?? session?.machines ?? [];
      const nextIndex = (() => {
        for (
          let index = currentIndex + 1;
          index < machines.length;
          index++
        ) {
          if (
            machines[index].status === 'pending' ||
            machines[index].status === 'captured'
          ) {
            return index;
          }
        }
        return -1;
      })();

      // Explicitly reset capture state using the next machine's data
      const nextMachine = nextIndex !== -1 ? machines[nextIndex] : null;
      setCaptureState({
        imageData: nextMachine?.imageData ?? null,
        metersMatch: nextMachine?.metersMatch ?? null,
        manualMetersIn: '',
        manualMetersOut: '',
      });

      if (nextIndex !== -1) {
        setCurrentIndex(nextIndex);
      } else {
        setMode('review');
      }
    } catch (err) {
      console.error('[SaveAndNext] Error:', err);
      setSaveError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    if (!currentMachine) return;
    setSaving(true);
    setSaveError(null);

    try {
      if (currentMachine.reportedMachineId) {
        await axios.patch(
          `/api/collection-reports-v2/machines?id=${currentMachine.reportedMachineId}`,
          { status: 'skipped' }
        );
      } else {
        await axios.post('/api/collection-reports-v2/machines', {
          sessionId,
          machineId: currentMachine.machineId,
          machineName: currentMachine.machineName,
          machineCustomName: currentMachine.machineCustomName,
          serialNumber: currentMachine.serialNumber,
          manufacturer: currentMachine.manufacturer,
          game: currentMachine.game || '',
          locationId: session?.locationId || '',
          locationName: session?.locationName || '',
          sequenceOrder: currentMachine.sequenceOrder,
          collector: session?.collector || '',
          collectorName: session?.collectorName || '',
          systemMetersIn: currentMachine.systemMetersIn,
          systemMetersOut: currentMachine.systemMetersOut,
          status: 'skipped',
        });
      }

      const res = await axios.get(
        `/api/collection-reports-v2/sessions/${sessionId}`
      );
      const newSession = res.data?.data;
      if (newSession) {
        setSession(newSession);
      }
      setSaveError(null);

      // Advance to next pending machine or go to review.
      // Use newSession directly to avoid stale closure on session.
      const machines = newSession?.machines ?? session?.machines ?? [];
      const nextIndex = (() => {
        for (
          let index = currentIndex + 1;
          index < machines.length;
          index++
        ) {
          if (
            machines[index].status === 'pending' ||
            machines[index].status === 'captured'
          ) {
            return index;
          }
        }
        return -1;
      })();

      // Explicitly reset capture state using the next machine's data
      const nextMachine = nextIndex !== -1 ? machines[nextIndex] : null;
      setCaptureState({
        imageData: nextMachine?.imageData ?? null,
        metersMatch: nextMachine?.metersMatch ?? null,
        manualMetersIn: '',
        manualMetersOut: '',
      });

      if (nextIndex !== -1) {
        setCurrentIndex(nextIndex);
      } else {
        setMode('review');
      }
    } catch (err) {
      console.error('[Skip] Error:', err);
      setSaveError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!sessionId) return;
    setSubmitting(true);
    try {
      await axios.patch(
        `/api/collection-reports-v2/sessions/${sessionId}/submit`
      );
      await fetchSession();
    } catch (err) {
      console.error('Failed to submit session:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionId) return;
    setDeleting(true);
    try {
      await axios.delete(
        `/api/collection-reports-v2/sessions/${sessionId}`
      );
      router.push('/collection-report');
    } catch (err) {
      console.error('Failed to delete session:', err);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // ============================================================================
  // Helpers
  // ============================================================================

  const findNextPending = (fromIndex: number): number => {
    const machines = session?.machines ?? [];
    for (let index = fromIndex; index < machines.length; index++) {
      if (
        machines[index].status === 'pending' ||
        machines[index].status === 'captured'
      ) {
        return index;
      }
    }
    return -1;
  };

  // ============================================================================
  // Loading / Error
  // ============================================================================

  if (loading) {
    return <CollectionReportV2SessionDetailSkeleton />;
  }

  if (error || !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <p className="mb-4 text-red-600">{error || 'Session not found'}</p>
        <button
          type="button"
          onClick={() => router.push('/collection-report')}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Back to Reports
        </button>
      </div>
    );
  }

  if (session.sessionStatus === 'submitted') {
    return (
      <CollectionReportV2SessionReport session={session} router={router} />
    );
  }

  if (mode === 'review') {
    return (
      <ReviewView
        session={session}
        submitting={submitting}
        onBack={() => {
          const nextIndex = findNextPending(0);
          if (nextIndex !== -1) {
            setCurrentIndex(nextIndex);
            setMode('capture');
          }
        }}
        onSubmit={handleSubmit}
        onEditMachine={(index) => {
          setCurrentIndex(index);
          setMode('capture');
        }}
        router={router}
      />
    );
  }

  // ============================================================================
  // Capture Wizard
  // ============================================================================

  if (!currentMachine) {
    // All machines done, switch to review
    return (
      <ReviewView
        session={session}
        submitting={submitting}
        onSubmit={handleSubmit}
        onEditMachine={(index) => {
          setCurrentIndex(index);
          setMode('capture');
        }}
        router={router}
      />
    );
  }

  const totalCount = session.machines.length;
  const doneCount = session.machines.filter(
    m => m.status === 'confirmed' || m.status === 'skipped'
  ).length;
  const isLast = findNextPending(currentIndex + 1) === -1;
  const isDone =
    currentMachine.status === 'confirmed' ||
    currentMachine.status === 'skipped';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Back + Progress */}
        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.push('/collection-report')}
              className="flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <svg
                className="mr-1 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Reports
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-sm text-red-400 hover:text-red-600"
            >
              Delete session
            </button>
          </div>

          {/* Progress Bar */}
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">
                {session.locationName}
              </span>
              <span className="flex items-center gap-1 text-gray-500">
                <input
                  type="number"
                  min={1}
                  max={totalCount}
                  value={currentIndex + 1}
                  onChange={e => {
                    const value = parseInt(e.target.value, 10);
                    if (
                      value >= 1 &&
                      value <= totalCount &&
                      session
                    ) {
                      const target = session.machines[value - 1];
                      if (target) {
                        setCaptureState({
                          imageData: target.imageData ?? null,
                          metersMatch: target.metersMatch ?? null,
                          manualMetersIn:
                            target.metersMatch === false
                              ? String(target.systemMetersIn)
                              : '',
                          manualMetersOut:
                            target.metersMatch === false
                              ? String(target.systemMetersOut)
                              : '',
                        });
                        setCurrentIndex(value - 1);
                      }
                    }
                  }}
                  className="w-14 rounded border border-gray-300 px-2 py-0.5 text-center text-sm"
                />
                <span>/ {totalCount} machines</span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${(doneCount / totalCount) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Machine Capture Card */}
        <div className="rounded-lg bg-white p-4 shadow-md sm:p-6">
          {/* Machine Header */}
          <div className="mb-6 border-b border-gray-100 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Machine {currentIndex + 1} of {totalCount}
                </h2>
                <p className="text-lg font-semibold text-gray-800">
                  {currentMachine.machineCustomName ||
                    currentMachine.machineName}
                </p>
                <div className="mt-1 flex flex-wrap gap-x-4 text-sm text-gray-500">
                  {currentMachine.serialNumber && (
                    <span>SN: {currentMachine.serialNumber}</span>
                  )}
                  {currentMachine.manufacturer && (
                    <span>{currentMachine.manufacturer}</span>
                  )}
                  {currentMachine.game && <span>{currentMachine.game}</span>}
                </div>
              </div>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                #{currentMachine.sequenceOrder + 1}
              </span>
            </div>
          </div>

          {/* System Meters */}
          <div className="mb-6">
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
              System Meters (from SMIB)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4">
                <div className="text-xs text-gray-500">Meters In</div>
                <div className="text-xl font-bold text-gray-900 sm:text-2xl">
                  {currentMachine.systemMetersIn.toLocaleString()}
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4">
                <div className="text-xs text-gray-500">Meters Out</div>
                <div className="text-xl font-bold text-gray-900 sm:text-2xl">
                  {currentMachine.systemMetersOut.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Photo Capture */}
          <div className="mb-6">
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
              Meter Photo
            </label>
            {captureState.imageData ? (
              <div className="relative">
                <img
                  src={captureState.imageData}
                  alt="Meter"
                  className="max-h-64 w-full rounded-lg border border-gray-200 object-contain"
                />
                <button
                  type="button"
                  onClick={() =>
                    setCaptureState(prev => ({ ...prev, imageData: null }))
                  }
                  className="absolute right-2 top-2 rounded-full bg-red-500 p-1.5 text-white hover:bg-red-600"
                >
                  <svg
                    className="h-4 w-4"
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
            ) : (
              <button
                type="button"
                onClick={() => setShowCamera(true)}
                className="flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 transition-colors hover:border-blue-400 hover:bg-blue-50 sm:p-8"
              >
                <svg
                  className="mb-3 h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-base font-medium text-gray-600">
                  Tap to take a photo
                </span>
                <span className="mt-1 text-sm text-gray-400">
                  Camera will open automatically
                </span>
              </button>
            )}
          </div>

          {/* Meters Match */}
          <div className="mb-6">
            <label className="mb-3 block text-sm font-medium text-gray-700">
              Do the physical meters match the system values?
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <button
                type="button"
                onClick={() =>
                  setCaptureState(prev => ({
                    ...prev,
                    metersMatch: true,
                    manualMetersIn: '',
                    manualMetersOut: '',
                  }))
                }
                className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                  captureState.metersMatch === true
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <div className="text-sm sm:text-base">✓ Yes, they match</div>
                <div className="mt-0.5 text-xs opacity-75">
                  Use system values as-is
                </div>
              </button>
              <button
                type="button"
                onClick={() =>
                  setCaptureState(prev => ({ ...prev, metersMatch: false }))
                }
                className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                  captureState.metersMatch === false
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <div className="text-sm sm:text-base">✗ No, enter manually</div>
                <div className="mt-0.5 text-xs opacity-75">
                  Type the actual meter values
                </div>
              </button>
            </div>
          </div>

          {/* Manual Entry */}
          {captureState.metersMatch === false && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <label className="mb-3 block text-sm font-medium text-amber-800">
                Enter actual meter values from the machine
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div>
                  <label className="block text-xs text-amber-700">
                    Actual Meters In
                  </label>
                  <input
                    type="number"
                    value={captureState.manualMetersIn}
                    onChange={e =>
                      setCaptureState(prev => ({
                        ...prev,
                        manualMetersIn: e.target.value,
                      }))
                    }
                    placeholder={String(currentMachine.systemMetersIn)}
                    className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-4 py-3 text-sm focus:border-amber-500 focus:outline-none sm:py-2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs text-amber-700">
                    Actual Meters Out
                  </label>
                  <input
                    type="number"
                    value={captureState.manualMetersOut}
                    onChange={e =>
                      setCaptureState(prev => ({
                        ...prev,
                        manualMetersOut: e.target.value,
                      }))
                    }
                    placeholder={String(currentMachine.systemMetersOut)}
                    className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-4 py-3 text-sm focus:border-amber-500 focus:outline-none sm:py-2.5"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Save Error */}
          {saveError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-red-700">{saveError}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSaveError(null)}
                    className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              {currentIndex > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={saving}
                  className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={() => router.push('/collection-report')}
                className="text-center text-sm text-gray-400 hover:text-gray-600 sm:text-left"
              >
                Cancel
              </button>
            </div>
            <div className="flex gap-2 sm:gap-3">
              {isDone ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={saving}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 sm:flex-none sm:px-5"
                >
                  Next
                </button>
              ) : (
                <>
                  {currentMachine.status !== 'skipped' && (
                    <button
                      type="button"
                      onClick={handleSkip}
                      disabled={saving}
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 sm:flex-none sm:px-5"
                    >
                      Skip
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveAndNext}
                    disabled={saving || captureState.metersMatch === null}
                    className="flex-1 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 sm:flex-none sm:px-6"
                  >
                    {saving
                      ? 'Saving...'
                      : isLast
                        ? 'Review'
                        : 'Save & Next'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      {showCamera && currentMachine && (
        <CameraOverlay
          machineInfo={{
            serialNumber: currentMachine.serialNumber,
            machineCustomName: currentMachine.machineCustomName,
            machineName: currentMachine.machineName,
            manufacturer: currentMachine.manufacturer,
            systemMetersIn: currentMachine.systemMetersIn,
            systemMetersOut: currentMachine.systemMetersOut,
          }}
          onCapture={handleCameraCapture}
          onCancel={() => setShowCamera(false)}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Delete Session
            </h3>
            <p className="mb-6 text-sm text-gray-600">
              Are you sure? This will permanently remove all captured data
              for this session.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSession}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Review View Component
// ============================================================================

function ReviewView({
  session,
  submitting,
  onBack,
  onSubmit,
  onEditMachine,
  router,
}: {
  session: SessionDetail;
  submitting: boolean;
  onBack?: () => void;
  onSubmit: () => void;
  onEditMachine?: (index: number) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const allSkipped = session.machines.every(m => m.status === 'skipped');
  const anyCaptured = session.machines.some(
    m => m.status === 'confirmed' || m.status === 'captured'
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => router.push('/collection-report')}
          className="mb-4 flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <svg
            className="mr-1 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Reports
        </button>

        <div className="mb-6 rounded-lg bg-white p-4 shadow-md sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                  Review Session
                </h1>
                <p className="text-sm text-gray-500">
                  {session.locationName} · {session.machinesTotal} machines
                </p>
              </div>
              <div className="flex gap-2 sm:gap-3">
                {onBack && (
                  <button
                    type="button"
                    onClick={onBack}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:flex-none sm:px-4"
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={submitting || (!anyCaptured && !allSkipped)}
                  className="flex-1 rounded-lg bg-green-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 sm:flex-none sm:px-6"
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
          </div>
        </div>

        {/* Machine Review Cards */}
        <div className="space-y-3">
          {session.machines.map((machine, index) => {
            const isDone =
              machine.status === 'confirmed' || machine.status === 'skipped';
            return (
              <div
                key={machine.reportedMachineId || index}
                className={`rounded-lg border bg-white p-4 shadow-sm ${
                  isDone ? 'border-green-200' : 'border-amber-200'
                }`}
              >
                <div className="flex gap-4">
                  {/* Thumbnail */}
                  <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                    {machine.imageData ? (
                      <img
                        src={machine.imageData}
                        alt={machine.machineName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-gray-400">
                        No photo
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {machine.machineCustomName || machine.machineName}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {machine.serialNumber && `${machine.serialNumber} · `}
                          {machine.manufacturer}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={machine.status} />
                        {onEditMachine && (
                          <button
                            type="button"
                            onClick={() => onEditMachine(index)}
                            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            title="Edit this machine"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-gray-400">Sys In:</span>{' '}
                        <span className="font-medium text-gray-700">
                          {machine.systemMetersIn.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Sys Out:</span>{' '}
                        <span className="font-medium text-gray-700">
                          {machine.systemMetersOut.toLocaleString()}
                        </span>
                      </div>
                      {machine.metersMatch !== undefined && (
                        <div className="col-span-2">
                          <span className="text-gray-400">Meters match:</span>{' '}
                          <span
                            className={
                              machine.metersMatch
                                ? 'text-green-600'
                                : 'text-amber-600'
                            }
                          >
                            {machine.metersMatch ? 'Yes' : 'No (manual entry)'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-6 rounded-lg bg-white p-4 shadow-md">
          <div className="text-center text-sm text-gray-600 sm:text-left">
            <strong className="text-gray-900">
              {session.machinesConfirmed}
            </strong>{' '}
            confirmed ·{' '}
            <strong className="text-gray-900">{session.machinesSkipped}</strong>{' '}
            skipped ·{' '}
            <strong className="text-gray-900">
              {session.machinesTotal -
                session.machinesCaptured -
                session.machinesSkipped}
            </strong>{' '}
            pending ·{' '}
            <strong className="text-gray-900">
              {session.machinesCaptured -
                session.machinesConfirmed}
            </strong>{' '}
            captured
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Submitted View
// ============================================================================


