import React, { useEffect, useState } from 'react';
import { useMovementRequestActionsStore } from '@/lib/store/movementRequestActionsStore';
import { MovementRequest } from '@/lib/types/movementRequests';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Cross2Icon } from '@radix-ui/react-icons';
import { updateMovementRequest } from '@/lib/helpers/movementRequests';
import { fetchAllGamingLocations } from '@/lib/helpers/locations';
import { fetchCabinetsForLocation } from '@/lib/helpers/cabinets';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';
import axios from 'axios';

export default function EditMovementRequestModal({
  onSaved,
}: {
  onSaved: () => void;
}) {
  const { isEditModalOpen, selectedMovementRequest, closeEditModal } =
    useMovementRequestActionsStore();

  // Form state
  const [formData, setFormData] = useState<MovementRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Data state
  const [locations, setLocations] = useState<{ id: string; name: string }[]>(
    []
  );
  const [users, setUsers] = useState<
    { _id: string; name: string; email: string }[]
  >([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [cabinetSearch, setCabinetSearch] = useState('');
  const [availableCabinets, setAvailableCabinets] = useState<Cabinet[]>([]);
  const [selectedCabinets, setSelectedCabinets] = useState<Cabinet[]>([]);
  const [cabinetDropdownOpen, setCabinetDropdownOpen] = useState(false);
  const [loadingCabinets, setLoadingCabinets] = useState(false);

  // Load initial data
  useEffect(() => {
    if (isEditModalOpen && selectedMovementRequest) {
      console.log('🔍 [EDIT MODAL] selectedMovementRequest:', selectedMovementRequest);
      console.log('🔍 [EDIT MODAL] locationFrom:', selectedMovementRequest.locationFrom);
      console.log('🔍 [EDIT MODAL] locationTo:', selectedMovementRequest.locationTo);
      setFormData(selectedMovementRequest);

      // Parse cabinetIn string back to cabinet objects
      if (selectedMovementRequest.cabinetIn) {
        const cabinetIds = selectedMovementRequest.cabinetIn.split(',');
        // We'll need to fetch the actual cabinet objects
        // For now, create placeholder objects
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
    const fetchLocations = async () => {
      try {
        const locationsData = await fetchAllGamingLocations();
        console.log('🔍 [EDIT MODAL] Loaded locations:', locationsData.length);
        console.log('🔍 [EDIT MODAL] First 5 locations:', locationsData.slice(0, 5).map(l => ({ id: l.id, name: l.name })));
        setLocations(locationsData);
      } catch (error) {
        console.error('Failed to fetch locations:', error);
      }
    };
    fetchLocations();
  }, []);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get('/api/users');
        if (response.data.users) {
          setUsers(response.data.users);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };
    fetchUsers();
  }, []);

  // Fetch cabinets when location changes
  useEffect(() => {
    if (formData?.locationFrom) {
      // Find the location ID from the location name
      const location = locations.find(
        loc => loc.name === formData.locationFrom
      );
      if (location) {
        const fetchCabinets = async () => {
          setLoadingCabinets(true);
          try {
            const result = await fetchCabinetsForLocation(
              location.id,
              undefined,
              'All'
            );
            setCabinets(result.data);
            setAvailableCabinets(result.data);
          } catch (error) {
            console.error('Failed to fetch cabinets:', error);
            setCabinets([]);
            setAvailableCabinets([]);
          } finally {
            setLoadingCabinets(false);
          }
        };
        fetchCabinets();
      }
    } else {
      setCabinets([]);
      setAvailableCabinets([]);
    }
  }, [formData?.locationFrom, locations]);

  // Filter cabinets based on search
  useEffect(() => {
    if (cabinetSearch.trim()) {
      const filtered = cabinets.filter(
        cab =>
          !selectedCabinets.find(sc => sc._id === cab._id) &&
          (cab.serialNumber
            ?.toLowerCase()
            .includes(cabinetSearch.toLowerCase()) ||
            cab.assetNumber
              ?.toLowerCase()
              .includes(cabinetSearch.toLowerCase()) ||
            cab.relayId?.toLowerCase().includes(cabinetSearch.toLowerCase()) ||
            cab.smbId?.toLowerCase().includes(cabinetSearch.toLowerCase()) ||
            cab.smibBoard
              ?.toLowerCase()
              .includes(cabinetSearch.toLowerCase()) ||
            cab.installedGame
              ?.toLowerCase()
              .includes(cabinetSearch.toLowerCase()) ||
            cab.game?.toLowerCase().includes(cabinetSearch.toLowerCase()))
      );
      setAvailableCabinets(filtered);
    } else {
      // Show all cabinets except already selected ones
      setAvailableCabinets(
        cabinets.filter(cab => !selectedCabinets.find(sc => sc._id === cab._id))
      );
    }
  }, [cabinetSearch, cabinets, selectedCabinets]);

  // Handle clicks outside cabinet dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.cabinet-dropdown-container')) {
        setCabinetDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isEditModalOpen || !formData) return null;

  const validate = () => {
    const errs: { [key: string]: string } = {};

    if (!formData.movementType) errs.movementType = 'Movement type is required';
    if (!formData.locationFrom)
      errs.locationFrom = 'Source location is required';
    if (!formData.locationTo)
      errs.locationTo = 'Destination location is required';
    if (!formData.requestTo) errs.requestTo = 'Request recipient is required';
    if (!selectedCabinets.length)
      errs.selectedCabinets = `${formData.movementType} selection is required`;

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
          .map(
            cab => cab.serialNumber || cab.assetNumber || cab.relayId || cab._id
          )
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

  const addCabinet = (cabinet: Cabinet) => {
    if (!selectedCabinets.find(cab => cab._id === cabinet._id)) {
      setSelectedCabinets([...selectedCabinets, cabinet]);
    }
    setCabinetSearch('');
    setCabinetDropdownOpen(false);
  };

  const removeCabinet = (cabinetId: string) => {
    setSelectedCabinets(selectedCabinets.filter(cab => cab._id !== cabinetId));
  };

  return (
    <Dialog open={isEditModalOpen} onOpenChange={closeEditModal}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Edit Movement Request
          </DialogTitle>
        </DialogHeader>

        <div className="grid max-h-[70vh] grid-cols-1 gap-6 overflow-y-auto p-6 md:grid-cols-2">
          {/* Left Column */}
          <div className="flex flex-col gap-4">
            {/* Movement Type */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Please Select Movement Type{' '}
                <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.movementType}
                onValueChange={value =>
                  setFormData(prev =>
                    prev ? { ...prev, movementType: value } : null
                  )
                }
              >
                <SelectTrigger className="w-full border-gray-300 focus:border-buttonActive focus:ring-buttonActive">
                  <SelectValue placeholder="Select movement type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="machine">Machine</SelectItem>
                  <SelectItem value="smib">SMIB</SelectItem>
                </SelectContent>
              </Select>
              {errors.movementType && (
                <div className="mt-1 text-xs text-red-500">
                  {errors.movementType}
                </div>
              )}
            </div>

            {/* From Location */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Please Select Location It Is Coming From{' '}
                <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.locationFrom}
                onValueChange={value => {
                  setFormData(prev =>
                    prev ? { ...prev, locationFrom: value } : null
                  );
                  // Clear selected cabinets when location changes
                  setSelectedCabinets([]);
                  setCabinetSearch('');
                }}
              >
                <SelectTrigger className="w-full border-gray-300 focus:border-buttonActive focus:ring-buttonActive">
                  <SelectValue placeholder="Select source location" />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  {/* Show the original location if it doesn't exist anymore */}
                  {formData.locationFrom && 
                   !locations.find(l => l.name === formData.locationFrom || l.id === formData.locationFrom) && (
                    <SelectItem value={formData.locationFrom} className="text-red-500">
                      {formData.locationFrom} (Deleted/Renamed)
                    </SelectItem>
                  )}
                  {locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.name}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.locationFrom && (
                <div className="mt-1 text-xs text-red-500">
                  {errors.locationFrom}
                </div>
              )}
            </div>

            {/* To Location */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Please Select Location It Is Going To{' '}
                <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.locationTo}
                onValueChange={value =>
                  setFormData(prev =>
                    prev ? { ...prev, locationTo: value } : null
                  )
                }
                disabled={!selectedCabinets.length}
              >
                <SelectTrigger className="w-full border-gray-300 focus:border-buttonActive focus:ring-buttonActive">
                  <SelectValue placeholder="Location Is It Going To" />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  {/* Show the original location if it doesn't exist anymore */}
                  {formData.locationTo && 
                   !locations.find(l => l.name === formData.locationTo || l.id === formData.locationTo) && (
                    <SelectItem value={formData.locationTo} className="text-red-500">
                      {formData.locationTo} (Deleted/Renamed)
                    </SelectItem>
                  )}
                  {locations
                    .filter(loc => loc.name !== formData.locationFrom)
                    .map(loc => (
                      <SelectItem key={loc.id} value={loc.name}>
                        {loc.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {errors.locationTo && (
                <div className="mt-1 text-xs text-red-500">
                  {errors.locationTo}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Notes
              </label>
              <Textarea
                value={formData.reason || ''}
                onChange={e =>
                  setFormData(prev =>
                    prev ? { ...prev, reason: e.target.value } : null
                  )
                }
                className="border-gray-300 placeholder-gray-400 focus:border-buttonActive focus:ring-buttonActive"
                placeholder="Please Enter Notes"
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-4">
            {/* Request To */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Request To: <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.requestTo || undefined}
                onValueChange={value =>
                  setFormData(prev =>
                    prev ? { ...prev, requestTo: value } : null
                  )
                }
                disabled={!formData.locationTo}
              >
                <SelectTrigger className="w-full border-gray-300 focus:border-buttonActive focus:ring-buttonActive">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter(user => user.email && user.email.trim() !== '')
                    .map(user => (
                      <SelectItem key={user._id} value={user.email}>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {user.name || user.email}
                          </span>
                          <span className="text-xs text-gray-500">
                            {user.email}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {errors.requestTo && (
                <div className="mt-1 text-xs text-red-500">
                  {errors.requestTo}
                </div>
              )}
            </div>

            {/* Cabinet/SMIB Selection */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Please Select a {formData.movementType} to be Moved{' '}
                <span className="text-red-500">*</span>
              </label>
              <div className="cabinet-dropdown-container relative">
                <Input
                  placeholder={`Select ${formData.movementType}`}
                  value={cabinetSearch}
                  onChange={e => {
                    setCabinetSearch(e.target.value);
                    setCabinetDropdownOpen(true);
                  }}
                  onFocus={() => setCabinetDropdownOpen(true)}
                  disabled={!formData.locationFrom}
                  className="border-gray-300 placeholder-gray-400 focus:border-buttonActive focus:ring-buttonActive"
                  autoComplete="off"
                />
                {cabinetDropdownOpen && formData.locationFrom && (
                  <div className="absolute left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                    {loadingCabinets ? (
                      <div className="px-4 py-2 text-center text-sm text-gray-400">
                        Loading {formData.movementType.toLowerCase()}s...
                      </div>
                    ) : availableCabinets.length > 0 ? (
                      availableCabinets.map(cab => {
                        const displayName =
                          cab.installedGame ||
                          cab.game ||
                          cab.assetNumber ||
                          cab.serialNumber ||
                          cab.relayId ||
                          'Unknown Machine';
                        const identifier =
                          cab.serialNumber ||
                          cab.assetNumber ||
                          cab.smibBoard ||
                          cab.relayId ||
                          cab._id;

                        return (
                          <button
                            key={cab._id}
                            type="button"
                            className="flex w-full items-center justify-between px-4 py-2 text-left text-gray-900 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => addCabinet(cab)}
                            disabled={selectedCabinets.some(
                              sc => sc._id === cab._id
                            )}
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {displayName}
                              </span>
                              <span className="text-xs text-gray-500">
                                {identifier}
                              </span>
                            </div>
                            {!selectedCabinets.some(
                              sc => sc._id === cab._id
                            ) && (
                              <span className="text-sm text-blue-600">+</span>
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-4 py-2 text-center text-sm text-gray-400">
                        {cabinetSearch
                          ? `No ${formData.movementType.toLowerCase()}s match your search.`
                          : `No ${formData.movementType.toLowerCase()}s available at this location.`}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {errors.selectedCabinets && (
                <div className="mt-1 text-xs text-red-500">
                  {errors.selectedCabinets}
                </div>
              )}
            </div>

            {/* Selected Items */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Selected {formData.movementType}s ({selectedCabinets.length})
              </label>
              <div className="h-40 min-h-[60px] overflow-y-auto rounded-md border bg-gray-50 p-3">
                {selectedCabinets.length > 0 ? (
                  selectedCabinets.map(cab => {
                    const displayName =
                      cab.installedGame ||
                      cab.game ||
                      cab.assetNumber ||
                      cab.serialNumber ||
                      cab.relayId ||
                      'Unknown Machine';
                    return (
                      <div
                        key={cab._id}
                        className="mb-2 flex items-center justify-between rounded border bg-white p-2 last:mb-0"
                      >
                        <div>
                          <div className="text-sm font-medium">
                            {displayName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {cab.serialNumber &&
                              cab.serialNumber !== displayName && (
                                <>Serial: {cab.serialNumber}</>
                              )}
                            {cab.assetNumber &&
                              cab.assetNumber !== displayName && (
                                <>Asset: {cab.assetNumber}</>
                              )}
                            {cab.relayId && cab.relayId !== displayName && (
                              <>Relay: {cab.relayId}</>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCabinet(cab._id)}
                          className="text-red-500 hover:bg-red-50 hover:text-red-700"
                        >
                          <Cross2Icon className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })
                ) : (
                  <p className="py-2 text-center text-sm text-gray-400">
                    No {formData.movementType.toLowerCase()}s selected.
                  </p>
                )}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Status <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.status}
                onValueChange={value =>
                  setFormData(prev =>
                    prev
                      ? {
                          ...prev,
                          status: value as
                            | 'pending'
                            | 'approved'
                            | 'rejected'
                            | 'in progress',
                        }
                      : null
                  )
                }
              >
                <SelectTrigger className="w-full border-gray-300 focus:border-buttonActive focus:ring-buttonActive">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="in progress">In Progress</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-gray-200 p-6">
          {errors.submit && (
            <div className="mb-2 text-center text-sm text-red-500">
              {errors.submit}
            </div>
          )}
          <div className="flex flex-col sm:flex-row justify-end gap-2 w-full">
            <DialogClose asChild>
              <Button
                variant="outline"
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="bg-button hover:bg-buttonActive text-white w-full sm:w-auto order-1 sm:order-2"
            >
              {loading ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
