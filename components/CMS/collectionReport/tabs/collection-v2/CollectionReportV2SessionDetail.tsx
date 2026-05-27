/**
 * Collection Report V2 — Session Detail with Capture Wizard
 *
 * Wizard-style flow: step through each machine to capture photo + meters,
 * then review everything before submitting. Images stored as base64.
 */

'use client';

import axios from 'axios';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import CameraOverlay from './CameraOverlay';
import CollectionReportV2SessionDetailSkeleton from '@/components/ui/skeletons/CollectionReportV2SessionDetailSkeleton';
import CollectionReportV2SessionReport from './CollectionReportV2SessionReport';
import StatusBadge from './CollectionReportV2StatusBadge';
import { MuiDateCalendar } from '@/components/shared/ui/MuiDateCalendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shared/ui/popover';
import { useUserStore } from '@/lib/store/userStore';

// ============================================================================
// Types
// ============================================================================

type WizardMode = 'capture' | 'review';

type ReportedMachineMovement = {
  sasMetersIn?: number;
  sasMetersOut?: number;
  sasGross?: number;
  manualMetersIn?: number;
  manualMetersOut?: number;
  machineGross?: number;
};

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
  sasMetersIn: number | null;
  sasMetersOut: number | null;
  manualMetersIn?: number;
  manualMetersOut?: number;
  prevsasMetersIn?: number;
  prevsasMetersOut?: number;
  prevManualMetersIn?: number;
  prevManualMetersOut?: number;
  movement?: ReportedMachineMovement;
  sasStartTime?: string;
  sasEndTime?: string;
  sessionStartTime?: string;
  sessionEndTime?: string;
  imageData?: string;
  metersMatch?: boolean;
  ramClear?: boolean;
  ramClearMetersIn?: number;
  ramClearMetersOut?: number;
  // These are movement-based (movement.machineGross / movement.sasGross)
  machineGross?: number;
  sasGross?: number;
  grossDifference?: number;
  lastCollectionTime?: string | null;
  isSupplemental?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type SessionDetail = {
  sessionId: string;
  sessionStatus: 'in-progress' | 'submitted';
  locationId: string;
  locationName: string;
  noSMIBLocation?: boolean;
  licencee: string;
  collector: string;
  collectorName: string;
  sessionStartTime?: string;
  sessionEndTime?: string;
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
  ramClear: boolean;
  ramClearMetersIn: string;
  ramClearMetersOut: string;
};

// ============================================================================
// Component
// ============================================================================

type SessionDetailProps = {
  /** When provided (modal mode), overrides the URL param. */
  sessionId?: string;
  /** Called instead of navigating away — used when embedded in a modal. */
  onClose?: () => void;
};

export default function CollectionReportV2SessionDetail({
  sessionId: sessionIdProp,
  onClose,
}: SessionDetailProps = {}) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const params = useParams();
  const router = useRouter();
  const sessionId = sessionIdProp ?? (params?.sessionId as string);

  // Navigate back to the V2 tab — calls onClose in modal mode, navigates otherwise.
  const handleBackToReports = () => {
    if (onClose) {
      onClose();
    } else {
      router.push('/collection-report?section=collection-v2');
    }
  };

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
  const [editMode, setEditMode] = useState(false);
  const [checkingCollection, setCheckingCollection] = useState(false);
  const [machineLastCollectionInput, setMachineLastCollectionInput] =
    useState('');

  // Custom SAS period — for past reports where the user wants to override the
  // auto-detected last-collection date and specify an explicit start + end.
  const [useCustomPeriod, setUseCustomPeriod] = useState(false);
  const [customSasStart, setCustomSasStart] = useState('');
  const [customSasEnd, setCustomSasEnd] = useState('');
  const [machineFirstCollectionTime, setMachineFirstCollectionTime] = useState<Date | null>(null);
  const [machineLastCollectionTime, setMachineLastCollectionTime] = useState<Date | null>(null);
  const [fetchingCustomMeters, setFetchingCustomMeters] = useState(false);
  const [sasStartOpen, setSasStartOpen] = useState(false);
  const [sasEndOpen, setSasEndOpen] = useState(false);
  const originalMetersRef = useRef<{
    in: number | null;
    out: number | null;
  } | null>(null);

  const autoEdited = useRef(false);

  const { user } = useUserStore();
  const userRoles = (user?.roles as string[]) || [];
  const isDeveloper = userRoles.includes('developer');
  const isAdmin = userRoles.includes('admin');

  // Images are now persisted to MongoDB (as tempImageData) on each save,
  // then uploaded to Google Drive on submit. No client-side cache needed.

  // Current capture state for the active machine
  const [captureState, setCaptureState] = useState<CaptureState>({
    imageData: null,
    metersMatch: null,
    manualMetersIn: '',
    manualMetersOut: '',
    ramClear: false,
    ramClearMetersIn: '',
    ramClearMetersOut: '',
  });

  // ============================================================================
  // Effects
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
          if (!background)
            setError(res.data?.error || 'Failed to load session');
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

  // Auto-enter edit mode when a submitted session is opened via pencil
  useEffect(() => {
    if (session?.sessionStatus === 'submitted' && !autoEdited.current) {
      autoEdited.current = true;
      handleEnterEditMode();
    }
  }, [session?.sessionStatus]);

  // Reset capture state when current index changes
  const currentMachine = session?.machines[currentIndex];

  const getInitialCaptureStateForMachine = useCallback(
    (
      machine: SessionMachine | undefined | null,
      isNoSMIB: boolean
    ): CaptureState => {
      if (!machine) {
        return {
          imageData: null,
          metersMatch: isNoSMIB ? true : null,
          manualMetersIn: '',
          manualMetersOut: '',
          ramClear: false,
          ramClearMetersIn: '',
          ramClearMetersOut: '',
        };
      }
      return {
        imageData: machine.imageData ?? null,
        metersMatch: isNoSMIB ? true : (machine.metersMatch ?? null),
        manualMetersIn:
          isNoSMIB || machine.metersMatch === false
            ? String(machine.manualMetersIn ?? machine.sasMetersIn ?? '')
            : '',
        manualMetersOut:
          isNoSMIB || machine.metersMatch === false
            ? String(machine.manualMetersOut ?? machine.sasMetersOut ?? '')
            : '',
        ramClear: machine.ramClear === true,
        ramClearMetersIn:
          machine.ramClearMetersIn !== undefined
            ? String(machine.ramClearMetersIn)
            : '',
        ramClearMetersOut:
          machine.ramClearMetersOut !== undefined
            ? String(machine.ramClearMetersOut)
            : '',
      };
    },
    []
  );

  // Pre-fill capture state from existing data (server returns Drive URL or tempImageData).
  useEffect(() => {
    if (currentMachine && session) {
      setCaptureState(
        getInitialCaptureStateForMachine(
          currentMachine,
          session.noSMIBLocation === true
        )
      );
    }
  }, [
    currentIndex,
    currentMachine?.reportedMachineId,
    session,
    getInitialCaptureStateForMachine,
  ]);

  // Check last collection time when machine changes
  useEffect(() => {
    if (!currentMachine) return;
    // Reset custom period toggle for each new machine
    setUseCustomPeriod(false);

    // Cache original auto-detected meters
    originalMetersRef.current = {
      in: currentMachine.sasMetersIn,
      out: currentMachine.sasMetersOut,
    };

    // Pre-populate custom period pickers from the machine's saved SAS times.
    // This way when the user clicks "Override period" / "Set full period", the
    // pickers already show the currently-saved dates so they only need to change
    // what they want — in particular, the end date can be adjusted without
    // having to re-enter the start from scratch.
    setCustomSasStart(
      currentMachine.sasStartTime
        ? new Date(currentMachine.sasStartTime).toISOString()
        : currentMachine.lastCollectionTime
          ? new Date(currentMachine.lastCollectionTime).toISOString()
          : ''
    );
    setCustomSasEnd(
      currentMachine.sasEndTime
        ? new Date(currentMachine.sasEndTime).toISOString()
        : ''
    );

    setCheckingCollection(true);
    setMachineLastCollectionInput(
      currentMachine.sasStartTime
        ? new Date(currentMachine.sasStartTime).toISOString()
        : currentMachine.lastCollectionTime
          ? new Date(currentMachine.lastCollectionTime).toISOString()
          : ''
    );
    // Brief delay to show skeleton
    const timer = setTimeout(() => setCheckingCollection(false), 400);
    return () => clearTimeout(timer);
  }, [currentIndex, currentMachine?.reportedMachineId]);

  // Fetch chronological boundaries when currentMachine changes
  useEffect(() => {
    if (!currentMachine?.machineId) return;

    axios
      .get(
        `/api/collection-reports-v2/machines/last-collection-time?machineId=${currentMachine.machineId}&excludeSessionId=${sessionId || ''}`
      )
      .then(res => {
        const data = res.data?.data;
        if (data) {
          setMachineFirstCollectionTime(data.firstCollectionTime ? new Date(data.firstCollectionTime) : null);
          setMachineLastCollectionTime(data.collectionTime ? new Date(data.collectionTime) : null);
        } else {
          setMachineFirstCollectionTime(null);
          setMachineLastCollectionTime(null);
        }
      })
      .catch(() => {
        setMachineFirstCollectionTime(null);
        setMachineLastCollectionTime(null);
      });
  }, [currentIndex, currentMachine?.machineId, sessionId]);

  const targetTime = useCustomPeriod
    ? (customSasEnd ? new Date(customSasEnd) : null)
    : (currentMachine?.sasEndTime ? new Date(currentMachine.sasEndTime) : new Date());

  const isMiddleReportWarning = (() => {
    if (machineFirstCollectionTime && machineLastCollectionTime) {
      const startTimeVal = useCustomPeriod
        ? (customSasStart ? new Date(customSasStart) : null)
        : (currentMachine?.sasStartTime ? new Date(currentMachine.sasStartTime) : null);

      const startInMiddle =
        startTimeVal &&
        startTimeVal > machineFirstCollectionTime &&
        startTimeVal < machineLastCollectionTime;
      const endInMiddle =
        targetTime &&
        targetTime > machineFirstCollectionTime &&
        targetTime < machineLastCollectionTime;

      if (startInMiddle || endInMiddle) {
        return true;
      }
    }
    return false;
  })();

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleApplyCustomPeriod = async () => {
    if (!currentMachine || !customSasStart || !customSasEnd) {
      toast.error('Please select both start and end date/time');
      return;
    }
    if (new Date(customSasStart) >= new Date(customSasEnd)) {
      toast.error('Start time must be before end time', {
        description: `Start: ${new Date(customSasStart).toLocaleString()} — End: ${new Date(customSasEnd).toLocaleString()}`,
        duration: 6000,
      });
      return;
    }
    setFetchingCustomMeters(true);
    try {
      const res = await axios.get('/api/collection-reports-v2/custom-meters', {
        params: {
          machineId: currentMachine.machineId,
          startDate: customSasStart,
          endDate: customSasEnd,
        },
      });

      if (res.data?.success && session) {
        const { sasMetersIn, sasMetersOut } = res.data.data;
        const updatedMachines = [...session.machines];
        updatedMachines[currentIndex] = {
          ...updatedMachines[currentIndex],
          sasMetersIn,
          sasMetersOut,
        };
        setSession({
          ...session,
          machines: updatedMachines,
        });

        // Update manual meters if they don't match
        if (captureState.metersMatch === false) {
          setCaptureState(prev => ({
            ...prev,
            manualMetersIn: String(sasMetersIn),
            manualMetersOut: String(sasMetersOut),
          }));
        }

        toast.success('Custom period system meters applied successfully!');
      } else {
        toast.error(res.data?.error || 'Failed to fetch custom period meters');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to apply custom period meters');
    } finally {
      setFetchingCustomMeters(false);
    }
  };

  const handleUseAutoDetected = () => {
    if (originalMetersRef.current && session) {
      const updatedMachines = [...session.machines];
      updatedMachines[currentIndex] = {
        ...updatedMachines[currentIndex],
        sasMetersIn: originalMetersRef.current.in,
        sasMetersOut: originalMetersRef.current.out,
      };
      setSession({
        ...session,
        machines: updatedMachines,
      });

      // Update manual meters if they don't match
      if (captureState.metersMatch === false) {
        setCaptureState(prev => ({
          ...prev,
          manualMetersIn: String(originalMetersRef.current!.in),
          manualMetersOut: String(originalMetersRef.current!.out),
        }));
      }
    }
    setUseCustomPeriod(false);
  };

  // ============================================================================
  // Image Handling (camera overlay)
  // ============================================================================

  const handleCameraCapture = (imageData: string) => {
    setCaptureState(prev => ({ ...prev, imageData }));
    setShowCamera(false);
  };

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (!file) continue;

        const reader = new FileReader();
        reader.onload = event => {
          const base64 = event.target?.result as string;
          setCaptureState(prev => ({ ...prev, imageData: base64 }));
          toast.success('Image pasted successfully');
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  }, []);

  useEffect(() => {
    if (mode !== 'capture' || showCamera) return;

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [mode, showCamera, handlePaste]);

  // ============================================================================
  // Back Navigation
  // ============================================================================

  const handleBack = () => {
    if (currentIndex <= 0 || !session) return;
    const prevIndex = currentIndex - 1;
    const prevMachine = session.machines[prevIndex];
    if (!prevMachine) return;
    setCaptureState(
      getInitialCaptureStateForMachine(
        prevMachine,
        session.noSMIBLocation === true
      )
    );
    setCurrentIndex(prevIndex);
  };

  // ============================================================================
  // Next (pure navigation, no save)
  // ============================================================================

  const handleNext = () => {
    if (!session) return;
    const machines = session.machines;
    const nextIndex = editMode
      ? currentIndex + 1
      : findNextPending(currentIndex + 1);
    if (nextIndex !== -1 && nextIndex < machines.length) {
      const nextMachine = machines[nextIndex];
      setCaptureState(
        getInitialCaptureStateForMachine(
          nextMachine,
          session.noSMIBLocation === true
        )
      );
      setCurrentIndex(nextIndex);
    } else if (!editMode) {
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
      const isNoSMIB = session?.noSMIBLocation === true;
      const isMatch = isNoSMIB ? true : captureState.metersMatch;
      const status = isMatch !== null ? 'confirmed' : 'captured';

      // Validate meter values are present
      if (
        isNoSMIB &&
        (captureState.manualMetersIn === '' ||
          captureState.manualMetersOut === '')
      ) {
        setSaveError('Please enter both Meters In and Meters Out values.');
        setSaving(false);
        return;
      }

      if (
        !isNoSMIB &&
        isMatch === false &&
        (captureState.manualMetersIn === '' ||
          captureState.manualMetersOut === '')
      ) {
        setSaveError('Please enter both Meters In and Meters Out values.');
        setSaving(false);
        return;
      }

      // RAM clear: both peak values required when toggle is on.
      if (
        captureState.ramClear &&
        (captureState.ramClearMetersIn === '' ||
          captureState.ramClearMetersOut === '')
      ) {
        setSaveError(
          'Please enter both RAM Clear Meters In and Meters Out values.'
        );
        setSaving(false);
        return;
      }

      // Determine if user cleared an existing image
      const imageWasCleared =
        !captureState.imageData && currentMachine.imageData;

      const payload: Record<string, unknown> = {
        metersMatch: isMatch,
        status,
        sasMetersIn: currentMachine.sasMetersIn,
        sasMetersOut: currentMachine.sasMetersOut,
      };

      // Include image data in the payload — the backend stores it as tempImageData
      // until the session is submitted, at which point it's uploaded to Google Drive.
      if (captureState.imageData?.startsWith('data:image/')) {
        payload.imageData = captureState.imageData;
      }

      // If user cleared an existing Drive image, signal backend to remove it
      if (imageWasCleared && currentMachine.imageData?.startsWith('/api/')) {
        payload.removeImage = true;
      }

      if (isNoSMIB) {
        // No-SMIB: manual values go in manualMetersIn/Out only.
        // sasMetersIn/Out must be null — there is no SMIB relay, and storing
        // the manual values there causes them to leak into SAS columns if the
        // location is later switched to SMIB.
        payload.manualMetersIn = Number(captureState.manualMetersIn);
        payload.manualMetersOut = Number(captureState.manualMetersOut);
        payload.sasMetersIn = null;
        payload.sasMetersOut = null;
      } else if (isMatch === true) {
        payload.manualMetersIn = currentMachine.sasMetersIn;
        payload.manualMetersOut = currentMachine.sasMetersOut;
      } else if (isMatch === false) {
        payload.manualMetersIn =
          captureState.manualMetersIn !== ''
            ? Number(captureState.manualMetersIn)
            : currentMachine.sasMetersIn;
        payload.manualMetersOut =
          captureState.manualMetersOut !== ''
            ? Number(captureState.manualMetersOut)
            : currentMachine.sasMetersOut;
      }

      // RAM clear toggle — always included so the backend can $unset peak
      // values when the user turns it off.
      payload.ramClear = captureState.ramClear;
      if (captureState.ramClear) {
        payload.ramClearMetersIn = Number(captureState.ramClearMetersIn);
        payload.ramClearMetersOut = Number(captureState.ramClearMetersOut);
      }

      // Validate custom period start/end ordering before saving
      if (useCustomPeriod && customSasStart && customSasEnd) {
        if (new Date(customSasStart) >= new Date(customSasEnd)) {
          toast.error('Start time must be before end time', {
            description: `Start: ${new Date(customSasStart).toLocaleString()} — End: ${new Date(customSasEnd).toLocaleString()}`,
            duration: 6000,
          });
          setSaving(false);
          return;
        }
      }

      // SAS period: custom override takes precedence over stored values.
      // For custom period: use the exact start and end the user specified.
      // For default: preserve the machine's stored sasEndTime when editing
      // (so re-saving doesn't overwrite a previously-set end time with "now").
      // Only fall back to now when no end time has been stored yet.
      if (useCustomPeriod) {
        if (customSasStart) {
          payload.sasStartTime = new Date(customSasStart).toISOString();
        }
        if (customSasEnd) {
          payload.sasEndTime = new Date(customSasEnd).toISOString();
        }
      } else {
        if (machineLastCollectionInput) {
          payload.sasStartTime = new Date(
            machineLastCollectionInput
          ).toISOString();
        }
        // Use the machine's already-stored sasEndTime when editing so we don't
        // overwrite it with the current moment on every Save & Next.
        // For a brand-new capture (no stored sasEndTime) fall back to now.
        payload.sasEndTime = currentMachine.sasEndTime
          ? new Date(currentMachine.sasEndTime).toISOString()
          : new Date().toISOString();
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

        await axios.post('/api/collection-reports-v2/machines', payload);
      }

      // In edit mode: advance by index or exit edit on last
      if (editMode) {
        console.log('[EditMode] Saved machine', currentMachine.machineName, {
          machineId: currentMachine.machineId,
          status,
          metersMatch: isMatch,
        });

        const nextIndex = currentIndex + 1;
        const machines = session?.machines ?? [];
        if (nextIndex < machines.length) {
          // Refetch session so the next machine has fresh server data
          await fetchSession(true);
          setCurrentIndex(nextIndex);
        } else {
          // Last machine saved — go to review for submit
          console.log('[EditMode] All machines saved, going to review');
          await fetchSession(true);
          setMode('review');
        }
        setSaveError(null);
        return;
      }

      // Normal mode: advance to next pending or go to review
      const res = await axios.get(
        `/api/collection-reports-v2/sessions/${sessionId}`
      );
      const newSession = res.data?.data;
      if (newSession) {
        setSession(newSession);
      }
      setSaveError(null);

      const machines = newSession?.machines ?? session?.machines ?? [];
      const nextIndex = (() => {
        for (let index = currentIndex + 1; index < machines.length; index++) {
          if (
            machines[index].status === 'pending' ||
            machines[index].status === 'captured'
          ) {
            return index;
          }
        }
        return -1;
      })();

      const nextMachine = nextIndex !== -1 ? machines[nextIndex] : null;
      setCaptureState(
        getInitialCaptureStateForMachine(
          nextMachine,
          session?.noSMIBLocation === true
        )
      );

      if (nextIndex !== -1) {
        setCurrentIndex(nextIndex);
      } else {
        setMode('review');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[SaveAndNext] Error:', message);
      setSaveError('Failed to save. Please try again.');
      toast.error('Failed to save machine', {
        description: message,
        duration: 5000,
      });
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
          sasMetersIn: currentMachine.sasMetersIn,
          sasMetersOut: currentMachine.sasMetersOut,
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
        for (let index = currentIndex + 1; index < machines.length; index++) {
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
      setCaptureState(
        getInitialCaptureStateForMachine(
          nextMachine,
          session?.noSMIBLocation === true
        )
      );

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
      // Images are already stored as tempImageData in MongoDB from each save.
      // The submit endpoint automatically discovers and uploads them to Drive.
      const payload: Record<string, unknown> = {};
      if (session?.sessionStartTime) {
        payload.sessionStartTime = session.sessionStartTime;
      }

      await axios.patch(
        `/api/collection-reports-v2/sessions/${sessionId}/submit`,
        payload
      );
      setEditMode(false);
      // Close the modal / navigate back to the list — submit is the end of the flow.
      // Don't refetch here: the session-status change to 'submitted' would trigger
      // the auto-enter-edit-mode effect and bounce the user back to machine 1.
      handleBackToReports();
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
      await axios.delete(`/api/collection-reports-v2/sessions/${sessionId}`);
      handleBackToReports();
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
  // Render
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
          onClick={() => handleBackToReports()}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Close
        </button>
      </div>
    );
  }

  // ============================================================================
  // Edit Mode Handlers
  // ============================================================================

  const handleEnterEditMode = () => {
    setEditMode(true);
    setMode('capture');
    setCurrentIndex(0);
    const firstMachine = session?.machines[0];
    if (firstMachine) {
      setCaptureState(
        getInitialCaptureStateForMachine(
          firstMachine,
          session?.noSMIBLocation === true
        )
      );
    }
  };

  const handleExitEdit = async () => {
    await fetchSession(true);
    setEditMode(false);
  };

  if (session.sessionStatus === 'submitted' && !editMode) {
    return (
      <CollectionReportV2SessionReport
        session={session}
        router={router}
        onBack={handleBackToReports}
        onEdit={isDeveloper || isAdmin ? handleEnterEditMode : undefined}
      />
    );
  }

  if (mode === 'review') {
    return (
      <ReviewView
        session={session}
        submitting={submitting}
        onBackToReports={handleBackToReports}
        onBack={() => {
          setCurrentIndex(0);
          setMode('capture');
        }}
        onSubmit={() => handleSubmit()}
        onEditMachine={index => {
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
        onBackToReports={handleBackToReports}
        onSubmit={() => handleSubmit()}
        onEditMachine={index => {
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
  const isLast = editMode
    ? currentIndex >= session.machines.length - 1
    : findNextPending(currentIndex + 1) === -1;
  const isDone =
    currentMachine.status === 'confirmed' ||
    currentMachine.status === 'skipped';

  return (
    <div className="bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Back + Progress */}
        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleBackToReports()}
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
              Close
            </button>
            {editMode ? (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    await fetchSession(true);
                    setMode('review');
                  }}
                  className="text-sm text-green-600 hover:text-green-700"
                >
                  Skip to Review
                </button>
                <button
                  type="button"
                  onClick={handleExitEdit}
                  className="text-sm text-blue-500 hover:text-blue-700"
                >
                  Exit Edit
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-sm text-red-400 hover:text-red-600"
              >
                Delete session
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-gray-700">
                  {session.locationName}
                </p>
                {session.sessionStartTime && (
                  <p className="mt-0.5 text-xs text-gray-400">
                    Start:{' '}
                    {new Date(session.sessionStartTime).toLocaleString(
                      'en-US',
                      {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      }
                    )}
                    {session.sessionEndTime && (
                      <>
                        {' '}
                        · End:{' '}
                        {new Date(session.sessionEndTime).toLocaleString(
                          'en-US',
                          {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          }
                        )}
                      </>
                    )}
                  </p>
                )}
              </div>
              <span className="flex shrink-0 items-center gap-1 text-gray-500">
                <input
                  type="number"
                  min={1}
                  max={totalCount}
                  value={currentIndex + 1}
                  onChange={e => {
                    const value = parseInt(e.target.value, 10);
                    if (value >= 1 && value <= totalCount && session) {
                      const target = session.machines[value - 1];
                      if (target) {
                        setCaptureState({
                          imageData: target.imageData ?? null,
                          metersMatch: target.metersMatch ?? null,
                          manualMetersIn:
                            target.metersMatch === false
                              ? String(target.sasMetersIn)
                              : '',
                          manualMetersOut:
                            target.metersMatch === false
                              ? String(target.sasMetersOut)
                              : '',
                          ramClear: target.ramClear === true,
                          ramClearMetersIn:
                            target.ramClearMetersIn !== undefined
                              ? String(target.ramClearMetersIn)
                              : '',
                          ramClearMetersOut:
                            target.ramClearMetersOut !== undefined
                              ? String(target.ramClearMetersOut)
                              : '',
                        });
                        setCurrentIndex(value - 1);
                      }
                    }
                  }}
                  className="w-12 rounded border border-gray-300 px-2 py-0.5 text-center text-sm"
                />
                <span>/ {totalCount}</span>
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

          {/* ── Collection Period (SAS Times) ─────────────────────────────────────
               Shown for ALL locations (including noSMIB).
               noSMIB: audit-only — times are saved but never affect meter
               calculations. SMIB: times are also used to fetch delta meters.
          ──────────────────────────────────────────────────────────────────── */}
          <div className="mb-6">
            {checkingCollection ? (
              <div className="animate-pulse rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="mb-2 h-3 w-32 rounded bg-gray-200" />
                <div className="h-8 w-48 rounded bg-gray-200" />
              </div>
            ) : useCustomPeriod ? (
              /* Custom period — two date pickers */
              <div className="space-y-2">
                <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-blue-800">
                      Custom collection period
                    </p>
                    {session?.noSMIBLocation && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-600">
                        Audit only
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {/* Start picker */}
                    <div>
                      <p className="mb-1 text-xs font-medium text-blue-700">
                        Start
                      </p>
                      <Popover
                        open={sasStartOpen}
                        onOpenChange={setSasStartOpen}
                      >
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-left text-sm hover:bg-gray-50"
                          >
                            {customSasStart
                              ? new Date(customSasStart).toLocaleString(
                                  'en-US',
                                  {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  }
                                )
                              : 'Select start date & time'}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="mui-calendar-popover w-auto p-0"
                          align="start"
                          collisionPadding={8}
                        >
                          <MuiDateCalendar
                            mode="single"
                            showTime={true}
                            buttonLabel="Apply"
                            maxDate={customSasEnd ? new Date(customSasEnd) : new Date()}
                            onSelect={range => {
                              if (range?.from) {
                                setCustomSasStart(range.from.toISOString());
                                setSasStartOpen(false);
                              }
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    {/* End picker */}
                    <div>
                      <p className="mb-1 text-xs font-medium text-blue-700">
                        End
                      </p>
                      <Popover open={sasEndOpen} onOpenChange={setSasEndOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-left text-sm hover:bg-gray-50"
                          >
                            {customSasEnd
                              ? new Date(customSasEnd).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })
                              : 'Select end date & time'}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="mui-calendar-popover w-auto p-0"
                          align="start"
                          collisionPadding={8}
                        >
                          <MuiDateCalendar
                            mode="single"
                            showTime={true}
                            buttonLabel="Apply"
                            maxDate={new Date()}
                            minDate={customSasStart ? new Date(customSasStart) : undefined}
                            onSelect={range => {
                              if (range?.from) {
                                setCustomSasEnd(range.from.toISOString());
                                setSasEndOpen(false);
                              }
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  {/* Inline error when start >= end */}
                  {customSasStart && customSasEnd && new Date(customSasStart) >= new Date(customSasEnd) && (
                    <p className="mt-2 text-xs font-semibold text-red-600">
                      ⚠️ Start time must be before end time
                    </p>
                  )}

                  {/* Apply Period Meters button — SMIB locations only */}
                  {!session?.noSMIBLocation && (
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={handleApplyCustomPeriod}
                        disabled={
                          fetchingCustomMeters ||
                          !customSasStart ||
                          !customSasEnd ||
                          (!!customSasStart && !!customSasEnd && new Date(customSasStart) >= new Date(customSasEnd))
                        }
                        className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {fetchingCustomMeters
                          ? 'Applying...'
                          : 'Apply Period Meters'}
                      </button>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={
                    session?.noSMIBLocation
                      ? () => setUseCustomPeriod(false)
                      : handleUseAutoDetected
                  }
                  className="text-xs text-gray-600 underline hover:text-gray-900"
                >
                  Use default times
                </button>
              </div>
            ) : currentMachine.sasStartTime ||
              currentMachine.lastCollectionTime ? (
              /* Saved start time (edit) or auto-detected hint (new capture) */
              <div className="space-y-2">
                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-green-700">
                        {currentMachine.sasStartTime
                          ? 'Period start'
                          : 'Period start · last collected'}
                      </p>
                      <p className="text-sm font-semibold text-green-800">
                        {new Date(
                          currentMachine.sasStartTime ??
                            currentMachine.lastCollectionTime!
                        ).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-green-700">
                        {currentMachine.sasEndTime
                          ? 'Period end'
                          : 'Period end · now'}
                      </p>
                      <p className="text-sm font-semibold text-green-800">
                        {new Date(
                          currentMachine.sasEndTime ?? new Date()
                        ).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  {session?.noSMIBLocation && (
                    <p className="mt-2 text-xs italic text-green-600">
                      For auditing purposes only
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setUseCustomPeriod(true)}
                  className="text-xs text-gray-600 underline hover:text-gray-900"
                >
                  Set custom start and end time
                </button>
              </div>
            ) : (
              /* No previous collection — machine.collectionTime is the start */
              <div className="space-y-2">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-800">
                    No previous collection found for this machine
                  </p>
                  <p className="mt-1 text-xs text-amber-700">
                    {session?.noSMIBLocation
                      ? 'Set the collection start time for auditing purposes.'
                      : 'When was the last time this machine was collected?'}
                  </p>
                  <div className="mt-3">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="w-full rounded-lg border border-amber-300 bg-white px-4 py-2 text-left text-sm hover:bg-gray-50"
                        >
                          {machineLastCollectionInput
                            ? new Date(
                                machineLastCollectionInput
                              ).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              }) +
                              ' ' +
                              new Date(
                                machineLastCollectionInput
                              ).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                              })
                            : 'Select date & time'}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="mui-calendar-popover w-auto p-0"
                        align="start"
                        collisionPadding={8}
                      >
                        <MuiDateCalendar
                          mode="single"
                          showTime={true}
                          buttonLabel="Set"
                          maxDate={new Date()}
                          onSelect={range => {
                            if (range?.from) {
                              setMachineLastCollectionInput(
                                range.from.toISOString()
                              );
                            }
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  {session?.noSMIBLocation && (
                    <p className="mt-2 text-xs italic text-amber-600">
                      For auditing purposes only
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setUseCustomPeriod(true)}
                  className="text-xs text-gray-600 underline hover:text-gray-900"
                >
                  Set custom start and end time
                </button>
              </div>
            )}
          </div>

          {/* System Meters */}
          {!session?.noSMIBLocation && (
            <div className="mb-6">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
                System Meters (from SMIB)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4">
                  <div className="text-xs text-gray-500">Meters In</div>
                  <div className="text-xl font-bold text-gray-900 sm:text-2xl">
                    {currentMachine.sasMetersIn?.toLocaleString() ?? 'N/A'}
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4">
                  <div className="text-xs text-gray-500">Meters Out</div>
                  <div className="text-xl font-bold text-gray-900 sm:text-2xl">
                    {currentMachine.sasMetersOut?.toLocaleString() ?? 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Supplemental Meters Warning — shown when the machine is flagged as supplemental
               (backend detected offline SMIB ≥ 3 days on save/load). */}
          {!session?.noSMIBLocation && currentMachine?.isSupplemental === true && (
            <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-lg leading-none" aria-hidden="true">📶</span>
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    Supplemental meters will be generated
                  </p>
                  <p className="mt-1 text-xs text-amber-700">
                    This SMIB cabinet has been offline for ≥ 3 days. Non-entered lifetime
                    meters (jackpot, credits won, current credits, etc.) will be carried
                    forward from the previous collection with a movement delta of&nbsp;0.
                    Only physical drop meters (Meters In / Meters Out) reflect actual movement.
                  </p>
                </div>
              </div>
            </div>
          )}

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
                  or press{' '}
                  <span className="rounded bg-gray-200 px-1 font-mono text-xs">
                    Ctrl+V
                  </span>{' '}
                  to paste
                </span>
              </button>
            )}
          </div>

          {/* Meters Match */}
          {!session?.noSMIBLocation && (
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
                  <div className="text-sm sm:text-base">
                    ✗ No, enter manually
                  </div>
                  <div className="mt-0.5 text-xs opacity-75">
                    Type the actual meter values
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Manual Entry */}
          {(session?.noSMIBLocation === true ||
            captureState.metersMatch === false) && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <label className="mb-3 block text-sm font-medium text-amber-800">
                {session?.noSMIBLocation === true
                  ? 'Enter meter values from the machine'
                  : 'Enter actual meter values from the machine'}
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div>
                  <label className="block text-xs text-amber-700">
                    {session?.noSMIBLocation === true
                      ? 'Meters In'
                      : 'Actual Meters In'}
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
                    placeholder={
                      session?.noSMIBLocation === true
                        ? '0'
                        : String(currentMachine.sasMetersIn)
                    }
                    className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-4 py-3 text-sm focus:border-amber-500 focus:outline-none sm:py-2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs text-amber-700">
                    {session?.noSMIBLocation === true
                      ? 'Meters Out'
                      : 'Actual Meters Out'}
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
                    placeholder={
                      session?.noSMIBLocation === true
                        ? '0'
                        : String(currentMachine.sasMetersOut)
                    }
                    className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-4 py-3 text-sm focus:border-amber-500 focus:outline-none sm:py-2.5"
                  />
                </div>
              </div>
            </div>
          )}

          {/* RAM Clear — always available regardless of metersMatch / SMIB state */}
          <div className="mb-6 rounded-lg border border-yellow-300 bg-yellow-50 p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={captureState.ramClear}
                onChange={e =>
                  setCaptureState(prev => ({
                    ...prev,
                    ramClear: e.target.checked,
                    ramClearMetersIn: e.target.checked
                      ? prev.ramClearMetersIn
                      : '',
                    ramClearMetersOut: e.target.checked
                      ? prev.ramClearMetersOut
                      : '',
                  }))
                }
                className="mt-0.5 h-4 w-4 rounded border-yellow-400 text-yellow-600 focus:ring-yellow-500"
              />
              <div className="flex-1">
                <span className="block text-sm font-medium text-yellow-900">
                  RAM Clear
                </span>
                <span className="mt-0.5 block text-xs text-yellow-700">
                  Check if the machine's meters were reset between the previous
                  collection and this one. Movement is computed as (peak − prev)
                  + current.
                </span>
              </div>
            </label>

            {captureState.ramClear && (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div>
                  <label className="block text-xs text-yellow-800">
                    RAM Clear Meters In (peak before reset)
                  </label>
                  <input
                    type="number"
                    value={captureState.ramClearMetersIn}
                    onChange={e =>
                      setCaptureState(prev => ({
                        ...prev,
                        ramClearMetersIn: e.target.value,
                      }))
                    }
                    placeholder="0"
                    className="mt-1 w-full rounded-lg border border-yellow-300 bg-white px-4 py-3 text-sm focus:border-yellow-500 focus:outline-none sm:py-2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs text-yellow-800">
                    RAM Clear Meters Out (peak before reset)
                  </label>
                  <input
                    type="number"
                    value={captureState.ramClearMetersOut}
                    onChange={e =>
                      setCaptureState(prev => ({
                        ...prev,
                        ramClearMetersOut: e.target.value,
                      }))
                    }
                    placeholder="0"
                    className="mt-1 w-full rounded-lg border border-yellow-300 bg-white px-4 py-3 text-sm focus:border-yellow-500 focus:outline-none sm:py-2.5"
                  />
                </div>
              </div>
            )}
          </div>

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
          {/* Middle-Date Block Warning */}
          {isMiddleReportWarning && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3.5 shadow-sm">
              <p className="flex items-center text-sm font-semibold text-red-700">
                <span className="mr-2">⚠️</span> Cannot save machine
              </p>
              <p className="mt-1 text-xs text-red-600">
                The selected collection times fall between existing reports. Middle-date collections are not allowed.
              </p>
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
              {!editMode && (
                <button
                  type="button"
                  onClick={() => handleBackToReports()}
                  className="text-center text-sm text-gray-400 hover:text-gray-600 sm:text-left"
                >
                  Cancel
                </button>
              )}
            </div>
            <div className="flex gap-2 sm:gap-3">
              {editMode ? (
                <>
                  {currentIndex < session.machines.length - 1 && (
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={
                        saving ||
                        (useCustomPeriod &&
                          !!customSasStart &&
                          !!customSasEnd &&
                          new Date(customSasStart) >= new Date(customSasEnd))
                      }
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 sm:flex-none sm:px-5"
                    >
                      Next
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveAndNext}
                    disabled={
                      saving ||
                      captureState.metersMatch === null ||
                      isMiddleReportWarning ||
                      (useCustomPeriod
                        ? !customSasStart ||
                          !customSasEnd ||
                          new Date(customSasStart) >= new Date(customSasEnd)
                        : !currentMachine.lastCollectionTime &&
                          !machineLastCollectionInput)
                    }
                    className="flex-1 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 sm:flex-none sm:px-6"
                  >
                    {saving
                      ? 'Saving...'
                      : isLast
                        ? 'Save & Review'
                        : 'Save & Next'}
                  </button>
                </>
              ) : isDone ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={
                    saving ||
                    (useCustomPeriod &&
                      !!customSasStart &&
                      !!customSasEnd &&
                      new Date(customSasStart) >= new Date(customSasEnd))
                  }
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
                      disabled={
                        saving ||
                        !!captureState.imageData ||
                        captureState.metersMatch !== null
                      }
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 sm:flex-none sm:px-5"
                      title={
                        captureState.imageData ||
                        captureState.metersMatch !== null
                          ? 'Remove captured data to skip this machine'
                          : undefined
                      }
                    >
                      Skip Machine
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveAndNext}
                    disabled={
                      saving ||
                      captureState.metersMatch === null ||
                      isMiddleReportWarning ||
                      (useCustomPeriod
                        ? !customSasStart ||
                          !customSasEnd ||
                          new Date(customSasStart) >= new Date(customSasEnd)
                        : !currentMachine.lastCollectionTime &&
                          !machineLastCollectionInput)
                    }
                    className="flex-1 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 sm:flex-none sm:px-6"
                  >
                    {saving ? 'Saving...' : isLast ? 'Review' : 'Save & Next'}
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
            sasMetersIn: currentMachine.sasMetersIn ?? 0,
            sasMetersOut: currentMachine.sasMetersOut ?? 0,
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
              Are you sure? This will permanently remove all captured data for
              this session.
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
  onBackToReports,
  onBack,
  onSubmit,
  onEditMachine,
  router,
}: {
  session: SessionDetail;
  submitting: boolean;
  onBackToReports?: () => void;
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
          onClick={() =>
            onBackToReports
              ? onBackToReports()
              : router.push('/collection-report?section=collection-v2')
          }
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
          Close
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
                onClick={() => onSubmit()}
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
                <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                  {/* Top row on mobile: thumbnail + name + status; row on desktop */}
                  <div className="flex items-start gap-3 sm:contents">
                    {/* Thumbnail — imageData comes from server (Drive URL or tempImageData) */}
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 sm:h-20 sm:w-20">
                      {machine.imageData ? (
                        <img
                          src={machine.imageData}
                          alt={machine.machineName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-center text-[10px] text-gray-400">
                          No photo
                        </div>
                      )}
                    </div>

                    {/* On mobile only — name + status sit next to thumbnail */}
                    <div className="flex min-w-0 flex-1 items-start justify-between gap-2 sm:hidden">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-gray-900">
                          {machine.machineCustomName || machine.machineName}
                        </h3>
                        <p className="truncate text-xs text-gray-500">
                          {machine.serialNumber && `${machine.serialNumber}`}
                          {machine.serialNumber &&
                            machine.manufacturer &&
                            ' · '}
                          {machine.manufacturer}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-1">
                        {machine.isSupplemental === true && (
                          <span
                            className="inline-flex items-center gap-0.5 rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700"
                            title="Supplemental: SMIB offline ≥ 3 days"
                          >
                            <span aria-hidden="true">📶</span>
                          </span>
                        )}
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
                  </div>

                  {/* Info column */}
                  <div className="min-w-0 flex-1">
                    {/* Desktop only — name + status row (hidden on mobile, shown above) */}
                    <div className="hidden items-start justify-between sm:flex">
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
                        {machine.ramClear === true && (
                          <span
                            className="inline-flex items-center rounded-full border border-yellow-300 bg-yellow-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-yellow-800"
                            title={`Pre-reset peak: ${machine.ramClearMetersIn ?? '-'} / ${machine.ramClearMetersOut ?? '-'}`}
                          >
                            RAM Clear
                          </span>
                        )}
                        {machine.isSupplemental === true && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700"
                            title="Supplemental meters: SMIB cabinet was offline ≥ 3 days. Non-entered lifetime meters were carried forward with 0 movement delta."
                          >
                            <span aria-hidden="true">📶</span>
                            Supplemental
                          </span>
                        )}
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

                    {/* Stats — label : value rows on mobile, 2-col grid on desktop */}
                    <div className="flex flex-col gap-1.5 text-xs sm:mt-2 sm:grid sm:grid-cols-2 sm:gap-3">
                      <div className="flex items-baseline justify-between sm:block">
                        <span className="text-gray-400">
                          {session?.noSMIBLocation ? 'Machine In' : 'Sys In'}
                        </span>
                        <span className="font-medium text-gray-700 sm:ml-1">
                          {machine.sasMetersIn?.toLocaleString() ?? 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between sm:block">
                        <span className="text-gray-400">
                          {session?.noSMIBLocation ? 'Machine Out' : 'Sys Out'}
                        </span>
                        <span className="font-medium text-gray-700 sm:ml-1">
                          {machine.sasMetersOut?.toLocaleString() ?? 'N/A'}
                        </span>
                      </div>
                      {machine.machineGross !== undefined && (
                        <div className="flex items-baseline justify-between sm:block">
                          <span className="text-gray-400">Machine Gross</span>
                          <span className="font-medium text-gray-700 sm:ml-1">
                            {machine.machineGross?.toLocaleString() ?? 'N/A'}
                          </span>
                        </div>
                      )}
                      {!session?.noSMIBLocation &&
                        machine.sasGross !== undefined && (
                          <div className="flex items-baseline justify-between sm:block">
                            <span className="text-gray-400">SAS Gross</span>
                            <span className="font-medium text-gray-700 sm:ml-1">
                              {machine.sasGross?.toLocaleString() ?? 'N/A'}
                            </span>
                          </div>
                        )}
                      {!session?.noSMIBLocation &&
                        machine.grossDifference !== undefined &&
                        machine.grossDifference !== 0 && (
                          <div className="flex items-baseline justify-between sm:col-span-2 sm:block">
                            <span className="text-gray-400">Difference</span>
                            <span className="font-medium text-red-600 sm:ml-1">
                              {machine.grossDifference?.toLocaleString() ??
                                'N/A'}
                            </span>
                          </div>
                        )}
                      {!session?.noSMIBLocation &&
                        machine.metersMatch !== undefined && (
                          <div className="flex items-baseline justify-between gap-2 sm:col-span-2 sm:block">
                            <span className="shrink-0 text-gray-400">
                              Meters match
                            </span>
                            <span
                              className={`text-right sm:ml-1 sm:text-left ${
                                machine.metersMatch
                                  ? 'text-green-600'
                                  : 'text-amber-600'
                              }`}
                            >
                              {machine.metersMatch
                                ? 'Yes'
                                : 'No (manual entry)'}
                            </span>
                          </div>
                        )}
                      {machine.sasStartTime && (
                        <div className="flex items-baseline justify-between gap-2 sm:col-span-2 sm:block">
                          <span className="shrink-0 text-gray-400">
                            SAS Start
                          </span>
                          <span className="text-right font-medium text-gray-700 sm:ml-1 sm:text-left">
                            {new Date(machine.sasStartTime).toLocaleString(
                              'en-US',
                              {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              }
                            )}
                          </span>
                        </div>
                      )}
                      {machine.sasEndTime && (
                        <div className="flex items-baseline justify-between gap-2 sm:col-span-2 sm:block">
                          <span className="shrink-0 text-gray-400">
                            SAS End
                          </span>
                          <span className="text-right font-medium text-gray-700 sm:ml-1 sm:text-left">
                            {new Date(machine.sasEndTime).toLocaleString(
                              'en-US',
                              {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              }
                            )}
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
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 sm:flex sm:flex-wrap sm:gap-x-3 sm:text-sm">
            <div className="flex items-center gap-1">
              <strong className="text-gray-900">
                {session.machinesConfirmed}
              </strong>
              <span>confirmed</span>
            </div>
            <div className="flex items-center gap-1">
              <strong className="text-gray-900">
                {session.machinesSkipped}
              </strong>
              <span>skipped</span>
            </div>
            <div className="flex items-center gap-1">
              <strong className="text-gray-900">
                {session.machinesTotal -
                  session.machinesCaptured -
                  session.machinesSkipped}
              </strong>
              <span>pending</span>
            </div>
            <div className="flex items-center gap-1">
              <strong className="text-gray-900">
                {session.machinesCaptured - session.machinesConfirmed}
              </strong>
              <span>captured</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Submitted View
// ============================================================================
