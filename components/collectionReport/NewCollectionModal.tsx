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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import LocationSingleSelect from "@/components/ui/common/LocationSingleSelect";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Edit3, ExternalLink } from "lucide-react";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { InfoConfirmationDialog } from "@/components/ui/InfoConfirmationDialog";
import axios from "axios";
import type { CollectionDocument } from "@/lib/types/collections";
import type { NewCollectionModalProps } from "@/lib/types/componentProps";
import type {
  CollectionReportMachineSummary,
  CreateCollectionReportPayload,
} from "@/lib/types/api";
import { PCDateTimePicker } from "@/components/ui/pc-date-time-picker";
import { useUserStore } from "@/lib/store/userStore";
import { useCollectionModalStore } from "@/lib/store/collectionModalStore";
import { createCollectionReport } from "@/lib/helpers/collectionReport";
import { updateCollection } from "@/lib/helpers/collections";
import { validateMachineEntry } from "@/lib/helpers/collectionReportModal";
import { v4 as uuidv4 } from "uuid";
import { updateMachineCollectionHistory } from "@/lib/helpers/cabinets";
import { NewCollectionModalSkeleton } from "@/components/ui/skeletons/NewCollectionModalSkeleton";
import { validateCollectionReportPayload } from "@/lib/utils/validation";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils/formatting";
import { formatMachineDisplayNameWithBold } from "@/lib/utils/machineDisplay";
import { getMachineDisplayName } from "@/lib/utils/machineDisplaySimple";
import { calculateDefaultCollectionTime } from "@/lib/utils/collectionTime";
import { calculateMachineMovement } from "@/lib/utils/frontendMovementCalculation";
import { useDebounce, useDebouncedCallback } from "@/lib/hooks/useDebounce";
// Activity logging will be handled via API calls
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Advanced SAS start override state
// (Placed near top-level to avoid re-renders from dynamic imports)

// ... existing code ...

async function addMachineCollection(data: Partial<CollectionDocument>): Promise<CollectionDocument> {
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
  onRefreshLocations,
}: NewCollectionModalProps) {
  // Get Zustand store actions
  const {
    setSelectedLocation: setStoreSelectedLocation,
    setLockedLocation: setStoreLockedLocation,
    setAvailableMachines: setStoreAvailableMachines,
    setCollectedMachines: setStoreCollectedMachines,
    resetState: resetStoreState,
  } = useCollectionModalStore();
  const hasResetRef = useRef(false);
  const user = useUserStore((state) => state.user);
  const userId = user?._id;

  // Helper function to get proper user display name for activity logging
  const getUserDisplayName = useCallback(() => {
    if (!user) return "Unknown User";

    // Check if user has profile with firstName and lastName
    if (user.profile?.firstName && user.profile?.lastName) {
      return `${user.profile.firstName} ${user.profile.lastName}`;
    }

    // If only firstName exists, use it
    if (user.profile?.firstName && !user.profile?.lastName) {
      return user.profile.firstName;
    }

    // If only lastName exists, use it
    if (!user.profile?.firstName && user.profile?.lastName) {
      return user.profile.lastName;
    }

    // If neither firstName nor lastName exist, use username
    if (user.username && user.username.trim() !== "") {
      return user.username;
    }

    // If username doesn't exist or is blank, use email
    if (user.emailAddress && user.emailAddress.trim() !== "") {
      return user.emailAddress;
    }

    // Fallback
    return "Unknown User";
  }, [user]);

  // Activity logging function
  const logActivity = useCallback(
    async (
      action: string,
      resource: string,
      resourceId: string,
      resourceName: string,
      details: string,
      previousData?: Record<string, unknown> | null,
      newData?: Record<string, unknown> | null
    ) => {
      try {
        const response = await fetch("/api/activity-logs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            resource,
            resourceId,
            resourceName,
            details,
            userId: user?._id || "unknown",
            username: getUserDisplayName(),
            userRole: "user",
            previousData: previousData || null,
            newData: newData || null,
            changes: [], // Will be calculated by the API
          }),
        });

        if (!response.ok) {
          console.error("Failed to log activity:", response.statusText);
        }
      } catch (error) {
        console.error("Error logging activity:", error);
      }
    },
    [user, getUserDisplayName]
  );

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
      setMachineSearchTerm("");
      setHasChanges(false);
    }

    onClose();
  }, [hasChanges, onRefresh, onClose]);

  // Handle location selection
  const handleLocationChange = useCallback(
    (value: string) => {
      setSelectedLocationId(value);
      // Load previous balance from selected location
      const selectedLocation = locations.find(
        (loc) => String(loc._id) === value
      );
      if (selectedLocation) {
        setFinancials((prev) => ({
          ...prev,
          previousBalance: (
            (selectedLocation as Record<string, unknown>).collectionBalance || 0
          ).toString(),
        }));
      }
    },
    [locations]
  );

  // Function to generate collector name from user profile
  const getCollectorName = useCallback(() => {
    if (!user) return "Unknown Collector";

    // Check if user has profile with firstName and lastName
    if (user.profile?.firstName && user.profile?.lastName) {
      return `${user.profile.firstName} ${user.profile.lastName}`;
    }

    // If only firstName exists, use it
    if (user.profile?.firstName && !user.profile?.lastName) {
      return user.profile.firstName;
    }

    // If only lastName exists, use it
    if (!user.profile?.firstName && user.profile?.lastName) {
      return user.profile.lastName;
    }

    // Fallback to username if available
    if (user.username) {
      return user.username;
    }

    // Final fallback to email address
    if (user.emailAddress) {
      return user.emailAddress;
    }

    return "Unknown Collector";
  }, [user]);

  const [selectedLocationId, setSelectedLocationId] = useState<
    string | undefined
  >(undefined);
  const [selectedLocationName, setSelectedLocationName] = useState<string>("");
  const [machinesOfSelectedLocation, setMachinesOfSelectedLocation] = useState<
    CollectionReportMachineSummary[]
  >([]);
  const [machineSearchTerm, setMachineSearchTerm] = useState("");
  const [lockedLocationId, setLockedLocationId] = useState<string | undefined>(
    undefined
  );

  // Filter machines based on search term when location is selected
  const filteredMachines = useMemo(() => {
    if (!machineSearchTerm.trim()) {
      return machinesOfSelectedLocation;
    }

    const searchLower = machineSearchTerm.toLowerCase();
    return machinesOfSelectedLocation.filter(
      (machine) =>
        (machine.name && machine.name.toLowerCase().includes(searchLower)) ||
        (machine.serialNumber &&
          machine.serialNumber.toLowerCase().includes(searchLower)) ||
        (machine.custom?.name &&
          machine.custom.name.toLowerCase().includes(searchLower)) ||
        (machine.game && machine.game.toLowerCase().includes(searchLower))
    );
  }, [machinesOfSelectedLocation, machineSearchTerm]);

  const [selectedMachineId, setSelectedMachineId] = useState<
    string | undefined
  >(undefined);

  // Global collection time for the entire report - always enabled
  const [currentCollectionTime, setCurrentCollectionTime] = useState<Date>(
    new Date() // Will be updated when location is selected
  );
  const [currentMetersIn, setCurrentMetersIn] = useState("");
  const [currentMetersOut, setCurrentMetersOut] = useState("");
  const [currentRamClearMetersIn, setCurrentRamClearMetersIn] = useState("");
  const [currentRamClearMetersOut, setCurrentRamClearMetersOut] = useState("");
  const [currentMachineNotes, setCurrentMachineNotes] = useState("");
  const [currentRamClear, setCurrentRamClear] = useState(false);
  // Advanced SAS controls
  const [showAdvancedSas, setShowAdvancedSas] = useState(false);
  const [customSasStartTime, setCustomSasStartTime] = useState<Date | null>(
    null
  );

  const [collectedMachineEntries, setCollectedMachineEntries] = useState<
    CollectionDocument[]
  >([]);
  const [collectedMachinesSearchTerm, setCollectedMachinesSearchTerm] =
    useState("");
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalLoading, _setIsModalLoading] = useState(false);

  // Edit functionality state
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [showUpdateConfirmation, setShowUpdateConfirmation] = useState(false);
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
  const [showViewMachineConfirmation, setShowViewMachineConfirmation] =
    useState(false);
  const [showCreateReportConfirmation, setShowCreateReportConfirmation] =
    useState(false);

  const [financials, setFinancials] = useState({
    taxes: "0",
    advance: "0",
    variance: "0",
    varianceReason: "",
    amountToCollect: "0",
    collectedAmount: "",
    balanceCorrection: "",
    balanceCorrectionReason: "",
    previousBalance: "0",
    reasonForShortagePayment: "",
  });

  // Base value typed by the user before entering collected amount
  const [baseBalanceCorrection, setBaseBalanceCorrection] =
    useState<string>("");

  const [prevIn, setPrevIn] = useState<number | null>(null);
  const [prevOut, setPrevOut] = useState<number | null>(null);
  const [previousCollectionTime, setPreviousCollectionTime] = useState<
    string | Date | undefined
  >(undefined);
  const [isLoadingExistingCollections, setIsLoadingExistingCollections] =
    useState(false);

  const selectedLocation = useMemo(() => {
    const locationIdToUse = lockedLocationId || selectedLocationId;
    return locations.find((l) => String(l._id) === locationIdToUse);
  }, [locations, selectedLocationId, lockedLocationId]);

  // Update collection time when location changes
  useEffect(() => {
    if (selectedLocation?.gameDayOffset !== undefined) {
      const defaultTime = calculateDefaultCollectionTime(
        selectedLocation.gameDayOffset
      );
      setCurrentCollectionTime(defaultTime);
    }
  }, [selectedLocation]);

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

    // Calculate total movement data from all machine entries using proper movement calculation
    const totalMovementData = collectedMachineEntries.map((entry) => {
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

    // Get financial values
    const taxes = Number(financials.taxes) || 0;
    const variance = Number(financials.variance) || 0;
    const advance = Number(financials.advance) || 0;

    // Use the location's previous balance, not the calculated one
    const locationPreviousBalance = selectedLocation?.collectionBalance || 0;

    // Get profit share from selected location (default to 50% if not available)
    const profitShare = selectedLocation?.profitShare || 50;

    // Calculate partner profit: (gross - variance - advance) * profitShare / 100 - taxes
    const partnerProfit =
      ((reportTotalData.gross - variance - advance) * profitShare) / 100 -
      taxes;

    // Calculate amount to collect: gross - variance - advance - partnerProfit + locationPreviousBalance
    const amountToCollect =
      reportTotalData.gross -
      variance -
      advance -
      partnerProfit +
      locationPreviousBalance;

    setFinancials((prev) => ({
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
    isLoadingCollections,
    isLoadingExistingCollections,
  ]);

  // Auto-calculate amount to collect when relevant data changes
  useEffect(() => {
    calculateAmountToCollect();
  }, [calculateAmountToCollect]);

  const machineForDataEntry = useMemo(() => {
    // First, try to find in the machines of selected location
    let found = machinesOfSelectedLocation.find(
      (m) => String(m._id) === selectedMachineId
    );

    // If not found and we have a selectedMachineId, try to find in collected machines
    if (!found && selectedMachineId) {
      const collectedEntry = collectedMachineEntries.find(
        (entry) => entry.machineId === selectedMachineId
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

    console.warn("🔍 machineForDataEntry calculation:", {
      selectedMachineId,
      machinesCount: machinesOfSelectedLocation.length,
      found: !!found,
      machineIds: machinesOfSelectedLocation.map((m) => m._id),
      foundMachine: found
        ? {
            _id: found._id,
            name: found.name,
            serialNumber: found.serialNumber,
            collectionMeters: found.collectionMeters,
          }
        : null,
      // Debug: show all machines for comparison
      allMachines: machinesOfSelectedLocation.map((m) => ({
        _id: m._id,
        name: m.name,
        serialNumber: m.serialNumber,
      })),
    });

    if (!found && selectedMachineId && machinesOfSelectedLocation.length > 0) {
      console.error("❌ Machine not found! This might be the issue:", {
        selectedMachineId,
        availableIds: machinesOfSelectedLocation.map((m) => String(m._id)),
        availableSerialNumbers: machinesOfSelectedLocation.map(
          (m) => m.serialNumber
        ),
      });
    }

    return found;
  }, [machinesOfSelectedLocation, selectedMachineId, collectedMachineEntries]);

  // Enable inputs when we have either machineForDataEntry or selectedMachineId (for editing mode)
  const inputsEnabled = useMemo(() => {
    return !!machineForDataEntry || !!selectedMachineId;
  }, [machineForDataEntry, selectedMachineId]);

  // Validation for "Add Machine" button - check if required fields are filled
  const isAddMachineEnabled = useMemo(() => {
    // Must have a machine selected
    if (!machineForDataEntry) return false;

    // Must have meters in and out entered
    if (!currentMetersIn || !currentMetersOut) return false;

    // If RAM Clear is checked, must have RAM Clear meters
    if (
      currentRamClear &&
      (!currentRamClearMetersIn || !currentRamClearMetersOut)
    ) {
      return false;
    }

    return true;
  }, [
    machineForDataEntry,
    currentMetersIn,
    currentMetersOut,
    currentRamClear,
    currentRamClearMetersIn,
    currentRamClearMetersOut,
  ]);

  // Monitor arrays for undefined values that could cause key issues
  useEffect(() => {
    console.warn("🔍 Monitoring arrays for undefined values:");
    console.warn(
      "🔍 machinesOfSelectedLocation:",
      machinesOfSelectedLocation.map((m, i) => ({
        index: i,
        _id: m._id,
        name: m.name,
        serialNumber: m.serialNumber,
        hasUndefinedId: m._id === undefined,
        hasId: !!m._id,
      }))
    );
    console.warn(
      "🔍 collectedMachineEntries:",
      collectedMachineEntries.map((e, i) => ({
        index: i,
        _id: e._id,
        hasUndefinedId: e._id === undefined,
        machineId: e.machineId,
      }))
    );
    console.warn("🔍 selectedMachineId:", selectedMachineId);
    console.warn(
      "🔍 machineForDataEntry:",
      machineForDataEntry
        ? {
            _id: machineForDataEntry._id,
            name: machineForDataEntry.name,
            serialNumber: machineForDataEntry.serialNumber,
          }
        : null
    );
  }, [
    machinesOfSelectedLocation,
    collectedMachineEntries,
    selectedMachineId,
    machineForDataEntry,
  ]);

  // Function to handle clicks on disabled input fields
  const handleDisabledFieldClick = useCallback(() => {
    if (!inputsEnabled) {
      toast.warning("Please select a machine first", {
        duration: 3000,
        position: "top-left",
      });
    }
  }, [inputsEnabled]);

  // Real-time validation for meter inputs
  const validateMeterInputs = useCallback(() => {
    if (!machineForDataEntry || !currentMetersIn || !currentMetersOut) {
      return;
    }

    // Check if RAM Clear meters are missing (but don't return early)
    const ramClearMetersMissing =
      currentRamClear &&
      (!currentRamClearMetersIn || !currentRamClearMetersOut);

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
      false // Always false for new entries
    );

    // Combine validation warnings with RAM Clear meters missing warning
    const allWarnings = [...(validation.warnings || [])];
    if (ramClearMetersMissing) {
      allWarnings.push(
        "Please enter last meters before Ram clear (or rollover)"
      );
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
        // Add cache-busting parameter to ensure fresh data
        let url = `/api/collections?incompleteOnly=true&_t=${Date.now()}`;
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
    if (show && locations.length > 0) {
      console.warn(
        "🔄 Fetching fresh collections data. selectedLocationId:",
        selectedLocationId,
        "locations:",
        locations.length
      );
      // Always fetch fresh data when modal opens, regardless of current state
      fetchExistingCollections(selectedLocationId);
    }
  }, [show, selectedLocationId, fetchExistingCollections, locations.length]);

  // Always fetch fresh data when modal opens to ensure latest values
  useEffect(() => {
    if (show) {
      console.warn("🔄 Modal opened - ensuring fresh data is available");

      // Refresh locations data first
      if (onRefreshLocations) {
        console.warn("🔄 Refreshing locations data");
        onRefreshLocations();
      }

      // Trigger a refresh of the parent component's data if onRefresh is available
      if (onRefresh) {
        console.warn(
          "🔄 Triggering parent data refresh to ensure fresh locations and machines data"
        );
        onRefresh();
      }
    }
  }, [show, onRefresh, onRefreshLocations]);

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

    if (locationIdToUse) {
      // Always fetch fresh machine data from API to ensure latest meter values
      const fetchMachinesForLocation = async () => {
        try {
          console.warn(
            "🔄 ALWAYS fetching fresh machines for location from API:",
            locationIdToUse
          );
          // Add cache-busting parameter to ensure fresh machine data
          const response = await axios.get(
            `/api/machines?locationId=${locationIdToUse}&_t=${Date.now()}`
          );
          if (response.data?.success && response.data?.data) {
            console.warn(
              "🔄 Fresh machines fetched from API:",
              response.data.data.length,
              "machines"
            );
            console.warn(
              "🔄 Machine meter data:",
              response.data.data.map((m: CollectionReportMachineSummary) => ({
                name: m.name,
                serialNumber: m.serialNumber,
                collectionMeters: m.collectionMeters,
              }))
            );
            setMachinesOfSelectedLocation(response.data.data);
          } else {
            console.warn("🔄 No machines found in API response");
            setMachinesOfSelectedLocation([]);
          }
        } catch (error) {
          console.error("Error fetching machines for location:", error);
          setMachinesOfSelectedLocation([]);
        }
      };

      fetchMachinesForLocation();
      setSelectedMachineId(undefined);
    } else {
      console.warn("No location ID to use");
      setMachinesOfSelectedLocation([]);
      setSelectedMachineId(undefined);
      setMachineSearchTerm("");
    }
  }, [selectedLocationId, lockedLocationId]);

  // Fetch fresh machine data when modal opens to ensure we have the latest meter values
  // This is now handled by the main location loading useEffect to avoid duplicate API calls

  useEffect(() => {
    console.warn(
      "🔍 useEffect for selectedMachineId and machineForDataEntry:",
      {
        selectedMachineId,
        machineForDataEntry: machineForDataEntry
          ? {
              _id: machineForDataEntry._id,
              name: machineForDataEntry.name,
              serialNumber: machineForDataEntry.serialNumber,
              collectionMeters: machineForDataEntry.collectionMeters,
            }
          : null,
      }
    );

    if (selectedMachineId && machineForDataEntry) {
      // Check if this machine is already in the collected list
      const existingEntry = collectedMachineEntries.find(
        (entry) => entry.machineId === selectedMachineId
      );

      console.warn("🔍 Found existing entry:", existingEntry);

      if (existingEntry) {
        // Pre-fill with existing values from collected list
        console.warn("🔍 Pre-filling from existing entry:", {
          metersIn: existingEntry.metersIn,
          metersOut: existingEntry.metersOut,
          prevIn: existingEntry.prevIn,
          prevOut: existingEntry.prevOut,
        });
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
        // FIXED: Use machine's current collectionMeters as the previous values for the next collection
        // The machine's collectionMeters represent the last collection meters, which become the "previous" for the next collection
        console.warn("🔍 For new entries, using machine's collectionMeters as previous values:", {
          collectionMeters: machineForDataEntry.collectionMeters,
          metersIn: machineForDataEntry.collectionMeters?.metersIn,
          metersOut: machineForDataEntry.collectionMeters?.metersOut,
        });
        
        // Use machine's current collectionMeters as the previous values for the next collection
        if (machineForDataEntry.collectionMeters) {
          const prevMetersIn = machineForDataEntry.collectionMeters.metersIn || 0;
          const prevMetersOut = machineForDataEntry.collectionMeters.metersOut || 0;
          console.warn("🔍 Setting prevIn/prevOut from machine collectionMeters:", {
            prevMetersIn,
            prevMetersOut,
          });
          setPrevIn(prevMetersIn);
          setPrevOut(prevMetersOut);
        } else {
          console.warn("🔍 No collectionMeters found, setting prevIn/prevOut to 0");
          setPrevIn(0);
          setPrevOut(0);
        }

        // Reset input fields for new entries
        setCurrentMetersIn("");
        setCurrentMetersOut("");
        setCurrentMachineNotes("");
        setCurrentRamClear(false);
        // Keep existing collectionTime - don't reset it
      }

      // Get previousCollectionTime from the gaming location, not the machine
      const selectedLocation = locations.find(
        (l) => String(l._id) === (lockedLocationId || selectedLocationId)
      );
      if (selectedLocation?.previousCollectionTime) {
        setPreviousCollectionTime(selectedLocation.previousCollectionTime);
      } else {
        setPreviousCollectionTime(undefined);
      }
    } else {
      // Only clear prevIn/prevOut when no machine is selected and machines are available
      // This prevents clearing values when a machine is selected and has valid collectionMeters
      console.warn("🔍 useEffect triggered with:", {
        selectedMachineId,
        machinesCount: machinesOfSelectedLocation.length,
        machineForDataEntry: machineForDataEntry
          ? {
              _id: machineForDataEntry._id,
              collectionMeters: machineForDataEntry.collectionMeters,
            }
          : null,
        shouldClear:
          selectedMachineId === undefined &&
          machinesOfSelectedLocation.length > 0,
      });

      // Only clear if no machine is selected AND machines are available
      // Don't clear if a machine is selected, even if machineForDataEntry is not found yet
      if (
        selectedMachineId === undefined &&
        machinesOfSelectedLocation.length > 0
      ) {
        console.warn(
          "🔄 Clearing prevIn/prevOut because no machine is selected but machines are available"
        );
        setPrevIn(null);
        setPrevOut(null);
      } else if (selectedMachineId && machineForDataEntry) {
        console.warn(
          "🔍 Machine is selected and found, should NOT clear prevIn/prevOut"
        );
      } else if (selectedMachineId && !machineForDataEntry) {
        console.warn(
          "⚠️ Machine is selected but not found in machinesOfSelectedLocation - this might be the issue!"
        );
        // Try to find the machine manually and set prevIn/prevOut
        const manualFound = machinesOfSelectedLocation.find(
          (m) => String(m._id) === selectedMachineId
        );
        if (manualFound && manualFound.collectionMeters) {
          console.warn(
            "🔧 Manually setting prevIn/prevOut from found machine:",
            {
              metersIn: manualFound.collectionMeters.metersIn,
              metersOut: manualFound.collectionMeters.metersOut,
            }
          );
          setPrevIn(manualFound.collectionMeters.metersIn || 0);
          setPrevOut(manualFound.collectionMeters.metersOut || 0);
        }
      }
      setPreviousCollectionTime(undefined);
    }
  }, [
    selectedMachineId,
    machineForDataEntry,
    locations,
    lockedLocationId,
    selectedLocationId,
    collectedMachineEntries,
    machinesOfSelectedLocation,
  ]);

  // Debounced machine selection validation (1 second)
  const debouncedSelectedMachineId = useDebounce(selectedMachineId, 1000);
  const debouncedMachineForDataEntry = useDebounce(machineForDataEntry, 1000);

  useEffect(() => {
    if (debouncedSelectedMachineId && debouncedMachineForDataEntry) {
      // Trigger validation when machine selection is debounced
      validateMeterInputs();
    }
  }, [
    debouncedSelectedMachineId,
    debouncedMachineForDataEntry,
    validateMeterInputs,
  ]);

  // Debounced input field validation (1.5 seconds)
  const debouncedCurrentMetersIn = useDebounce(currentMetersIn, 1500);
  const debouncedCurrentMetersOut = useDebounce(currentMetersOut, 1500);
  const debouncedCurrentMachineNotes = useDebounce(currentMachineNotes, 1500);

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

  const resetMachineSpecificInputFields = useCallback(() => {
    // Keep existing collectionTime - don't reset it
    setCurrentMetersIn("");
    setCurrentMetersOut("");
    setCurrentMachineNotes("");
    setCurrentRamClear(false);
    setCurrentRamClearMetersIn("");
    setCurrentRamClearMetersOut("");
    setEditingEntryId(null);
  }, []);

  // Reset state when modal opens for NEW collection
  useEffect(() => {
    if (show) {
      // Clear all state for a fresh start
      console.warn("🔄 Resetting modal state for fresh start");
      setCollectedMachineEntries([]);
      setSelectedLocationId(undefined);
      setSelectedLocationName("");
      setSelectedMachineId(undefined);
      setMachinesOfSelectedLocation([]);
      setIsLoadingCollections(false);
      setIsLoadingExistingCollections(false);
      setHasChanges(false);
      setLockedLocationId(undefined);
      setMachineSearchTerm("");

      // Reset all form fields
      resetMachineSpecificInputFields();

      // Reset financials to default values
      setFinancials({
        taxes: "0",
        advance: "0",
        variance: "0",
        varianceReason: "",
        amountToCollect: "0",
        collectedAmount: "",
        balanceCorrection: "",
        balanceCorrectionReason: "",
        previousBalance: "0",
        reasonForShortagePayment: "",
      });
      setBaseBalanceCorrection("");
    }
  }, [show, resetMachineSpecificInputFields]);

  // Sync local state with Zustand store for state sharing between desktop and mobile modals
  useEffect(() => {
    if (selectedLocationId !== undefined) {
      setStoreSelectedLocation(selectedLocationId, selectedLocationName);
    }
  }, [selectedLocationId, selectedLocationName, setStoreSelectedLocation]);

  useEffect(() => {
    setStoreLockedLocation(lockedLocationId);
  }, [lockedLocationId, setStoreLockedLocation]);

  useEffect(() => {
    setStoreAvailableMachines(machinesOfSelectedLocation);
  }, [machinesOfSelectedLocation, setStoreAvailableMachines]);

  useEffect(() => {
    setStoreCollectedMachines(collectedMachineEntries);
  }, [collectedMachineEntries, setStoreCollectedMachines]);

  useEffect(() => {
    if (!show && !hasResetRef.current) {
      // Reset form when modal is closed
      hasResetRef.current = true;

      // Reset Zustand store
      resetStoreState();

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
      setFinancials({
        taxes: "0",
        advance: "0",
        variance: "0",
        varianceReason: "",
        amountToCollect: "0",
        collectedAmount: "",
        balanceCorrection: "",
        balanceCorrectionReason: "",
        previousBalance: "0",
        reasonForShortagePayment: "",
      });
      setBaseBalanceCorrection("");
      setPrevIn(null);
      setPrevOut(null);
      setPreviousCollectionTime(undefined);
    } else if (show) {
      hasResetRef.current = false;
    }
  }, [show, resetStoreState]);

  // Check for rollover/ramclear conditions on individual machine
  const checkForMachineRolloverConditions = useCallback(
    (metersIn: number, prevIn: number) => {
      return metersIn < prevIn;
    },
    []
  );

  const addMachineToCollection = useCallback(async () => {
    if (isProcessing) return;
    if (
      currentRamClear &&
      (!currentRamClearMetersIn || !currentRamClearMetersOut)
    ) {
      toast.error(
        "RAM Clear Meters In and Out are required when RAM Clear is checked",
        { position: "top-left" }
      );
      return;
    }

    const metersIn = Number(currentMetersIn);
    const metersOut = Number(currentMetersOut);
    // Don't set prevIn/prevOut values - let the API calculate them from machine history
    // Setting them to 0 or any hardcoded value causes meter mismatches

    // Call the validation and add logic directly here to avoid circular dependency
    const validation = validateMachineEntry(
      selectedMachineId,
      machineForDataEntry,
      currentMetersIn,
      currentMetersOut,
      userId,
      currentRamClear,
      0, // Use 0 for validation - API will calculate correct values
      0, // Use 0 for validation - API will calculate correct values
      currentRamClearMetersIn ? Number(currentRamClearMetersIn) : undefined,
      currentRamClearMetersOut ? Number(currentRamClearMetersOut) : undefined,
      false // Not in edit mode for this function
    );

    if (!validation.isValid) {
      toast.error(validation.error || "Validation failed", {
        position: "top-left",
      });
      return;
    }

    // Show warnings if any
    if (validation.warnings && validation.warnings.length > 0) {
      validation.warnings.forEach((warning) => {
        toast.warning(warning, { duration: 4000, position: "top-left" });
      });
    }

    setIsProcessing(true);

    try {
      const sasEndTime =
        currentCollectionTime && !isNaN(currentCollectionTime.getTime())
          ? currentCollectionTime
          : new Date();

      console.warn("🔄 Collection creation:", {
        machineId: selectedMachineId,
        collectionTime: sasEndTime.toISOString(),
        hasCustomSasStart: !!customSasStartTime,
        customSasStart: customSasStartTime?.toISOString(),
      });

      const collectionPayload = {
        machineId: selectedMachineId || "",
        machineName: machineForDataEntry?.name || "",
        machineCustomName: selectedMachineId || "",
        serialNumber: machineForDataEntry?.serialNumber || "",
        timestamp: currentCollectionTime
          ? new Date(currentCollectionTime)
          : new Date(),
        metersIn,
        metersOut,
        // Don't include prevIn/prevOut - let API calculate from machine history
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
        locationReportId: "",
        ...(customSasStartTime && {
          sasMeters: {
            sasStartTime: customSasStartTime.toISOString(),
          },
        }),
      };

      const createdCollection = await addMachineCollection(collectionPayload as CollectionDocument);

      setCollectedMachineEntries((prev) => {
        const updated = [...prev, createdCollection];

        if (prev.length === 0 && selectedLocationId) {
          setLockedLocationId(selectedLocationId);
        }

        return updated;
      });

      // Reset form fields
      resetMachineSpecificInputFields();
      setSelectedMachineId(undefined);

      toast.success("Machine added to collection list!", {
        position: "top-left",
      });

      // Log the activity
      if (selectedLocationName) {
        await logActivity(
          "create",
          "collection",
          createdCollection._id,
          `${
            machineForDataEntry?.name || selectedMachineId
          } at ${selectedLocationName}`,
          `Added machine ${
            machineForDataEntry?.name || selectedMachineId
          } to collection list`,
          null, // No previous data for creation
          createdCollection // New data
        );
      }
    } catch (error: unknown) {
      console.error("Error adding machine:", error);
      
      // Handle validation errors from backend
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const axiosError = error as any;
      if (axiosError.response?.status === 400 && axiosError.response?.data?.error === "Invalid previous meter values") {
        const errorData = axiosError.response.data;
        toast.error(
          `Validation Error: ${errorData.details}\n\nExpected: PrevIn=${errorData.expectedPrevIn}, PrevOut=${errorData.expectedPrevOut}\nReceived: PrevIn=${errorData.actualPrevIn}, PrevOut=${errorData.actualPrevOut}\n\nPlease refresh the page and try again.`,
          { 
            position: "top-left",
            duration: 10000 // Show longer for validation errors
          }
        );
      } else {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to add machine:", error);
        }
        toast.error(
          "Failed to add machine. Please check the console for details.",
          { position: "top-left" }
        );
      }
    } finally {
      setIsProcessing(false);
    }
  }, [
    isProcessing,
    selectedMachineId,
    selectedLocationId,
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
    customSasStartTime,
    resetMachineSpecificInputFields,
    getCollectorName,
    logActivity,
  ]);

  // Main handler that checks for rollover conditions and calls the actual addition logic
  const handleAddEntry = useCallback(async () => {
    console.warn("🔄 handleAddEntry called, isProcessing:", isProcessing);
    console.warn("🔄 handleAddEntry - inputsEnabled:", inputsEnabled);
    console.warn(
      "🔄 handleAddEntry - machineForDataEntry:",
      machineForDataEntry
    );
    if (isProcessing) return; // Prevent multiple submissions

    // Check for rollover conditions first
    const metersIn = Number(currentMetersIn);
    const prevIn = Number(machineForDataEntry?.collectionMeters?.metersIn) || 0;

    // Check for rollover/ramclear conditions on this individual machine
    if (checkForMachineRolloverConditions(metersIn, prevIn)) {
      setPendingMachineSubmission(() => () => addMachineToCollection());
      setShowMachineRolloverWarning(true);
      return;
    }

    // No rollover conditions, proceed directly
    await addMachineToCollection();
  }, [
    isProcessing,
    currentMetersIn,
    machineForDataEntry,
    checkForMachineRolloverConditions,
    addMachineToCollection,
    inputsEnabled,
  ]);

  const handleDeleteCollectedEntry = useCallback(
    (_id: string) => {
      if (isProcessing) return; // Prevent deletion during processing

      setEntryToDelete(_id);
      setShowDeleteConfirmation(true);
    },
    [isProcessing]
  );

  const handleEditCollectedEntry = useCallback(
    async (entryId: string) => {
      if (isProcessing) return;

      const entryToEdit = collectedMachineEntries.find(
        (e) => e._id === entryId
      );
      if (entryToEdit) {
        // Set editing state
        setEditingEntryId(entryId);

        // Set the selected machine ID
        setSelectedMachineId(entryToEdit.machineId);

        // Populate form fields with existing data
        setCurrentMetersIn(entryToEdit.metersIn.toString());
        setCurrentMetersOut(entryToEdit.metersOut.toString());
        setCurrentMachineNotes(entryToEdit.notes || "");
        setCurrentRamClear(entryToEdit.ramClear || false);
        setCurrentRamClearMetersIn(
          entryToEdit.ramClearMetersIn?.toString() || ""
        );
        setCurrentRamClearMetersOut(
          entryToEdit.ramClearMetersOut?.toString() || ""
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
          { position: "top-left" }
        );
      }
    },
    [isProcessing, collectedMachineEntries]
  );

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
    // Keep existing collectionTime - don't reset it

    // Reset prev values
    setPrevIn(null);
    setPrevOut(null);

    toast.info("Edit cancelled", { position: "top-left" });
  }, []);

  const handleAddOrUpdateEntry = useCallback(async () => {
    if (isProcessing) return;

    // If updating an existing entry, show confirmation dialog
    if (editingEntryId) {
      setShowUpdateConfirmation(true);
      return;
    }

    // If adding a new entry, proceed directly
    if (machineForDataEntry) {
      handleAddEntry();
    }
  }, [isProcessing, editingEntryId, machineForDataEntry, handleAddEntry]);

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
      toast.error(validation.error || "Validation failed", {
        position: "top-left",
      });
      return;
    }

    setIsProcessing(true);

    try {
      if (editingEntryId) {
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
        });

        // Update local state
        setCollectedMachineEntries((prev) =>
          prev.map((entry) =>
            entry._id === editingEntryId ? { ...entry, ...result } : entry
          )
        );

        // Clear editing state and machine selection first to disable inputs
        setEditingEntryId(null);
        setSelectedMachineId("");

        // Then clear all form fields
        setCurrentMetersIn("");
        setCurrentMetersOut("");
        setCurrentMachineNotes("");
        setCurrentRamClear(false);
        setCurrentRamClearMetersIn("");
        setCurrentRamClearMetersOut("");
        setPrevIn(null);
        setPrevOut(null);

        toast.success("Machine updated!", { position: "top-left" });
      } else {
        // Add new collection (existing logic)
        await handleAddEntry();
      }
    } catch {
      toast.error("Failed to update machine. Please try again.", {
        position: "top-left",
      });
    } finally {
      setIsProcessing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isProcessing,
    selectedMachineId,
    machineForDataEntry,
    currentMetersIn,
    currentMetersOut,
    currentMachineNotes,
    currentRamClear,
    currentRamClearMetersIn,
    currentRamClearMetersOut,
    currentCollectionTime,
    editingEntryId,
    prevIn,
    prevOut,
    userId,
    customSasStartTime,
    handleAddEntry,
  ]);

  const confirmUpdateEntry = useCallback(() => {
    setShowUpdateConfirmation(false);
    confirmAddOrUpdateEntry();
  }, [confirmAddOrUpdateEntry]);

  const confirmDeleteEntry = useCallback(async () => {
    if (!entryToDelete || !userId) {
      toast.error("User not found.", { position: "top-left" });
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
        await logActivity(
          "delete",
          "collection",
          entryToDelete,
          `${entryData.machineCustomName} at ${selectedLocationName}`,
          `Deleted collection entry for machine: ${entryData.machineCustomName} at ${selectedLocationName}`,
          entryData, // Previous data (the deleted entry)
          null // No new data for deletion
        );
      }

      // Update the machine's collection history (remove the entry)
      if (entryData) {
        try {
          console.warn("🔄 Deleting from machine collection history:", {
            machineId: entryData.machineId,
            entryId: entryToDelete,
            prevIn: entryData.prevIn,
            prevOut: entryData.prevOut,
            metersIn: entryData.metersIn,
            metersOut: entryData.metersOut,
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
            "✅ Machine collection history entry deleted successfully"
          );
        } catch (historyError) {
          console.error(
            "❌ Failed to delete from machine collection history:",
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

      toast.success("Machine deleted!", { position: "top-left" });

      // Remove the collection from local state
      setCollectedMachineEntries((prev) => {
        const newEntries = prev.filter((entry) => entry._id !== entryToDelete);
        // Unlock location if no machines remain
        if (newEntries.length === 0) {
          setLockedLocationId(undefined);
          setMachineSearchTerm("");
        }
        return newEntries;
      });

      setHasChanges(true);

      // Refresh parent data to get updated machine meter values
      if (onRefresh) {
        console.warn(
          "🔄 Triggering parent refresh to get updated machine data after deletion"
        );
        onRefresh();
      }

      // Keep the machine selected and form populated so user can continue working

      // Close confirmation dialog
      setShowDeleteConfirmation(false);
      setEntryToDelete(null);
    } catch {
      toast.error("Failed to delete machine", { position: "top-left" });
    } finally {
      setIsProcessing(false);
    }
  }, [
    entryToDelete,
    userId,
    collectedMachineEntries,
    selectedLocationName,
    onRefresh,
    logActivity,
  ]);

  const handleCreateMultipleReportsInternal = useCallback(async () => {
    setIsProcessing(true);

    // Log form data for debugging
    console.warn("📋 Creating collection report with data:", {
      collectedMachineEntries: collectedMachineEntries.map((entry) => ({
        machineId: entry.machineId,
        machineName: entry.machineName,
        serialNumber: entry.serialNumber,
        machineCustomName: entry.machineCustomName,
        timestamp: entry.timestamp,
        timestampISO:
          entry.timestamp instanceof Date
            ? entry.timestamp.toISOString()
            : new Date(entry.timestamp).toISOString(),
        metersIn: entry.metersIn,
        metersOut: entry.metersOut,
        notes: entry.notes,
        ramClear: entry.ramClear,
      })),
      currentCollectionTime: currentCollectionTime,
      currentCollectionTimeISO: currentCollectionTime?.toISOString(),
      selectedLocationId,
      selectedLocationName,
      financials,
    });

    // Generate a single locationReportId for all collections in this report
    const reportId = uuidv4();

    try {
      toast.loading("Updating collections and creating report...", {
        id: "create-reports-toast",
      });

      // Step 1: Update all existing collections with the report ID and mark as completed
      await updateCollectionsWithReportId(collectedMachineEntries, reportId);

      // Step 2: Create a single collection report with all the financial data
      // Use the global collection time as the report timestamp
      const reportTimestamp = currentCollectionTime;

      console.warn("⏰ Collection time for report:", {
        reportTimestamp: reportTimestamp.toISOString(),
        currentCollectionTime: currentCollectionTime.toISOString(),
        reportTimestampType: typeof reportTimestamp,
        currentCollectionTimeType: typeof currentCollectionTime,
        allEntryTimes: collectedMachineEntries.map((entry) => ({
          entryId: entry._id,
          timestamp:
            entry.timestamp instanceof Date
              ? entry.timestamp.toISOString()
              : new Date(entry.timestamp).toISOString(),
        })),
      });

      const payload: CreateCollectionReportPayload = {
        variance:
          financials.variance && financials.variance.trim() !== ""
            ? Number(financials.variance)
            : 0,
        previousBalance:
          financials.previousBalance && financials.previousBalance.trim() !== ""
            ? Number(financials.previousBalance)
            : 0,
        currentBalance: 0,
        amountToCollect: Number(financials.amountToCollect) || 0,
        amountCollected:
          financials.collectedAmount && financials.collectedAmount.trim() !== ""
            ? Number(financials.collectedAmount)
            : 0,
        amountUncollected: 0,
        partnerProfit: 0,
        taxes:
          financials.taxes && financials.taxes.trim() !== ""
            ? Number(financials.taxes)
            : 0,
        advance:
          financials.advance && financials.advance.trim() !== ""
            ? Number(financials.advance)
            : 0,
        collectorName: getCollectorName(),
        locationName: selectedLocationName,
        locationReportId: reportId,
        location: selectedLocationId || "",
        totalDrop: 0,
        totalCancelled: 0,
        totalGross: 0,
        totalSasGross: 0,
        timestamp: reportTimestamp.toISOString(),
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
        `Successfully created collection report with ${collectedMachineEntries.length} machine(s)!`,
        { position: "top-left" }
      );

      // Reset the form and close modal
      setHasChanges(true);
      handleClose();
      if (onRefresh) {
        onRefresh();
      }
    } catch (error: unknown) {
      toast.dismiss("create-reports-toast");
      console.error("❌ Failed to create collection report:", error);
      
      // Handle specific API response errors
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const axiosError = error as any;
      if (axiosError.response?.data) {
        const errorData = axiosError.response.data;
        
        if (errorData.error === "A collection report already exists for this location on this gaming day") {
          // Handle duplicate report error with specific action
          toast.error(
            `${errorData.error}\n\nDetails: ${errorData.details}\n\nExisting Report: ${errorData.existingReportId}\nDate: ${errorData.existingReportDate}\n\nPlease delete the existing report first to create a new one.`,
            { 
              position: "top-left",
              duration: 15000 // Show longer for important errors
            }
          );
        } else if (errorData.error) {
          // Handle other API errors
          toast.error(
            `${errorData.error}${errorData.details ? `\n\nDetails: ${errorData.details}` : ''}`,
            { 
              position: "top-left",
              duration: 10000
            }
          );
        } else {
          // Fallback for other response errors
          toast.error(
            `Failed to create collection report: ${axiosError.response?.statusText || 'Server error'}`,
            { position: "top-left" }
          );
        }
      } else {
        // Handle network or other errors
        toast.error(
          `Failed to create collection report: ${
            error instanceof Error ? error.message : "Network error"
          }`,
          { position: "top-left" }
        );
      }
    }

    setIsProcessing(false);
  }, [
    collectedMachineEntries,
    currentCollectionTime,
    financials,
    getCollectorName,
    selectedLocationName,
    selectedLocationId,
    handleClose,
    onRefresh,
  ]);

  const handleCreateMultipleReports = useCallback(async () => {
    if (isProcessing) return; // Prevent multiple submissions

    if (!userId) {
      toast.error("User not found.", { position: "top-left" });
      return;
    }
    if (collectedMachineEntries.length === 0) {
      toast.error("No machines added to the list.", { position: "top-left" });
      return;
    }
    if (!selectedLocationId || !selectedLocationName) {
      toast.error("Location not properly selected.", { position: "top-left" });
      return;
    }

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

    // Check that amount to collect has a value (auto-calculated, always required)
    const amountToCollectHasValue =
      financials.amountToCollect !== undefined &&
      financials.amountToCollect !== null &&
      financials.amountToCollect.toString().trim() !== "" &&
      Number(financials.amountToCollect) !== 0;

    // Check that balance correction has a value (user input, always required)
    const balanceCorrectionHasValue =
      financials.balanceCorrection !== undefined &&
      financials.balanceCorrection !== null &&
      financials.balanceCorrection.toString().trim() !== "";

    return amountToCollectHasValue && balanceCorrectionHasValue;
  }, [collectedMachineEntries, financials]);

  if (!show) {
    return null;
  }

  // Show skeleton loader while modal is loading
  if (isModalLoading) {
    return <NewCollectionModalSkeleton />;
  }
  // Use mobile modal for mobile devices, desktop modal for larger screens
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
          className="max-w-6xl lg:max-w-7xl h-[calc(100vh-2rem)] md:h-[95vh] lg:h-[90vh] p-0 flex flex-col bg-container"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="p-4 md:p-6 pb-0">
            <DialogTitle className="text-xl md:text-2xl font-bold">
              New Collection Report Batch
            </DialogTitle>
            <DialogDescription>
              Create a new collection report for the selected location and
              machines.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-grow flex flex-col lg:flex-row overflow-y-auto min-h-0">
            {/* Mobile: Full width, Desktop: 1/5 width */}
            <div className="w-full lg:w-1/5 border-b lg:border-b-0 lg:border-r border-gray-300 p-3 md:p-4 flex flex-col space-y-3 overflow-y-auto">
              <div className={
                isProcessing ||
                lockedLocationId !== undefined ||
                collectedMachineEntries.length > 0
                  ? "opacity-50 pointer-events-none"
                  : ""
              }>
                <LocationSingleSelect
                  locations={locations.map((loc) => ({
                    id: String(loc._id),
                    name: loc.name,
                    sasEnabled: false,
                  }))}
                  selectedLocation={lockedLocationId || selectedLocationId || ""}
                  onSelectionChange={handleLocationChange}
                  placeholder="Select Location"
                  includeAllOption={false}
                />
              </div>

              {lockedLocationId && (
                <p className="text-xs text-gray-500 italic">
                  Location is locked to the first machine&apos;s location
                </p>
              )}

              {/* Machine search bar - always visible when location is selected */}
              {(selectedLocationId || lockedLocationId) && (
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Search machines..."
                    value={machineSearchTerm}
                    onChange={(e) => setMachineSearchTerm(e.target.value)}
                    className="w-full"
                  />
                  {machineSearchTerm && (
                    <p className="text-xs text-gray-500">
                      Showing {filteredMachines.length} of{" "}
                      {machinesOfSelectedLocation.length} machines
                    </p>
                  )}
                </div>
              )}

              <div className="flex-grow space-y-2 min-h-[100px] overflow-y-auto">
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

                    return filteredMachines.length > 0 ? (
                      filteredMachines.map((machine, index) => (
                        <Button
                          key={
                            machine._id
                              ? String(machine._id)
                              : `machine-${index}-${
                                  machine.serialNumber || "unknown"
                                }`
                          }
                          variant={
                            selectedMachineId === machine._id
                              ? "secondary"
                              : collectedMachineEntries.find(
                                  (e) => e.machineId === machine._id
                                )
                              ? "default"
                              : "outline"
                          }
                          className="w-full justify-start text-left h-auto py-2 px-3 whitespace-normal break-words"
                          onClick={() => {
                            if (
                              collectedMachineEntries.find(
                                (e) => e.machineId === machine._id
                              ) &&
                              true
                            ) {
                              toast.info(
                                `${machine.name} is already in the list. Click edit on the right to modify.`,
                                { position: "top-left" }
                              );
                              return;
                            }

                            // If machine is already selected, unselect it
                            if (selectedMachineId === String(machine._id)) {
                              console.warn("🔍 Machine unselected:", {
                                machineId: String(machine._id),
                                machineName: machine.name,
                              });
                              setSelectedMachineId("");
                              return;
                            }

                            console.warn("🔍 Machine selected:", {
                              machineId: String(machine._id),
                              machineName: machine.name,
                              serialNumber: machine.serialNumber,
                              collectionMeters: machine.collectionMeters,
                            });
                            setSelectedMachineId(String(machine._id));
                          }}
                          disabled={
                            isProcessing ||
                            (editingEntryId !== null &&
                              collectedMachineEntries.find(
                                (e) => e._id === editingEntryId
                              )?.machineId !== machine._id) ||
                            (collectedMachineEntries.find(
                              (e) => e.machineId === machine._id
                            ) &&
                              !editingEntryId)
                          }
                        >
                          {formatMachineDisplayNameWithBold(machine)}
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
                        {machineSearchTerm && lockedLocationId
                          ? `No machines found matching "${machineSearchTerm}".`
                          : "No machines for this location."}
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

            {/* Mobile: Full width, Desktop: 3/5 width (60%) */}
            <div className="w-full lg:w-3/5 p-3 md:p-4 flex flex-col space-y-3 overflow-y-auto">
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
                    className="w-full bg-lighterBlueHighlight text-primary-foreground flex items-center justify-between"
                  >
                    <span>
                      {machineForDataEntry
                        ? formatMachineDisplayNameWithBold(machineForDataEntry)
                        : "Select a machine to edit"}
                    </span>
                    {machineForDataEntry && (
                      <ExternalLink
                        className="h-4 w-4 ml-2 hover:scale-110 transition-transform cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowViewMachineConfirmation(true);
                        }}
                      />
                    )}
                  </Button>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-grayHighlight mb-2">
                      Collection Time:
                    </label>
                    <PCDateTimePicker
                      date={currentCollectionTime}
                      setDate={(date) => {
                        if (
                          date &&
                          date instanceof Date &&
                          !isNaN(date.getTime())
                        ) {
                          console.warn("🕐 Collection time changed:", {
                            newDate: date.toISOString(),
                            newDateLocal: date.toLocaleString(),
                            timestamp: date.getTime(),
                            previousTime: currentCollectionTime.toISOString(),
                          });
                          setCurrentCollectionTime(date);
                        }
                      }}
                      disabled={isProcessing}
                      placeholder="Select collection time"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This time applies to the current machine being
                      added/edited
                    </p>
                  </div>

                  {/* Advanced SAS Start override */}
                  <div className="mb-2">
                    <button
                      type="button"
                      className="text-xs text-button underline"
                      onClick={() => setShowAdvancedSas((p) => !p)}
                    >
                      {showAdvancedSas
                        ? "Hide Advanced"
                        : "Advanced: Custom previous SAS start"}
                    </button>
                  </div>
                  {showAdvancedSas && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-grayHighlight mb-2">
                        Previous SAS Start (optional):
                      </label>
                      <PCDateTimePicker
                        date={customSasStartTime || undefined}
                        setDate={(date) => {
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
                      <p className="text-xs text-gray-500 mt-1">
                        Leave empty to auto-use last collection time or 24h
                        before.
                      </p>
                    </div>
                  )}

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
                          disabled={!inputsEnabled || isProcessing}
                        />
                      </div>
                      <p className="text-xs text-grayHighlight mt-1">
                        Prev In: {prevIn !== null ? prevIn : "N/A"}
                      </p>
                      {/* Regular Meters In Validation */}
                      {currentMetersIn &&
                        prevIn &&
                        Number(currentMetersIn) < Number(prevIn) && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-red-600 text-xs">
                              Warning: Meters In ({currentMetersIn}) should be
                              higher than or equal to Previous Meters In (
                              {prevIn})
                            </p>
                          </div>
                        )}
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
                          disabled={!inputsEnabled || isProcessing}
                        />
                      </div>
                      <p className="text-xs text-grayHighlight mt-1">
                        Prev Out: {prevOut !== null ? prevOut : "N/A"}
                      </p>
                      {/* Regular Meters Out Validation */}
                      {currentMetersOut &&
                        prevOut &&
                        Number(currentMetersOut) < Number(prevOut) && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-red-600 text-xs">
                              Warning: Meters Out ({currentMetersOut}) should be
                              higher than or equal to Previous Meters Out (
                              {prevOut})
                            </p>
                          </div>
                        )}
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
                            disabled={!inputsEnabled || isProcessing}
                            className={`border-blue-300 focus:border-blue-500 ${
                              currentRamClearMetersIn &&
                              prevIn &&
                              Number(currentRamClearMetersIn) > Number(prevIn)
                                ? "border-red-500 focus:border-red-500"
                                : ""
                            }`}
                          />
                          {/* RAM Clear Meters In Validation */}
                          {currentRamClearMetersIn &&
                            prevIn &&
                            Number(currentRamClearMetersIn) >
                              Number(prevIn) && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                                <p className="text-red-600 text-xs">
                                  Warning: RAM Clear Meters In (
                                  {currentRamClearMetersIn}) should be lower
                                  than or equal to Previous Meters In ({prevIn})
                                </p>
                              </div>
                            )}
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
                            disabled={!inputsEnabled || isProcessing}
                            className={`border-blue-300 focus:border-blue-500 ${
                              currentRamClearMetersOut &&
                              prevOut &&
                              Number(currentRamClearMetersOut) > Number(prevOut)
                                ? "border-red-500 focus:border-red-500"
                                : ""
                            }`}
                          />
                          {/* RAM Clear Meters Out Validation */}
                          {currentRamClearMetersOut &&
                            prevOut &&
                            Number(currentRamClearMetersOut) >
                              Number(prevOut) && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                                <p className="text-red-600 text-xs">
                                  Warning: RAM Clear Meters Out (
                                  {currentRamClearMetersOut}) should be lower
                                  than or equal to Previous Meters Out (
                                  {prevOut})
                                </p>
                              </div>
                            )}
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
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      disabled={!inputsEnabled || isProcessing}
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
                        disabled={!inputsEnabled || isProcessing}
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
                          onClick={() => {
                            if (editingEntryId || machineForDataEntry) {
                              handleAddOrUpdateEntry();
                            } else {
                              handleDisabledFieldClick();
                            }
                          }}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                          disabled={
                            (!inputsEnabled && !editingEntryId) || isProcessing
                          }
                        >
                          {isProcessing
                            ? "Processing..."
                            : "Update Entry in List"}
                        </Button>
                      </>
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={() => {
                                if (machineForDataEntry) {
                                  handleAddEntry();
                                } else {
                                  handleDisabledFieldClick();
                                }
                              }}
                              className={`w-full text-white ${
                                isAddMachineEnabled
                                  ? "bg-blue-600 hover:bg-blue-700"
                                  : "bg-gray-400 cursor-not-allowed"
                              }`}
                              disabled={
                                !inputsEnabled ||
                                isProcessing ||
                                !isAddMachineEnabled
                              }
                            >
                              {isProcessing
                                ? "Processing..."
                                : "Add Machine to List"}
                            </Button>
                          </TooltipTrigger>
                          {!isAddMachineEnabled && (
                            <TooltipContent>
                              <p>
                                {!machineForDataEntry
                                  ? "Please select a machine"
                                  : !currentMetersIn || !currentMetersOut
                                  ? "Please enter meters in and out"
                                  : currentRamClear &&
                                    (!currentRamClearMetersIn ||
                                      !currentRamClearMetersOut)
                                  ? "Please enter RAM Clear meters when RAM Clear is checked"
                                  : "Please fill required fields"}
                              </p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>

                  <hr className="my-4 border-gray-300" />
                  <p className="text-lg font-semibold text-center text-gray-700">
                    Shared Financials for Batch
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Taxes:
                      </label>
                      <Input
                        type="text"
                        placeholder="0"
                        value={financials.taxes}
                        onChange={(e) =>
                          (/^-?\d*\.?\d*$/.test(e.target.value) ||
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Advance:
                      </label>
                      <Input
                        type="text"
                        placeholder="0"
                        value={financials.advance}
                        onChange={(e) =>
                          (/^-?\d*\.?\d*$/.test(e.target.value) ||
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Variance:
                      </label>
                      <Input
                        type="text"
                        placeholder="0"
                        value={financials.variance}
                        onChange={(e) =>
                          (/^-?\d*\.?\d*$/.test(e.target.value) ||
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount To Collect:{" "}
                        <span className="text-red-500">*</span>{" "}
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Collected Amount:
                      </label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Input
                                type="text"
                                placeholder="0"
                                value={financials.collectedAmount}
                                onChange={(e) => {
                                  if (
                                    /^-?\d*\.?\d*$/.test(e.target.value) ||
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

                                      // Only calculate previous balance if collected amount is 0 or more
                                      let previousBalance =
                                        financials.previousBalance; // Keep existing value
                                      if (
                                        e.target.value !== "" &&
                                        amountCollected >= 0
                                      ) {
                                        // Calculate previous balance: collectedAmount - amountToCollect
                                        previousBalance = (
                                          amountCollected - amountToCollect
                                        ).toString();
                                      }

                                      // Final correction = base entered first + collected amount
                                      const finalCorrection =
                                        (Number(baseBalanceCorrection) || 0) +
                                        amountCollected;

                                      setFinancials((prev) => ({
                                        ...prev,
                                        previousBalance: previousBalance,
                                        balanceCorrection:
                                          e.target.value === ""
                                            ? baseBalanceCorrection || "0"
                                            : finalCorrection.toString(),
                                      }));
                                    }, 0);
                                  }
                                }}
                                disabled={
                                  isProcessing ||
                                  (baseBalanceCorrection.trim() === "" &&
                                    financials.balanceCorrection.trim() === "")
                                }
                              />
                            </div>
                          </TooltipTrigger>
                          {isProcessing ||
                          (baseBalanceCorrection.trim() === "" &&
                            financials.balanceCorrection.trim() === "") ? (
                            <TooltipContent>
                              <p>
                                {isProcessing
                                  ? "Please wait until processing completes."
                                  : "Enter a Balance Correction first, then the Collected Amount will unlock."}
                              </p>
                            </TooltipContent>
                          ) : null}
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Balance Correction:{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Input
                                type="text"
                                placeholder="0"
                                value={financials.balanceCorrection}
                                onChange={(e) => {
                                  if (
                                    /^-?\d*\.?\d*$/.test(e.target.value) ||
                                    e.target.value === ""
                                  ) {
                                    const newBalanceCorrection = e.target.value;

                                    setFinancials((prev) => ({
                                      ...prev,
                                      balanceCorrection: newBalanceCorrection,
                                    }));
                                    setBaseBalanceCorrection(
                                      newBalanceCorrection
                                    );
                                  }
                                }}
                                className="bg-white border-gray-300 focus:border-primary"
                                title="Balance correction amount (editable)"
                                disabled={
                                  isProcessing ||
                                  financials.collectedAmount.trim() !== ""
                                }
                              />
                            </div>
                          </TooltipTrigger>
                          {isProcessing ||
                          financials.collectedAmount.trim() !== "" ? (
                            <TooltipContent>
                              <p>
                                {isProcessing
                                  ? "Please wait until processing completes."
                                  : "Clear the Collected Amount to edit the Balance Correction."}
                              </p>
                            </TooltipContent>
                          ) : null}
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
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
            <div className="w-full lg:w-1/5 border-t lg:border-t-0 lg:border-l border-gray-300 flex flex-col bg-gray-50 min-h-0">
              <div className="sticky top-0 bg-gray-50 z-10 p-3 md:p-4 pb-2 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-700">
                  Collected Machines ({collectedMachineEntries.length})
                </h3>
                {/* Search bar for collected machines if more than 6 */}
                {collectedMachineEntries.length > 6 && (
                  <div className="mt-2">
                    <input
                      type="text"
                      placeholder="Search collected machines..."
                      value={collectedMachinesSearchTerm}
                      onChange={(e) =>
                        setCollectedMachinesSearchTerm(e.target.value)
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-3 md:p-4 pt-2 space-y-2">
                {isLoadingCollections || isLoadingExistingCollections ? (
                  <>
                    <div className="text-center py-4">
                      <p className="text-blue-600 font-medium">
                        Checking if any collection reports is in progress first
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Please wait while we check for incomplete collections
                      </p>
                    </div>
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
                  </>
                ) : collectedMachineEntries.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-10">
                    No machines added to the list yet.
                  </p>
                ) : (
                  [...collectedMachineEntries]
                    .filter((entry) => {
                      if (!collectedMachinesSearchTerm) return true;
                      const searchLower =
                        collectedMachinesSearchTerm.toLowerCase();
                      return (
                        (entry.serialNumber &&
                          entry.serialNumber
                            .toLowerCase()
                            .includes(searchLower)) ||
                        (entry.machineCustomName &&
                          entry.machineCustomName
                            .toLowerCase()
                            .includes(searchLower)) ||
                        (entry.machineId &&
                          entry.machineId
                            .toLowerCase()
                            .includes(searchLower)) ||
                        (entry.machineName &&
                          entry.machineName
                            .toLowerCase()
                            .includes(searchLower)) ||
                        (entry.game &&
                          entry.game.toLowerCase().includes(searchLower))
                      );
                    })
                    .sort((a, b) => {
                      // Sort by timestamp in descending order (most recent first)
                      const timestampA =
                        a.timestamp instanceof Date
                          ? a.timestamp
                          : new Date(a.timestamp);
                      const timestampB =
                        b.timestamp instanceof Date
                          ? b.timestamp
                          : new Date(b.timestamp);
                      return timestampB.getTime() - timestampA.getTime();
                    })
                    .map((entry, index) => (
                      <div
                        key={
                          entry._id
                            ? String(entry._id)
                            : `entry-${index}-${
                                entry.machineCustomName ||
                                entry.machineId ||
                                "unknown"
                              }`
                        }
                        className="bg-white p-3 rounded-md shadow border border-gray-200 space-y-1 relative"
                      >
                        <p className="font-semibold text-sm text-primary break-words">
                          {getMachineDisplayName({
                            serialNumber: entry.serialNumber,
                            machineCustomName: entry.machineCustomName,
                            machineId: entry.machineId,
                          })}
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
                            onClick={() =>
                              handleDeleteCollectedEntry(entry._id)
                            }
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
          </div>

          <DialogFooter className="p-4 md:p-6 pt-2 md:pt-4 flex justify-center border-t border-gray-300">
            <Button
              onClick={() => {
                console.warn("🚀 Create Report button clicked:", {
                  isCreateReportsEnabled,
                  isProcessing,
                  collectedMachineEntriesCount: collectedMachineEntries.length,
                  currentCollectionTime: currentCollectionTime,
                });
                if (!isCreateReportsEnabled || isProcessing) return;
                // Show confirmation dialog
                setShowCreateReportConfirmation(true);
              }}
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

      {/* Machine Rollover/Ramclear Warning Modal */}
      <Dialog
        open={showMachineRolloverWarning}
        onOpenChange={setShowMachineRolloverWarning}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-red-600">
              ⚠️ Rollover/Ramclear Warning
            </DialogTitle>
            <DialogDescription>
              This machine has detected a rollover or ramclear event. Proceed
              with caution.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700 mb-4">
              This machine has <strong>metersIn</strong> value less than its{" "}
              <strong>previous metersIn</strong> value.
            </p>
            <p className="text-gray-700 mb-4">
              This typically indicates a <strong>rollover</strong> or{" "}
              <strong>ramclear</strong> situation.
            </p>
            <p className="text-gray-700 font-medium">
              Are you sure you want to add this machine with rollover/ramclear?
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancelMachineRollover}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmMachineRollover}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              Yes, Add Machine
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
      <InfoConfirmationDialog
        isOpen={showCreateReportConfirmation}
        onClose={() => setShowCreateReportConfirmation(false)}
        onConfirm={confirmCreateReports}
        title="Confirm Collection Report"
        message={`You are about to create a collection report for ${
          collectedMachineEntries.length
        } machine(s) with collection time: ${
          currentCollectionTime ? formatDate(currentCollectionTime) : "Not set"
        }. Do you want to proceed?`}
        confirmText="Yes, Create Report"
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
            window.open(machineUrl, "_blank");
          }
          setShowViewMachineConfirmation(false);
        }}
        title="View Machine"
        message="Do you want to open this machine's details in a new tab?"
        confirmText="Yes, View Machine"
        cancelText="Cancel"
        isLoading={false}
      />
    </>
  );
}
