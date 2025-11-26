/**
 * Edit Collection Modal Component
 * Comprehensive modal for editing existing collection reports with machine data.
 *
 * Features:
 * - Location selection
 * - Collection time/date editing
 * - Machine data editing (meters in/out, previous meters)
 * - Movement calculations
 * - SAS time override functionality
 * - Machine validation
 * - Collection report updates
 * - Machine collection history updates
 * - Debounced search and validation
 * - Loading states and skeletons
 * - Toast notifications
 * - Tooltips for guidance
 *
 * Very large component (~2815 lines) handling complete collection report editing workflow.
 *
 * @param open - Whether the modal is visible
 * @param reportId - ID of the collection report to edit
 * @param onClose - Callback to close the modal
 * @param onSuccess - Callback when collection is successfully updated
 */
'use client';

import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { InfoConfirmationDialog } from '@/components/ui/InfoConfirmationDialog';
import { Button } from '@/components/ui/button';
import { LocationSelect } from '@/components/ui/custom-select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PCDateTimePicker } from '@/components/ui/pc-date-time-picker';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { updateMachineCollectionHistory } from '@/lib/helpers/cabinets';
import { updateCollectionReport } from '@/lib/helpers/collectionReport';
import { validateMachineEntry } from '@/lib/helpers/collectionReportModal';
import { updateCollection } from '@/lib/helpers/collections';
import { useDebounce, useDebouncedCallback } from '@/lib/hooks/useDebounce';
import { useUserStore } from '@/lib/store/userStore';
import type {
  CollectionReportData,
  CollectionReportLocationWithMachines,
  CollectionReportMachineSummary,
} from '@/lib/types/api';
import type {
  CollectionDocument,
  PreviousCollectionMeters,
} from '@/lib/types/collections';
import { calculateDefaultCollectionTime } from '@/lib/utils/collectionTime';
import { formatDate } from '@/lib/utils/formatting';
import { calculateMachineMovement } from '@/lib/utils/frontendMovementCalculation';
import { formatMachineDisplayNameWithBold } from '@/lib/utils/machineDisplay';
import { calculateMovement } from '@/lib/utils/movementCalculation';
import { getSerialNumberIdentifier } from '@/lib/utils/serialNumber';
import { getUserDisplayName } from '@/lib/utils/userDisplay';
import axios from 'axios';
import { Edit, ExternalLink, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type EditCollectionModalProps = {
  show: boolean;
  onClose: () => void;
  reportId: string;
  locations: CollectionReportLocationWithMachines[];
  onRefresh: () => void;
};

async function fetchCollectionReportById(
  reportId: string
): Promise<CollectionReportData> {
  const res = await axios.get(`/api/collection-report/${reportId}`);
  return res.data;
}

async function fetchCollectionsByReportId(
  reportId: string
): Promise<CollectionDocument[]> {
  // Add cache-busting parameter to ensure fresh data
  const res = await axios.get(
    `/api/collections?locationReportId=${reportId}&_t=${Date.now()}`
  );
  console.warn('🔍 fetchCollectionsByReportId result:', {
    reportId,
    collectionsCount: res.data.length,
    collections: res.data,
  });
  return res.data;
}

async function deleteMachineCollection(
  id: string
): Promise<{ success: boolean }> {
  // First get the collection to find the machineId and previous values
  const collection = await axios.get(`/api/collections?id=${id}`);
  const collectionData = collection.data;

  console.warn('🔄 Deleting collection with reversion data:', {
    collectionId: id,
    machineId: collectionData.machineId,
    prevIn: collectionData.prevIn,
    prevOut: collectionData.prevOut,
    metersIn: collectionData.metersIn,
    metersOut: collectionData.metersOut,
  });

  // Delete the collection document (this will also revert machine collectionMeters)
  const res = await axios.delete(`/api/collections?id=${id}`);

  // Also delete from machine's collection history
  if (collectionData && collectionData.machineId) {
    console.warn('🔄 Deleting from machine collection history:', {
      machineId: collectionData.machineId,
      entryId: id,
    });

    await updateMachineCollectionHistory(
      collectionData.machineId,
      undefined, // No entry data needed for delete
      'delete',
      id
    );
  }

  return res.data;
}

export default function EditCollectionModal({
  show,
  onClose,
  reportId,
  locations = [],
  onRefresh,
}: EditCollectionModalProps) {
  const user = useUserStore(state => state.user);
  const userId = user?._id;

  // State management with simpler approach
  const [reportData, setReportData] = useState<CollectionReportData | null>(
    null
  );
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [selectedLocationName, setSelectedLocationName] = useState<string>('');
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [collectedMachineEntries, setCollectedMachineEntries] = useState<
    CollectionDocument[]
  >([]);
  const [originalCollections, setOriginalCollections] = useState<
    CollectionDocument[]
  >([]);
  const [collectedMachinesSearchTerm, setCollectedMachinesSearchTerm] =
    useState('');
  const [machineSearchTerm, setMachineSearchTerm] = useState('');
  const [updateAllDate, setUpdateAllDate] = useState<Date | undefined>(
    undefined
  );
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false);
  const [showUnsavedChangesWarning, setShowUnsavedChangesWarning] =
    useState(false);

  // Edit functionality state
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [showUpdateConfirmation, setShowUpdateConfirmation] = useState(false);
  const [showViewMachineConfirmation, setShowViewMachineConfirmation] =
    useState(false);

  // View toggle state
  const [viewMode, setViewMode] = useState<'machines' | 'collected'>(
    'machines'
  );

  // Machine input state - MOVED BEFORE handleClose
  const [currentCollectionTime, setCurrentCollectionTime] = useState<Date>(
    new Date() // Will be updated when location is selected
  );
  const [currentMetersIn, setCurrentMetersIn] = useState('');
  const [currentMetersOut, setCurrentMetersOut] = useState('');
  const [currentRamClearMetersIn, setCurrentRamClearMetersIn] = useState('');
  const [currentRamClearMetersOut, setCurrentRamClearMetersOut] = useState('');
  const [currentMachineNotes, setCurrentMachineNotes] = useState('');
  const [currentRamClear, setCurrentRamClear] = useState(false);
  // Advanced SAS controls
  const [showAdvancedSas, setShowAdvancedSas] = useState(false);
  const [customSasStartTime, setCustomSasStartTime] = useState<Date | null>(
    null
  );
  const [prevIn, setPrevIn] = useState<number | null>(null);
  const [prevOut, setPrevOut] = useState<number | null>(null);
  const [isFirstCollection, setIsFirstCollection] = useState(false);

  // Confirmation dialog state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [showUpdateReportConfirmation, setShowUpdateReportConfirmation] =
    useState(false);

  // Financial state
  const [financials, setFinancials] = useState({
    taxes: '',
    advance: '',
    variance: '',
    varianceReason: '',
    amountToCollect: '',
    collectedAmount: '',
    balanceCorrection: '0',
    balanceCorrectionReason: '',
    previousBalance: '0',
    reasonForShortagePayment: '',
  });

  // Base value typed by the user before entering collected amount
  const [baseBalanceCorrection, setBaseBalanceCorrection] =
    useState<string>('');

  // Derived state
  const selectedLocation = useMemo(
    () => locations.find(l => String(l._id) === selectedLocationId),
    [locations, selectedLocationId]
  );

  const [machinesOfSelectedLocation, setMachinesOfSelectedLocation] = useState<
    CollectionReportMachineSummary[]
  >([]);
  const [isLoadingMachines, setIsLoadingMachines] = useState(false);
  const [hasSetCollectionTimeFromReport, setHasSetCollectionTimeFromReport] =
    useState(false);

  // ============================================================================
  // Computed Values
  // ============================================================================
  const machineForDataEntry = useMemo(() => {
    // First, try to find in the machines of selected location
    let found = machinesOfSelectedLocation.find(
      m => String(m._id) === selectedMachineId
    );

    // If not found and we have a selectedMachineId, try to find in collected machines
    if (!found && selectedMachineId) {
      const collectedEntry = collectedMachineEntries.find(
        entry => entry.machineId === selectedMachineId
      );

      if (collectedEntry) {
        // Create a mock machine object from the collected entry for display purposes
        found = {
          _id: collectedEntry.machineId as string, // Type assertion for mock object
          name:
            collectedEntry.machineCustomName ||
            collectedEntry.serialNumber ||
            collectedEntry.machineId,
          serialNumber: collectedEntry.serialNumber || collectedEntry.machineId,
          collectionMeters: {
            metersIn: collectedEntry.prevIn || 0,
            metersOut: collectedEntry.prevOut || 0,
          },
        } as (typeof machinesOfSelectedLocation)[0]; // Type assertion since we're creating a mock object
      }
    }

    return found;
  }, [machinesOfSelectedLocation, selectedMachineId, collectedMachineEntries]);

  // ============================================================================
  // Event Handlers
  // ============================================================================
  // Custom close handler that checks for changes - MOVED HERE to be after all state declarations
  const handleClose = useCallback(() => {
    // Check if there are unsaved edits
    if (hasUnsavedEdits) {
      console.warn('🚫 Preventing modal close - unsaved edits detected');
      setShowUnsavedChangesWarning(true);
      return false; // Indicate that close was prevented
    }

    // Check if user has unsaved machine data (selected machine or entered data)
    if (
      !editingEntryId &&
      (selectedMachineId ||
        currentMetersIn ||
        currentMetersOut ||
        currentMachineNotes.trim())
    ) {
      const enteredMetersIn = currentMetersIn ? Number(currentMetersIn) : 0;
      const enteredMetersOut = currentMetersOut ? Number(currentMetersOut) : 0;
      const hasNotes = currentMachineNotes.trim().length > 0;

      if (
        selectedMachineId ||
        enteredMetersIn !== 0 ||
        enteredMetersOut !== 0 ||
        hasNotes
      ) {
        console.warn(
          '🚫 Preventing modal close - unsaved machine data detected'
        );
        toast.error(
          `You have unsaved machine data. ` +
            (selectedMachineId
              ? `Machine: ${machineForDataEntry?.name || machineForDataEntry?.serialNumber || 'selected machine'}. `
              : '') +
            (enteredMetersIn !== 0 || enteredMetersOut !== 0
              ? `Meters: In=${enteredMetersIn}, Out=${enteredMetersOut}. `
              : '') +
            (hasNotes
              ? `Notes: "${currentMachineNotes.substring(0, 30)}${currentMachineNotes.length > 30 ? '...' : ''}". `
              : '') +
            `Please click "Add Machine to List" to save this data, or cancel by clicking the X button and confirming you want to discard changes.`,
          {
            duration: 10000,
            position: 'top-left',
          }
        );
        setShowUnsavedChangesWarning(true);
        return false; // Indicate that close was prevented
      }
    }

    if (hasChanges && onRefresh) {
      onRefresh();
    }
    onClose();
    return true; // Indicate that close was allowed
  }, [
    hasChanges,
    onRefresh,
    onClose,
    hasUnsavedEdits,
    editingEntryId,
    selectedMachineId,
    currentMetersIn,
    currentMetersOut,
    currentMachineNotes,
    machineForDataEntry?.name,
    machineForDataEntry?.serialNumber,
    setShowUnsavedChangesWarning,
  ]);

  // Update collection time when location changes (only if not already set from report data)
  useEffect(() => {
    if (
      selectedLocation?.gameDayOffset !== undefined &&
      !hasSetCollectionTimeFromReport
    ) {
      const defaultTime = calculateDefaultCollectionTime(
        selectedLocation.gameDayOffset
      );
      setCurrentCollectionTime(defaultTime);
    }
  }, [selectedLocation, hasSetCollectionTimeFromReport]);

  // Always fetch fresh machine data when location changes
  useEffect(() => {
    if (selectedLocationId) {
      console.warn(
        '🔄 ALWAYS fetching fresh machines for location from API:',
        selectedLocationId
      );

      const fetchMachinesForLocation = async () => {
        setIsLoadingMachines(true);
        try {
          // Add cache-busting parameter to ensure fresh machine data
          const response = await axios.get(
            `/api/machines?locationId=${selectedLocationId}&_t=${Date.now()}`
          );
          if (response.data?.success && response.data?.data) {
            console.warn(
              '🔄 Fresh machines fetched from API:',
              response.data.data.length,
              'machines'
            );
            console.warn(
              '🔄 Machine meter data:',
              response.data.data.map((m: CollectionReportMachineSummary) => ({
                name: m.name,
                serialNumber: m.serialNumber,
                collectionMeters: m.collectionMeters,
              }))
            );
            setMachinesOfSelectedLocation(response.data.data);
          } else {
            console.warn('🔄 No machines found in API response');
            setMachinesOfSelectedLocation([]);
          }
        } catch (error) {
          console.error('Error fetching machines for location:', error);
          setMachinesOfSelectedLocation([]);
        } finally {
          setIsLoadingMachines(false);
        }
      };

      fetchMachinesForLocation();
    } else {
      setMachinesOfSelectedLocation([]);
      setIsLoadingMachines(false);
    }
  }, [selectedLocationId]);

  // Check if this is the first collection for the selected machine
  useEffect(() => {
    if (selectedMachineId) {
      axios
        .get(`/api/collections/check-first-collection?machineId=${selectedMachineId}`)
        .then(response => {
          setIsFirstCollection(response.data.isFirstCollection);
        })
        .catch(error => {
          console.error('Error checking first collection:', error);
          setIsFirstCollection(false); // Default to false on error (hide advanced)
        });
    } else {
      setIsFirstCollection(false);
    }
  }, [selectedMachineId]);

  // Filter machines based on search term
  // Utility function for proper alphabetical and numerical sorting
  const sortMachinesAlphabetically = useCallback(<
    T extends { name?: string; serialNumber?: string },
  >(
    machines: T[]
  ): T[] => {
    return machines.sort((a, b) => {
      const nameA = (a.name || a.serialNumber || '').toString();
      const nameB = (b.name || b.serialNumber || '').toString();

      // Extract the base name and number parts
      const matchA = nameA.match(/^(.+?)(\d+)?$/);
      const matchB = nameB.match(/^(.+?)(\d+)?$/);

      if (!matchA || !matchB) {
        return nameA.localeCompare(nameB);
      }

      const [, baseA, numA] = matchA;
      const [, baseB, numB] = matchB;

      // First compare the base part alphabetically
      const baseCompare = baseA.localeCompare(baseB);
      if (baseCompare !== 0) {
        return baseCompare;
      }

      // If base parts are the same, compare numerically
      const numAInt = numA ? parseInt(numA, 10) : 0;
      const numBInt = numB ? parseInt(numB, 10) : 0;

      return numAInt - numBInt;
    });
  }, []);

  const filteredMachines = useMemo(() => {
    let result = machinesOfSelectedLocation;

    if (machineSearchTerm.trim()) {
      const searchLower = machineSearchTerm.toLowerCase();
      result = machinesOfSelectedLocation.filter(
        machine =>
          (machine.name && machine.name.toLowerCase().includes(searchLower)) ||
          (machine.serialNumber &&
            machine.serialNumber.toLowerCase().includes(searchLower)) ||
          (machine.custom?.name &&
            machine.custom.name.toLowerCase().includes(searchLower)) ||
          (machine.game && machine.game.toLowerCase().includes(searchLower))
      );
    }

    // Always sort alphabetically and numerically
    return sortMachinesAlphabetically(result);
  }, [machinesOfSelectedLocation, machineSearchTerm, sortMachinesAlphabetically]);

  // Function to handle clicks on disabled input fields
  const handleDisabledFieldClick = useCallback(() => {
    if (!machineForDataEntry) {
      toast.warning('Please select a machine first', {
        duration: 3000,
        position: 'top-left',
      });
    }
  }, [machineForDataEntry]);

  // Calculate amount to collect based on machine entries and financial inputs
  const calculateAmountToCollect = useCallback(() => {
    console.warn(
      '🔄 Calculating amount to collect with entries:',
      collectedMachineEntries.length
    );

    if (!collectedMachineEntries.length) {
      console.warn('🔄 No machine entries, setting amount to collect to 0');
      setFinancials(prev => ({ ...prev, amountToCollect: '0' }));
      return;
    }

    // Calculate total movement data from all machine entries using proper movement calculation
    const totalMovementData = collectedMachineEntries.map(entry => {
      const movement = calculateMachineMovement(
        entry.metersIn || 0,
        entry.metersOut || 0,
        entry.prevIn || 0,
        entry.prevOut || 0,
        entry.ramClear || false,
        undefined, // ramClearCoinIn not available in CollectionDocument
        undefined, // ramClearCoinOut not available in CollectionDocument
        entry.ramClearMetersIn,
        entry.ramClearMetersOut
      );
      console.warn('🔄 Machine movement calculation:', {
        machineId: entry.machineId,
        metersIn: entry.metersIn,
        prevIn: entry.prevIn,
        metersOut: entry.metersOut,
        prevOut: entry.prevOut,
        ramClear: entry.ramClear,
        ramClearMetersIn: entry.ramClearMetersIn,
        ramClearMetersOut: entry.ramClearMetersOut,
        calculatedMovement: movement,
      });
      return {
        drop: movement.metersIn,
        cancelledCredits: movement.metersOut,
        gross: movement.gross,
      };
    });

    // Sum up all movement data
    const reportTotalData = totalMovementData.reduce(
      (prev, current) => ({
        drop: prev.drop + current.drop,
        cancelledCredits: prev.cancelledCredits + current.cancelledCredits,
        gross: prev.gross + current.gross,
      }),
      { drop: 0, cancelledCredits: 0, gross: 0 }
    );

    console.warn('🔄 Total movement data:', reportTotalData);

    // Get financial values
    const taxes = Number(financials.taxes) || 0;
    const variance = Number(financials.variance) || 0;
    const advance = Number(financials.advance) || 0;

    // Use the location's previous balance, not the calculated one
    const locationPreviousBalance = selectedLocation?.collectionBalance || 0;

    // Get profit share from selected location (default to 50% if not available)
    const profitShare = selectedLocation?.profitShare || 50;

    console.warn('🔄 Financial inputs:', {
      taxes,
      variance,
      advance,
      locationPreviousBalance,
      profitShare,
    });

    // Calculate partner profit: Math.floor((gross - variance - advance) * profitShare / 100) - taxes
    const partnerProfit =
      Math.floor(
        ((reportTotalData.gross - variance - advance) * profitShare) / 100
      ) - taxes;

    // Calculate amount to collect: gross - variance - advance - partnerProfit + locationPreviousBalance
    const amountToCollect =
      reportTotalData.gross -
      variance -
      advance -
      partnerProfit +
      locationPreviousBalance;

    console.warn('🔄 Final calculation:', {
      gross: reportTotalData.gross,
      variance,
      advance,
      partnerProfit,
      locationPreviousBalance,
      amountToCollect,
    });

    setFinancials(prev => ({
      ...prev,
      amountToCollect: amountToCollect.toFixed(2),
    }));
  }, [
    collectedMachineEntries,
    financials.taxes,
    financials.variance,
    financials.advance,
    selectedLocation?.collectionBalance,
    selectedLocation?.profitShare,
  ]);

  // Auto-calculate amount to collect when relevant data changes
  useEffect(() => {
    calculateAmountToCollect();
  }, [calculateAmountToCollect]);

  // Update location name when location changes
  useEffect(() => {
    if (selectedLocation) {
      setSelectedLocationName(selectedLocation.name);
    } else {
      setSelectedLocationName('');
    }
  }, [selectedLocation]);

  // Load report data
  useEffect(() => {
    if (show && reportId) {
      fetchCollectionReportById(reportId)
        .then(data => {
          setReportData(data);

          // CRITICAL: If report has isEditing: true, there are unsaved changes
          // This prevents users from closing the auto-reopened modal without saving
          if (data.isEditing) {
            console.warn(
              '⚠️ Report has isEditing: true - marking as having unsaved edits'
            );
            setHasUnsavedEdits(true);
          }

          // Set the collection time to the report's timestamp
          if (data.collectionDate && data.collectionDate !== '-') {
            setCurrentCollectionTime(new Date(data.collectionDate));
            setHasSetCollectionTimeFromReport(true);
          }

          setFinancials({
            taxes: data.locationMetrics?.taxes?.toString() || '',
            advance: data.locationMetrics?.advance?.toString() || '',
            variance: data.locationMetrics?.variance?.toString() || '',
            varianceReason: data.locationMetrics?.varianceReason || '',
            amountToCollect:
              data.locationMetrics?.amountToCollect?.toString() || '',
            collectedAmount:
              data.locationMetrics?.collectedAmount?.toString() || '',
            balanceCorrection:
              data.locationMetrics?.balanceCorrection?.toString() || '',
            balanceCorrectionReason:
              data.locationMetrics?.correctionReason || '',
            previousBalance:
              data.locationMetrics?.previousBalanceOwed?.toString() || '',
            reasonForShortagePayment:
              data.locationMetrics?.reasonForShortage || '',
          });
        })
        .catch(error => {
          console.error('Error loading report:', error);
          toast.error('Failed to load report data', { position: 'top-left' });
        });
    }
  }, [show, reportId]);

  // Load collections with fresh data fetching
  useEffect(() => {
    if (show && reportId) {
      console.warn(
        '🔄 EditCollectionModal opened - fetching fresh collections data for report:',
        reportId
      );
      setIsLoadingCollections(true);
      fetchCollectionsByReportId(reportId)
        .then(collections => {
          console.warn(
            '🔄 Fresh collections fetched:',
            collections.length,
            'collections',
            collections.map(c => ({
              id: c._id,
              machine: c.machineName,
              isCompleted: c.isCompleted,
            }))
          );
          setCollectedMachineEntries(collections);
          // CRITICAL: Store original collections for dirty tracking
          setOriginalCollections(JSON.parse(JSON.stringify(collections)));
          console.warn(
            '🔍 collectedMachineEntries state updated with',
            collections.length,
            'items'
          );
          if (collections.length > 0) {
            const firstMachine = collections[0];
            if (firstMachine.location) {
              const matchingLocation = locations.find(
                loc => loc.name === firstMachine.location
              );
              if (matchingLocation) {
                console.warn(
                  '🔄 Auto-selecting location:',
                  matchingLocation.name
                );
                setSelectedLocationId(String(matchingLocation._id));
                // Don't auto-select the machine - let user choose
                setSelectedMachineId('');
              }
            }
          }
        })
        .catch(error => {
          console.error('Error fetching collections:', error);
          setCollectedMachineEntries([]);
          setOriginalCollections([]);
        })
        .finally(() => setIsLoadingCollections(false));
    }
  }, [show, reportId, locations]);

  // Always fetch fresh machine data when modal opens to ensure latest meter values
  useEffect(() => {
    if (show && locations.length > 0) {
      console.warn(
        '🔄 EditCollectionModal opened - ensuring fresh machine data is available'
      );

      // Trigger a refresh of the parent component's data if onRefresh is available
      if (onRefresh) {
        console.warn(
          '🔄 Triggering parent data refresh to ensure fresh locations and machines data'
        );
        onRefresh();
      }
    }
  }, [show, onRefresh, locations.length]);

  // Detect dirty state by comparing current vs original collections
  useEffect(() => {
    if (
      originalCollections.length === 0 ||
      collectedMachineEntries.length === 0
    ) {
      setHasUnsavedEdits(false);
      return;
    }

    let hasChanges = false;
    for (const current of collectedMachineEntries) {
      const original = originalCollections.find(o => o._id === current._id);
      if (original) {
        if (
          current.metersIn !== original.metersIn ||
          current.metersOut !== original.metersOut
        ) {
          hasChanges = true;
          break;
        }
      }
    }

    setHasUnsavedEdits(hasChanges);
  }, [collectedMachineEntries, originalCollections]);

  // Add beforeunload warning when there are unsaved changes
  useEffect(() => {
    if (!show || !hasUnsavedEdits) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [show, hasUnsavedEdits]);

  // Reset form when modal closes
  useEffect(() => {
    if (!show) {
      // Reset all state
      setReportData(null);
      setSelectedLocationId('');
      setSelectedLocationName('');
      setSelectedMachineId('');
      setCollectedMachineEntries([]);
      setHasChanges(false);
      setCurrentCollectionTime(new Date());
      setCurrentMetersIn('');
      setCurrentMetersOut('');
      setCurrentMachineNotes('');
      setHasSetCollectionTimeFromReport(false);
      setCurrentRamClear(false);
      setEditingEntryId(null);
      setFinancials({
        taxes: '',
        advance: '',
        variance: '',
        varianceReason: '',
        amountToCollect: '',
        collectedAmount: '',
        balanceCorrection: '0',
        balanceCorrectionReason: '',
        previousBalance: '0',
        reasonForShortagePayment: '',
      });
      setBaseBalanceCorrection('');
    }
  }, [show]);

  // Real-time validation for meter inputs
  const validateMeterInputs = useCallback(() => {
    console.warn('🔄 Validating meter inputs:', {
      hasMachine: !!machineForDataEntry,
      metersIn: currentMetersIn,
      metersOut: currentMetersOut,
      ramClear: currentRamClear,
      ramClearMetersIn: currentRamClearMetersIn,
      ramClearMetersOut: currentRamClearMetersOut,
    });

    if (!machineForDataEntry || !currentMetersIn || !currentMetersOut) {
      console.warn('🔄 Validation skipped - missing required data');
      return;
    }

    // Check if RAM Clear meters are missing (but don't return early)
    const ramClearMetersMissing =
      currentRamClear &&
      (!currentRamClearMetersIn || !currentRamClearMetersOut);

    console.warn('🔄 RAM Clear meters missing:', ramClearMetersMissing);

    const validation = validateMachineEntry(
      selectedMachineId,
      machineForDataEntry,
      currentMetersIn,
      currentMetersOut,
      userId,
      currentRamClear,
      prevIn || 0,
      prevOut || 0,
      currentRamClearMetersIn ? Number(currentRamClearMetersIn) : undefined,
      currentRamClearMetersOut ? Number(currentRamClearMetersOut) : undefined
    );

    console.warn('🔄 Validation result:', {
      isValid: validation.isValid,
      error: validation.error,
      warnings: validation.warnings,
    });

    // Combine validation warnings with RAM Clear meters missing warning
    const allWarnings = [...(validation.warnings || [])];
    if (ramClearMetersMissing) {
      allWarnings.push(
        'Please enter last meters before Ram clear (or rollover)'
      );
    }

    if (allWarnings.length > 0) {
      console.warn('🔄 All warnings:', allWarnings);
    }
  }, [
    selectedMachineId,
    machineForDataEntry,
    currentMetersIn,
    currentMetersOut,
    currentRamClearMetersIn,
    currentRamClearMetersOut,
    userId,
    currentRamClear,
    prevIn,
    prevOut,
  ]);

  // Debounced validation on input changes (3 seconds)
  const debouncedValidateMeterInputs = useDebouncedCallback(
    validateMeterInputs,
    3000
  );
  useEffect(() => {
    debouncedValidateMeterInputs();
  }, [debouncedValidateMeterInputs]);

  // Set prevIn/prevOut values when machineForDataEntry changes (for new entries)
  useEffect(() => {
    if (machineForDataEntry && !editingEntryId) {
      // Check if this machine is already in the collected entries
      const isAlreadyCollected = collectedMachineEntries.some(
        entry => entry.machineId === String(machineForDataEntry._id)
      );

      if (isAlreadyCollected) {
        console.warn(
          '🔍 Machine already collected - skipping historical query (will use stored prevIn/prevOut when editing)'
        );
        return;
      }

      console.warn(
        '🔍 Setting prevIn/prevOut for new entry being added to historical report:',
        {
          machineId: machineForDataEntry._id,
          reportTimestamp: currentCollectionTime,
          reportTimestampISO: currentCollectionTime.toISOString(),
        }
      );

      // For historical reports, query for the actual previous collection at that time
      const fetchHistoricalPrevMeters = async () => {
        try {
          const { getPreviousCollectionMetersAtTime } = await import(
            '@/lib/helpers/historicalCollectionData'
          );

          const previousMeters = await getPreviousCollectionMetersAtTime(
            String(machineForDataEntry._id),
            currentCollectionTime
          );

          console.warn('🔍 Historical query result:', {
            previousMeters,
            machineId: machineForDataEntry._id,
            timestamp: currentCollectionTime.toISOString(),
          });

          if (previousMeters !== null) {
            console.warn('🔍 Using historical prevIn/prevOut:', previousMeters);
            setPrevIn(previousMeters.prevIn);
            setPrevOut(previousMeters.prevOut);
          } else {
            // Query failed - use 0 as safe fallback
            console.warn('🔍 Historical query returned null, using 0');
            setPrevIn(0);
            setPrevOut(0);
          }
        } catch (error) {
          console.error('Error fetching historical prev meters:', error);
          // Use 0 as safe fallback on error
          console.warn(
            '🔍 Error in historical query, using 0 as safe fallback'
          );
          setPrevIn(0);
          setPrevOut(0);
        }
      };

      fetchHistoricalPrevMeters();
    }
  }, [
    machineForDataEntry,
    editingEntryId,
    currentCollectionTime,
    collectedMachineEntries,
  ]);

  // Debounced machine selection validation (1 second)
  const debouncedMachineForDataEntry = useDebounce(machineForDataEntry, 1000);
  const debouncedEditingEntryId = useDebounce(editingEntryId, 1000);

  useEffect(() => {
    if (debouncedMachineForDataEntry || debouncedEditingEntryId) {
      // Trigger validation when machine selection is debounced
      validateMeterInputs();
    }
  }, [
    debouncedMachineForDataEntry,
    debouncedEditingEntryId,
    validateMeterInputs,
  ]);

  // Debounced input field validation (1.5 seconds)
  const debouncedCurrentMetersIn = useDebounce(currentMetersIn, 1500);
  const debouncedCurrentMetersOut = useDebounce(currentMetersOut, 1500);
  const debouncedCurrentMachineNotes = useDebounce(currentMachineNotes, 1500);
  const debouncedCurrentRamClearMetersIn = useDebounce(currentRamClearMetersIn, 1500);
  const debouncedCurrentRamClearMetersOut = useDebounce(currentRamClearMetersOut, 1500);

  useEffect(() => {
    if (
      debouncedCurrentMetersIn ||
      debouncedCurrentMetersOut ||
      debouncedCurrentMachineNotes
    ) {
      // Trigger validation when input fields change (debounced)
      validateMeterInputs();
    }
  }, [
    debouncedCurrentMetersIn,
    debouncedCurrentMetersOut,
    debouncedCurrentMachineNotes,
    validateMeterInputs,
  ]);

  const handleEditEntry = useCallback(
    async (entryId: string) => {
      if (isProcessing) return;

      const entryToEdit = collectedMachineEntries.find(e => e._id === entryId);
      if (entryToEdit) {
        // Set editing state
        setEditingEntryId(entryId);

        // Set the selected machine ID
        setSelectedMachineId(entryToEdit.machineId);

        // Populate form fields with existing data
        setCurrentMetersIn(entryToEdit.metersIn.toString());
        setCurrentMetersOut(entryToEdit.metersOut.toString());
        setCurrentMachineNotes(entryToEdit.notes || '');
        setCurrentRamClear(entryToEdit.ramClear || false);
        setCurrentRamClearMetersIn(
          entryToEdit.ramClearMetersIn?.toString() || ''
        );
        setCurrentRamClearMetersOut(
          entryToEdit.ramClearMetersOut?.toString() || ''
        );

        // Set the collection time
        if (entryToEdit.timestamp) {
          setCurrentCollectionTime(new Date(entryToEdit.timestamp));
        }

        // Set previous values for display
        setPrevIn(entryToEdit.prevIn || 0);
        setPrevOut(entryToEdit.prevOut || 0);

        toast.info(
          "Edit mode activated. Make your changes and click 'Update Entry in List'.",
          { position: 'top-left' }
        );
      }
    },
    [isProcessing, collectedMachineEntries]
  );

  const handleCancelEdit = useCallback(() => {
    // Reset editing state
    setEditingEntryId(null);

    // Clear all input fields
    setCurrentMetersIn('');
    setCurrentMetersOut('');
    setCurrentMachineNotes('');
    setCurrentRamClear(false);
    setCurrentRamClearMetersIn('');
    setCurrentRamClearMetersOut('');
    // Keep existing collectionTime - don't reset it

    // Reset prev values
    setPrevIn(null);
    setPrevOut(null);

    toast.info('Edit cancelled', { position: 'top-left' });
  }, []);

  const confirmAddOrUpdateEntry = useCallback(async () => {
    if (isProcessing) return;

    // Validation logic here (same as existing validation)
    const validation = validateMachineEntry(
      selectedMachineId,
      machineForDataEntry,
      currentMetersIn,
      currentMetersOut,
      userId,
      currentRamClear,
      prevIn || 0,
      prevOut || 0,
      currentRamClearMetersIn ? Number(currentRamClearMetersIn) : undefined,
      currentRamClearMetersOut ? Number(currentRamClearMetersOut) : undefined,
      !!editingEntryId
    );

    if (!validation.isValid) {
      toast.error(validation.error || 'Validation failed', {
        position: 'top-left',
      });
      return;
    }

    setIsProcessing(true);

    try {
      if (editingEntryId) {
        // Find the existing collection to get its locationReportId
        const existingEntry = collectedMachineEntries.find(
          e => e._id === editingEntryId
        );

        // Update existing collection
        const result = await updateCollection(editingEntryId, {
          metersIn: Number(currentMetersIn),
          metersOut: Number(currentMetersOut),
          notes: currentMachineNotes,
          ramClear: currentRamClear,
          ramClearMetersIn: currentRamClearMetersIn
            ? Number(currentRamClearMetersIn)
            : undefined,
          ramClearMetersOut: currentRamClearMetersOut
            ? Number(currentRamClearMetersOut)
            : undefined,
          timestamp: currentCollectionTime,
          prevIn: prevIn || 0,
          prevOut: prevOut || 0,
          // CRITICAL: Preserve the existing locationReportId for history update
          locationReportId: existingEntry?.locationReportId || reportId,
        });

        // Update local state
        setCollectedMachineEntries(prev =>
          prev.map(entry =>
            entry._id === editingEntryId ? { ...entry, ...result } : entry
          )
        );

        // Clear editing state and machine selection first to disable inputs
        setEditingEntryId(null);
        setSelectedMachineId('');

        // Then clear all form fields
        setCurrentMetersIn('');
        setCurrentMetersOut('');
        setCurrentMachineNotes('');
        setCurrentRamClear(false);
        setCurrentRamClearMetersIn('');
        setCurrentRamClearMetersOut('');
        setPrevIn(null);
        setPrevOut(null);

        toast.success('Machine updated!', { position: 'top-left' });
      } else {
        // Calculate movement with RAM Clear support using the same utility
        const previousMeters: PreviousCollectionMeters = {
          metersIn: prevIn || 0,
          metersOut: prevOut || 0,
        };

        const movement = calculateMovement(
          Number(currentMetersIn),
          Number(currentMetersOut),
          previousMeters,
          currentRamClear,
          currentRamClearMetersIn ? Number(currentRamClearMetersIn) : undefined,
          currentRamClearMetersOut
            ? Number(currentRamClearMetersOut)
            : undefined
        );

        // Round movement values to 2 decimal places
        const roundedMovement = {
          metersIn: Number(movement.metersIn.toFixed(2)),
          metersOut: Number(movement.metersOut.toFixed(2)),
          gross: Number(movement.gross.toFixed(2)),
        };

        // Add new collection to the list
        const newEntry: CollectionDocument = {
          _id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // More unique temporary ID
          machineId: selectedMachineId,
          machineName: machineForDataEntry?.name || '',
          serialNumber: machineForDataEntry?.serialNumber || '',
          machineCustomName: machineForDataEntry?.custom?.name || '',
          metersIn: Number(currentMetersIn),
          metersOut: Number(currentMetersOut),
          prevIn: prevIn || 0,
          prevOut: prevOut || 0,
          notes: currentMachineNotes,
          ramClear: currentRamClear,
          ramClearMetersIn: currentRamClearMetersIn
            ? Number(currentRamClearMetersIn)
            : undefined,
          ramClearMetersOut: currentRamClearMetersOut
            ? Number(currentRamClearMetersOut)
            : undefined,
          timestamp: currentCollectionTime,
          location: selectedLocationName,
          locationReportId: reportId,
          collector: getUserDisplayName(user),
          isCompleted: false,
          softMetersIn: 0,
          softMetersOut: 0,
          sasMeters: {
            machine: selectedMachineId,
            drop: 0,
            totalCancelledCredits: 0,
            gross: 0,
            gamesPlayed: 0,
            jackpot: 0,
            sasStartTime: '',
            sasEndTime: '',
          },
          movement: roundedMovement,
          createdAt: new Date(),
          updatedAt: new Date(),
          __v: 0,
        };

        // Save to database first
        // CRITICAL: Match NewCollectionModal logic - let API calculate prevIn/prevOut, movement, and SAS metrics
        try {
          const collectionPayload = {
            machineId: selectedMachineId,
            machineName: machineForDataEntry?.name || '',
            serialNumber: machineForDataEntry?.serialNumber || '',
            machineCustomName: machineForDataEntry?.custom?.name || '',
            metersIn: Number(currentMetersIn),
            metersOut: Number(currentMetersOut),
            // Don't include prevIn/prevOut - let API calculate from machine history
            notes: currentMachineNotes,
            ramClear: currentRamClear,
            ramClearMetersIn: currentRamClearMetersIn
              ? Number(currentRamClearMetersIn)
              : undefined,
            ramClearMetersOut: currentRamClearMetersOut
              ? Number(currentRamClearMetersOut)
              : undefined,
            timestamp: currentCollectionTime,
            location: selectedLocationName,
            locationReportId: reportId,
            collector: getUserDisplayName(user),
            // Only include sasStartTime if custom SAS time is set (matches NewCollectionModal)
            ...(customSasStartTime && {
              sasMeters: {
                sasStartTime: customSasStartTime,
              },
            }),
          };

          const response = await axios.post(
            '/api/collections',
            collectionPayload
          );

          // Add to local state with the real ID from database
          // CRITICAL: API returns { success: true, data: created }, so we need response.data.data._id
          const savedEntry = { ...newEntry, _id: response.data.data._id };
          console.warn('🔍 Adding machine to local state:', {
            machineId: savedEntry.machineId,
            machineName: savedEntry.machineName,
            _id: savedEntry._id,
            currentEntriesCount: collectedMachineEntries.length,
          });
          setCollectedMachineEntries(prev => {
            const updated = [...prev, savedEntry];
            console.warn('🔍 Updated collected entries count:', updated.length);
            return updated;
          });
          setHasChanges(true);

          // Reset form fields
          setCurrentMetersIn('');
          setCurrentMetersOut('');
          setCurrentMachineNotes('');
          setCurrentRamClear(false);
          setCurrentRamClearMetersIn('');
          setCurrentRamClearMetersOut('');
          setPrevIn(null);
          setPrevOut(null);
          setSelectedMachineId('');

          toast.success(
            'Machine added to collection list and saved to database!',
            { position: 'top-left' }
          );
        } catch (error) {
          console.error('Error saving collection to database:', error);
          toast.error('Failed to save machine to database. Please try again.', {
            position: 'top-left',
          });
        }
      }
    } catch {
      toast.error('Failed to update machine. Please try again.', {
        position: 'top-left',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [
    isProcessing,
    selectedMachineId,
    machineForDataEntry,
    currentMetersIn,
    currentMetersOut,
    currentMachineNotes,
    collectedMachineEntries,
    currentRamClear,
    currentRamClearMetersIn,
    currentRamClearMetersOut,
    currentCollectionTime,
    editingEntryId,
    prevIn,
    prevOut,
    userId,
    customSasStartTime,
    reportId,
    selectedLocationName,
    user,
  ]);

  const confirmUpdateEntry = useCallback(() => {
    setShowUpdateConfirmation(false);
    confirmAddOrUpdateEntry();
  }, [confirmAddOrUpdateEntry]);

  const handleAddOrUpdateEntry = useCallback(async () => {
    if (isProcessing) return;

    // If updating an existing entry, show confirmation dialog
    if (editingEntryId) {
      setShowUpdateConfirmation(true);
      return;
    }

    // If adding a new entry, proceed directly
    if (machineForDataEntry) {
      confirmAddOrUpdateEntry();
    }
  }, [
    isProcessing,
    editingEntryId,
    machineForDataEntry,
    confirmAddOrUpdateEntry,
  ]);

  const handleDeleteEntry = useCallback(
    (entryId: string) => {
      if (isProcessing) return;

      // Check if this is the last collection
      if (collectedMachineEntries.length === 1) {
        toast.error(
          'Cannot delete the last collection. A collection report must have at least one machine. Please add another machine before deleting this one.',
          {
            duration: 5000,
            position: 'top-left',
          }
        );
        return;
      }

      setEntryToDelete(entryId);
      setShowDeleteConfirmation(true);
    },
    [isProcessing, collectedMachineEntries.length]
  );

  const confirmDeleteEntry = useCallback(async () => {
    if (!entryToDelete) return;

    setIsProcessing(true);
    try {
      await deleteMachineCollection(entryToDelete);
      toast.success('Machine deleted!', { position: 'top-left' });

      // Remove the deleted entry from local state immediately
      setCollectedMachineEntries(prev =>
        prev.filter(entry => entry._id !== entryToDelete)
      );

      // CRITICAL: Also update originalCollections to prevent batch update errors
      // When we delete a machine, it's no longer in the report, so we shouldn't try to update its history
      setOriginalCollections(prev =>
        prev.filter(entry => entry._id !== entryToDelete)
      );

      // Refetch collections to ensure data consistency
      setIsLoadingCollections(true);
      try {
        const updatedCollections = await fetchCollectionsByReportId(reportId);
        setCollectedMachineEntries(updatedCollections);
        // CRITICAL: Also update originalCollections with the fresh data
        setOriginalCollections(JSON.parse(JSON.stringify(updatedCollections)));
      } catch (error) {
        console.error('Error refetching collections after delete:', error);
      } finally {
        setIsLoadingCollections(false);
      }

      setHasChanges(true);

      // Refresh machines data to show updated values (including reverted collectionMeters)
      if (onRefresh) {
        console.warn(
          '🔄 Triggering parent refresh to get updated machine data after deletion'
        );
        onRefresh();
      }

      // Keep the machine selected and form populated so user can continue working

      // Close confirmation dialog
      setShowDeleteConfirmation(false);
      setEntryToDelete(null);
    } catch {
      toast.error('Failed to delete machine', { position: 'top-left' });
    } finally {
      setIsProcessing(false);
    }
  }, [entryToDelete, reportId, onRefresh]);

  const handleUpdateReport = useCallback(async () => {
    if (isProcessing || !userId || !reportData) {
      toast.error('Missing required data.', { position: 'top-left' });
      return;
    }

    // Check if there are any collections
    if (collectedMachineEntries.length === 0) {
      toast.error(
        'Cannot update report. At least one machine must be added to the collection report.',
        {
          duration: 5000,
          position: 'top-left',
        }
      );
      return;
    }

    // Check if user has unsaved form changes for currently selected machine
    if (editingEntryId && machineForDataEntry) {
      const editingEntry = collectedMachineEntries.find(
        e => e._id === editingEntryId
      );
      if (editingEntry) {
        const formMetersIn = currentMetersIn ? Number(currentMetersIn) : 0;
        const formMetersOut = currentMetersOut ? Number(currentMetersOut) : 0;
        const savedMetersIn = editingEntry.metersIn || 0;
        const savedMetersOut = editingEntry.metersOut || 0;

        // Check if form values differ from saved values
        if (
          formMetersIn !== savedMetersIn ||
          formMetersOut !== savedMetersOut
        ) {
          toast.warning(
            `Unsaved meter changes detected for ${machineForDataEntry.name || machineForDataEntry.serialNumber}. ` +
              `Current form: In=${formMetersIn}, Out=${formMetersOut}. ` +
              `Saved values: In=${savedMetersIn}, Out=${savedMetersOut}. ` +
              `Please click "Update Machine" to save changes or cancel the edit.`,
            {
              duration: 8000,
              position: 'top-left',
            }
          );
          return;
        }
      }
    }

    // Check if user has entered new machine data without adding it to the list
    // This includes: machine selected OR any meter values entered OR notes entered
    if (
      !editingEntryId &&
      (selectedMachineId ||
        currentMetersIn ||
        currentMetersOut ||
        currentMachineNotes)
    ) {
      const enteredMetersIn = currentMetersIn ? Number(currentMetersIn) : 0;
      const enteredMetersOut = currentMetersOut ? Number(currentMetersOut) : 0;
      const hasNotes = currentMachineNotes.trim().length > 0;

      // If ANY data has been entered (machine selected, meters entered, or notes added)
      if (
        selectedMachineId ||
        enteredMetersIn !== 0 ||
        enteredMetersOut !== 0 ||
        hasNotes
      ) {
        toast.error(
          `You have unsaved machine data. ` +
            (selectedMachineId
              ? `Machine: ${machineForDataEntry?.name || machineForDataEntry?.serialNumber || 'selected machine'}. `
              : '') +
            (enteredMetersIn !== 0 || enteredMetersOut !== 0
              ? `Meters: In=${enteredMetersIn}, Out=${enteredMetersOut}. `
              : '') +
            (hasNotes
              ? `Notes: "${currentMachineNotes.substring(0, 30)}${currentMachineNotes.length > 30 ? '...' : ''}". `
              : '') +
            `Please click "Add Machine to List" to save this data, or cancel by unselecting the machine and clearing the form before updating the report.`,
          {
            duration: 10000,
            position: 'top-left',
          }
        );
        return;
      }
    }

    setIsProcessing(true);
    try {
      // PHASE 1: Detect machine meter changes and call batch update API
      const changes: Array<{
        machineId: string;
        locationReportId: string;
        metersIn: number;
        metersOut: number;
        prevMetersIn: number;
        prevMetersOut: number;
        collectionId: string;
      }> = [];

      for (const current of collectedMachineEntries) {
        const original = originalCollections.find(o => o._id === current._id);
        if (original) {
          // Check if meters changed
          const metersInChanged = current.metersIn !== original.metersIn;
          const metersOutChanged = current.metersOut !== original.metersOut;

          if (metersInChanged || metersOutChanged) {
            console.warn(
              `🔍 Detected changes for machine ${current.machineId}:`,
              {
                originalMetersIn: original.metersIn,
                currentMetersIn: current.metersIn,
                originalMetersOut: original.metersOut,
                currentMetersOut: current.metersOut,
              }
            );

            changes.push({
              machineId: current.machineId,
              locationReportId: current.locationReportId || reportId,
              metersIn: current.metersIn || 0,
              metersOut: current.metersOut || 0,
              prevMetersIn: current.prevIn || 0,
              prevMetersOut: current.prevOut || 0,
              collectionId: current._id,
            });
          }
        } else {
          // CRITICAL: This is a NEW machine added in this editing session
          // We need to create its collection history entry
          console.warn(`✨ Detected NEW machine added: ${current.machineId}`, {
            machineId: current.machineId,
            metersIn: current.metersIn,
            metersOut: current.metersOut,
            collectionId: current._id,
          });

          changes.push({
            machineId: current.machineId,
            locationReportId: current.locationReportId || reportId,
            metersIn: current.metersIn || 0,
            metersOut: current.metersOut || 0,
            prevMetersIn: current.prevIn || 0,
            prevMetersOut: current.prevOut || 0,
            collectionId: current._id,
          });
        }
      }

      // If there are meter changes, call batch update API
      if (changes.length > 0) {
        console.warn(
          `🔄 Calling batch update API for ${changes.length} machine(s)`
        );
        // CRITICAL: Use PATCH for updating, not POST
        const batchResponse = await axios.patch(
          `/api/collection-reports/${reportId}/update-history`,
          { changes }
        );

        if (!batchResponse.data.success) {
          toast.error('Failed to update machine histories. Please try again.', {
            position: 'top-left',
          });
          return;
        }

        console.warn('✅ Machine histories updated successfully');
        toast.success(
          `Updated ${changes.length} machine histories successfully!`,
          { position: 'top-left' }
        );
      } else {
        console.warn('ℹ️ No machine meter changes detected');
      }

      // PHASE 2: Update collection report financials
      const updateData = {
        ...reportData,
        variance: Number(financials.variance) || 0,
        previousBalance: Number(financials.previousBalance) || 0,
        amountToCollect: Number(financials.amountToCollect) || 0,
        amountCollected: Number(financials.collectedAmount) || 0,
        taxes: Number(financials.taxes) || 0,
        advance: Number(financials.advance) || 0,
        varianceReason: financials.varianceReason,
        reasonShortagePayment: financials.reasonForShortagePayment,
        balanceCorrection: Number(financials.balanceCorrection) || 0,
        balanceCorrectionReas: financials.balanceCorrectionReason,
      };

      await updateCollectionReport(reportId, updateData);
      toast.success('Report updated successfully!', { position: 'top-left' });

      // Clear unsaved edits flag and close modal
      // CRITICAL: Don't call handleClose() here as state update may not have taken effect
      // Instead, directly call onClose() since we know the update was successful
      setHasUnsavedEdits(false);
      setHasChanges(true);

      // Refresh parent and close modal
      if (onRefresh) {
        onRefresh();
      }
      onClose();
    } catch (error) {
      console.error('Failed to update report:', error);
      toast.error('Failed to update report. Please try again.', {
        position: 'top-left',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [
    isProcessing,
    userId,
    reportData,
    financials,
    reportId,
    collectedMachineEntries,
    originalCollections,
    onClose,
    onRefresh,
    editingEntryId,
    machineForDataEntry,
    currentMetersIn,
    currentMetersOut,
    currentMachineNotes,
    selectedMachineId,
  ]);

  const isUpdateReportEnabled = useMemo(() => {
    return (
      collectedMachineEntries.length > 0 &&
      financials.variance !== '' &&
      financials.advance !== '' &&
      financials.taxes !== '' &&
      financials.previousBalance !== '' &&
      financials.collectedAmount !== ''
    );
  }, [collectedMachineEntries, financials]);

  if (!show) return null;

  // Use mobile modal for mobile devices
  return (
    <>
      <Dialog
        open={show}
        onOpenChange={isOpen => {
          // CRITICAL: Only allow closing if handleClose returns true
          // If there are unsaved edits, handleClose will return false and show warning
          if (!isOpen) {
            const canClose = handleClose();
            if (!canClose) {
              // Prevent the dialog from closing by not calling the close handler
              // The warning dialog will be shown by handleClose
              return;
            }
          }
        }}
      >
        <DialogContent
          className="flex h-[calc(100vh-2rem)] max-w-6xl flex-col bg-container p-0 md:h-[95vh] lg:h-[90vh] lg:max-w-7xl"
          onInteractOutside={e => e.preventDefault()}
        >
          <DialogHeader className="p-4 pb-0 md:p-6">
            <DialogTitle className="text-xl font-bold md:text-2xl">
              Edit Collection Report
            </DialogTitle>
          </DialogHeader>

          <div className="flex min-h-0 flex-grow flex-col overflow-y-auto lg:flex-row">
            {/* Mobile: Full width, Desktop: 1/4 width */}
            <div className="flex w-full flex-col space-y-3 overflow-y-auto border-b border-gray-300 p-3 md:p-4 lg:w-1/4 lg:border-b-0 lg:border-r">
              <LocationSelect
                value={selectedLocationId}
                onValueChange={setSelectedLocationId}
                locations={locations.map(loc => ({
                  _id: String(loc._id),
                  name: loc.name,
                }))}
                placeholder="Select Location"
                disabled={true}
                className="w-full"
                emptyMessage="No locations found"
              />

              {/* View Toggle Buttons */}
              <div className="mt-2 flex gap-2">
                <Button
                  variant={viewMode === 'machines' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('machines')}
                  className="flex-1"
                >
                  Available Machines
                </Button>
                <Button
                  variant={viewMode === 'collected' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('collected')}
                  className="flex-1"
                  disabled={collectedMachineEntries.length === 0}
                >
                  Collected ({collectedMachineEntries.length})
                </Button>
              </div>

              {/* Search bar for machines - only show in machines view */}
              {viewMode === 'machines' &&
                machinesOfSelectedLocation.length > 0 && (
                  <div className="mt-2">
                    <Input
                      type="text"
                      placeholder="Search machines..."
                      value={machineSearchTerm}
                      onChange={e => setMachineSearchTerm(e.target.value)}
                      className="w-full"
                    />
                    {machineSearchTerm && (
                      <p className="mt-1 text-xs text-gray-500">
                        Showing {filteredMachines.length} of{' '}
                        {machinesOfSelectedLocation.length} machines
                      </p>
                    )}
                  </div>
                )}

              {/* Search bar for collected machines - only show in collected view */}
              {viewMode === 'collected' &&
                collectedMachineEntries.length > 0 && (
                  <div className="mt-2">
                    <Input
                      type="text"
                      placeholder="Search collected machines..."
                      value={collectedMachinesSearchTerm}
                      onChange={e =>
                        setCollectedMachinesSearchTerm(e.target.value)
                      }
                      className="w-full"
                    />
                  </div>
                )}

              {/* Update All Dates - Show if there are 2 or more machines in collected view */}
              {viewMode === 'collected' &&
                collectedMachineEntries.length >= 2 && (
                  <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-2.5">
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      Update All Dates
                    </label>
                    <PCDateTimePicker
                      date={updateAllDate}
                      setDate={date => {
                        if (
                          date &&
                          date instanceof Date &&
                          !isNaN(date.getTime())
                        ) {
                          setUpdateAllDate(date);
                        }
                      }}
                      disabled={isProcessing}
                      placeholder="Select date/time"
                    />
                    <Button
                      onClick={async () => {
                        if (!updateAllDate) return;
                        
                        setIsProcessing(true);
                        
                        try {
                          toast.loading('Updating all machines...', {
                            id: 'update-all-dates',
                          });

                          console.warn('🔄 Updating machines:', collectedMachineEntries.map(m => ({ id: m._id, has_id: !!m._id })));

                          // Update all collections in database
                          const results = await Promise.allSettled(
                            collectedMachineEntries.map(async entry => {
                              if (!entry._id) {
                                console.warn('⚠️ Skipping entry without _id:', entry);
                                return;
                              }
                              
                              console.warn(`📝 Updating collection ${entry._id} to ${updateAllDate.toISOString()}`);
                              return await axios.patch(
                                `/api/collections?id=${entry._id}`,
                                {
                                  timestamp: updateAllDate.toISOString(),
                                  collectionTime: updateAllDate.toISOString(),
                                }
                              );
                            })
                          );

                          // Check for failures
                          const failed = results.filter(
                            r => r.status === 'rejected'
                          ).length;

                          // Update frontend state
                          setCollectedMachineEntries(prev =>
                            prev.map(entry => ({
                              ...entry,
                              timestamp: updateAllDate,
                              collectionTime: updateAllDate,
                            }))
                          );
                          
                          setHasUnsavedEdits(true);
                          
                          toast.dismiss('update-all-dates');

                          if (failed > 0) {
                            toast.warning(
                              `Updated ${collectedMachineEntries.length - failed} machines, ${failed} failed`
                            );
                          } else {
                            toast.success(
                              `Updated ${collectedMachineEntries.length} machines in database`
                            );
                          }
                        } catch (error) {
                          toast.dismiss('update-all-dates');
                          console.error('Failed to update dates:', error);
                          toast.error('Failed to update machines');
                        } finally {
                          setIsProcessing(false);
                        }
                      }}
                      disabled={!updateAllDate || isProcessing}
                      className="mt-2 w-full bg-blue-600 text-xs hover:bg-blue-700"
                      size="sm"
                    >
                      {isProcessing ? 'Updating...' : 'Apply to All Machines'}
                    </Button>
                  </div>
                )}

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                {viewMode === 'machines' ? (
                  selectedLocationId ? (
                    isLoadingMachines ? (
                      <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Skeleton
                            key={i}
                            className="h-12 w-full rounded-md"
                          />
                        ))}
                      </div>
                    ) : filteredMachines.length > 0 ? (
                      filteredMachines.map(machine => (
                        <Button
                          key={String(machine._id)}
                          variant={
                            selectedMachineId === machine._id
                              ? 'secondary'
                              : collectedMachineEntries.find(
                                    e => e.machineId === machine._id
                                  )
                                ? 'default'
                                : 'outline'
                          }
                          className={`h-auto w-full justify-start whitespace-normal break-words px-3 py-2 text-left ${
                            collectedMachineEntries.find(
                              e => e.machineId === machine._id
                            ) && !editingEntryId
                              ? 'cursor-not-allowed opacity-60'
                              : ''
                          }`}
                          onClick={() => {
                            // If in editing mode and this is the machine being edited, allow selection
                            if (editingEntryId) {
                              const entryBeingEdited =
                                collectedMachineEntries.find(
                                  e => e._id === editingEntryId
                                );
                              if (
                                entryBeingEdited?.machineId ===
                                String(machine._id)
                              ) {
                                // This is the machine being edited - keep it selected
                                setSelectedMachineId(String(machine._id));
                                return;
                              }
                            }

                            if (
                              collectedMachineEntries.find(
                                e => e.machineId === machine._id
                              ) &&
                              !editingEntryId
                            ) {
                              toast.info(
                                `${machine.name} is already in the list. Click edit on the right to modify.`,
                                { position: 'top-left' }
                              );
                              return;
                            }

                            // If machine is already selected, unselect it
                            if (selectedMachineId === String(machine._id)) {
                              console.warn('🔍 Machine unselected:', {
                                machineId: String(machine._id),
                                machineName: machine.name,
                              });
                              setSelectedMachineId('');
                              return;
                            }

                            setSelectedMachineId(String(machine._id));

                            // Don't set prevIn/prevOut here - let the useEffect handle it
                            // The useEffect will query for historical previous collection
                            console.warn(
                              '🔍 Machine selected - useEffect will fetch historical prevIn/prevOut:',
                              {
                                machineId: machine._id,
                                reportTimestamp:
                                  currentCollectionTime.toISOString(),
                              }
                            );
                          }}
                          disabled={
                            isProcessing ||
                            (editingEntryId !== null &&
                              collectedMachineEntries.find(
                                e => e._id === editingEntryId
                              )?.machineId !== machine._id) ||
                            (collectedMachineEntries.find(
                              e => e.machineId === machine._id
                            ) &&
                              !editingEntryId)
                          }
                        >
                          {formatMachineDisplayNameWithBold(machine)}
                          {collectedMachineEntries.find(
                            e => e.machineId === machine._id
                          ) &&
                            !editingEntryId && (
                              <span className="ml-auto text-xs text-green-500">
                                (Added)
                              </span>
                            )}
                        </Button>
                      ))
                    ) : machineSearchTerm ? (
                      <p className="pt-2 text-xs text-grayHighlight md:text-sm">
                        No machines found matching &quot;{machineSearchTerm}
                        &quot;.
                      </p>
                    ) : (
                      <p className="pt-2 text-xs text-grayHighlight md:text-sm">
                        No machines for this location.
                      </p>
                    )
                  ) : (
                    <p className="pt-2 text-xs text-grayHighlight md:text-sm">
                      Select a location to see machines.
                    </p>
                  )
                ) : // Collected Machines View
                isLoadingCollections ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div
                        key={i}
                        className="space-y-2 rounded-md border border-gray-200 bg-white p-3 shadow"
                      >
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-3 w-2/3" />
                        <div className="flex justify-end gap-1">
                          <Skeleton className="h-6 w-6 rounded" />
                          <Skeleton className="h-6 w-6 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : collectedMachineEntries.length === 0 ? (
                  <p className="py-10 text-center text-sm text-gray-500">
                    No machines added to the list yet.
                  </p>
                ) : (
                  collectedMachineEntries
                    .filter(entry => {
                      if (!collectedMachinesSearchTerm.trim()) return true;
                      const searchLower =
                        collectedMachinesSearchTerm.toLowerCase();
                      return (
                        (entry.machineName &&
                          entry.machineName
                            .toLowerCase()
                            .includes(searchLower)) ||
                        (entry.serialNumber &&
                          entry.serialNumber
                            .toLowerCase()
                            .includes(searchLower)) ||
                        (entry.machineCustomName &&
                          entry.machineCustomName
                            .toLowerCase()
                            .includes(searchLower)) ||
                        (entry.game &&
                          entry.game.toLowerCase().includes(searchLower))
                      );
                    })
                    .map(entry => (
                      <div
                        key={entry._id}
                        className="relative space-y-1 rounded-md border border-gray-200 bg-white p-3 shadow"
                      >
                        <p className="break-words text-sm font-semibold text-primary">
                          {formatMachineDisplayNameWithBold({
                            serialNumber: entry.serialNumber,
                            custom: { name: entry.machineCustomName },
                            game: entry.game,
                          })}
                        </p>
                        <p className="text-xs text-gray-600">
                          Time: {formatDate(entry.timestamp)}
                        </p>
                        <p className="text-xs text-gray-600">
                          Meters: In {entry.metersIn || 0} | Out{' '}
                          {entry.metersOut || 0}
                        </p>
                        <p className="text-xs text-gray-600">
                          Movement: {entry.movement?.gross || 0}
                        </p>
                        <div className="mt-2 flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditEntry(entry._id)}
                            disabled={isProcessing}
                            className="h-6 w-6 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteEntry(entry._id)}
                            disabled={isProcessing}
                            className="h-6 w-6 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Mobile: Full width, Desktop: 3/4 width (expanded since we removed right sidebar) */}
            <div className="flex w-full flex-col space-y-3 overflow-y-auto p-3 md:p-4 lg:w-3/4">
              {(selectedMachineId && machineForDataEntry) ||
              collectedMachineEntries.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-grayHighlight">
                      {selectedLocationName} (Prev. Collection:{' '}
                      {machineForDataEntry?.collectionTime
                        ? formatDate(machineForDataEntry.collectionTime)
                        : 'N/A'}
                      )
                    </p>
                  </div>

                  <Button
                    variant="default"
                    className="flex w-full items-center justify-between bg-lighterBlueHighlight text-primary-foreground"
                  >
                    <span>
                      {machineForDataEntry
                        ? formatMachineDisplayNameWithBold({
                            serialNumber:
                              getSerialNumberIdentifier(machineForDataEntry),
                            custom: { name: machineForDataEntry.name },
                          })
                        : 'Select a machine to edit'}
                    </span>
                    {machineForDataEntry && (
                      <ExternalLink
                        className="ml-2 h-4 w-4 cursor-pointer transition-transform hover:scale-110"
                        onClick={e => {
                          e.stopPropagation();
                          setShowViewMachineConfirmation(true);
                        }}
                      />
                    )}
                  </Button>

                  <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-grayHighlight">
                      Collection Time:
                    </label>
                    <PCDateTimePicker
                      date={currentCollectionTime}
                      setDate={date => {
                        if (
                          date &&
                          date instanceof Date &&
                          !isNaN(date.getTime())
                        ) {
                          console.warn(
                            '🕐 Collection time changed in edit modal:',
                            {
                              newDate: date.toISOString(),
                              newDateLocal: date.toLocaleString(),
                              previousTime: currentCollectionTime.toISOString(),
                            }
                          );
                          setCurrentCollectionTime(date);
                        }
                      }}
                      disabled={isProcessing}
                      placeholder="Select collection time"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      This time applies to the current machine being
                      added/edited
                    </p>
                  </div>

                  {/* Advanced SAS Start override - Only show for first collection */}
                  {isFirstCollection && (
                    <div className="mb-2">
                      <button
                        type="button"
                        className="text-xs text-button underline"
                        onClick={() => setShowAdvancedSas(p => !p)}
                      >
                        {showAdvancedSas
                          ? 'Hide Advanced'
                          : 'Advanced: Custom previous SAS start'}
                      </button>
                    </div>
                  )}
                  {isFirstCollection && showAdvancedSas && (
                    <div className="mb-4">
                      <label className="mb-2 block text-sm font-medium text-grayHighlight">
                        Previous SAS Start (optional):
                      </label>
                      <PCDateTimePicker
                        date={customSasStartTime || undefined}
                        setDate={date => {
                          if (
                            date &&
                            date instanceof Date &&
                            !isNaN(date.getTime())
                          ) {
                            setCustomSasStartTime(date);
                          } else if (!date) {
                            setCustomSasStartTime(null);
                          }
                        }}
                        disabled={isProcessing}
                        placeholder="Select previous SAS start (optional)"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Leave empty to auto-use last collection time or 24h
                        before.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-grayHighlight">
                        Meters In:
                      </label>
                      <div>
                        <Input
                          type="text"
                          placeholder="0"
                          value={currentMetersIn}
                          onChange={e => {
                            const val = e.target.value;
                            if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                              setCurrentMetersIn(val);
                            }
                          }}
                          disabled={!machineForDataEntry || isProcessing}
                        />
                      </div>
                      <p className="mt-1 text-xs text-grayHighlight">
                        Prev In: {prevIn !== null ? prevIn : 'N/A'}
                      </p>
                      {/* Regular Meters In Validation - Debounced */}
                      {debouncedCurrentMetersIn &&
                        prevIn &&
                        Number(debouncedCurrentMetersIn) < Number(prevIn) && (
                          <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2">
                            <p className="text-xs text-red-600">
                              Warning: Meters In ({debouncedCurrentMetersIn}) should be
                              higher than or equal to Previous Meters In (
                              {prevIn})
                            </p>
                          </div>
                        )}
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-grayHighlight">
                        Meters Out:
                      </label>
                      <div>
                        <Input
                          type="text"
                          placeholder="0"
                          value={currentMetersOut}
                          onChange={e => {
                            const val = e.target.value;
                            if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                              setCurrentMetersOut(val);
                            }
                          }}
                          disabled={!machineForDataEntry || isProcessing}
                        />
                      </div>
                      <p className="mt-1 text-xs text-grayHighlight">
                        Prev Out: {prevOut !== null ? prevOut : 'N/A'}
                      </p>
                      {/* Regular Meters Out Validation - Debounced */}
                      {debouncedCurrentMetersOut &&
                        prevOut &&
                        Number(debouncedCurrentMetersOut) < Number(prevOut) && (
                          <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2">
                            <p className="text-xs text-red-600">
                              Warning: Meters Out ({debouncedCurrentMetersOut}) should be
                              higher than or equal to Previous Meters Out (
                              {prevOut})
                            </p>
                          </div>
                        )}
                    </div>
                  </div>

                  {/* RAM Clear Meter Inputs - Only show when RAM Clear is checked */}
                  {currentRamClear && (
                    <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-4">
                      <h4 className="mb-3 text-sm font-medium text-blue-800">
                        RAM Clear Meters (Before Rollover)
                      </h4>
                      <p className="mb-3 text-xs text-blue-600">
                        Please enter the last meter readings before the RAM
                        Clear occurred.
                      </p>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-blue-700">
                            RAM Clear Meters In:
                          </label>
                          <Input
                            type="text"
                            placeholder="0"
                            value={currentRamClearMetersIn}
                            onChange={e => {
                              const val = e.target.value;
                              if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                                setCurrentRamClearMetersIn(val);
                              }
                            }}
                            disabled={!machineForDataEntry || isProcessing}
                            className={`border-blue-300 focus:border-blue-500 ${
                              debouncedCurrentRamClearMetersIn &&
                              prevIn &&
                              Number(debouncedCurrentRamClearMetersIn) > Number(prevIn)
                                ? 'border-red-500 focus:border-red-500'
                                : ''
                            }`}
                          />
                          {/* RAM Clear Meters In Validation - Debounced */}
                          {debouncedCurrentRamClearMetersIn &&
                            prevIn &&
                            Number(debouncedCurrentRamClearMetersIn) >
                              Number(prevIn) && (
                              <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2">
                                <p className="text-xs text-red-600">
                                  Warning: RAM Clear Meters In (
                                  {debouncedCurrentRamClearMetersIn}) should be lower
                                  than or equal to Previous Meters In ({prevIn})
                                </p>
                              </div>
                            )}
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-blue-700">
                            RAM Clear Meters Out:
                          </label>
                          <Input
                            type="text"
                            placeholder="0"
                            value={currentRamClearMetersOut}
                            onChange={e => {
                              const val = e.target.value;
                              if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                                setCurrentRamClearMetersOut(val);
                              }
                            }}
                            disabled={!machineForDataEntry || isProcessing}
                            className={`border-blue-300 focus:border-blue-500 ${
                              debouncedCurrentRamClearMetersOut &&
                              prevOut &&
                              Number(debouncedCurrentRamClearMetersOut) > Number(prevOut)
                                ? 'border-red-500 focus:border-red-500'
                                : ''
                            }`}
                          />
                          {/* RAM Clear Meters Out Validation - Debounced */}
                          {debouncedCurrentRamClearMetersOut &&
                            prevOut &&
                            Number(debouncedCurrentRamClearMetersOut) >
                              Number(prevOut) && (
                              <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2">
                                <p className="text-xs text-red-600">
                                  Warning: RAM Clear Meters Out (
                                  {debouncedCurrentRamClearMetersOut}) should be lower
                                  than or equal to Previous Meters Out (
                                  {prevOut})
                                </p>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-2 flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="ramClearCheckbox"
                      checked={currentRamClear}
                      onChange={e => {
                        setCurrentRamClear(e.target.checked);
                        if (!e.target.checked) {
                          // Clear RAM Clear meter fields when unchecked
                          setCurrentRamClearMetersIn('');
                          setCurrentRamClearMetersOut('');
                        } else {
                          // Auto-fill RAM Clear meters with previous values when checked
                          if (prevIn !== null) {
                            setCurrentRamClearMetersIn(prevIn.toString());
                          }
                          if (prevOut !== null) {
                            setCurrentRamClearMetersOut(prevOut.toString());
                          }
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      disabled={!machineForDataEntry || isProcessing}
                    />
                    <label
                      htmlFor="ramClearCheckbox"
                      className="text-sm font-medium text-gray-700"
                    >
                      RAM Clear
                    </label>
                  </div>

                  <div>
                    <label className="mb-1 mt-2 block text-sm font-medium text-grayHighlight">
                      Notes (for this machine):
                    </label>
                    <div>
                      <Textarea
                        placeholder="Machine-specific notes..."
                        value={currentMachineNotes}
                        onChange={e => setCurrentMachineNotes(e.target.value)}
                        className="min-h-[60px]"
                        disabled={!machineForDataEntry || isProcessing}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    {editingEntryId ? (
                      <>
                        <Button
                          onClick={handleCancelEdit}
                          variant="outline"
                          className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                          disabled={isProcessing}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            if (editingEntryId || machineForDataEntry) {
                              handleAddOrUpdateEntry();
                            } else {
                              handleDisabledFieldClick();
                            }
                          }}
                          className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                          disabled={
                            (!machineForDataEntry && !editingEntryId) ||
                            isProcessing
                          }
                        >
                          {isProcessing
                            ? 'Processing...'
                            : 'Update Entry in List'}
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={
                          machineForDataEntry
                            ? handleAddOrUpdateEntry
                            : () => {}
                        }
                        className="w-full bg-blue-600 text-white hover:bg-blue-700"
                        disabled={!machineForDataEntry || isProcessing}
                      >
                        {isProcessing ? 'Processing...' : 'Add Machine to List'}
                      </Button>
                    )}
                  </div>

                  <hr className="my-4 border-gray-300" />
                  <p className="text-center text-lg font-semibold text-gray-700">
                    Shared Financials for Report
                  </p>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-grayHighlight">
                        Taxes:
                      </label>
                      <Input
                        type="text"
                        placeholder="0"
                        value={financials.taxes}
                        onChange={e => {
                          const val = e.target.value;
                          if (/^\d*\.?\d*$/.test(val) || val === '') {
                            setFinancials(prev => ({
                              ...prev,
                              taxes: val,
                            }));
                          }
                        }}
                        disabled={isProcessing}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-grayHighlight">
                        Advance:
                      </label>
                      <Input
                        type="text"
                        placeholder="0"
                        value={financials.advance}
                        onChange={e => {
                          const val = e.target.value;
                          if (/^\d*\.?\d*$/.test(val) || val === '') {
                            setFinancials(prev => ({
                              ...prev,
                              advance: val,
                            }));
                          }
                        }}
                        disabled={isProcessing}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-grayHighlight">
                        Variance:
                      </label>
                      <Input
                        type="text"
                        placeholder="0"
                        value={financials.variance}
                        onChange={e => {
                          const val = e.target.value;
                          if (/^\d*\.?\d*$/.test(val) || val === '') {
                            setFinancials(prev => ({
                              ...prev,
                              variance: val,
                            }));
                          }
                        }}
                        disabled={isProcessing}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-grayHighlight">
                        Variance Reason:
                      </label>
                      <Textarea
                        placeholder="Variance Reason"
                        value={financials.varianceReason}
                        onChange={e =>
                          setFinancials(prev => ({
                            ...prev,
                            varianceReason: e.target.value,
                          }))
                        }
                        className="min-h-[40px]"
                        disabled={isProcessing}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-grayHighlight">
                        Amount To Collect:{' '}
                        <span className="text-xs text-gray-400">
                          (Auto-calculated)
                        </span>
                      </label>
                      <Input
                        type="text"
                        placeholder="0"
                        value={financials.amountToCollect}
                        readOnly
                        className="cursor-not-allowed bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-grayHighlight">
                        Collected Amount:{' '}
                        <span className="text-xs text-gray-400">
                          (Optional)
                        </span>
                      </label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Input
                                type="text"
                                placeholder="0"
                                value={financials.collectedAmount}
                                onChange={e => {
                                  const val = e.target.value;
                                  if (/^\d*\.?\d*$/.test(val) || val === '') {
                                    setFinancials(prev => ({
                                      ...prev,
                                      collectedAmount: val,
                                    }));

                                    // Calculate previous balance and balance correction using setTimeout to avoid infinite loops
                                    setTimeout(() => {
                                      const amountCollected = Number(val) || 0;
                                      const amountToCollect =
                                        Number(financials.amountToCollect) || 0;

                                      // Previous balance = collected amount - amount to collect
                                      const previousBalance =
                                        amountCollected - amountToCollect;

                                      // Final correction = base entered first + collected amount
                                      const finalCorrection =
                                        (Number(baseBalanceCorrection) || 0) +
                                        amountCollected;

                                      setFinancials(prev => ({
                                        ...prev,
                                        previousBalance:
                                          previousBalance.toString(),
                                        balanceCorrection:
                                          e.target.value === ''
                                            ? baseBalanceCorrection || '0'
                                            : finalCorrection.toString(),
                                      }));
                                    }, 0);
                                  }
                                }}
                                disabled={
                                  isProcessing ||
                                  (baseBalanceCorrection.trim() === '' &&
                                    financials.balanceCorrection.trim() === '')
                                }
                              />
                            </div>
                          </TooltipTrigger>
                          {isProcessing ||
                          (baseBalanceCorrection.trim() === '' &&
                            financials.balanceCorrection.trim() === '') ? (
                            <TooltipContent>
                              <p>
                                {isProcessing
                                  ? 'Please wait until processing completes.'
                                  : 'Enter a Balance Correction first, then the Collected Amount will unlock.'}
                              </p>
                            </TooltipContent>
                          ) : null}
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-grayHighlight">
                        Balance Correction:{' '}
                        <span className="text-xs text-gray-400"></span>
                      </label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Input
                                type="text"
                                placeholder="0"
                                value={financials.balanceCorrection}
                                onChange={e => {
                                  const newBalanceCorrection = e.target.value;
                                  if (
                                    /^-?\d*\.?\d*$/.test(
                                      newBalanceCorrection
                                    ) ||
                                    newBalanceCorrection === ''
                                  ) {
                                    setFinancials(prev => ({
                                      ...prev,
                                      balanceCorrection: newBalanceCorrection,
                                    }));
                                    setBaseBalanceCorrection(
                                      newBalanceCorrection
                                    );
                                  }
                                }}
                                className="border-gray-300 bg-white focus:border-primary"
                                title="Balance correction amount (editable)"
                                disabled={
                                  isProcessing ||
                                  financials.collectedAmount.trim() !== ''
                                }
                              />
                            </div>
                          </TooltipTrigger>
                          {isProcessing ||
                          financials.collectedAmount.trim() !== '' ? (
                            <TooltipContent>
                              <p>
                                {isProcessing
                                  ? 'Please wait until processing completes.'
                                  : 'Clear the Collected Amount to edit the Balance Correction.'}
                              </p>
                            </TooltipContent>
                          ) : null}
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-grayHighlight">
                        Balance Correction Reason:
                      </label>
                      <Textarea
                        placeholder="Correction Reason"
                        value={financials.balanceCorrectionReason}
                        onChange={e =>
                          setFinancials(prev => ({
                            ...prev,
                            balanceCorrectionReason: e.target.value,
                          }))
                        }
                        className="min-h-[40px]"
                        disabled={isProcessing}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-grayHighlight">
                        Previous Balance:
                      </label>
                      <Input
                        type="text"
                        placeholder="0"
                        value={financials.previousBalance}
                        className="cursor-not-allowed border-gray-300 bg-gray-100 focus:border-primary"
                        disabled={true}
                        title="Previous balance from last collection (read-only)"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-grayHighlight">
                        Reason For Shortage Payment:
                      </label>
                      <Textarea
                        placeholder="Shortage Reason"
                        value={financials.reasonForShortagePayment}
                        onChange={e =>
                          setFinancials(prev => ({
                            ...prev,
                            reasonForShortagePayment: e.target.value,
                          }))
                        }
                        className="min-h-[40px]"
                        disabled={isProcessing}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full flex-grow items-center justify-center">
                  <p className="text-center text-base text-grayHighlight">
                    Select a location and machine from the left to enter its
                    collection data.
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex justify-center border-t border-gray-300 p-4 pt-2 md:p-6 md:pt-4">
            <Button
              onClick={() => {
                if (!isUpdateReportEnabled || isProcessing) return;
                setShowUpdateReportConfirmation(true);
              }}
              className={`w-auto bg-button px-8 py-3 text-base hover:bg-buttonActive ${
                !isUpdateReportEnabled || isProcessing
                  ? 'cursor-not-allowed'
                  : 'cursor-pointer'
              }`}
              disabled={!isUpdateReportEnabled || isProcessing}
            >
              {isProcessing
                ? 'UPDATING REPORT...'
                : collectedMachineEntries.length === 0
                  ? 'ADD MACHINES TO UPDATE REPORT'
                  : 'UPDATE REPORT'}
            </Button>
            {collectedMachineEntries.length === 0 && (
              <p className="mt-2 text-center text-sm text-red-600">
                At least one machine must be added to update the collection
                report
              </p>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirmation}
        onClose={() => {
          setShowDeleteConfirmation(false);
          setEntryToDelete(null);
        }}
        onConfirm={confirmDeleteEntry}
        title="Confirm Delete"
        message="Are you sure you want to delete this collection entry?"
        confirmText="Yes, Delete"
        cancelText="Cancel"
        isLoading={isProcessing}
      />

      {/* Update Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showUpdateConfirmation}
        onClose={() => setShowUpdateConfirmation(false)}
        onConfirm={confirmUpdateEntry}
        title="Confirm Update"
        message="Are you sure you want to update this collection entry?"
        confirmText="Yes, Update"
        cancelText="Cancel"
        isLoading={isProcessing}
      />

      {/* Update Report Confirmation Dialog */}
      <InfoConfirmationDialog
        isOpen={showUpdateReportConfirmation}
        onClose={() => setShowUpdateReportConfirmation(false)}
        onConfirm={handleUpdateReport}
        title="Confirm Report Update"
        message={`You are about to update this collection report with collection time: ${
          currentCollectionTime ? formatDate(currentCollectionTime) : 'Not set'
        }. Do you want to proceed?`}
        confirmText="Yes, Update Report"
        cancelText="Cancel"
        isLoading={isProcessing}
      />

      {/* View Machine Confirmation Dialog */}
      <InfoConfirmationDialog
        isOpen={showViewMachineConfirmation}
        onClose={() => setShowViewMachineConfirmation(false)}
        onConfirm={() => {
          if (selectedMachineId) {
            const machineUrl = `/machines/${selectedMachineId}`;
            window.open(machineUrl, '_blank');
          }
          setShowViewMachineConfirmation(false);
        }}
        title="View Machine"
        message="Do you want to open this machine's details in a new tab?"
        confirmText="Yes, View Machine"
        cancelText="Cancel"
        isLoading={false}
      />

      {/* Unsaved Changes Warning Dialog */}
      <ConfirmationDialog
        isOpen={showUnsavedChangesWarning}
        onClose={() => setShowUnsavedChangesWarning(false)}
        onConfirm={() => {
          // User wants to discard changes and close
          // Clear all unsaved data
          setSelectedMachineId('');
          setCurrentMetersIn('');
          setCurrentMetersOut('');
          setCurrentMachineNotes('');
          setCurrentRamClear(false);
          setCurrentRamClearMetersIn('');
          setCurrentRamClearMetersOut('');
          setHasUnsavedEdits(false);
          setShowUnsavedChangesWarning(false);
          // Now close the modal
          if (hasChanges && onRefresh) {
            onRefresh();
          }
          onClose();
        }}
        title="Unsaved Machine Data"
        message={
          editingEntryId
            ? 'You have unsaved changes to a machine entry. Do you want to discard these changes and close?'
            : 'You have unsaved machine data (selected machine, entered meters, or notes). Do you want to discard this data and close?'
        }
        confirmText="Discard & Close"
        cancelText="Keep Editing"
        isLoading={false}
      />
    </>
  );
}
