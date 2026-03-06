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
import { updateMovementRequest } from '@/lib/helpers/movementRequests';
import { useMovementRequestActionsStore } from '@/lib/store/movementRequestActionsStore';
import { useUserStore } from '@/lib/store/userStore';
import { MovementRequest } from '@/lib/types/movement';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

// === Disabled field hint banner ===
function DisabledHint({ message }: { message: string }) {
  return (
    <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
      <span>⚠</span> {message}
    </p>
  );
}

export default function EditMovementRequestModal({ onSaved }: { onSaved: () => void }) {
  const { isEditModalOpen, selectedMovementRequest, closeEditModal } =
    useMovementRequestActionsStore();
  const { user: currentUser } = useUserStore();
  const userRoles = currentUser?.roles?.map(r => r.toLowerCase()) || [];
  const isAdminOrDev = userRoles.some(role => ['admin', 'developer'].includes(role));
  const userEmail = currentUser?.emailAddress;

  // Form state
  const [formData, setFormData] = useState<MovementRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Data state
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<{ _id: string; name: string; emailAddress: string; roles: string[]; assignedLocations: string[] }[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loadingCabinets, setLoadingCabinets] = useState(false);
  const [selectedCabinets, setSelectedCabinets] = useState<Cabinet[]>([]);

  // Load initial data when modal opens
  useEffect(() => {
    if (isEditModalOpen && selectedMovementRequest) {
      setFormData(selectedMovementRequest);

      if (selectedMovementRequest.cabinetIn) {
        const cabinetIds = selectedMovementRequest.cabinetIn.split(',');
        const placeholderCabinets = cabinetIds.map(id => ({
          _id: id,
          serialNumber: id,
          assetNumber: id,
          relayId: id,
          locationId: selectedMovementRequest.locationId,
        })) as Cabinet[];
        setSelectedCabinets(placeholderCabinets);
      }
    }
  }, [isEditModalOpen, selectedMovementRequest]);

  // Fetch locations
  useEffect(() => {
    fetchAllGamingLocations()
      .then(setLocations)
      .catch(error => console.error('Failed to fetch locations:', error));
  }, []);

  // Fetch users
  useEffect(() => {
    if (isEditModalOpen) {
      setLoadingUsers(true);
      axios
        .get('/api/users')
        .then(response => { if (response.data.users) setUsers(response.data.users); })
        .catch(error => console.error('Failed to fetch users:', error))
        .finally(() => setLoadingUsers(false));
    }
  }, [isEditModalOpen]);

  // Resolve user IDs if they are currently email addresses (for legacy data)
  useEffect(() => {
    if (formData?.requestTo && users.length > 0) {
      // If requestTo looks like an email and we can find the user ID
      if (formData.requestTo.includes('@')) {
        const foundUser = users.find(u => u.emailAddress === formData.requestTo);
        if (foundUser) {
          setFormData(prev => prev ? { ...prev, requestTo: foundUser._id } : null);
        }
      }
    }
  }, [users, formData?.requestTo]);

  // Fetch cabinets when location changes
  useEffect(() => {
    if (formData?.locationFrom) {
      const location = locations.find(
        loc => loc.name === formData.locationFrom || loc.id === formData.locationFrom
      );
      if (location) {
        setLoadingCabinets(true);
        fetchCabinetsForLocation(location.id, undefined, 'All')
          .then(result => {
            setCabinets(result.data);
          })
          .catch(error => {
            console.error('Failed to fetch cabinets:', error);
            setCabinets([]);
          })
          .finally(() => setLoadingCabinets(false));
      }
    } else {
      setCabinets([]);
    }
  }, [formData?.locationFrom, locations]);

  if (!isEditModalOpen || !formData) return null;

  const validate = () => {
    const errs: { [key: string]: string } = {};
    if (!formData.movementType) errs.movementType = 'Movement type is required.';
    if (!formData.locationFrom) errs.locationFrom = 'From location is required.';
    if (!selectedCabinets.length) errs.selectedCabinets = 'Select at least one ' + (formData.movementType?.toLowerCase() || 'item') + '.';
    if (!formData.locationTo) errs.locationTo = 'Destination location is required.';
    const toLocId = locations.find(l => l.name === formData.locationTo || l.id === formData.locationTo)?.id;
    const fromLocId = locations.find(l => l.name === formData.locationFrom || l.id === formData.locationFrom)?.id;
    if (toLocId && toLocId === fromLocId) errs.locationTo = 'Destination must be different from source.';
    if (!formData.requestTo) errs.requestTo = 'Recipient user is required.';
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const updatedData = {
        ...formData,
        cabinetIn: selectedCabinets
          .map(cab => cab.serialNumber || cab.assetNumber || cab.relayId || cab._id)
          .join(','),
        updatedAt: new Date(),
      };
      await updateMovementRequest(updatedData);
      onSaved();
      closeEditModal();
    } catch (error) {
      console.error('Failed to update movement request:', error);
      setErrors({ submit: 'Failed to update movement request' });
    } finally {
      setLoading(false);
    }
  };

  // Derive SearchableSelect options
  const locationOptions = locations
    .filter(loc => {
      if (isAdminOrDev) return true;
      return currentUser?.assignedLocations?.includes(loc.id) || currentUser?.assignedLocations?.includes(loc.name);
    })
    .map(loc => ({ label: loc.name, value: loc.name }));
    
  // Ensure the current selection exists in options so it doesn't appear blank
  if (formData.locationFrom && !locationOptions.some(opt => opt.value === formData.locationFrom)) {
    locationOptions.push({ label: formData.locationFrom, value: formData.locationFrom });
  }

  const toLocationOptions = locationOptions.filter(loc => loc.value !== formData.locationFrom);

  // Resolve the current from-location value for SearchableSelect
  const fromLocationValue =
    locations.find(l => l.name === formData.locationFrom || l.id === formData.locationFrom)?.name ||
    formData.locationFrom ||
    '';

  // Filter users based on destination location assignment
  const destinationLocationId = locations.find(l => l.name === formData.locationTo || l.id === formData.locationTo)?.id;
  
  const filteredUsers = users.filter(user => {
    if (!user.emailAddress || user.emailAddress.trim() === '') return false;
    if (!destinationLocationId) return false;
    
    const roleLower = user.roles?.map(r => r.toLowerCase()) || [];
    const hasRole = roleLower.includes('location admin') || roleLower.includes('technician');
    const hasLocation = user.assignedLocations?.includes(destinationLocationId);
    
    return hasRole && hasLocation;
  });

  // Ensure current recipient is always included so their name displays correctly
  const currentRecipient = users.find(u => u._id === formData.requestTo);
  if (currentRecipient && !filteredUsers.some(u => u._id === currentRecipient._id)) {
    filteredUsers.push(currentRecipient);
  } else if (!currentRecipient && formData.requestTo) {
    // Legacy fallback user in case they are not in `users` list but their name is recorded
    filteredUsers.push({
      _id: formData.requestTo,
      name: formData.recipientName || formData.requestTo,
      emailAddress: formData.requestTo,
      roles: [],
      assignedLocations: []
    });
  }

  // Calculate if user has full record edit permissions
  const isCreator = formData.createdBy === currentUser?._id || formData.createdBy === userEmail;
  const canModifyRecord = isAdminOrDev || isCreator;
  const isRecipient = formData.requestTo === currentUser?._id || formData.requestTo === userEmail;
  
  // Destination involvement check (can update status)
  const isAuthorizedDestinationUser = userRoles.some(role => 
    ['location admin', 'technician', 'manager'].includes(role)
  ) && currentUser?.assignedLocations?.includes(destinationLocationId || '');

  const canUpdateStatus = canModifyRecord || isRecipient || isAuthorizedDestinationUser;

  return (
    <Dialog open={isEditModalOpen} onOpenChange={closeEditModal}>
      <DialogContent className="md:max-w-3xl md:max-h-[85vh] overflow-hidden bg-white p-0 flex flex-col items-center">
        <DialogHeader className="border-b border-gray-100 p-6 shrink-0 w-full">
          <DialogTitle className="text-2xl font-bold text-gray-800 text-center">
            Edit Movement Request
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
                value={formData.movementType?.toLowerCase() || ''}
                onValueChange={value =>
                  setFormData(prev => prev ? { ...prev, movementType: value } : null)
                }
              >
                <SelectTrigger 
                  className="h-11 w-full border-gray-300 shadow-sm focus:border-buttonActive focus:ring-buttonActive"
                  disabled={!canModifyRecord}
                >
                  <SelectValue placeholder="Select movement type" />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  <SelectItem value="machine">Machine</SelectItem>
                  <SelectItem value="smib">SMIB</SelectItem>
                  {formData.movementType && !['machine', 'smib'].includes(formData.movementType.toLowerCase()) && (
                    <SelectItem value={formData.movementType.toLowerCase()}>
                      {formData.movementType.charAt(0).toUpperCase() + formData.movementType.slice(1)} (Legacy)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {!canModifyRecord && <DisabledHint message="Only the creator can change the movement type." />}
              {errors.movementType && <div className="mt-1 text-xs font-medium text-red-500">{errors.movementType}</div>}
            </div>

            {/* From Location — searchable */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Please Select Location It Is Coming From <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={locationOptions}
                value={fromLocationValue}
                onChange={value => {
                  setFormData(prev => prev ? { ...prev, locationFrom: value, locationTo: '', requestTo: '' } : null);
                  setSelectedCabinets([]);
                }}
                placeholder="Select source location"
                searchPlaceholder="Search locations..."
                error={!!errors.locationFrom}
                className={`h-11 shadow-sm ${!canModifyRecord ? 'pointer-events-none opacity-50' : ''}`}
              />
              {!canModifyRecord && <DisabledHint message="Only the creator can change the source location." />}
              {errors.locationFrom && <div className="mt-1 text-xs font-medium text-red-500">{errors.locationFrom}</div>}
            </div>

            {/* To Location — searchable, disabled until cabinets selected */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Please Select Location It Is Going To <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <SearchableSelect
                  options={toLocationOptions}
                  value={formData.locationTo || ''}
                  onChange={value =>
                    setFormData(prev => prev ? { ...prev, locationTo: value, requestTo: '' } : null)
                  }
                  placeholder="Select destination location"
                  searchPlaceholder="Search locations..."
                  error={!!errors.locationTo}
                  className={`h-11 shadow-sm ${(!selectedCabinets.length || !canModifyRecord) ? 'pointer-events-none opacity-50' : ''}`}
                />
                {!selectedCabinets.length && (
                  <div
                    className="absolute inset-0 cursor-not-allowed z-10"
                    onClick={() =>
                      setErrors(prev => ({
                        ...prev,
                        toLocationHint: !formData.locationFrom
                          ? 'Please select a source location first.'
                          : 'Please select at least one machine before choosing a destination.',
                      }))
                    }
                  />
                )}
                {canModifyRecord && !selectedCabinets.length && errors.toLocationHint && (
                  <DisabledHint message={errors.toLocationHint} />
                )}
                {!canModifyRecord && (
                  <div className="absolute inset-0 cursor-not-allowed z-10" />
                )}
              </div>
              {!canModifyRecord && <DisabledHint message="Only the creator can change the destination." />}
              {errors.locationTo && <div className="mt-1 text-xs font-medium text-red-500">{errors.locationTo}</div>}
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Notes</label>
              <Textarea
                value={formData.reason || ''}
                onChange={e =>
                  setFormData(prev => prev ? { ...prev, reason: e.target.value } : null)
                }
                className="min-h-[120px] resize-none border-gray-300 shadow-sm placeholder-gray-400 focus:border-buttonActive focus:ring-buttonActive"
                placeholder="Please enter details about this update..."
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
                  value={formData.requestTo || ''}
                  onValueChange={value =>
                    setFormData(prev => prev ? { ...prev, requestTo: value } : null)
                  }
                  disabled={!formData.locationTo || loadingUsers || !canModifyRecord}
                >
                  <SelectTrigger className="h-11 w-full border-gray-300 shadow-sm focus:border-buttonActive focus:ring-buttonActive">
                    {loadingUsers ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading users...</span>
                      </div>
                    ) : (
                      <SelectValue placeholder={formData.locationTo ? "Select user" : "Select destination location first"} />
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
                        {formData.locationTo 
                          ? "No technicians or admins assigned to this location found." 
                          : "Please select a destination location above to see available recipients."}
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {!canModifyRecord && (
                  <div className="absolute inset-0 cursor-not-allowed z-10" />
                )}
                {canModifyRecord && !formData.locationTo && (
                  <div
                    className="absolute inset-0 cursor-not-allowed z-10"
                    onClick={() =>
                      setErrors(prev => ({
                        ...prev,
                        requestToHint: !formData.locationFrom
                          ? 'Please select a source location first.'
                          : !selectedCabinets.length
                          ? 'Please select at least one machine first.'
                          : 'Please select a destination location first.',
                      }))
                    }
                  />
                )}
              </div>
              {!canModifyRecord && <DisabledHint message="Only the creator can change the recipient." />}
              {errors.requestTo && <div className="mt-1 text-xs font-medium text-red-500">{errors.requestTo}</div>}
              {canModifyRecord && !formData.locationTo && errors.requestToHint && (
                <DisabledHint message={errors.requestToHint} />
              )}
            </div>

            {/* Cabinet/SMIB Selection with MultiSelectDropdown */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Please Select {formData.movementType}s to be Moved <span className="text-red-500">*</span>
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
                  }}
                  placeholder={
                    loadingCabinets 
                    ? "Loading items..." 
                    : formData.locationFrom 
                      ? 'Select ' + formData.movementType + 's' 
                      : 'Select a source location first'
                  }
                  searchPlaceholder={'Search ' + formData.movementType + 's...'}
                  disabled={!formData.locationFrom || loadingCabinets || !canModifyRecord}
                  label={formData.movementType + 's'}
                />
                {!canModifyRecord && (
                  <div className="absolute inset-0 cursor-not-allowed z-10" />
                )}
                {canModifyRecord && !formData.locationFrom && (
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
              {!canModifyRecord && <DisabledHint message="Only the creator can modify items in this request." />}
              {canModifyRecord && !formData.locationFrom && errors.machineHint && (
                <DisabledHint message={errors.machineHint} />
              )}
              {errors.selectedCabinets && (
                <div className="mt-1 text-xs font-medium text-red-500">{errors.selectedCabinets}</div>
              )}
            </div>

            {/* Selected Items */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Selected {formData.movementType}s ({selectedCabinets.length})
              </label>
              <div className="h-40 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50/50 p-4 shadow-inner">
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
                          onRemove={() => setSelectedCabinets(prev => prev.filter(c => c._id !== cab._id))}
                          className="bg-buttonActive text-white px-3 py-1 font-medium shadow-sm"
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-gray-400">
                    <p className="text-sm">No {(formData.movementType || 'machine').toLowerCase()}s selected.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Status <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.status}
                onValueChange={value =>
                  setFormData(prev =>
                    prev
                      ? { ...prev, status: value as 'pending' | 'completed' }
                      : null
                  )
                }
              >
                <SelectTrigger 
                  className="h-11 w-full border-gray-300 shadow-sm focus:border-buttonActive focus:ring-buttonActive"
                  disabled={!canUpdateStatus}
                >
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  {formData?.status && formData.status !== 'pending' && formData.status !== 'completed' && (
                    <SelectItem value={formData.status}>
                      {String(formData.status).charAt(0).toUpperCase() + String(formData.status).slice(1)} (Legacy)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {!canUpdateStatus && <DisabledHint message="You don't have permission to update the status of this request." />}
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
              onClick={handleSave}
              disabled={loading || !canUpdateStatus}
              className="h-11 flex-1 bg-green-600 hover:bg-green-700 text-white font-bold shadow-md transition-all active:scale-95 sm:order-2"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Updating...</span>
                </div>
              ) : 'Update'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
