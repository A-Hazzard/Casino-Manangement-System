/**
 * useCollectorScheduleData Hook
 *
 * Manages all state and logic for the collector schedule tab,
 * including edit and soft-delete operations.
 *
 * Edit/delete available to: manager, admin, location admin, owner, developer.
 */

'use client';

import { deleteScheduler, editScheduler } from '@/lib/helpers/schedulers';
import { fetchAndFormatCollectorSchedules } from '@/lib/helpers/collections';
import { useUserStore } from '@/lib/store/userStore';
import type { CollectorSchedule } from '@/lib/types/components';
import type { LocationSelectItem } from '@/lib/types/location';
import { useCallback, useEffect, useMemo, useState } from 'react';

const ITEMS_PER_PAGE = 20;
const MANAGE_ROLES = ['manager', 'admin', 'location admin', 'owner', 'developer'];

export function useCollectorScheduleData(
  selectedLicencee: string | null,
  locations: LocationSelectItem[]
) {
  const { user } = useUserStore();

  // ============================================================================
  // Permission
  // ============================================================================
  const canManage = useMemo(
    () => user?.roles?.some((r: string) => MANAGE_ROLES.includes(r)) ?? false,
    [user]
  );

  // ============================================================================
  // Filter State
  // ============================================================================
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedCollector, setSelectedCollector] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // ============================================================================
  // Data State
  // ============================================================================
  const [collectorSchedules, setCollectorSchedules] = useState<CollectorSchedule[]>([]);
  const [collectors, setCollectors] = useState<string[]>([]);
  const [loadingCollectorSchedules, setLoadingCollectorSchedules] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  // ============================================================================
  // Edit / Delete State
  // ============================================================================
  const [editingSchedule, setEditingSchedule] = useState<CollectorSchedule | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState<CollectorSchedule | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ============================================================================
  // Computed Values (Pagination)
  // ============================================================================
  const totalPages = useMemo(
    () => Math.ceil(collectorSchedules.length / ITEMS_PER_PAGE) || 1,
    [collectorSchedules.length]
  );

  const paginatedSchedules = useMemo(() => {
    const skip = currentPage * ITEMS_PER_PAGE;
    return collectorSchedules.slice(skip, skip + ITEMS_PER_PAGE);
  }, [collectorSchedules, currentPage]);

  // ============================================================================
  // Data Fetching
  // ============================================================================
  const fetchSchedules = useCallback(async () => {
    setLoadingCollectorSchedules(true);
    try {
      const { collectorSchedules: schedules, collectors: collectorList } =
        await fetchAndFormatCollectorSchedules(
          selectedLicencee || undefined,
          selectedLocation === 'all' ? undefined : selectedLocation,
          selectedCollector === 'all' ? undefined : selectedCollector,
          selectedStatus === 'all' ? undefined : selectedStatus
        );

      setCollectorSchedules(schedules);
      setCollectors(collectorList);
      setCurrentPage(0);
    } catch (error) {
      console.error('Error fetching collector schedules:', error);
    } finally {
      setLoadingCollectorSchedules(false);
    }
  }, [selectedLicencee, selectedLocation, selectedCollector, selectedStatus]);

  // ============================================================================
  // Edit Handler
  // ============================================================================
  const handleEditSave = useCallback(
    async (data: { startTime: string; endTime: string; status: string }) => {
      if (!editingSchedule?._id) return;
      setSaving(true);
      try {
        const ok = await editScheduler(editingSchedule._id, data);
        if (ok) {
          setEditingSchedule(null);
          await fetchSchedules();
        }
      } finally {
        setSaving(false);
      }
    },
    [editingSchedule, fetchSchedules]
  );

  // ============================================================================
  // Delete Handler
  // ============================================================================
  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingSchedule?._id) return;
    setDeleting(true);
    try {
      const ok = await deleteScheduler(deletingSchedule._id);
      if (ok) {
        setDeletingSchedule(null);
        await fetchSchedules();
      }
    } finally {
      setDeleting(false);
    }
  }, [deletingSchedule, fetchSchedules]);

  const onResetFilters = useCallback(() => {
    setSelectedLocation('all');
    setSelectedCollector('all');
    setSelectedStatus('all');
  }, []);

  // ============================================================================
  // Effects
  // ============================================================================
  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  useEffect(() => {
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(0);
    }
  }, [collectorSchedules.length, currentPage, totalPages]);

  return {
    locations,
    collectors,
    selectedLocation,
    onLocationChange: setSelectedLocation,
    selectedCollector,
    onCollectorChange: setSelectedCollector,
    selectedStatus,
    onStatusChange: setSelectedStatus,
    onResetFilters,
    collectorSchedules,
    paginatedSchedules,
    loadingCollectorSchedules,
    currentPage,
    totalPages,
    setCurrentPage,
    // Edit / Delete
    canManage,
    editingSchedule,
    onEdit: setEditingSchedule,
    onEditClose: () => setEditingSchedule(null),
    onEditSave: handleEditSave,
    saving,
    deletingSchedule,
    onDelete: setDeletingSchedule,
    onDeleteClose: () => setDeletingSchedule(null),
    onDeleteConfirm: handleDeleteConfirm,
    deleting,
  };
}
