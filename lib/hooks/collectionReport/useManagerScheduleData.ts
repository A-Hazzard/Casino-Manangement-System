/**
 * useManagerScheduleData Hook
 *
 * Manages all state and logic for the manager schedule tab,
 * including edit and soft-delete operations.
 *
 * Edit/delete available to: manager, admin, location admin, owner, developer.
 */

'use client';

import { deleteScheduler, editScheduler, fetchSchedulersWithFilters } from '@/lib/helpers/schedulers';
import { useUserStore } from '@/lib/store/userStore';
import type { SchedulerTableRow } from '@/lib/types/components';
import type { SchedulerData } from '@/lib/types/api';
import type { LocationSelectItem } from '@/lib/types/location';
import { useCallback, useEffect, useMemo, useState } from 'react';

const ITEMS_PER_PAGE = 20;
const MANAGE_ROLES = ['manager', 'admin', 'location admin', 'owner', 'developer'];

export function useManagerScheduleData(
  selectedLicencee: string | null,
  locations: LocationSelectItem[],
  collectors: string[]
) {
  const { user } = useUserStore();

  // ============================================================================
  // Permission
  // ============================================================================
  const canManage = useMemo(
    () => user?.roles?.some((role: string) => MANAGE_ROLES.includes(role)) ?? false,
    [user]
  );

  // ============================================================================
  // Filter State
  // ============================================================================
  const [selectedSchedulerLocation, setSelectedSchedulerLocation] = useState<string>('all');
  const [selectedCollector, setSelectedCollector] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // ============================================================================
  // Data State
  // ============================================================================
  const [schedulers, setSchedulers] = useState<SchedulerTableRow[]>([]);
  const [rawSchedulers, setRawSchedulers] = useState<SchedulerData[]>([]);
  const [loadingSchedulers, setLoadingSchedulers] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  // ============================================================================
  // Edit / Delete State
  // ============================================================================
  const [editingRow, setEditingRow] = useState<SchedulerTableRow | null>(null);
  const [deletingRow, setDeletingRow] = useState<SchedulerTableRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ============================================================================
  // Computed Values (Pagination)
  // ============================================================================
  const totalPages = useMemo(
    () => Math.ceil(schedulers.length / ITEMS_PER_PAGE) || 1,
    [schedulers.length]
  );

  const paginatedSchedulers = useMemo(() => {
    const skip = currentPage * ITEMS_PER_PAGE;
    return schedulers.slice(skip, skip + ITEMS_PER_PAGE);
  }, [schedulers, currentPage]);

  // ============================================================================
  // Data Fetching
  // ============================================================================
  const fetchSchedules = useCallback(async () => {
    setLoadingSchedulers(true);
    try {
      const data = await fetchSchedulersWithFilters({
        licencee: selectedLicencee || undefined,
        location: selectedSchedulerLocation === 'all' ? undefined : selectedSchedulerLocation,
        collector: selectedCollector === 'all' ? undefined : selectedCollector,
        status: selectedStatus === 'all' ? undefined : selectedStatus,
      });

      setRawSchedulers(data);

      const mappedSchedules: SchedulerTableRow[] = data.map(item => ({
        id: item._id,
        collector: item.collectorName || item.collector || '-',
        location: item.locationName || item.location || '-',
        creator: item.creatorName || item.creator || '-',
        visitTime: item.startTime ? new Date(item.startTime).toLocaleString() : '-',
        createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString() : '-',
        status: item.status || 'pending',
        rawStartTime: item.startTime || '',
        rawEndTime: item.endTime || '',
        collectorName: item.collectorName || item.collector || '-',
        locationName: item.locationName || item.location || '-',
      }));

      setSchedulers(mappedSchedules);
      setCurrentPage(0);
    } catch (error) {
      console.error('Error fetching manager schedules:', error);
    } finally {
      setLoadingSchedulers(false);
    }
  }, [selectedLicencee, selectedSchedulerLocation, selectedCollector, selectedStatus]);

  // ============================================================================
  // Edit Handler
  // ============================================================================
  const handleEditSave = useCallback(
    async (data: { startTime: string; endTime: string; status: string }) => {
      if (!editingRow) return;
      setSaving(true);
      try {
        const ok = await editScheduler(editingRow.id, data);
        if (ok) {
          setEditingRow(null);
          await fetchSchedules();
        }
      } finally {
        setSaving(false);
      }
    },
    [editingRow, fetchSchedules]
  );

  // ============================================================================
  // Delete Handler
  // ============================================================================
  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingRow) return;
    setDeleting(true);
    try {
      const ok = await deleteScheduler(deletingRow.id);
      if (ok) {
        setDeletingRow(null);
        await fetchSchedules();
      }
    } finally {
      setDeleting(false);
    }
  }, [deletingRow, fetchSchedules]);

  const onResetSchedulerFilters = useCallback(() => {
    setSelectedSchedulerLocation('all');
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
  }, [schedulers.length, currentPage, totalPages]);

  return {
    locations,
    collectors,
    selectedSchedulerLocation,
    onSchedulerLocationChange: setSelectedSchedulerLocation,
    selectedCollector,
    onCollectorChange: setSelectedCollector,
    selectedStatus,
    onStatusChange: setSelectedStatus,
    onResetSchedulerFilters,
    schedulers,
    rawSchedulers,
    paginatedSchedulers,
    loadingSchedulers,
    currentPage,
    totalPages,
    setCurrentPage,
    // Edit / Delete
    canManage,
    editingRow,
    onEdit: setEditingRow,
    onEditClose: () => setEditingRow(null),
    onEditSave: handleEditSave,
    saving,
    deletingRow,
    onDelete: setDeletingRow,
    onDeleteClose: () => setDeletingRow(null),
    onDeleteConfirm: handleDeleteConfirm,
    deleting,
  };
}
