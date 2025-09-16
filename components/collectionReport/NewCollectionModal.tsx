import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LocationSelect } from "@/components/ui/custom-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Edit3 } from "lucide-react";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import axios from "axios";
import type {
  CollectionReportMachineEntry,
  CollectionDocument,
} from "@/lib/types/collections";
import type { NewCollectionModalProps } from "@/lib/types/componentProps";
import type {
  CollectionReportMachineSummary,
  CreateCollectionReportPayload,
} from "@/lib/types/api";
import { ModernDateTimePicker } from "@/components/ui/modern-date-time-picker";
import { BillValidatorSection } from "@/components/collectionReport/BillValidatorSection";
import type { BillValidatorFormData } from "@/shared/types/billValidator";
import {
  createCollectionReport,
  calculateSasMetrics,
} from "@/lib/helpers/collectionReport";
import { calculateMovement } from "@/lib/utils/movementCalculation";
import { validateMachineEntry } from "@/lib/helpers/collectionReportModal";
import { useUserStore } from "@/lib/store/userStore";
import { v4 as uuidv4 } from "uuid";
import { updateMachineCollectionHistory } from "@/lib/helpers/cabinets";
import { updateCollection } from "@/lib/helpers/collections";
import { NewCollectionModalSkeleton } from "@/components/ui/skeletons/NewCollectionModalSkeleton";
import MobileCollectionModal from "./mobile/MobileCollectionModal";
import { validateCollectionReportPayload } from "@/lib/utils/validation";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils/formatting";
import { getSerialNumberIdentifier } from "@/lib/utils/serialNumber";
import { createActivityLogger } from "@/lib/helpers/activityLogger";

async function addMachineCollection(
  data: Partial<CollectionDocument>
): Promise<CollectionDocument> {
  const res = await axios.post("/api/collections", data);
  // The API returns { success: true, data: created, calculations: {...} }
  return res.data.data;
}

async function deleteMachineCollection(
  id: string
): Promise<{ success: boolean }> {
  const res = await axios.delete(`/api/collections?id=${id}`);
  return res.data;
}

async function updateCollectionsWithReportId(
  collections: CollectionDocument[],
  reportId: string
): Promise<void> {
  // Update each collection with the correct locationReportId and mark as completed
  const updatePromises = collections.map(async (collection) => {
    try {
      await axios.patch(`/api/collections?id=${collection._id}`, {
        locationReportId: reportId,
        isCompleted: true,
      });
    } catch (error) {
      console.error(`Failed to update collection ${collection._id}:`, error);
      throw error;
    }
  });

  await Promise.all(updatePromises);
}

export default function NewCollectionModal({
  show,
  onClose,
  locations = [],
  onRefresh,
}: NewCollectionModalProps) {
  const hasResetRef = useRef(false);
  const user = useUserStore((state) => state.user);
  const userId = user?._id;
  const collectionLogger = useMemo(() => createActivityLogger("session"), []);
  const [hasChanges, setHasChanges] = useState(false);

  // Custom close handler that checks for changes
  const handleClose = useCallback(() => {
    if (hasChanges && onRefresh) {
      onRefresh();
    }

    // Reset state only after successful report creation (hasChanges = true)
    if (hasChanges) {
      setCollectedMachineEntries([]);
      setSelectedLocationId(undefined);
      setSelectedLocationName("");
      setSelectedMachineId(undefined);
      setLockedLocationId(undefined);
      setHasChanges(false);
    }

    onClose();
  }, [hasChanges, onRefresh, onClose]);

  // Function to generate collector name from user profile
  const getCollectorName = useCallback(() => {
    if (!user) return "Unknown Collector";

    // Check if user has profile with firstName and lastName
    const userWithProfile = user as typeof user & {
      profile?: { firstName?: string; lastName?: string };
      username?: string;
    };

    if (
      userWithProfile.profile?.firstName &&
      userWithProfile.profile?.lastName
    ) {
      return `${userWithProfile.profile.firstName} ${userWithProfile.profile.lastName}`;
    }

    // Fallback to username if available
    if (userWithProfile.username) {
      return userWithProfile.username;
    }

    // Final fallback to email
    return user.emailAddress || "Unknown Collector";
  }, [user]);

  const [selectedLocationId, setSelectedLocationId] = useState<
    string | undefined
  >(undefined);
  const [selectedLocationName, setSelectedLocationName] = useState<string>("");
  const [machinesOfSelectedLocation, setMachinesOfSelectedLocation] = useState<
    CollectionReportMachineSummary[]
  >([]);

  const [selectedMachineId, setSelectedMachineId] = useState<
    string | undefined
  >(undefined);

  const [currentCollectionTime, setCurrentCollectionTime] = useState<
    Date | undefined
  >(new Date());
  const [currentMetersIn, setCurrentMetersIn] = useState("");
  const [currentMetersOut, setCurrentMetersOut] = useState("");
  const [currentRamClearMetersIn, setCurrentRamClearMetersIn] = useState("");
  const [currentRamClearMetersOut, setCurrentRamClearMetersOut] = useState("");
  const [currentMachineNotes, setCurrentMachineNotes] = useState("");
  const [currentRamClear, setCurrentRamClear] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  const [collectedMachineEntries, setCollectedMachineEntries] = useState<
    CollectionDocument[]
  >([]);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalLoading, _setIsModalLoading] = useState(false);

  const [_showRolloverWarning, _setShowRolloverWarning] = useState(false);
  const [showMachineRolloverWarning, setShowMachineRolloverWarning] =
    useState(false);
  const [_pendingSubmission, _setPendingSubmission] = useState<
    (() => void) | null
  >(null);
  const [pendingMachineSubmission, setPendingMachineSubmission] = useState<
    (() => void) | null
  >(null);

  // Confirmation dialog state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [showUpdateConfirmation, setShowUpdateConfirmation] = useState(false);
  const [showCreateReportConfirmation, setShowCreateReportConfirmation] =
    useState(false);

  const [showRolloverWarning, setShowRolloverWarning] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState<
    (() => void) | null
  >(null);

  const [financials, setFinancials] = useState({
    taxes: "0",
    advance: "0",
    variance: "0",
    varianceReason: "",
    amountToCollect: "",
    collectedAmount: "",
    balanceCorrection: "0",
    balanceCorrectionReason: "",
    previousBalance: "0",
    reasonForShortagePayment: "",
  });

  // Track the base balance correction (without collected amount)
  const [baseBalanceCorrection, setBaseBalanceCorrection] = useState("0");

  const [prevIn, setPrevIn] = useState<number | null>(null);
  const [prevOut, setPrevOut] = useState<number | null>(null);
  const [previousCollectionTime, setPreviousCollectionTime] = useState<
    string | Date | undefined
  >(undefined);
  const [isLoadingExistingCollections, setIsLoadingExistingCollections] =
    useState(false);
  const [lockedLocationId, setLockedLocationId] = useState<string | undefined>(
    undefined
  );

  const selectedLocation = useMemo(() => {
    const locationIdToUse = lockedLocationId || selectedLocationId;
    return locations.find((l) => String(l._id) === locationIdToUse);
  }, [locations, selectedLocationId, lockedLocationId]);


  // Calculate amount to collect based on machine entries and financial inputs
  const calculateAmountToCollect = useCallback(() => {
    // Don't calculate if we don't have machine entries or if we're still loading
    if (
      !collectedMachineEntries.length ||
      isLoadingCollections ||
      isLoadingExistingCollections
    ) {
      setFinancials((prev) => ({ ...prev, amountToCollect: "0" }));
      return;
    }

    // Ensure we have valid machine data (not just empty entries)
    const hasValidData = collectedMachineEntries.some(
      (entry) => entry.metersIn !== undefined && entry.metersOut !== undefined
    );

    if (!hasValidData) {
      setFinancials((prev) => ({ ...prev, amountToCollect: "0" }));
      return;
    }

    // Calculate total movement data from all machine entries
    const totalMovementData = collectedMachineEntries.map((entry) => {
      const drop = (entry.metersIn || 0) - (entry.prevIn || 0);
      const cancelledCredits = (entry.metersOut || 0) - (entry.prevOut || 0);
      return {
        drop,
        cancelledCredits,
        gross: drop - cancelledCredits,
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

    // Get financial values
    const taxes = Number(financials.taxes) || 0;
    const variance = Number(financials.variance) || 0;
    const advance = Number(financials.advance) || 0;

    // Get profit share from selected location
    const profitShare = selectedLocation?.profitShare || 0;

    // Calculate partner profit: Math.floor((gross - variance - advance) * profitShare / 100) - taxes
    const partnerProfit =
      Math.floor(
        ((reportTotalData.gross - variance - advance) * profitShare) / 100
      ) - taxes;

    // Calculate amount to collect: gross - variance - advance - partnerProfit
    // NOTE: Amount to collect should NOT include previousBalance to avoid circular dependency
    const amountToCollect =
      reportTotalData.gross - variance - advance - partnerProfit;

    setFinancials((prev) => ({
      ...prev,
      amountToCollect: amountToCollect.toString(),
    }));
  }, [
    collectedMachineEntries,
    financials.taxes,
    financials.variance,
    financials.advance,
    selectedLocation?.profitShare,
    isLoadingCollections,
    isLoadingExistingCollections,
  ]);

  // Auto-calculate amount to collect when relevant data changes
  useEffect(() => {
    calculateAmountToCollect();
  }, [calculateAmountToCollect]);

  const machineForDataEntry = useMemo(
    () =>
      machinesOfSelectedLocation.find(
        (m) => String(m._id) === selectedMachineId
      ),

  const machineForDataEntry = useMemo(
    () => machinesOfSelectedLocation.find((m) => m._id === selectedMachineId),
    [machinesOfSelectedLocation, selectedMachineId]
  );

  // Function to handle clicks on disabled input fields
  const handleDisabledFieldClick = useCallback(() => {
    if (!machineForDataEntry && !editingEntryId) {
      toast.warning("Please select or edit a machine first", {
        duration: 3000,
        position: "top-right",
      });
    }
  }, [machineForDataEntry, editingEntryId]);

  // Real-time validation for meter inputs
  const validateMeterInputs = useCallback(() => {
    if (!machineForDataEntry || !currentMetersIn || !currentMetersOut) {
      setValidationWarnings([]);
      return;
    }

    // Check if RAM Clear meters are missing (but don't return early)

    const ramClearMetersMissing =
      currentRamClear &&
      (!currentRamClearMetersIn || !currentRamClearMetersOut);

    const ramClearMetersMissing = currentRamClear && (!currentRamClearMetersIn || !currentRamClearMetersOut);

    const validation = validateMachineEntry(
      selectedMachineId,
      machineForDataEntry,
      currentMetersIn,
      currentMetersOut,
      userId,
      currentRamClear,
      machineForDataEntry?.collectionMeters?.metersIn,
      machineForDataEntry?.collectionMeters?.metersOut,
      currentRamClearMetersIn ? Number(currentRamClearMetersIn) : undefined,
      currentRamClearMetersOut ? Number(currentRamClearMetersOut) : undefined
    );

    // Combine validation warnings with RAM Clear meters missing warning
    const allWarnings = [...(validation.warnings || [])];
    if (ramClearMetersMissing) {

      allWarnings.push(
        "Please enter last meters before Ram clear (or rollover)"
      );
    }

    setValidationWarnings(allWarnings);
  }, [
    selectedMachineId,
    machineForDataEntry,
    currentMetersIn,
    currentMetersOut,
    currentRamClearMetersIn,
    currentRamClearMetersOut,
    userId,
    currentRamClear,
  ]);

      allWarnings.push("Please enter last meters before Ram clear (or rollover)");
    }
    
    setValidationWarnings(allWarnings);
  }, [selectedMachineId, machineForDataEntry, currentMetersIn, currentMetersOut, currentRamClearMetersIn, currentRamClearMetersOut, userId, currentRamClear]);

  // Validate on input changes
  useEffect(() => {
    validateMeterInputs();
  }, [validateMeterInputs]);

  // Function to fetch existing collections
  // Helper function to get proper location ID from machine
  const getLocationIdFromMachine = useCallback(async (machineId: string) => {
    try {
      // The machine API requires timePeriod parameter, so we'll use a default one
      const response = await axios.get(
        `/api/machines/${machineId}?timePeriod=all`
      );
      return response.data.location;
    } catch (error) {
      console.error("Error fetching machine location:", error);
      return null;
    }
  }, []);

  const fetchExistingCollections = useCallback(
    async (locationId?: string) => {
      try {
        setIsLoadingExistingCollections(true);


        // Fetch ALL incomplete collections (not filtered by collector)
        let url = `/api/collections?incompleteOnly=true`;

        // First try to fetch incomplete collections for current user (API will filter for incomplete + empty locationReportId)
        let url = `/api/collections?incompleteOnly=true&collector=${userId}`;
        if (locationId) {
          url += `&location=${locationId}`;
        }

        const response = await axios.get(url);
        if (response.data && response.data.length > 0) {
          console.warn("Found existing collections:", response.data);
          console.warn("First collection location:", response.data[0].location);
          console.warn(
            "Available locations:",
            locations.map((l) => ({ id: l._id, name: l.name }))
          );

          // API already filtered for incomplete collections with empty locationReportId
          console.warn("Found incomplete collections:", response.data);

          // Only proceed if we have collections
          if (response.data.length > 0) {
            // Set the collected machine entries with existing collections
            setCollectedMachineEntries(response.data);

            // Get the proper location ID from the first machine
            const firstCollection = response.data[0];
            if (firstCollection.machineId) {
              const properLocationId = await getLocationIdFromMachine(
                firstCollection.machineId
              );

              console.warn(
                "Proper location ID from machine:",
                properLocationId
              );

              console.warn("Proper location ID from machine:", properLocationId);

              if (properLocationId) {
                // Set the proper location ID
                setSelectedLocationId(properLocationId);
                setLockedLocationId(properLocationId);
                console.warn("Set location to proper ID:", properLocationId);


                // Load previous balance from the location
                const locationData = locations.find(
                  (loc) => String(loc._id) === properLocationId
                );
                if (locationData) {
                  setFinancials((prev) => ({
                    ...prev,
                    previousBalance: (
                      (locationData as Record<string, unknown>)
                        .collectionBalance || 0
                    ).toString(),
                  }));
                }

              } else {
                // Fallback: try to find location by name in the locations array
                const locationByName = locations.find(
                  (loc) =>
                    loc.name.toLowerCase() ===
                    firstCollection.location?.toLowerCase()
                );
                if (locationByName) {
                  console.warn("Found location by name:", locationByName._id);
                  setSelectedLocationId(String(locationByName._id));
                  setLockedLocationId(String(locationByName._id));


                  // Load previous balance from the location
                  setFinancials((prev) => ({
                    ...prev,
                    previousBalance: (
                      (locationByName as Record<string, unknown>)
                        .collectionBalance || 0
                    ).toString(),
                  }));

                } else {
                  console.warn(
                    "Could not find location by name, using original:",
                    firstCollection.location
                  );
                  setSelectedLocationId(firstCollection.location);
                  setLockedLocationId(firstCollection.location);
                }
              }
            } else if (firstCollection.location) {
              // Fallback if no machineId: try to find location by name
              const locationByName = locations.find(
                (loc) =>
                  loc.name.toLowerCase() ===
                  firstCollection.location?.toLowerCase()
              );
              if (locationByName) {
                console.warn(
                  "Found location by name (no machineId):",
                  locationByName._id
                );
                setSelectedLocationId(String(locationByName._id));
                setLockedLocationId(String(locationByName._id));


                // Load previous balance from the location
                setFinancials((prev) => ({
                  ...prev,
                  previousBalance: (
                    (locationByName as Record<string, unknown>)
                      .collectionBalance || 0
                  ).toString(),
                }));

              } else {
                console.warn(
                  "Could not find location by name (no machineId), using original:",
                  firstCollection.location
                );
                setSelectedLocationId(firstCollection.location);
                setLockedLocationId(firstCollection.location);
              }
            }

            console.warn("Fetched existing collections:", response.data);
          } else {
            console.warn(
              "No incomplete collections found, not locking location"
            );
            // Don't set any collections or lock the location
          }
        }
      } catch (error) {
        console.error("Error fetching existing collections:", error);
        // Don't show error toast as this is a background operation
      } finally {
        setIsLoadingExistingCollections(false);
      }
    },

    [locations, getLocationIdFromMachine]
  );

  // Fetch existing collections when modal opens (server-side driven, no local state dependency)
  useEffect(() => {
    if (show && collectedMachineEntries.length === 0 && locations.length > 0) {

    [userId, locations, getLocationIdFromMachine]
  );

  // Fetch existing collections when modal opens
  useEffect(() => {
    if (
      show &&
      userId &&
      collectedMachineEntries.length === 0 &&
      locations.length > 0
    ) {
      console.warn(
        "Fetching existing collections. selectedLocationId:",
        selectedLocationId,
        "locations:",
        locations.length
      );
      fetchExistingCollections(selectedLocationId);
    }
  }, [
    show,

    selectedLocationId,
    fetchExistingCollections,
    locations.length,
    collectedMachineEntries.length,

    userId,
    selectedLocationId,
    fetchExistingCollections,
    collectedMachineEntries.length,
    locations.length,
  ]);

  useEffect(() => {
    if (selectedLocation) {
      setSelectedLocationName(selectedLocation.name);
    } else {
      setSelectedLocationName("");
    }
  }, [selectedLocation]);

  useEffect(() => {
    const locationIdToUse = lockedLocationId || selectedLocationId;
    console.warn(
      "Loading machines for location. locationIdToUse:",
      locationIdToUse,
      "lockedLocationId:",
      lockedLocationId,
      "selectedLocationId:",
      selectedLocationId
    );
    console.warn(
      "Available locations:",
      locations.map((l) => ({
        id: l._id,
        name: l.name,
        machinesCount: l.machines?.length || 0,
      }))
    );

    if (locationIdToUse) {
      const location = locations.find(
        (loc) => String(loc._id) === locationIdToUse
      );
      console.warn("Found location:", location);
      if (location) {
        console.warn(
          "Setting machines for location:",
          location.machines?.length || 0,
          "machines"
        );
        setMachinesOfSelectedLocation(location.machines || []);
      } else {
        console.warn(
          "Location not found in locations array, but we have a locked location ID:",
          locationIdToUse
        );
        // If we have a locked location but it's not in the locations array,
        // this might be a data inconsistency. Let's try to fetch the location data
        // or at least show an empty state with a message
        setMachinesOfSelectedLocation([]);
      }
      setSelectedMachineId(undefined);
    } else {
      console.warn("No location ID to use");
      setMachinesOfSelectedLocation([]);
      setSelectedMachineId(undefined);
    }
  }, [selectedLocationId, lockedLocationId, locations]);

  useEffect(() => {
    if (selectedMachineId && machineForDataEntry) {
      // Check if this machine is already in the collected list
      const existingEntry = collectedMachineEntries.find(
        (entry) => entry.machineId === selectedMachineId
      );

      if (existingEntry) {
        // Pre-fill with existing values from collected list
        setCurrentMetersIn(existingEntry.metersIn?.toString() || "");
        setCurrentMetersOut(existingEntry.metersOut?.toString() || "");
        setCurrentMachineNotes(existingEntry.notes || "");
        setCurrentRamClear(existingEntry.ramClear || false);
        setCurrentCollectionTime(
          existingEntry.timestamp
            ? new Date(existingEntry.timestamp)
            : new Date()
        );
        setPrevIn(existingEntry.prevIn || 0);
        setPrevOut(existingEntry.prevOut || 0);
      } else {
        // Use collectionMeters directly from the machine data for new entries
        if (machineForDataEntry.collectionMeters) {
          setPrevIn(machineForDataEntry.collectionMeters.metersIn || 0);
          setPrevOut(machineForDataEntry.collectionMeters.metersOut || 0);
        } else {
          setPrevIn(0);
          setPrevOut(0);
        }

        // Reset input fields for new entries
        setCurrentMetersIn("");
        setCurrentMetersOut("");
        setCurrentMachineNotes("");
        setCurrentRamClear(false);
        setCurrentCollectionTime(new Date());
      }

      // Get previousCollectionTime from the gaming location, not the machine

      const selectedLocation = locations.find(
        (l) => String(l._id) === (lockedLocationId || selectedLocationId)
      );

      const selectedLocation = locations.find((l) => String(l._id) === (lockedLocationId || selectedLocationId));
      if (selectedLocation?.previousCollectionTime) {
        setPreviousCollectionTime(selectedLocation.previousCollectionTime);
      } else {
        setPreviousCollectionTime(undefined);
      }
    } else {
      setPrevIn(null);
      setPrevOut(null);
      setPreviousCollectionTime(undefined);
    }

  }, [
    selectedMachineId,
    machineForDataEntry,
    locations,
    lockedLocationId,
    selectedLocationId,
    collectedMachineEntries,
  ]);

  }, [selectedMachineId, machineForDataEntry, locations, lockedLocationId, selectedLocationId, collectedMachineEntries]);

  const resetMachineSpecificInputFields = useCallback(() => {
    setCurrentCollectionTime(new Date());
    setCurrentMetersIn("");
    setCurrentMetersOut("");
    setCurrentMachineNotes("");
    setCurrentRamClear(false);

    setCurrentRamClearMetersIn("");
    setCurrentRamClearMetersOut("");

  }, []);

  // Reset state when modal opens for NEW collection
  useEffect(() => {
    if (show) {
      // Clear all state for a fresh start
      setCollectedMachineEntries([]);
      setSelectedLocationId(undefined);
      setSelectedLocationName("");
      setSelectedMachineId(undefined);
      setMachinesOfSelectedLocation([]);
      setIsLoadingCollections(false);


      setLocationSearch("");
      setEditingEntryId(null);
      setHasChanges(false);
      setLockedLocationId(undefined);

      // Reset all form fields
      resetMachineSpecificInputFields();
    }
  }, [show, resetMachineSpecificInputFields]);


  useEffect(() => {
    if (!show && !hasResetRef.current) {
      // Reset form when modal is closed
      hasResetRef.current = true;

      // Reset all state directly without calling resetFullForm to prevent infinite loop
      setSelectedLocationId(undefined);
      setSelectedLocationName("");
      setMachinesOfSelectedLocation([]);
      setSelectedMachineId(undefined);
      setCurrentCollectionTime(new Date());
      setCurrentMetersIn("");
      setCurrentMetersOut("");
      setCurrentMachineNotes("");
      setCurrentRamClear(false);
      setCollectedMachineEntries([]);
      setEditingEntryId(null);
      setFinancials({
        taxes: "0",
        advance: "0",
        variance: "0",
        varianceReason: "",
        amountToCollect: "",
        collectedAmount: "",
        balanceCorrection: "0",
        balanceCorrectionReason: "",
        previousBalance: "0",
        reasonForShortagePayment: "",
      });
      setBaseBalanceCorrection("0");
      setPrevIn(null);
      setPrevOut(null);
      setPreviousCollectionTime(undefined);
    } else if (show) {
      hasResetRef.current = false;
    }
  }, [show]);

  // Check for rollover/ramclear conditions on individual machine
  const checkForMachineRolloverConditions = useCallback(
    (metersIn: number, prevIn: number) => {
      return metersIn < prevIn;
    },
    []
  );

  const handleAddOrUpdateEntry = useCallback(async () => {
    if (isProcessing) return; // Prevent multiple submissions

    // Check if RAM Clear meters are mandatory when RAM Clear is checked
    if (
      currentRamClear &&
      (!currentRamClearMetersIn || !currentRamClearMetersOut)
    ) {
      toast.error(
        "RAM Clear Meters In and Out are required when RAM Clear is checked"
      );
      return;
    }

    // If updating an existing entry, show confirmation dialog
    if (editingEntryId) {
      setShowUpdateConfirmation(true);
      return;
    }

    // If adding a new entry, check for rollover conditions first
    const metersIn = Number(currentMetersIn);
    const metersOut = Number(currentMetersOut);
    const prevIn = Number(machineForDataEntry?.collectionMeters?.metersIn) || 0;
    const prevOut =
      Number(machineForDataEntry?.collectionMeters?.metersOut) || 0;

    // Check for rollover/ramclear conditions on this individual machine
    if (checkForMachineRolloverConditions(metersIn, prevIn)) {
      setPendingMachineSubmission(() => () => handleAddOrUpdateEntry());
      setShowMachineRolloverWarning(true);
      return;
    }

    // Call the validation and add logic directly here to avoid circular dependency

  // Auto-calculate financial values when machines or financial inputs change
  useEffect(() => {
    if (collectedMachineEntries.length > 0) {
      // Get profit share from the selected location
      const selectedLocation = locations.find((l) => String(l._id) === (lockedLocationId || selectedLocationId));
      const profitShare = selectedLocation?.profitShare || 50; // Default to 50% if not set
      
      // Calculate total amount to collect
      const totalAmountToCollect = calculateTotalAmountToCollect(
        collectedMachineEntries,
        profitShare
      );

      // Update amount to collect
      setFinancials((prev) => ({
        ...prev,
        amountToCollect: totalAmountToCollect.toString(),
      }));
    } else {
      // Reset to empty when no machines
      setFinancials((prev) => ({
        ...prev,
        amountToCollect: "",
        balanceCorrection: "",
      }));
    }
  }, [collectedMachineEntries, locations, lockedLocationId, selectedLocationId]);

  // Auto-calculate balance correction when amount to collect or collected amount changes
  useEffect(() => {
    const amountToCollect = Number(financials.amountToCollect) || 0;
    const collectedAmount = Number(financials.collectedAmount) || 0;

    if (amountToCollect !== 0 || collectedAmount !== 0) {
      const balanceCorrection = calculateBalanceCorrection(
        amountToCollect,
        collectedAmount
      );
      setFinancials((prev) => ({
        ...prev,
        balanceCorrection: balanceCorrection.toString(),
      }));
    }
  }, [financials.amountToCollect, financials.collectedAmount]);

  useEffect(() => {
    if (!show && !hasResetRef.current) {
      // Reset form when modal is closed
      hasResetRef.current = true;

      // Reset all state directly without calling resetFullForm to prevent infinite loop
      setSelectedLocationId(undefined);
      setSelectedLocationName("");
      setLocationSearch("");
      setMachinesOfSelectedLocation([]);
      setSelectedMachineId(undefined);
      setCurrentCollectionTime(new Date());
      setCurrentMetersIn("");
      setCurrentMetersOut("");
      setCurrentMachineNotes("");
      setCurrentRamClear(false);
      setCollectedMachineEntries([]);
      setEditingEntryId(null);
      setFinancials({
        taxes: "",
        advance: "",
        variance: "",
        varianceReason: "",
        amountToCollect: "",
        collectedAmount: "",
        balanceCorrection: "",
        balanceCorrectionReason: "",
        previousBalance: "",
        reasonForShortagePayment: "",
      });
      setPrevIn(null);
      setPrevOut(null);
      setPreviousCollectionTime(undefined);
    } else if (show) {
      hasResetRef.current = false;
    }
  }, [show]);

  const handleAddOrUpdateEntry = useCallback(async () => {
    if (isProcessing) return; // Prevent multiple submissions

    // Check if RAM Clear meters are mandatory when RAM Clear is checked
    if (currentRamClear && (!currentRamClearMetersIn || !currentRamClearMetersOut)) {
      toast.error("RAM Clear Meters In and Out are required when RAM Clear is checked");
      return;
    }

    // Use enhanced validation with RAM Clear support
    const validation = validateMachineEntry(
      selectedMachineId,
      machineForDataEntry,
      currentMetersIn,
      currentMetersOut,
      userId,
      currentRamClear,
      machineForDataEntry?.collectionMeters?.metersIn,
      machineForDataEntry?.collectionMeters?.metersOut,
      currentRamClearMetersIn ? Number(currentRamClearMetersIn) : undefined,
      currentRamClearMetersOut ? Number(currentRamClearMetersOut) : undefined
    );

    if (!validation.isValid) {
      toast.error(validation.error || "Validation failed");
      return;
    }

    // Show warnings if any
    if (validation.warnings && validation.warnings.length > 0) {

      validation.warnings.forEach((warning) => {
        toast.warning(warning, { duration: 4000 });

      validation.warnings.forEach(warning => {
        toast.warning(warning);
      });
    }

    setIsProcessing(true);


    try {
      // Calculate SAS start time
      const sasStartTime = machineForDataEntry?.collectionTime
        ? new Date(machineForDataEntry.collectionTime)
        : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default to 24 hours ago

      let sasMetrics;
      try {
        const machineIdentifier =
          machineForDataEntry?.serialNumber ||
          machineForDataEntry?.name ||
          selectedMachineId;
        sasMetrics = await calculateSasMetrics(
          machineIdentifier || "",
          sasStartTime,
          currentCollectionTime || new Date()
        );
      } catch (sasError) {
        console.warn("SAS metrics calculation failed:", sasError);
        sasMetrics = {
          drop: 0,
          totalCancelledCredits: 0,
          gross: 0,
        };
      }

      // Calculate movement with RAM Clear support
      const previousMeters = {
        metersIn: machineForDataEntry?.collectionMeters?.metersIn || 0,
        metersOut: machineForDataEntry?.collectionMeters?.metersOut || 0,
      };
      const movement = calculateMovement(
        metersIn,
        metersOut,
        previousMeters,
        currentRamClear,
        currentRamClearMetersIn ? Number(currentRamClearMetersIn) : undefined,
        currentRamClearMetersOut ? Number(currentRamClearMetersOut) : undefined
      );

      const entryData: CollectionDocument = {
        _id: uuidv4(), // Generate a unique ID
        isCompleted: false,
        machineId: selectedMachineId || "",
        machineName: machineForDataEntry?.name || "",
        machineCustomName: selectedMachineId || "", // Using machineId as custom name
        serialNumber: machineForDataEntry?.serialNumber || "",
        timestamp: currentCollectionTime
          ? new Date(currentCollectionTime)
          : new Date(),
        metersIn,
        metersOut,
        prevIn: prevIn || 0,
        prevOut: prevOut || 0,
        softMetersIn: 0, // Default value
        softMetersOut: 0, // Default value
        movement,
        ramClear: currentRamClear || false,
        ramClearMetersIn: currentRamClearMetersIn
          ? Number(currentRamClearMetersIn)
          : undefined,
        ramClearMetersOut: currentRamClearMetersOut
          ? Number(currentRamClearMetersOut)
          : undefined,
        notes: currentMachineNotes || "",
        location: selectedLocationName || "",
        collector: getCollectorName() || "",
        locationReportId: "", // Will be set when report is created
        // Add calculated nested objects
        sasMeters: {
          machine: machineForDataEntry?.name || "",
          drop: sasMetrics.drop,
          totalCancelledCredits: sasMetrics.totalCancelledCredits,
          gross: sasMetrics.gross,
          gamesPlayed: 0, // Default value
          jackpot: 0, // Default value
          sasStartTime: sasStartTime.toISOString(),
          sasEndTime: (currentCollectionTime || new Date()).toISOString(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        __v: 0,
      };

      // Create collection document in database
      const createdCollection = await addMachineCollection(entryData);

      // Add the created entry to the collected machines list (use the response from database)
      setCollectedMachineEntries((prev) => [...prev, createdCollection]);

      // Reset form fields
      resetMachineSpecificInputFields();
      setSelectedMachineId(undefined);

      toast.success("Machine added to collection list!");

      // Log the activity
      if (collectionLogger && selectedLocationName) {
        await collectionLogger.logCreate(
          createdCollection._id,
          `${
            machineForDataEntry?.name || selectedMachineId
          } at ${selectedLocationName}`,
          {
            machineId: selectedMachineId,
            machineName: machineForDataEntry?.name || "",
            locationName: selectedLocationName,
            metersIn,
            metersOut,
          },
          `Added machine ${
            machineForDataEntry?.name || selectedMachineId
          } to collection list`
        );
      }
    } catch (error) {
      console.error("Error adding machine:", error);
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to add machine:", error);
      }
      toast.error(
        "Failed to add machine. Please check the console for details."
      );
    } finally {
      setIsProcessing(false);
    }
  }, [
    isProcessing,
    selectedMachineId,
    machineForDataEntry,
    currentMetersIn,
    currentMetersOut,
    currentRamClearMetersIn,
    currentRamClearMetersOut,
    currentCollectionTime,
    currentMachineNotes,
    currentRamClear,
    selectedLocationName,
    userId,
    resetMachineSpecificInputFields,
    collectionLogger,
    editingEntryId,
    getCollectorName,
    checkForMachineRolloverConditions,
  ]);

  const confirmAddOrUpdateEntry = useCallback(async () => {
    if (isProcessing) return; // Prevent multiple submissions

    // Use enhanced validation with RAM Clear support
    console.warn("🔍 validateMachineEntry called - Debug Info:");
    console.warn("  selectedMachineId:", selectedMachineId);
    console.warn("  machineForDataEntry:", machineForDataEntry);
    console.warn("  currentMetersIn:", currentMetersIn);
    console.warn("  currentMetersOut:", currentMetersOut);
    console.warn("  userId:", userId);

    const validation = validateMachineEntry(
      selectedMachineId,
      machineForDataEntry,
      currentMetersIn,
      currentMetersOut,
      userId,
      currentRamClear,
      machineForDataEntry?.collectionMeters?.metersIn,
      machineForDataEntry?.collectionMeters?.metersOut,
      currentRamClearMetersIn ? Number(currentRamClearMetersIn) : undefined,
      currentRamClearMetersOut ? Number(currentRamClearMetersOut) : undefined
    );

    console.warn("  validation result:", validation);

    if (!validation.isValid) {
      toast.error(validation.error || "Validation failed");
      return;
    }

    // Show warnings if any
    if (validation.warnings && validation.warnings.length > 0) {
      validation.warnings.forEach((warning) => {
        toast.warning(warning);
      });
    }


    setIsProcessing(true);

    const metersIn = Number(currentMetersIn);
    const metersOut = Number(currentMetersOut);

    // Calculate SAS metrics
    const sasStartTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    const sasEndTime = currentCollectionTime || new Date();

    let sasMetrics;
    try {
      const machineIdentifier =
        machineForDataEntry?.serialNumber ||
        machineForDataEntry?.name ||
        selectedMachineId;
      sasMetrics = await calculateSasMetrics(
        machineIdentifier || "",
        sasStartTime,
        sasEndTime
      );
    } catch (error) {
      console.error("Error calculating SAS metrics:", error);
      sasMetrics = {
        drop: 0,
        totalCancelledCredits: 0,
        gross: 0,
        jackpot: 0,
        sasStartTime: sasStartTime.toISOString(),
        sasEndTime: sasEndTime.toISOString(),
      };
    }

    // Calculate movement with RAM Clear support
    const previousMeters = {
      metersIn: machineForDataEntry?.collectionMeters?.metersIn || 0,
      metersOut: machineForDataEntry?.collectionMeters?.metersOut || 0,
    };
    const movement = calculateMovement(
      metersIn,
      metersOut,
      previousMeters,
      currentRamClear,
      undefined, // ramClearCoinIn (legacy)
      undefined, // ramClearCoinOut (legacy)
      currentRamClearMetersIn ? Number(currentRamClearMetersIn) : undefined,
      currentRamClearMetersOut ? Number(currentRamClearMetersOut) : undefined
    );

    const entryData = {
      _id: uuidv4(), // Generate a unique ID
      machineId: selectedMachineId,
      machineName: machineForDataEntry?.name || "",
      machineCustomName: selectedMachineId, // Using machineId as custom name
      serialNumber: machineForDataEntry?.serialNumber || "",
      timestamp: currentCollectionTime
        ? new Date(currentCollectionTime)
        : new Date(),
      metersIn,
      metersOut,
      prevIn: prevIn || 0,
      prevOut: prevOut || 0,
      softMetersIn: metersIn,
      softMetersOut: metersOut,
      notes: currentMachineNotes,
      ramClear: currentRamClear,

      ramClearMetersIn: currentRamClearMetersIn
        ? Number(currentRamClearMetersIn)
        : undefined,
      ramClearMetersOut: currentRamClearMetersOut
        ? Number(currentRamClearMetersOut)
        : undefined,

      ramClearMetersIn: currentRamClearMetersIn ? Number(currentRamClearMetersIn) : undefined,
      ramClearMetersOut: currentRamClearMetersOut ? Number(currentRamClearMetersOut) : undefined,
      useCustomTime: true,
      selectedDate: currentCollectionTime
        ? currentCollectionTime.toISOString().split("T")[0]
        : "",
      timeHH: currentCollectionTime
        ? String(currentCollectionTime.getHours()).padStart(2, "0")
        : "",
      timeMM: currentCollectionTime
        ? String(currentCollectionTime.getMinutes()).padStart(2, "0")
        : "",
      isCompleted: false,
      collector: userId,
      location: selectedLocationName,
      locationReportId: "", // Will be set when report is created
      // Add calculated nested objects
      sasMeters: {
        machine: machineForDataEntry?.name || "",
        drop: sasMetrics.drop,
        totalCancelledCredits: sasMetrics.totalCancelledCredits,
        gross: sasMetrics.gross,
        gamesPlayed: 0,
        jackpot: sasMetrics.jackpot,
        sasStartTime: sasMetrics.sasStartTime,
        sasEndTime: sasMetrics.sasEndTime,
      },
      movement: movement,
    };

    try {
      let result: CollectionDocument;
      const isUpdate = editingEntryId !== null;

      if (isUpdate) {
        // Update existing collection - use clean entryData like the edit modal does
        const existingEntry = collectedMachineEntries.find(
          (e) => e._id === editingEntryId
        );
        if (!existingEntry) {
          toast.error("Collection entry not found for update");
          setIsProcessing(false);
          return;
        }

        console.warn("🔄 UPDATING COLLECTION DOCUMENT:", {
          editingEntryId,
          existingEntry: {
            _id: existingEntry._id,
            metersIn: existingEntry.metersIn,
            metersOut: existingEntry.metersOut,
            locationReportId: existingEntry.locationReportId,
          },
          entryData: {
            metersIn: entryData.metersIn,
            metersOut: entryData.metersOut,
            prevIn: entryData.prevIn,
            prevOut: entryData.prevOut,
          },
        });


        // Since all entries are now created in the database, always update via API
        console.warn("📡 Updating collection document via API");

        // Use clean entryData directly like the edit modal does
        result = await updateCollection(editingEntryId, entryData);

        console.warn("✅ COLLECTION DOCUMENT UPDATED:", {
          result: {
            _id: result._id,
            metersIn: result.metersIn,
            metersOut: result.metersOut,
            locationReportId: result.locationReportId,
          },
        });

        // Log the update activity
        await collectionLogger.logUpdate(
          editingEntryId,
          `${entryData.machineCustomName} at ${selectedLocationName}`,
          existingEntry, // previousData
          entryData, // newData
          `Updated collection entry for machine: ${entryData.machineCustomName} at ${selectedLocationName}`
        );

        // Only update collection history if collection is completed, has a locationReportId, and a collection report exists
        const shouldUpdateHistory =
          result.isCompleted &&
          result.locationReportId &&
          result.locationReportId.trim() !== "";

        if (shouldUpdateHistory) {
          try {
            // Check if collection report exists
            const reportResponse = await axios.get(
              `/api/collection-reports?locationReportId=${result.locationReportId}`
            );
            const reportExists =
              reportResponse.data && reportResponse.data.length > 0;

            if (reportExists) {
              const collectionHistoryEntry = {
                _id: editingEntryId,
                metersIn: entryData.metersIn,
                metersOut: entryData.metersOut,
                prevMetersIn: entryData.prevIn || 0,
                prevMetersOut: entryData.prevOut || 0,
                timestamp: entryData.timestamp || new Date(),
                locationReportId: result.locationReportId,
              };

              console.warn("Updating machine collection history for edit:", {
                machineId: entryData.machineId,
                collectionHistoryEntry,
              });

              await updateMachineCollectionHistory(
                entryData.machineId || "",
                collectionHistoryEntry,
                "update",
                editingEntryId
              );

              console.warn(
                "Machine collection history updated successfully for edit"
              );
            } else {
              console.warn(
                `Collection report not found for locationReportId ${result.locationReportId}, skipping collection history update`
              );
            }
          } catch (historyError) {
            console.error(
              "Failed to update machine collection history for edit:",
              historyError
            );
            // Check if it's a 404 error (machine not found)
            if (
              historyError &&
              typeof historyError === "object" &&
              "response" in historyError
            ) {
              const axiosError = historyError as {
                response: { status: number };
              };
              if (axiosError.response.status === 404) {
                console.warn(
                  `Machine ${entryData.machineId} not found, skipping collection history update`
                );
              }
            }
            // Don't fail the entire operation if history update fails
          }
        } else {
          console.warn(
            `Skipping collection history update - collection not completed or no locationReportId (isCompleted: ${result.isCompleted}, locationReportId: "${result.locationReportId}")`
          );
        }

        toast.success("Machine updated!");


        
        // Refresh machines data to show updated values
        if (onRefresh) {
          onRefresh();
        }

        // Debug: Check what fields the result contains
        console.warn("🔍 UPDATE RESULT:", {
          result: result,
          originalEntry: existingEntry,
          hasRequiredFields: {
            _id: !!result._id,
            machineName: !!result.machineName,
            serialNumber: !!result.serialNumber,
            timestamp: !!result.timestamp,
            metersIn: result.metersIn !== undefined,
            metersOut: result.metersOut !== undefined,
          },

          valuesBeingUsed: {
            machineName: result.machineName || existingEntry.machineName,
            serialNumber: result.serialNumber || existingEntry.serialNumber,
            timestamp: result.timestamp || existingEntry.timestamp,
            metersIn:
              result.metersIn !== undefined
                ? result.metersIn
                : existingEntry.metersIn,
            metersOut:
              result.metersOut !== undefined
                ? result.metersOut
                : existingEntry.metersOut,
          },
        });

        // Update the local state directly to avoid duplicates
        // Use the server response data first, fall back to old entry only if server data is missing
        setCollectedMachineEntries((prev) =>
          prev.map((entry) =>
            entry._id === editingEntryId
              ? {
                  ...entry, // Keep all existing fields as fallback
                  ...result, // Override with updated fields from server
                  // Use server data first, fall back to old entry only if server data is missing
                  machineName: result.machineName || entry.machineName,
                  serialNumber: result.serialNumber || entry.serialNumber,
                  timestamp: result.timestamp || entry.timestamp || new Date(),
                  metersIn:
                    result.metersIn !== undefined
                      ? result.metersIn
                      : entry.metersIn,
                  metersOut:
                    result.metersOut !== undefined
                      ? result.metersOut
                      : entry.metersOut,
                  // Ensure movement data is updated if present in result
                  movement: result.movement || entry.movement,
                  // Update any other fields that might have changed
                  notes:
                    result.notes !== undefined ? result.notes : entry.notes,
                  ramClearMetersIn:
                    result.ramClearMetersIn !== undefined
                      ? result.ramClearMetersIn
                      : entry.ramClearMetersIn,
                  ramClearMetersOut:
                    result.ramClearMetersOut !== undefined
                      ? result.ramClearMetersOut
                      : entry.ramClearMetersOut,
                }
              : entry
          )
        );

        // Clear editing state and reset form fields after successful update
        setEditingEntryId(null);
        // Clear and disable input fields until another machine is selected
        resetMachineSpecificInputFields();
        setSelectedMachineId(undefined);

        });

        // Ensure the updated result has all necessary fields by merging with original entry
        const updatedEntry = {
          ...existingEntry, // Keep all original fields
          ...result, // Override with updated fields
          // Ensure critical display fields are present
          machineName: result.machineName || existingEntry.machineName,
          serialNumber: result.serialNumber || existingEntry.serialNumber,
          timestamp: result.timestamp || existingEntry.timestamp || new Date(),
        };

        console.warn("🔄 FINAL UPDATED ENTRY:", updatedEntry);

        // Update the collection in local state
        setCollectedMachineEntries((prev) =>
          prev.map((entry) =>
            entry._id === editingEntryId ? updatedEntry : entry
          )
        );
      } else {
        // Add new collection
        result = await addMachineCollection(entryData);

        // Log the creation activity
        await collectionLogger.logCreate(
          result._id || entryData.machineId || "unknown",
          `${entryData.machineCustomName} at ${selectedLocationName}`,
          entryData,
          `Created collection entry for machine: ${entryData.machineCustomName} at ${selectedLocationName}`
        );

        toast.success("Machine added!");



        
        // Refresh machines data to show updated values
        if (onRefresh) {
          onRefresh();
        }
        // Add the new collection to the local state
        setCollectedMachineEntries((prev) => {
          const newEntries = [...prev, result];
          // Lock the location to the first machine's location if this is the first machine
          if (prev.length === 0 && selectedLocationId) {
            setLockedLocationId(selectedLocationId);
          }
          return newEntries;
        });


        // Keep the machine selected and form populated so user can add more machines
      }

      setHasChanges(true);
      // Don't reset form fields or clear machine selection - keep everything as is

      }

      setHasChanges(true);
      resetMachineSpecificInputFields();
      setEditingEntryId(null); // Clear editing state
    } catch (error) {
      // Log error for debugging in development
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to add machine:", error);
      }
      toast.error(
        "Failed to add machine. Please check the console for details."
      );
    } finally {
      setIsProcessing(false);
    }
  }, [
    isProcessing,
    selectedMachineId,
    machineForDataEntry,
    currentMetersIn,
    currentMetersOut,
    currentRamClearMetersIn,
    currentRamClearMetersOut,
    currentCollectionTime,
    currentMachineNotes,
    currentRamClear,
    prevIn,
    prevOut,
    selectedLocationName,
    userId,


    resetMachineSpecificInputFields,
    collectionLogger,
    collectedMachineEntries,
    editingEntryId,
    selectedLocationId,

    resetMachineSpecificInputFields,
  ]);

  // Confirmation dialog handlers
  const confirmUpdateEntry = useCallback(() => {
    setShowUpdateConfirmation(false);
    confirmAddOrUpdateEntry();
  }, [confirmAddOrUpdateEntry]);

  const handleCancelEdit = useCallback(() => {
    // Reset editing state
    setEditingEntryId(null);


    onRefresh,
  ]);

  const handleCancelEdit = useCallback(() => {
    // Reset editing state
    setEditingEntryId(null);
    
    // Clear all input fields
    setCurrentMetersIn("");
    setCurrentMetersOut("");
    setCurrentMachineNotes("");
    setCurrentRamClear(false);
    setCurrentRamClearMetersIn("");
    setCurrentRamClearMetersOut("");
    setCurrentCollectionTime(new Date());


    // Clear validation warnings
    setValidationWarnings([]);

    // Reset prev values
    setPrevIn(null);
    setPrevOut(null);


    
    // Clear validation warnings
    setValidationWarnings([]);
    
    // Reset prev values
    setPrevIn(null);
    setPrevOut(null);
    
    toast.info("Edit cancelled");
  }, []);

  const handleEditCollectedEntry = useCallback(
    (_id: string) => {
      if (isProcessing) return; // Prevent editing during processing

      const entryToEdit = collectedMachineEntries.find((e) => e._id === _id);
      if (entryToEdit) {
        if (selectedMachineId !== entryToEdit.machineCustomName) {
          setSelectedMachineId(entryToEdit.machineCustomName);
        }
        setCurrentCollectionTime(new Date(entryToEdit.timestamp));

        // Use movement values if available (for RAM Clear), otherwise use raw values
        const metersIn = entryToEdit.movement?.metersIn ?? entryToEdit.metersIn;
        const metersOut =
          entryToEdit.movement?.metersOut ?? entryToEdit.metersOut;
        setCurrentMetersIn(String(metersIn));
        setCurrentMetersOut(String(metersOut));
        setCurrentMachineNotes(entryToEdit.notes || "");
        setCurrentRamClear(entryToEdit.ramClear || false);
        // Set RAM Clear meters if they exist
        if (entryToEdit.ramClear) {
          setCurrentRamClearMetersIn(String(entryToEdit.ramClearMetersIn || 0));
          setCurrentRamClearMetersOut(
            String(entryToEdit.ramClearMetersOut || 0)
          );
        }

        setCurrentMetersIn(String(entryToEdit.metersIn));
        setCurrentMetersOut(String(entryToEdit.metersOut));
        setCurrentMachineNotes(entryToEdit.notes || "");
        setCurrentRamClear(entryToEdit.ramClear || false);
        setEditingEntryId(_id);
        toast.info(
          `Editing ${entryToEdit.machineCustomName}. Make changes and click 'Update Entry'.`
        );
      }
    },
    [collectedMachineEntries, selectedMachineId, isProcessing]
  );

  const handleDeleteCollectedEntry = useCallback(

    (_id: string) => {
      if (isProcessing) return; // Prevent deletion during processing

      setEntryToDelete(_id);
      setShowDeleteConfirmation(true);
    },
    [isProcessing]
  );

  const confirmDeleteEntry = useCallback(async () => {
    if (!entryToDelete || !userId) {
      toast.error("User not found.");
      return;
    }

    setIsProcessing(true);
    try {
      const entryToDeleteData = collectedMachineEntries.find(
        (e) => e._id === entryToDelete
      );
      const entryData = entryToDeleteData ? { ...entryToDeleteData } : null;

      await deleteMachineCollection(entryToDelete);

      // Log the deletion activity
      if (entryData) {
        await collectionLogger.logDelete(
          entryToDelete,
          `${entryData.machineCustomName} at ${selectedLocationName}`,
          entryData,
          `Deleted collection entry for machine: ${entryData.machineCustomName} at ${selectedLocationName}`
        );
      }

      // Update the machine's collection history (remove the entry)
      if (entryData) {
        try {
          console.warn("Deleting from machine collection history:", {
            machineId: entryData.machineId,
            entryId: entryToDelete,
          });

          await updateMachineCollectionHistory(
            entryData.machineId,
            {
              metersIn: entryData.metersIn,
              metersOut: entryData.metersOut,
              prevMetersIn: entryData.prevIn,
              prevMetersOut: entryData.prevOut,
              timestamp: entryData.timestamp,
              locationReportId: entryData.locationReportId,
            },
            "delete"
            // Don't pass entryId, let the API delete by locationReportId
          );

          console.warn("Machine collection history entry deleted successfully");
        } catch (historyError) {
          console.error(
            "Failed to delete from machine collection history:",
            historyError
          );
          // Check if it's a 404 error (machine not found)
          if (
            historyError &&
            typeof historyError === "object" &&
            "response" in historyError &&
            historyError.response &&
            typeof historyError.response === "object" &&
            "status" in historyError.response &&
            historyError.response.status === 404
          ) {
            console.warn(
              "Machine not found in database, but collection was deleted successfully"
            );
            // Don't show error to user as the main operation (deleting collection) succeeded
          } else {
            // For other errors, we could show a warning but don't fail the operation
            console.warn(
              "Collection history update failed, but collection was deleted successfully"
            );
          }
        }
      }

      toast.success("Machine deleted!");

      // Remove the collection from local state
      setCollectedMachineEntries((prev) => {
        const newEntries = prev.filter((entry) => entry._id !== entryToDelete);
        // Unlock location if no machines remain
        if (newEntries.length === 0) {
          setLockedLocationId(undefined);
        }
        return newEntries;
      });

      setHasChanges(true);

      // Keep the machine selected and form populated so user can continue working

      // Close confirmation dialog
      setShowDeleteConfirmation(false);
      setEntryToDelete(null);
    } catch {
      toast.error("Failed to delete machine");
    } finally {
      setIsProcessing(false);
    }
  }, [
    entryToDelete,
    userId,
    collectedMachineEntries,
    selectedLocationName,
    collectionLogger,
  ]);

  const handleCreateMultipleReportsInternal = useCallback(async () => {
    setIsProcessing(true);

    // Generate a single locationReportId for all collections in this report
    const reportId = uuidv4();

    try {
      toast.loading("Updating collections and creating report...", {
        id: "create-reports-toast",
      });

      // Step 1: Update all existing collections with the report ID and mark as completed
      await updateCollectionsWithReportId(collectedMachineEntries, reportId);

      // Step 2: Create a single collection report with all the financial data
      const payload: CreateCollectionReportPayload = {

    async (_id: string) => {
      if (isProcessing) return; // Prevent deletion during processing

      if (!userId) {
        toast.error("User not found.");
        return;
      }

      setIsProcessing(true);
      try {
        const entryToDelete = collectedMachineEntries.find(
          (e) => e._id === _id
        );
        const entryData = entryToDelete ? { ...entryToDelete } : null;

        await deleteMachineCollection(_id);

        // Log the deletion activity
        if (entryData) {
          await collectionLogger.logDelete(
            _id,
            `${entryData.machineCustomName} at ${selectedLocationName}`,
            entryData,
            `Deleted collection entry for machine: ${entryData.machineCustomName} at ${selectedLocationName}`
          );
        }

        // Update the machine's collection history (remove the entry)
        if (entryData) {
          try {
            console.warn("Deleting from machine collection history:", {
              machineId: entryData.machineId,
              entryId: _id,
            });

            await updateMachineCollectionHistory(
              entryData.machineId,
              {
                metersIn: entryData.metersIn,
                metersOut: entryData.metersOut,
                prevMetersIn: entryData.prevIn,
                prevMetersOut: entryData.prevOut,
                timestamp: entryData.timestamp,
                locationReportId: entryData.locationReportId,
              },
              "delete"
              // Don't pass entryId, let the API delete by locationReportId
            );

            console.warn(
              "Machine collection history entry deleted successfully"
            );
          } catch (historyError) {
            console.error(
              "Failed to delete from machine collection history:",
              historyError
            );
            // Check if it's a 404 error (machine not found)
            if (
              historyError &&
              typeof historyError === "object" &&
              "response" in historyError &&
              historyError.response &&
              typeof historyError.response === "object" &&
              "status" in historyError.response &&
              historyError.response.status === 404
            ) {
              console.warn(
                "Machine not found in database, but collection was deleted successfully"
              );
              // Don't show error to user as the main operation (deleting collection) succeeded
            } else {
              // For other errors, we could show a warning but don't fail the operation
              console.warn(
                "Collection history update failed, but collection was deleted successfully"
              );
            }
          }
        }

        toast.success("Machine deleted!");
        
        // Refresh machines data to show updated values
        if (onRefresh) {
          onRefresh();
        }
        // Remove the collection from local state instead of fetching from server
        setCollectedMachineEntries((prev) => {
          const newEntries = prev.filter((entry) => entry._id !== _id);
          // Unlock location if no machines remain
          if (newEntries.length === 0) {
            setLockedLocationId(undefined);
          }
          return newEntries;
        });
        setHasChanges(true);
      } catch {
        toast.error("Failed to delete machine");
      } finally {
        setIsProcessing(false);
      }
    },
    [
      userId,
      collectedMachineEntries,
      selectedLocationName,
      collectionLogger,
      isProcessing,
      onRefresh,
    ]
  );

  // Check for rollover/ramclear conditions
  const checkForRolloverConditions = useCallback(() => {
    return collectedMachineEntries.some((entry) => {
      const metersIn = Number(entry.metersIn) || 0;
      const prevIn = Number(entry.prevIn) || 0;
      return metersIn > prevIn;
    });
  }, [collectedMachineEntries]);

  const handleCreateMultipleReportsInternal = useCallback(async () => {
    setIsProcessing(true);

    // Generate a single locationReportId for all collections in this report
    const reportId = uuidv4();

    const reportCreationPromises = collectedMachineEntries.map((entry) => {
      const machineEntry = {
        machineId: entry.machineId,
        machineName: entry.machineName,
        collectionTime:
          entry.timestamp instanceof Date
            ? entry.timestamp.toISOString()
            : new Date(entry.timestamp).toISOString(),
        metersIn: entry.metersIn,
        metersOut: entry.metersOut,
        notes: entry.notes,
        useCustomTime: true,
        selectedDate:
          entry.timestamp instanceof Date
            ? entry.timestamp.toISOString().split("T")[0]
            : new Date(entry.timestamp).toISOString().split("T")[0],
        timeHH:
          entry.timestamp instanceof Date
            ? String(entry.timestamp.getHours()).padStart(2, "0")
            : String(new Date(entry.timestamp).getHours()).padStart(2, "0"),
        timeMM:
          entry.timestamp instanceof Date
            ? String(entry.timestamp.getMinutes()).padStart(2, "0")
            : String(new Date(entry.timestamp).getMinutes()).padStart(2, "0"),
      };
      const payload: CreateCollectionReportPayload & {
        machines: Array<
          Omit<CollectionReportMachineEntry, "internalId" | "serialNumber">
        >;
      } = {
        variance: Number(financials.variance) || 0,
        previousBalance: Number(financials.previousBalance) || 0,
        currentBalance: 0,
        amountToCollect: Number(financials.amountToCollect) || 0,
        amountCollected: Number(financials.collectedAmount) || 0,
        amountUncollected: 0,
        partnerProfit: 0,
        taxes: Number(financials.taxes) || 0,
        advance: Number(financials.advance) || 0,
        collectorName: getCollectorName(),
        locationName: selectedLocationName,
        locationReportId: reportId,
        location: selectedLocationId || "",
        totalDrop: 0,
        totalCancelled: 0,
        totalGross: 0,
        totalSasGross: 0,

        timestamp: new Date().toISOString(),

        timestamp: machineEntry.collectionTime,
        varianceReason: financials.varianceReason,
        reasonShortagePayment: financials.reasonForShortagePayment,
        balanceCorrection: Number(financials.balanceCorrection) || 0,
        balanceCorrectionReas: financials.balanceCorrectionReason,

        machines: collectedMachineEntries.map((entry) => ({
          machineId: entry.machineId,
          machineName: entry.machineName,
          collectionTime:
            entry.timestamp instanceof Date
              ? entry.timestamp.toISOString()
              : new Date(entry.timestamp).toISOString(),
          metersIn: entry.metersIn,
          metersOut: entry.metersOut,
          notes: entry.notes,
          useCustomTime: true,
          selectedDate:
            entry.timestamp instanceof Date
              ? entry.timestamp.toISOString().split("T")[0]
              : new Date(entry.timestamp).toISOString().split("T")[0],
          timeHH:
            entry.timestamp instanceof Date
              ? String(entry.timestamp.getHours()).padStart(2, "0")
              : String(new Date(entry.timestamp).getHours()).padStart(2, "0"),
          timeMM:
            entry.timestamp instanceof Date
              ? String(entry.timestamp.getMinutes()).padStart(2, "0")
              : String(new Date(entry.timestamp).getMinutes()).padStart(2, "0"),
        })),
      };

      // Validate payload before sending
      const validation = validateCollectionReportPayload(payload);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
      }

      // Create the collection report
      await createCollectionReport(payload);

      toast.dismiss("create-reports-toast");
      toast.success(
        `Successfully created collection report with ${collectedMachineEntries.length} machine(s)!`
      );

      // Reset the form and close modal
      setHasChanges(true);
      handleClose();
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      toast.dismiss("create-reports-toast");
      console.error("❌ Failed to create collection report:", error);
      toast.error(
        `Failed to create collection report: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    setIsProcessing(false);
  }, [
    collectedMachineEntries,
    financials.variance,
    financials.previousBalance,
    financials.amountToCollect,
    financials.collectedAmount,
    financials.taxes,
    financials.advance,
    financials.varianceReason,
    financials.reasonForShortagePayment,
    financials.balanceCorrection,
    financials.balanceCorrectionReason,
    getCollectorName,
    selectedLocationName,
    selectedLocationId,
    handleClose,
    onRefresh,
  ]);

  const handleCreateMultipleReports = useCallback(async () => {
    if (isProcessing) return; // Prevent multiple submissions

    if (!userId) {
      toast.error("User not found.");
      return;
    }
    if (collectedMachineEntries.length === 0) {
      toast.error("No machines added to the list.");
      return;
    }
    if (!selectedLocationId || !selectedLocationName) {
      toast.error("Location not properly selected.");
      return;
    }

        machines: [machineEntry],
      };
      const validation = validateCollectionReportPayload(payload);
      if (!validation.isValid) {
        // Log error for debugging in development
        if (process.env.NODE_ENV === "development") {
          console.error(
            "Validation failed for machine:",
            entry.machineName,
            validation.errors
          );
        }
        return Promise.reject({
          machineName: entry.machineName,
          errors: validation.errors,
        });
      }
      return createCollectionReport(payload);
    });

    // Proceed directly to create reports (no rollover warning on report creation)
    await handleCreateMultipleReportsInternal();
  }, [
    isProcessing,
    userId,
    collectedMachineEntries,
    selectedLocationId,
    selectedLocationName,
    handleCreateMultipleReportsInternal,
  ]);

  const confirmCreateReports = useCallback(() => {
    setShowCreateReportConfirmation(false);
    handleCreateMultipleReports();
  }, [handleCreateMultipleReports]);


  // Warning modal handlers

  // Machine rollover warning modal handlers
  const handleConfirmMachineRollover = useCallback(async () => {
    setShowMachineRolloverWarning(false);
    if (pendingMachineSubmission) {
      await pendingMachineSubmission();
      setPendingMachineSubmission(null);
    }
  }, [pendingMachineSubmission]);

  const handleCancelMachineRollover = useCallback(() => {
    setShowMachineRolloverWarning(false);
    setPendingMachineSubmission(null);
  }, []);


    // Update existing collections with the correct locationReportId
    if (successCount > 0) {
      try {
        await updateCollectionsWithReportId(collectedMachineEntries, reportId);

        // Update collection time for all machines in the list
        console.warn("🕒 Updating collection time for all machines...");
        const currentTime = new Date();
        for (const entry of collectedMachineEntries) {
          try {
            // Update the machine's last collection time
            await axios.patch(`/api/machines/${entry.machineId}`, {
              lastCollectionTime: currentTime.toISOString(),
            });
            console.warn(
              `✅ Updated collection time for machine ${entry.machineName}`
            );
          } catch (error) {
            console.error(
              `❌ Failed to update collection time for machine ${entry.machineName}:`,
              error
            );
            // Don't fail the entire operation if collection time update fails
          }
        }

        // Update machine collection history with the correct locationReportId
        const successfulResults = results
          .map((result, index) =>
            result.status === "fulfilled"
              ? { result: result.value, index }
              : null
          )
          .filter(Boolean);

        for (const item of successfulResults) {
          if (!item) continue;
          const { result: reportResult, index } = item;
          const entry = collectedMachineEntries[index];

          console.warn("Machine history update debug:", {
            entry: entry
              ? {
                  machineId: entry.machineId,
                  machineName: entry.machineName,
                  _id: entry._id,
                }
              : null,
            reportResult: reportResult
              ? {
                  data: reportResult.data,
                  hasDataId: !!reportResult.data?._id,
                }
              : null,
            reportId: reportId,
          });

          if (entry && entry.machineId) {
            try {
              const collectionHistoryEntry = {
                _id: entry._id,
                metersIn: entry.metersIn,
                metersOut: entry.metersOut,
                prevMetersIn: entry.prevIn || 0,
                prevMetersOut: entry.prevOut || 0,
                timestamp: entry.timestamp || new Date(),
                locationReportId: reportId, // Use the collection report ID, not the collection document ID
              };

              console.warn("Attempting to update machine collection history:", {
                machineId: entry.machineId,
                collectionHistoryEntry,
              });

              const result = await updateMachineCollectionHistory(
                entry.machineId,
                collectionHistoryEntry,
                "add"
              );

              console.warn("Machine collection history update result:", result);
            } catch (historyError) {
              console.error(
                `Failed to update machine collection history for ${entry.machineName}:`,
                historyError
              );
              // Don't fail the entire operation if history update fails
            }
          } else {
            console.warn(
              "Skipping machine history update - missing required data:",
              {
                hasEntry: !!entry,
                hasMachineId: !!entry?.machineId,
                hasReportResult: !!reportResult,
              }
            );
          }
        }
      } catch (error) {
        console.error("Failed to update collections with report ID:", error);
        toast.error("Reports created but failed to link collections");
      }

      // Refresh the parent page data after ANY successful creation
      if (onRefresh) {
        onRefresh();
      }
    }

    if (successCount === collectedMachineEntries.length) {
      // All reports created successfully - close modal
      setHasChanges(true);
      handleClose();
    } else if (successCount > 0) {
      // Some reports created - remove successful ones from the list
      const successfulMachineInternalIds = results
        .map((res, idx) =>
          res.status === "fulfilled" ? collectedMachineEntries[idx]._id : null
        )
        .filter((id) => id !== null);
      setCollectedMachineEntries((prev) =>
        prev.filter((e) => !successfulMachineInternalIds.includes(e._id))
      );
    }

    setIsProcessing(false);
  }, [
    collectedMachineEntries,
    selectedLocationId,
    selectedLocationName,
    financials,
    getCollectorName,
    handleClose,
    onRefresh,
  ]);

  const handleCreateMultipleReports = useCallback(async () => {
    if (isProcessing) return; // Prevent multiple submissions

    if (!userId) {
      toast.error("User not found.");
      return;
    }
    if (collectedMachineEntries.length === 0) {
      toast.error("No machines added to the list.");
      return;
    }
    if (!selectedLocationId || !selectedLocationName) {
      toast.error("Location not properly selected.");
      return;
    }

    // Check for rollover/ramclear conditions
    if (checkForRolloverConditions()) {
      setPendingSubmission(() => () => handleCreateMultipleReportsInternal());
      setShowRolloverWarning(true);
      return;
    }

    // If no rollover conditions, proceed directly
    await handleCreateMultipleReportsInternal();
  }, [
    isProcessing,
    userId,
    collectedMachineEntries,
    selectedLocationId,
    selectedLocationName,
    checkForRolloverConditions,
    handleCreateMultipleReportsInternal,
  ]);

  // Warning modal handlers
  const handleConfirmRollover = useCallback(async () => {
    setShowRolloverWarning(false);
    if (pendingSubmission) {
      await pendingSubmission();
      setPendingSubmission(null);
    }
  }, [pendingSubmission]);

  const handleCancelRollover = useCallback(() => {
    setShowRolloverWarning(false);
    setPendingSubmission(null);
  }, []);

  // Validate that all required fields have values before enabling Create Report button
  const isCreateReportsEnabled = useMemo(() => {
    // Must have machines in the list
    if (collectedMachineEntries.length === 0) return false;

    // Check that all collected machines have required meter values
    const allMachinesHaveRequiredData = collectedMachineEntries.every(
      (machine) =>
        machine.metersIn !== undefined &&
        machine.metersIn !== null &&
        machine.metersOut !== undefined &&
        machine.metersOut !== null
    );

    if (!allMachinesHaveRequiredData) return false;


    // Check that collectedAmount has a value (only required field)
    const collectedAmountHasValue =
      financials.collectedAmount !== undefined &&
      financials.collectedAmount !== null &&
      financials.collectedAmount.toString().trim() !== "";

    return collectedAmountHasValue;

    // Check that all required financial fields have values
    const requiredFinancialFields = [
      "variance",
      "advance",
      "taxes",
      "previousBalance",
      // 'collectedAmount' - Made optional as shown in UI
    ];

    const allFinancialFieldsHaveValues = requiredFinancialFields.every(
      (field) => {
        const value = financials[field as keyof typeof financials];
        return (
          value !== undefined &&
          value !== null &&
          value.toString().trim() !== ""
        );
      }
    );

    return allFinancialFieldsHaveValues;
  }, [collectedMachineEntries, financials]);

  if (!show) {
    return null;
  }

  // Show skeleton loader while modal is loading
  if (isModalLoading) {
    return <NewCollectionModalSkeleton />;
  }


  // Use mobile modal for mobile devices
  return (
    <>
      {/* Mobile Modal - Hidden on desktop */}
      <div className="md:hidden">
        <MobileCollectionModal
          show={show}
          onClose={handleClose}
          locations={locations}
          onRefresh={onRefresh}
        />
      </div>

      {/* Desktop Modal - Hidden on mobile */}
      <div className="hidden md:block">
        <Dialog
          open={show}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              handleClose();
            }
          }}
        >
          <DialogContent
            className="max-w-5xl h-[calc(100vh-2rem)] md:h-[90vh] p-0 flex flex-col bg-container"
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader className="p-4 md:p-6 pb-0">
              <DialogTitle className="text-xl md:text-2xl font-bold">
                New Collection Report Batch
              </DialogTitle>
            </DialogHeader>

            <div className="flex-grow flex flex-col lg:flex-row overflow-hidden">
              {/* Mobile: Full width, Desktop: 1/4 width */}
              <div className="w-full lg:w-1/4 border-b lg:border-b-0 lg:border-r border-gray-300 p-3 md:p-4 flex flex-col space-y-3 overflow-y-auto">
                <LocationSelect
                  value={lockedLocationId || selectedLocationId || ""}
                  onValueChange={(value) => {
                    setSelectedLocationId(value);
                    // Load previous balance from selected location
                    const selectedLocation = locations.find(
                      (loc) => String(loc._id) === value
                    );
                    if (selectedLocation) {
                      setFinancials((prev) => ({
                        ...prev,
                        previousBalance: (
                          (selectedLocation as Record<string, unknown>)
                            .collectionBalance || 0
                        ).toString(),
                      }));
                    }
                  }}
                  locations={locations.map((loc) => ({
                    _id: String(loc._id),
                    name: loc.name,
                  }))}
                  placeholder="Select Location"
                  disabled={isProcessing || lockedLocationId !== undefined}
                  className="w-full"
                  emptyMessage="No locations found"
                />

                {lockedLocationId && (
                  <p className="text-xs text-gray-500 italic">
                    Location is locked to the first machine&apos;s location
                  </p>
                )}

                <div className="flex-grow space-y-2 min-h-[100px]">
                  {isLoadingExistingCollections ? (
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className="bg-white p-3 rounded-md shadow border border-gray-200"
                        >
                          <Skeleton className="h-4 w-3/4 mb-2" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      ))}
                    </div>
                  ) : selectedLocationId || lockedLocationId ? (
                    (() => {
                      const locationIdToUse =
                        lockedLocationId || selectedLocationId;
                      const location = locations.find(
                        (l) => String(l._id) === locationIdToUse
                      );

                      if (!location) {
                        return (
                          <div className="text-center text-gray-500 py-4">
                            <p>Location data not available</p>
                            <p className="text-xs">ID: {locationIdToUse}</p>
                          </div>
                        );
                      }

                      return machinesOfSelectedLocation.length > 0 ? (
                        machinesOfSelectedLocation.map((machine) => (
                          <Button
                            key={String(machine._id)}
                            variant={
                              selectedMachineId === machine._id
                                ? "secondary"
                                : collectedMachineEntries.find(
                                    (e) => e.machineId === machine._id
                                  )
                                ? "default"
                                : "outline"
                            }
                            className="w-full justify-start text-left h-auto py-2 px-3 whitespace-normal"
                            onClick={() => {
                              if (
                                collectedMachineEntries.find(
                                  (e) => e.machineId === machine._id
                                ) &&
                                !editingEntryId
                              ) {
                                toast.info(
                                  `${machine.name} is already in the list. Click edit on the right to modify.`
                                );
                                return;
                              }

                              setSelectedMachineId(String(machine._id));
                            }}
                            disabled={
                              isProcessing ||
                              (editingEntryId !== null &&
                                collectedMachineEntries.find(
                                  (e) => e._id === editingEntryId
                                )?.machineId !== machine._id)
                            }
                          >
                            {machine.name} ({getSerialNumberIdentifier(machine)}
                            )
                            {collectedMachineEntries.find(
                              (e) => e.machineId === machine._id
                            ) &&
                              !editingEntryId && (
                                <span className="ml-auto text-xs text-green-500">
                                  (Added)
                                </span>
                              )}
                          </Button>
                        ))
                      ) : (
                        <p className="text-xs md:text-sm text-grayHighlight pt-2">
                          No machines for this location.
                        </p>
                      );
                    })()
                  ) : (
                    <p className="text-xs md:text-sm text-grayHighlight pt-2">
                      Select a location to see machines.
                    </p>
                  )}
                </div>
              </div>

              {/* Mobile: Full width, Desktop: 2/4 width */}
              <div className="w-full lg:w-2/4 p-3 md:p-4 flex flex-col space-y-3 overflow-y-auto">
                {(selectedMachineId && machineForDataEntry) ||
                collectedMachineEntries.length > 0 ? (
                  <>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-grayHighlight">
                        {selectedLocationName} (Prev. Collection:{" "}
                        {previousCollectionTime
                          ? formatDate(previousCollectionTime)
                          : "N/A"}
                        )
                      </p>
                    </div>

                    <Button
                      variant="default"
                      className="w-full bg-lighterBlueHighlight text-primary-foreground"
                    >
                      {machineForDataEntry ? (
                        <>
                          {machineForDataEntry.name} (
                          {getSerialNumberIdentifier(machineForDataEntry)})
                        </>
                      ) : (
                        "Select a machine to edit"
                      )}
                    </Button>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-grayHighlight mb-2">
                        Collection Time:
                      </label>
                      <ModernDateTimePicker
                        date={currentCollectionTime}
                        setDate={setCurrentCollectionTime}
                        disabled={!machineForDataEntry || isProcessing}
                        placeholder="Select collection time"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-grayHighlight mb-1">
                          Meters In:
                        </label>
                        <div onClick={handleDisabledFieldClick}>
                          <Input
                            type="text"
                            placeholder="0"
                            value={currentMetersIn}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (/^-?\d*\.?\d*$/.test(val) || val === "") {
                                setCurrentMetersIn(val);
                              }
                            }}
                            disabled={!machineForDataEntry || isProcessing}
                          />
                        </div>
                        <p className="text-xs text-grayHighlight mt-1">
                          Prev In: {prevIn !== null ? prevIn : "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-grayHighlight mb-1">
                          Meters Out:
                        </label>
                        <div onClick={handleDisabledFieldClick}>
                          <Input
                            type="text"
                            placeholder="0"
                            value={currentMetersOut}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (/^-?\d*\.?\d*$/.test(val) || val === "") {
                                setCurrentMetersOut(val);
                              }
                            }}
                            disabled={!machineForDataEntry || isProcessing}
                          />
                        </div>
                        <p className="text-xs text-grayHighlight mt-1">
                          Prev Out: {prevOut !== null ? prevOut : "N/A"}
                        </p>
                      </div>
                    </div>

                    {/* RAM Clear Meter Inputs - Only show when RAM Clear is checked */}
                    {currentRamClear && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                        <h4 className="text-sm font-medium text-blue-800 mb-3">
                          RAM Clear Meters (Before Rollover)
                        </h4>
                        <p className="text-xs text-blue-600 mb-3">
                          Please enter the last meter readings before the RAM
                          Clear occurred.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-blue-700 mb-1">
                              RAM Clear Meters In:
                            </label>
                            <Input
                              type="text"
                              placeholder="0"
                              value={currentRamClearMetersIn}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (/^-?\d*\.?\d*$/.test(val) || val === "") {
                                  setCurrentRamClearMetersIn(val);
                                }
                              }}
                              disabled={!machineForDataEntry || isProcessing}
                              className="border-blue-300 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-blue-700 mb-1">
                              RAM Clear Meters Out:
                            </label>
                            <Input
                              type="text"
                              placeholder="0"
                              value={currentRamClearMetersOut}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (/^-?\d*\.?\d*$/.test(val) || val === "") {
                                  setCurrentRamClearMetersOut(val);
                                }
                              }}
                              disabled={!machineForDataEntry || isProcessing}
                              className="border-blue-300 focus:border-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* RAM Clear Validation Warnings */}
                    {validationWarnings.length > 0 && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg
                              className="h-5 w-5 text-yellow-400"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">
                              RAM Clear Validation Warning
                            </h3>
                            <div className="mt-2 text-sm text-yellow-700">
                              {validationWarnings.map((warning, index) => (
                                <p key={index} className="mb-1">
                                  {warning}
                                </p>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div
                      className="flex items-center space-x-2 mt-2"
                      onClick={handleDisabledFieldClick}
                    >
                      <input
                        type="checkbox"
                        id="ramClearCheckbox"
                        checked={currentRamClear}
                        onChange={(e) => {
                          setCurrentRamClear(e.target.checked);
                          if (!e.target.checked) {
                            // Clear RAM Clear meter fields when unchecked
                            setCurrentRamClearMetersIn("");
                            setCurrentRamClearMetersOut("");
                          }
                        }}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
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
                      <label className="block text-sm font-medium text-grayHighlight mb-1 mt-2">
                        Notes (for this machine):
                      </label>
                      <div onClick={handleDisabledFieldClick}>
                        <Textarea
                          placeholder="Machine-specific notes..."
                          value={currentMachineNotes}
                          onChange={(e) =>
                            setCurrentMachineNotes(e.target.value)
                          }
                          className="min-h-[60px]"
                          disabled={!machineForDataEntry || isProcessing}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3">
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
                            onClick={
                              machineForDataEntry
                                ? handleAddOrUpdateEntry
                                : handleDisabledFieldClick
                            }
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                            disabled={!machineForDataEntry || isProcessing}
                          >
                            {isProcessing
                              ? "Processing..."
                              : "Update Entry in List"}
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={() => {
                            if (machineForDataEntry) {
                              handleAddOrUpdateEntry();
                            } else {
                              handleDisabledFieldClick();
                            }
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          disabled={!machineForDataEntry || isProcessing}
                        >
                          {isProcessing
                            ? "Processing..."
                            : "Add Machine to List"}
                        </Button>
                      )}
                    </div>

                    <hr className="my-4 border-gray-300" />
                    <p className="text-lg font-semibold text-center text-gray-700">
                      Shared Financials for Batch
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-grayHighlight mb-1">
                          Taxes: <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="text"
                          placeholder="0"
                          value={financials.taxes}
                          onChange={(e) =>
                            (/^\d*\.?\d*$/.test(e.target.value) ||
                              e.target.value === "") &&
                            setFinancials({
                              ...financials,
                              taxes: e.target.value,
                            })
                          }
                          disabled={isProcessing}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-grayHighlight mb-1">
                          Advance: <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="text"
                          placeholder="0"
                          value={financials.advance}
                          onChange={(e) =>
                            (/^\d*\.?\d*$/.test(e.target.value) ||
                              e.target.value === "") &&
                            setFinancials({
                              ...financials,
                              advance: e.target.value,
                            })
                          }
                          disabled={isProcessing}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-grayHighlight mb-1">
                          Variance: <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="text"
                          placeholder="0"
                          value={financials.variance}
                          onChange={(e) =>
                            (/^\d*\.?\d*$/.test(e.target.value) ||
                              e.target.value === "") &&
                            setFinancials({
                              ...financials,
                              variance: e.target.value,
                            })
                          }
                          disabled={isProcessing}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-grayHighlight mb-1">
                          Variance Reason:
                        </label>
                        <Textarea
                          placeholder="Variance Reason"
                          value={financials.varianceReason}
                          onChange={(e) =>
                            setFinancials({
                              ...financials,
                              varianceReason: e.target.value,
                            })
                          }
                          className="min-h-[40px]"
                          disabled={isProcessing}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-grayHighlight mb-1">
                          Amount To Collect:{" "}
                          <span className="text-xs text-gray-400">
                            (Auto-calculated)
                          </span>
                        </label>
                        <Input
                          type="text"
                          placeholder="0"
                          value={financials.amountToCollect}
                          readOnly
                          className="bg-gray-100 cursor-not-allowed"
                          title="This value is automatically calculated"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-grayHighlight mb-1">
                          Collected Amount:{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="text"
                          placeholder="0"
                          value={financials.collectedAmount}
                          onChange={(e) => {
                            if (
                              /^\d*\.?\d*$/.test(e.target.value) ||
                              e.target.value === ""
                            ) {
                              setFinancials({
                                ...financials,
                                collectedAmount: e.target.value,
                              });
                              // Trigger manual calculations
                              setTimeout(() => {
                                const amountCollected =
                                  Number(e.target.value) || 0;
                                const amountToCollect =
                                  Number(financials.amountToCollect) || 0;
                                const baseCorrection =
                                  Number(baseBalanceCorrection) || 0;

                                // Calculate previous balance: collectedAmount - amountToCollect
                                const previousBalance =
                                  amountCollected - amountToCollect;

                                // Calculate balance correction: baseBalanceCorrection + collectedAmount
                                const newBalanceCorrection =
                                  baseCorrection + amountCollected;

                                setFinancials((prev) => ({
                                  ...prev,
                                  previousBalance: previousBalance.toString(),
                                  balanceCorrection:
                                    newBalanceCorrection.toString(),
                                }));
                              }, 0);
                            }
                          }}
                          disabled={isProcessing}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-grayHighlight mb-1">
                          Balance Correction:{" "}
                          <span className="text-xs text-gray-400">
                            (Adds collected amount to existing value, editable)
                          </span>
                        </label>
                        <Input
                          type="text"
                          placeholder="0"
                          value={financials.balanceCorrection}
                          onChange={(e) => {
                            if (
                              /^-?\d*\.?\d*$/.test(e.target.value) ||
                              e.target.value === ""
                            ) {
                              // When user manually edits balance correction, extract the base value
                              const amountCollected =
                                Number(financials.collectedAmount) || 0;
                              const newBalanceCorrection =
                                Number(e.target.value) || 0;
                              const baseCorrection =
                                newBalanceCorrection - amountCollected;

                              setBaseBalanceCorrection(
                                baseCorrection.toString()
                              );
                              setFinancials((prev) => ({
                                ...prev,
                                balanceCorrection: e.target.value,
                              }));
                            }
                          }}
                          className="bg-white border-gray-300 focus:border-primary"
                          title="Balance correction (collected amount is automatically added to base value)"
                          disabled={isProcessing}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-grayHighlight mb-1">
                          Balance Correction Reason:
                        </label>
                        <Textarea
                          placeholder="Correction Reason"
                          value={financials.balanceCorrectionReason}
                          onChange={(e) =>
                            setFinancials({
                              ...financials,
                              balanceCorrectionReason: e.target.value,
                            })
                          }
                          className="min-h-[40px]"
                          disabled={isProcessing}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-grayHighlight mb-1">
                          Previous Balance:{" "}
                          <span className="text-xs text-gray-400">
                            (Auto-calculated: collected amount - amount to
                            collect)
                          </span>
                        </label>
                        <Input
                          type="text"
                          placeholder="0"
                          value={financials.previousBalance}
                          onChange={(e) =>
                            setFinancials((prev) => ({
                              ...prev,
                              previousBalance: e.target.value,
                            }))
                          }
                          className="bg-white border-gray-300 focus:border-primary"
                          title="Auto-calculated as collected amount minus amount to collect (editable)"
                          disabled={isProcessing}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-grayHighlight mb-1">
                          Reason For Shortage Payment:
                        </label>
                        <Textarea
                          placeholder="Shortage Reason"
                          value={financials.reasonForShortagePayment}
                          onChange={(e) =>
                            setFinancials({
                              ...financials,
                              reasonForShortagePayment: e.target.value,
                            })
                          }
                          className="min-h-[40px]"
                          disabled={isProcessing}
                        />
                      </div>
                    </div>

                    {/* Bill Validator Section */}
                    {selectedLocation && collectedMachineEntries.length > 0 && (
                      <div className="mt-6">
                        <hr className="my-4 border-gray-300" />
                        <BillValidatorSection
                          machineId={
                            collectedMachineEntries[0]?.machineId || ""
                          }
                          timePeriod="today"
                          onCollect={(formData: BillValidatorFormData) => {
                            console.warn("Collecting bills:", formData);
                            // TODO: Implement bill collection logic
                          }}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-grow flex items-center justify-center h-full">
                    <p className="text-grayHighlight text-base text-center">
                      Select a location and machine from the left to enter its
                      collection data.
                    </p>
                  </div>
                )}
              </div>

              {/* Mobile: Full width, Desktop: 1/4 width */}
              <div className="w-full lg:w-1/4 border-t lg:border-t-0 lg:border-l border-gray-300 p-3 md:p-4 flex flex-col space-y-2 overflow-y-auto bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-700 mb-2 sticky top-0 bg-gray-50 py-1">
                  Collected Machines ({collectedMachineEntries.length})
                </h3>
                {isLoadingCollections || isLoadingExistingCollections ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="bg-white p-3 rounded-md shadow border border-gray-200 space-y-2"
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
                  <p className="text-sm text-gray-500 text-center py-10">
                    No machines added to the list yet.
                  </p>
                ) : (
                  collectedMachineEntries.map((entry, index) => (
                    <div
                      key={entry._id || `entry-${index}`}
                      className="bg-white p-3 rounded-md shadow border border-gray-200 space-y-1 relative"
                    >
                      <p className="font-semibold text-sm text-primary">
                        {entry.machineName} ({entry.serialNumber || "N/A"})
                      </p>
                      <p className="text-xs text-gray-600">
                        Time: {formatDate(entry.timestamp)}
                      </p>
                      <p className="text-xs text-gray-600">
                        Meters In:{" "}
                        {entry.ramClear
                          ? entry.movement?.metersIn || entry.metersIn
                          : entry.metersIn}{" "}
                        | Meters Out:{" "}
                        {entry.ramClear
                          ? entry.movement?.metersOut || entry.metersOut
                          : entry.metersOut}
                      </p>
                      {entry.notes && (
                        <p className="text-xs text-gray-600 italic">
                          Notes: {entry.notes}
                        </p>
                      )}
                      {entry.ramClear && (
                        <p className="text-xs text-red-600 font-semibold">
                          RAM Clear: Enabled
                        </p>
                      )}
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 p-0 hover:bg-gray-200"
                          onClick={() => handleEditCollectedEntry(entry._id)}
                          disabled={isProcessing}
                        >
                          <Edit3 className="h-3.5 w-3.5 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 p-0 hover:bg-gray-200"
                          onClick={() => handleDeleteCollectedEntry(entry._id)}
                          disabled={isProcessing}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))

  return (
    <>
      <Dialog
        open={show}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            handleClose();
          }
        }}
      >
        <DialogContent
          className="max-w-5xl h-[calc(100vh-2rem)] md:h-[90vh] p-0 flex flex-col bg-container"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="p-4 md:p-6 pb-0">
            <DialogTitle className="text-xl md:text-2xl font-bold">
              New Collection Report Batch
            </DialogTitle>
          </DialogHeader>

          <div className="flex-grow flex flex-col lg:flex-row overflow-hidden">
            {/* Mobile: Full width, Desktop: 1/4 width */}
            <div className="w-full lg:w-1/4 border-b lg:border-b-0 lg:border-r border-gray-300 p-3 md:p-4 flex flex-col space-y-3 overflow-y-auto">
              <Select
                value={lockedLocationId || selectedLocationId || ""}
                onValueChange={(value) => setSelectedLocationId(value)}
                disabled={isProcessing || lockedLocationId !== undefined}
              >
                <SelectTrigger
                  className={`w-full bg-white border border-gray-300 text-gray-900 focus:ring-primary focus:border-primary ${
                    isProcessing || lockedLocationId !== undefined
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:border-gray-400"
                  }`}
                >
                  <SelectValue placeholder="Select Location">
                    {(() => {
                      const locationIdToUse =
                        lockedLocationId || selectedLocationId;
                      if (locationIdToUse) {
                        const location = locations.find(
                          (l) => String(l._id) === locationIdToUse
                        );
                        return location
                          ? location.name
                          : `Location ${locationIdToUse}`;
                      }
                      return "Select Location";
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {locations.length > 0 ? (
                    locations.map((loc) => (
                      <SelectItem key={String(loc._id)} value={String(loc._id)}>
                        {loc.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-grayHighlight">
                      No locations found.
                    </div>
                  )}
                </SelectContent>
              </Select>

              {lockedLocationId && (
                <p className="text-xs text-gray-500 italic">
                  Location is locked to the first machine&apos;s location
                </p>
              )}

              <div className="relative">
                <Input
                  placeholder="Search Locations..."
                  className="pr-10"
                  value={locationSearch}
                  disabled
                  onChange={(e) => setLocationSearch(e.target.value)}
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-grayHighlight" />
              </div>

              <div className="flex-grow space-y-2 min-h-[100px]">
                {isLoadingExistingCollections ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="bg-white p-3 rounded-md shadow border border-gray-200"
                      >
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : selectedLocationId || lockedLocationId ? (
                  (() => {
                    const locationIdToUse =
                      lockedLocationId || selectedLocationId;
                    const location = locations.find(
                      (l) => String(l._id) === locationIdToUse
                    );

                    if (!location) {
                      return (
                        <div className="text-center text-gray-500 py-4">
                          <p>Location data not available</p>
                          <p className="text-xs">ID: {locationIdToUse}</p>
                        </div>
                      );
                    }

                    return machinesOfSelectedLocation.length > 0 ? (
                      machinesOfSelectedLocation.map((machine) => (
                        <Button
                          key={String(machine._id)}
                          variant={
                            selectedMachineId === machine._id
                              ? "secondary"
                              : collectedMachineEntries.find(
                                  (e) => e.machineId === machine._id
                                )
                              ? "default"
                              : "outline"
                          }
                          className="w-full justify-start text-left h-auto py-2 px-3 whitespace-normal"
                          onClick={() => {
                            if (
                              collectedMachineEntries.find(
                                (e) => e.machineId === machine._id
                              ) &&
                              !editingEntryId
                            ) {
                              toast.info(
                                `${machine.name} is already in the list. Click edit on the right to modify.`
                              );
                              return;
                            }
                            setSelectedMachineId(String(machine._id));
                          }}
                          disabled={
                            isProcessing ||
                            (editingEntryId !== null &&
                              collectedMachineEntries.find(
                                (e) => e._id === editingEntryId
                              )?.machineId !== machine._id)
                          }
                        >
                          {machine.name} ({getSerialNumberIdentifier(machine)})
                          {collectedMachineEntries.find(
                            (e) => e.machineId === machine._id
                          ) &&
                            !editingEntryId && (
                              <span className="ml-auto text-xs text-green-500">
                                (Added)
                              </span>
                            )}
                        </Button>
                      ))
                    ) : (
                      <p className="text-xs md:text-sm text-grayHighlight pt-2">
                        No machines for this location.
                      </p>
                    );
                  })()
                ) : (
                  <p className="text-xs md:text-sm text-grayHighlight pt-2">
                    Select a location to see machines.
                  </p>
                )}
              </div>
            </div>


            <DialogFooter className="p-4 md:p-6 pt-2 md:pt-4 flex justify-center border-t border-gray-300">
              <Button
                onClick={() => setShowCreateReportConfirmation(true)}
                className={`w-auto bg-button hover:bg-buttonActive text-base px-8 py-3 ${
                  !isCreateReportsEnabled || isProcessing
                    ? "cursor-not-allowed"
                    : "cursor-pointer"
                }`}
                disabled={!isCreateReportsEnabled || isProcessing}
              >
                {isProcessing
                  ? "CREATING REPORTS..."
                  : `CREATE REPORT(S) (${collectedMachineEntries.length})`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Machine Rollover/Ramclear Warning Modal */}
      <Dialog
        open={showMachineRolloverWarning}
        onOpenChange={setShowMachineRolloverWarning}
      >

            {/* Mobile: Full width, Desktop: 2/4 width */}
            <div className="w-full lg:w-2/4 p-3 md:p-4 flex flex-col space-y-3 overflow-y-auto">
              {(selectedMachineId && machineForDataEntry) ||
              collectedMachineEntries.length > 0 ? (
                <>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-grayHighlight">
                      {selectedLocationName} (Prev. Collection:{" "}
                      {previousCollectionTime
                        ? formatDate(previousCollectionTime)
                        : "N/A"}
                      )
                    </p>
                  </div>

                  <Button
                    variant="default"
                    className="w-full bg-lighterBlueHighlight text-primary-foreground"
                  >
                    {machineForDataEntry ? (
                      <>
                        {machineForDataEntry.name} (
                        {getSerialNumberIdentifier(machineForDataEntry)})
                      </>
                    ) : (
                      "Select a machine to edit"
                    )}
                  </Button>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-grayHighlight mb-2">
                      Collection Time:
                    </label>
                    <SimpleDateTimePicker
                      date={currentCollectionTime}
                      setDate={setCurrentCollectionTime}
                      disabled={!machineForDataEntry || isProcessing}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-grayHighlight mb-1">
                        Meters In:
                      </label>
                      <div onClick={handleDisabledFieldClick}>
                        <Input
                          type="text"
                          placeholder="0"
                          value={currentMetersIn}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^-?\d*\.?\d*$/.test(val) || val === "") {
                              setCurrentMetersIn(val);
                            }
                          }}
                          disabled={!machineForDataEntry || isProcessing}
                        />
                      </div>
                      <p className="text-xs text-grayHighlight mt-1">
                        Prev In: {prevIn !== null ? prevIn : "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-grayHighlight mb-1">
                        Meters Out:
                      </label>
                      <div onClick={handleDisabledFieldClick}>
                        <Input
                          type="text"
                          placeholder="0"
                          value={currentMetersOut}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^-?\d*\.?\d*$/.test(val) || val === "") {
                              setCurrentMetersOut(val);
                            }
                          }}
                          disabled={!machineForDataEntry || isProcessing}
                        />
                      </div>
                      <p className="text-xs text-grayHighlight mt-1">
                        Prev Out: {prevOut !== null ? prevOut : "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* RAM Clear Meter Inputs - Only show when RAM Clear is checked */}
                  {currentRamClear && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                      <h4 className="text-sm font-medium text-blue-800 mb-3">
                        RAM Clear Meters (Before Rollover)
                      </h4>
                      <p className="text-xs text-blue-600 mb-3">
                        Please enter the last meter readings before the RAM Clear occurred.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-blue-700 mb-1">
                            RAM Clear Meters In:
                          </label>
                          <Input
                            type="text"
                            placeholder="0"
                            value={currentRamClearMetersIn}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (/^-?\d*\.?\d*$/.test(val) || val === "") {
                                setCurrentRamClearMetersIn(val);
                              }
                            }}
                            disabled={!machineForDataEntry || isProcessing}
                            className="border-blue-300 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-blue-700 mb-1">
                            RAM Clear Meters Out:
                          </label>
                          <Input
                            type="text"
                            placeholder="0"
                            value={currentRamClearMetersOut}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (/^-?\d*\.?\d*$/.test(val) || val === "") {
                                setCurrentRamClearMetersOut(val);
                              }
                            }}
                            disabled={!machineForDataEntry || isProcessing}
                            className="border-blue-300 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* RAM Clear Validation Warnings */}
                  {validationWarnings.length > 0 && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">
                            RAM Clear Validation Warning
                          </h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            {validationWarnings.map((warning, index) => (
                              <p key={index} className="mb-1">{warning}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div
                    className="flex items-center space-x-2 mt-2"
                    onClick={handleDisabledFieldClick}
                  >
                    <input
                      type="checkbox"
                      id="ramClearCheckbox"
                      checked={currentRamClear}
                      onChange={(e) => {
                        setCurrentRamClear(e.target.checked);
                        if (!e.target.checked) {
                          // Clear RAM Clear meter fields when unchecked
                          setCurrentRamClearMetersIn("");
                          setCurrentRamClearMetersOut("");
                        }
                      }}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
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
                    <label className="block text-sm font-medium text-grayHighlight mb-1 mt-2">
                      Notes (for this machine):
                    </label>
                    <div onClick={handleDisabledFieldClick}>
                      <Textarea
                        placeholder="Machine-specific notes..."
                        value={currentMachineNotes}
                        onChange={(e) => setCurrentMachineNotes(e.target.value)}
                        className="min-h-[60px]"
                        disabled={!machineForDataEntry || isProcessing}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
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
                          onClick={
                            machineForDataEntry
                              ? handleAddOrUpdateEntry
                              : handleDisabledFieldClick
                          }
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                          disabled={!machineForDataEntry || isProcessing}
                        >
                          {isProcessing ? "Processing..." : "Update Entry in List"}
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={
                          machineForDataEntry
                            ? handleAddOrUpdateEntry
                            : handleDisabledFieldClick
                        }
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={!machineForDataEntry || isProcessing}
                      >
                        {isProcessing ? "Processing..." : "Add Machine to List"}
                      </Button>
                    )}
                  </div>

                  <hr className="my-4 border-gray-300" />
                  <p className="text-lg font-semibold text-center text-gray-700">
                    Shared Financials for Batch
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-grayHighlight mb-1">
                        Taxes: <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        placeholder="0"
                        value={financials.taxes}
                        onChange={(e) =>
                          (/^\d*\.?\d*$/.test(e.target.value) ||
                            e.target.value === "") &&
                          setFinancials({
                            ...financials,
                            taxes: e.target.value,
                          })
                        }
                        disabled={isProcessing}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-grayHighlight mb-1">
                        Advance: <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        placeholder="0"
                        value={financials.advance}
                        onChange={(e) =>
                          (/^\d*\.?\d*$/.test(e.target.value) ||
                            e.target.value === "") &&
                          setFinancials({
                            ...financials,
                            advance: e.target.value,
                          })
                        }
                        disabled={isProcessing}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-grayHighlight mb-1">
                        Variance: <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        placeholder="0"
                        value={financials.variance}
                        onChange={(e) =>
                          (/^\d*\.?\d*$/.test(e.target.value) ||
                            e.target.value === "") &&
                          setFinancials({
                            ...financials,
                            variance: e.target.value,
                          })
                        }
                        disabled={isProcessing}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-grayHighlight mb-1">
                        Variance Reason:
                      </label>
                      <Textarea
                        placeholder="Variance Reason"
                        value={financials.varianceReason}
                        onChange={(e) =>
                          setFinancials({
                            ...financials,
                            varianceReason: e.target.value,
                          })
                        }
                        className="min-h-[40px]"
                        disabled={isProcessing}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-grayHighlight mb-1">
                        Amount To Collect:{" "}
                        <span className="text-xs text-gray-400">
                          (Auto-calculated)
                        </span>
                      </label>
                      <Input
                        type="text"
                        placeholder="0"
                        value={financials.amountToCollect}
                        readOnly
                        className="bg-gray-100 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-grayHighlight mb-1">
                        Collected Amount:{" "}
                        <span className="text-xs text-gray-400">
                          (Optional)
                        </span>
                      </label>
                      <Input
                        type="text"
                        placeholder="0"
                        value={financials.collectedAmount}
                        onChange={(e) =>
                          (/^\d*\.?\d*$/.test(e.target.value) ||
                            e.target.value === "") &&
                          setFinancials({
                            ...financials,
                            collectedAmount: e.target.value,
                          })
                        }
                        disabled={isProcessing}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-grayHighlight mb-1">
                        Balance Correction:
                      </label>
                      <Input
                        type="text"
                        placeholder="0"
                        value={financials.balanceCorrection}
                        onChange={(e) =>
                          setFinancials({
                            ...financials,
                            balanceCorrection: e.target.value,
                          })
                        }
                        className="bg-white"
                        disabled={isProcessing}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-grayHighlight mb-1">
                        Balance Correction Reason:
                      </label>
                      <Textarea
                        placeholder="Correction Reason"
                        value={financials.balanceCorrectionReason}
                        onChange={(e) =>
                          setFinancials({
                            ...financials,
                            balanceCorrectionReason: e.target.value,
                          })
                        }
                        className="min-h-[40px]"
                        disabled={isProcessing}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-grayHighlight mb-1">
                        Previous Balance:
                      </label>
                      <Input
                        type="text"
                        placeholder="0"
                        value={financials.previousBalance}
                        onChange={(e) =>
                          (/^\d*\.?\d*$/.test(e.target.value) ||
                            e.target.value === "") &&
                          setFinancials({
                            ...financials,
                            previousBalance: e.target.value,
                          })
                        }
                        disabled={isProcessing}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-grayHighlight mb-1">
                        Reason For Shortage Payment:
                      </label>
                      <Textarea
                        placeholder="Shortage Reason"
                        value={financials.reasonForShortagePayment}
                        onChange={(e) =>
                          setFinancials({
                            ...financials,
                            reasonForShortagePayment: e.target.value,
                          })
                        }
                        className="min-h-[40px]"
                        disabled={isProcessing}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-grow flex items-center justify-center h-full">
                  <p className="text-grayHighlight text-base text-center">
                    Select a location and machine from the left to enter its
                    collection data.
                  </p>
                </div>
              )}
            </div>

            {/* Mobile: Full width, Desktop: 1/4 width */}
            <div className="w-full lg:w-1/4 border-t lg:border-t-0 lg:border-l border-gray-300 p-3 md:p-4 flex flex-col space-y-2 overflow-y-auto bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-700 mb-2 sticky top-0 bg-gray-50 py-1">
                Collected Machines ({collectedMachineEntries.length})
              </h3>
              {isLoadingCollections || isLoadingExistingCollections ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="bg-white p-3 rounded-md shadow border border-gray-200 space-y-2"
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
                <p className="text-sm text-gray-500 text-center py-10">
                  No machines added to the list yet.
                </p>
              ) : (
                collectedMachineEntries.map((entry, index) => (
                  <div
                    key={entry._id || `entry-${index}`}
                    className="bg-white p-3 rounded-md shadow border border-gray-200 space-y-1 relative"
                  >
                    <p className="font-semibold text-sm text-primary">
                      {entry.machineName} ({entry.serialNumber || "N/A"})
                    </p>
                    <p className="text-xs text-gray-600">
                      Time: {formatDate(entry.timestamp)}
                    </p>
                    <p className="text-xs text-gray-600">
                      Meters In: {entry.ramClear ? entry.movement?.metersIn || entry.metersIn : entry.metersIn} | Meters Out:{" "}
                      {entry.ramClear ? entry.movement?.metersOut || entry.metersOut : entry.metersOut}
                    </p>
                    {entry.notes && (
                      <p className="text-xs text-gray-600 italic">
                        Notes: {entry.notes}
                      </p>
                    )}
                    {entry.ramClear && (
                      <p className="text-xs text-red-600 font-semibold">
                        RAM Clear: Enabled
                      </p>
                    )}
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 p-0 hover:bg-gray-200"
                        onClick={() => handleEditCollectedEntry(entry._id)}
                        disabled={isProcessing}
                      >
                        <Edit3 className="h-3.5 w-3.5 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 p-0 hover:bg-gray-200"
                        onClick={() => handleDeleteCollectedEntry(entry._id)}
                        disabled={isProcessing}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter className="p-4 md:p-6 pt-2 md:pt-4 flex justify-center border-t border-gray-300">
            <Button
              onClick={handleCreateMultipleReports}
              className={`w-auto bg-button hover:bg-buttonActive text-base px-8 py-3 ${
                !isCreateReportsEnabled || isProcessing
                  ? "cursor-not-allowed"
                  : "cursor-pointer"
              }`}
              disabled={!isCreateReportsEnabled || isProcessing}
            >
              {isProcessing
                ? "CREATING REPORTS..."
                : `CREATE REPORT(S) (${collectedMachineEntries.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rollover/Ramclear Warning Modal */}
      <Dialog open={showRolloverWarning} onOpenChange={setShowRolloverWarning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-red-600">
              ⚠️ Rollover/Ramclear Warning
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700 mb-4">

              This machine has <strong>metersIn</strong> value less than its{" "}
              <strong>previous metersIn</strong> value.

              One or more machines have <strong>metersIn</strong> values greater
              than their <strong>previous metersIn</strong> values.
            </p>
            <p className="text-gray-700 mb-4">
              This typically indicates a <strong>rollover</strong> or{" "}
              <strong>ramclear</strong> situation.
            </p>
            <p className="text-gray-700 font-medium">

              Are you sure you want to add this machine with rollover/ramclear?

              Are you sure you want to process rollover/ramclear?
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"

              onClick={handleCancelMachineRollover}

              onClick={handleCancelRollover}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button

              onClick={handleConfirmMachineRollover}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              Yes, Add Machine

              onClick={handleConfirmRollover}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              Yes, Process Rollover
            </Button>
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

      {/* Create Report Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showCreateReportConfirmation}
        onClose={() => setShowCreateReportConfirmation(false)}
        onConfirm={confirmCreateReports}
        title="Confirm Create Reports"
        message={`Are you sure you want to create reports for ${collectedMachineEntries.length} machine(s)?`}
        confirmText="Yes, Create Reports"
        cancelText="Cancel"
        isLoading={isProcessing}
      />

    </>
  );
}
