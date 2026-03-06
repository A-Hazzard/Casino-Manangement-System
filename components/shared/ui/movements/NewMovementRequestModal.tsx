import { Button } from '@/components/shared/ui/button';
import Chip from '@/components/shared/ui/common/Chip';
import MultiSelectDropdown from '@/components/shared/ui/common/MultiSelectDropdown';
import SearchableSelect from '@/components/shared/ui/common/SearchableSelect';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { Textarea } from '@/components/shared/ui/textarea';
import { fetchCabinetsForLocation } from '@/lib/helpers/cabinets';
import { fetchAllGamingLocations } from '@/lib/helpers/locations';
import { createMovementRequest } from '@/lib/helpers/movementRequests';
import { useUserStore } from '@/lib/store/userStore';
import type { NewMovementModalProps } from '@/lib/types/components';
import type { MovementRequest } from '@/lib/types/movement';
import type { MachineMovementRecord } from '@/lib/types/reports';
import { generateMongoId } from '@/lib/utils/id';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';

// === Disabled field hint banner ===
function DisabledHint({ message }: { message: string }) {
  return (
    <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
      <span>⚠</span> {message}
    </p>
  );
}

const NewMovementRequestModal: React.FC<NewMovementModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onRefresh,
  locations: propLocations,
}) => {
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<{ _id: string; name: string; emailAddress: string; roles: string[]; assignedLocations: string[] }[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [movementType, setMovementType] = useState<'Machine' | 'SMIB'>('Machine');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loadingCabinets, setLoadingCabinets] = useState(false);
  const [selectedCabinets, setSelectedCabinets] = useState<Cabinet[]>([]);
  const [requestTo, setRequestTo] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const { user: currentUser } = useUserStore();
  const userRoles = currentUser?.roles?.map(r => r.toLowerCase()) || [];
  const isAdminOrDev = userRoles.some(role => ['admin', 'developer'].includes(role));

  // Use prop locations or fetch if not provided
  useEffect(() => {
    if (propLocations && propLocations.length > 0) {
      setLocations(propLocations.map(loc => ({ id: loc._id, name: loc.name })));
    } else {
      fetchAllGamingLocations().then(setLocations);
    }
  }, [propLocations]);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const response = await axios.get('/api/users');
        if (response.data.users) setUsers(response.data.users);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoadingUsers(false);
      }
    };
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  // Fetch cabinets for selected from location
  useEffect(() => {
    if (fromLocation) {
      setLoadingCabinets(true);
      fetchCabinetsForLocation(fromLocation, undefined, 'All')
        .then(result => {
          setCabinets(result.data);
          setSelectedCabinets([]);
        })
        .catch(error => {
          console.error('Failed to fetch cabinets for location:', error);
          setCabinets([]);
          setSelectedCabinets([]);
          setErrors(prev => ({ ...prev, fromLocation: 'Failed to load machines for this location' }));
        })
        .finally(() => setLoadingCabinets(false));
    } else {
      setCabinets([]);
      setSelectedCabinets([]);
    }
  }, [fromLocation]);

  const validate = () => {
    const errs: { [key: string]: string } = {};
    if (!movementType) errs.movementType = 'Movement type is required.';
    if (!fromLocation) errs.fromLocation = 'From location is required.';
    if (!selectedCabinets.length) errs.selectedCabinets = 'Select at least one ' + (movementType.toLowerCase()) + '.';
    if (!toLocation) errs.toLocation = 'Destination location is required.';
    if (toLocation && toLocation === fromLocation) errs.toLocation = 'Destination must be different from source.';
    if (!requestTo) errs.requestTo = 'Recipient user is required.';
    return errs;
  };

  const handleRemoveCabinet = (cabinetId: string) => {
    setSelectedCabinets(prev => prev.filter(cab => cab._id !== cabinetId));
  };

  const handleSubmit = async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSubmitting(true);
    try {
      const createdBy = currentUser?.emailAddress || 'unknown';
      const fromLocationName = locations.find(loc => loc.id === fromLocation)?.name || fromLocation;
      const toLocationName = locations.find(loc => loc.id === toLocation)?.name || toLocation;
      const movementRequestId = await generateMongoId();

      const payload: Partial<MovementRequest> = {
        _id: movementRequestId,
        variance: 0,
        previousBalance: 0,
        currentBalance: 0,
        amountToCollect: 0,
        amountCollected: 0,
        amountUncollected: 0,
        partnerProfit: 0,
        taxes: 0,
        advance: 0,
        locationName: fromLocationName,
        locationFrom: fromLocationName,
        locationTo: toLocationName,
        locationId: fromLocation,
        locationFromId: fromLocation,
        locationToId: toLocation,
        selectedMachines: selectedCabinets.map(cab => cab._id),
        requestTo,
        reason: notes,
        cabinetIn: selectedCabinets
          .map(cab => cab.serialNumber || cab.assetNumber || cab.relayId || cab._id)
          .join(','),
        status: 'pending',
        createdBy: currentUser?._id || 'unknown',
        movementType: movementType.toLowerCase(),
        installationType: 'move',
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const createdRequest = await createMovementRequest(payload as MovementRequest);

      if (onSubmit) {
        const machineMovementRecord: MachineMovementRecord = {
          _id: createdRequest._id,
          machineId: selectedCabinets[0]?._id || '',
          machineName: selectedCabinets[0]?.installedGame || selectedCabinets[0]?.game || 'Unknown Machine',
          fromLocationId: fromLocation,
          fromLocationName,
          toLocationId: toLocation,
          toLocationName,
          moveDate: new Date(),
          reason: notes,
          status: 'pending',
          movedBy: createdBy,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        onSubmit(machineMovementRecord);
      }

      if (onRefresh) onRefresh();
      onClose();
    } catch (error) {
      console.error('Movement request creation error:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to create movement request.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Derive location options for SearchableSelect
  const locationOptions = locations
    .filter(loc => {
      if (isAdminOrDev) return true;
      return currentUser?.assignedLocations?.includes(loc.id) || currentUser?.assignedLocations?.includes(loc.name);
    })
    .map(loc => ({ label: loc.name, value: loc.id }));
    
  const toLocationOptions = locationOptions.filter(loc => loc.value !== fromLocation);

  // Filter users based on role and location access
  const filteredUsers = users.filter(user => {
    if (!user.emailAddress || user.emailAddress.trim() === '') return false;
    if (!toLocation) return false;
    
    const roleLower = user.roles?.map(r => r.toLowerCase()) || [];
    const hasRole = roleLower.includes('location admin') || roleLower.includes('technician');
    
    // Check if the user is assigned to the selected destination location
    // We compare with the destination location ID
    const hasLocation = user.assignedLocations?.includes(toLocation);
    
    return hasRole && hasLocation;
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="md:max-w-3xl md:max-h-[85vh] overflow-hidden bg-white p-0 flex flex-col items-center">
        <DialogHeader className="border-b border-gray-100 p-6 shrink-0 w-full">
          <DialogTitle className="text-2xl font-bold text-gray-800 text-center">
            New Movement Request
          </DialogTitle>
        </DialogHeader>

        <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-8 md:grid-cols-2 custom-scrollbar w-full">
          {/* Left Column */}
          <div className="flex flex-col gap-5">

            {/* Movement Type */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Please Select Movement Type <span className="text-red-500">*</span>
              </label>
              <Select
                value={movementType}
                onValueChange={(value: 'Machine' | 'SMIB') => setMovementType(value)}
              >
                <SelectTrigger className="h-11 w-full border-gray-300 shadow-sm focus:border-buttonActive focus:ring-buttonActive">
                  <SelectValue placeholder="Select movement type" />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  <SelectItem value="Machine">Machine</SelectItem>
                  <SelectItem value="SMIB">SMIB</SelectItem>
                </SelectContent>
              </Select>
              {errors.movementType && <div className="mt-1 text-xs font-medium text-red-500">{errors.movementType}</div>}
            </div>

            {/* From Location — searchable */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Please Select Location It Is Coming From <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={locationOptions}
                value={fromLocation}
                onChange={value => {
                  setFromLocation(value);
                  setToLocation('');
                  setSelectedCabinets([]);
                  setRequestTo('');
                }}
                placeholder="Select source location"
                searchPlaceholder="Search locations..."
                error={!!errors.fromLocation}
                className="h-11 shadow-sm"
              />
              {errors.fromLocation && <div className="mt-1 text-xs font-medium text-red-500">{errors.fromLocation}</div>}
            </div>

            {/* To Location — searchable, disabled until cabinets selected */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Please Select Location It Is Going To <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <SearchableSelect
                  options={toLocationOptions}
                  value={toLocation}
                  onChange={(val) => {
                    setToLocation(val);
                    setRequestTo('');
                  }}
                  placeholder="Select destination location"
                  searchPlaceholder="Search locations..."
                  error={!!errors.toLocation}
                  className={`h-11 shadow-sm ${!selectedCabinets.length ? 'pointer-events-none opacity-50' : ''}`}
                />
                {!selectedCabinets.length && (
                  <div
                    className="absolute inset-0 cursor-not-allowed z-10"
                    onClick={() =>
                      setErrors(prev => ({
                        ...prev,
                        toLocationHint: !fromLocation
                          ? 'Please select a source location first.'
                          : 'Please select at least one machine before choosing a destination.',
                      }))
                    }
                  />
                )}
              </div>
              {errors.toLocation && <div className="mt-1 text-xs font-medium text-red-500">{errors.toLocation}</div>}
              {!selectedCabinets.length && errors.toLocationHint && (
                <DisabledHint message={errors.toLocationHint} />
              )}
              {!selectedCabinets.length && !errors.toLocationHint && (
                <DisabledHint message={
                  !fromLocation
                    ? 'Select a source location first, then select machines.'
                    : 'Select at least one machine before choosing a destination.'
                } />
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Notes</label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="min-h-[120px] resize-none border-gray-300 shadow-sm placeholder-gray-400 focus:border-buttonActive focus:ring-buttonActive"
                placeholder="Please enter any additional notes or details about this request..."
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-5">

            {/* Request To — disabled until to-location selected */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Request To: <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Select
                  value={requestTo || undefined}
                  onValueChange={setRequestTo}
                  disabled={!toLocation || loadingUsers}
                >
                  <SelectTrigger className="h-11 w-full border-gray-300 shadow-sm focus:border-buttonActive focus:ring-buttonActive">
                    {loadingUsers ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading users...</span>
                      </div>
                    ) : (
                      <SelectValue placeholder={toLocation ? "Select user" : "Select destination location first"} />
                    )}
                  </SelectTrigger>
                  <SelectContent className="z-[9999] max-h-[300px]">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map(user => (
                        <SelectItem key={user._id} value={user._id}>
                          <div className="flex flex-col py-0.5">
                            <span className="font-semibold text-gray-900">{user.name || user.emailAddress}</span>
                            <span className="text-[11px] text-gray-500">{user.emailAddress}</span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="py-6 text-center text-sm text-gray-500 px-4">
                        {toLocation 
                          ? "No technicians or admins assigned to this location found." 
                          : "Please select a destination location above to see available recipients."}
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {!toLocation && (
                  <div
                    className="absolute inset-0 cursor-not-allowed z-10"
                    onClick={() =>
                      setErrors(prev => ({
                        ...prev,
                        requestToHint: !fromLocation
                          ? 'Please select a source location first.'
                          : !selectedCabinets.length
                          ? 'Please select at least one machine first.'
                          : 'Please select a destination location first.',
                      }))
                    }
                  />
                )}
              </div>
              {errors.requestTo && <div className="mt-1 text-xs font-medium text-red-500">{errors.requestTo}</div>}
              {!toLocation && errors.requestToHint && (
                <DisabledHint message={errors.requestToHint} />
              )}
            </div>

            {/* Cabinet/SMIB Selection with MultiSelectDropdown */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Please Select {movementType + 's'} to be Moved <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MultiSelectDropdown
                  options={cabinets.map(cab => ({
                    id: cab._id,
                    label: cab.installedGame || cab.game || cab.assetNumber || cab.serialNumber || 'Unknown Machine',
                    displayNode: (
                      <div className="flex flex-col py-1">
                        <span className="text-sm font-bold text-gray-900">
                          {cab.installedGame || cab.game || cab.assetNumber || cab.serialNumber || 'Unknown Machine'}
                        </span>
                        <span className="text-[11px] text-gray-500 font-medium">
                          SN: {cab.serialNumber || 'N/A'} | Asset: {cab.assetNumber || 'N/A'}
                        </span>
                      </div>
                    )
                  }))}
                  selectedIds={selectedCabinets.map(c => c._id)}
                  onChange={(ids) => {
                    const selected = cabinets.filter(c => ids.includes(c._id));
                    setSelectedCabinets(selected);
                    if (selected.length > 0) {
                      setErrors(prev => ({...prev, selectedCabinets: '', machineHint: ''}));
                    }
                  }}
                  placeholder={
                    loadingCabinets 
                      ? "Loading items..." 
                      : fromLocation 
                        ? `Select ${movementType}s` 
                        : "Select a source location first"
                  }
                  searchPlaceholder={`Search ${movementType}s...`}
                  disabled={!fromLocation || loadingCabinets}
                  label={movementType + 's'}
                />
                {!fromLocation && (
                  <div
                    className="absolute inset-0 cursor-not-allowed z-10"
                    onClick={() =>
                      setErrors(prev => ({
                        ...prev,
                        machineHint: 'Please select a source location before picking machines.',
                      }))
                    }
                  />
                )}
                {loadingCabinets && (
                   <div className="absolute right-10 top-1/2 -translate-y-1/2">
                     <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                   </div>
                )}
              </div>
              {!fromLocation && errors.machineHint && (
                <DisabledHint message={errors.machineHint} />
              )}
              {errors.selectedCabinets && (
                <div className="mt-1 text-xs font-medium text-red-500">{errors.selectedCabinets}</div>
              )}
            </div>

            {/* Selected Items */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Selected {movementType + 's'} ({selectedCabinets.length})
              </label>
              <div className="h-44 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50/50 p-4 shadow-inner">
                {selectedCabinets.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedCabinets.map(cab => {
                      const displayName =
                        cab.installedGame || cab.game || cab.assetNumber ||
                        cab.serialNumber || 'Unknown Machine';
                      return (
                        <Chip
                          key={cab._id}
                          label={displayName}
                          onRemove={() => handleRemoveCabinet(cab._id)}
                          className="bg-buttonActive text-white px-3 py-1 font-medium shadow-sm"
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-gray-400">
                    <p className="text-sm">No {movementType.toLowerCase() + 's'} selected.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-gray-100 p-6 w-full bg-gray-50/30">
          <div className="flex flex-col sm:flex-row justify-end gap-3 w-full max-w-sm ml-auto">
            <DialogClose asChild>
              <Button variant="outline" className="h-11 flex-1 font-semibold text-gray-700 hover:bg-gray-100 sm:order-1">
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="h-11 flex-1 bg-green-600 hover:bg-green-700 text-white font-bold shadow-md transition-all active:scale-95 sm:order-2"
            >
              {submitting ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Submitting...</span>
                </div>
              ) : 'Add'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewMovementRequestModal;
