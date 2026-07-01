'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { fetchCollectionReportById } from '@/lib/helpers/collectionReport/fetching';
import {
  buildMachineReportHighlightUrl,
  fetchMachineReportHistory,
} from '@/lib/helpers/collectionReport/machineHistory';
import type { CollectionReportData } from '@/lib/types/api';
import type { MachineReportHistoryEntry } from '@shared/types/collectionReportHistory';

type V2SessionMachinePreview = {
  machineId: string;
  machineName: string;
  machineGross?: number;
  sasGross?: number;
  variation?: number;
  sasMetersIn: number | null;
  sasMetersOut: number | null;
};

type V2SessionPreview = {
  sessionId: string;
  locationName: string;
  collectorName: string;
  sessionEndTime?: string;
  createdAt: string;
  machine: V2SessionMachinePreview | null;
};

type UseMachineReportHistoryProps = {
  machineId: string;
  currentReportId?: string;
  isOpen: boolean;
};

export function useMachineReportHistory({
  machineId,
  currentReportId,
  isOpen,
}: UseMachineReportHistoryProps) {
  const [entries, setEntries] = useState<MachineReportHistoryEntry[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [v1Preview, setV1Preview] = useState<CollectionReportData | null>(null);
  const [v2Preview, setV2Preview] = useState<V2SessionPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const selectedEntry = useMemo(() => {
    if (!selectedReportId) return null;
    return entries.find(entry => entry.reportId === selectedReportId) ?? null;
  }, [entries, selectedReportId]);

  useEffect(() => {
    if (!isOpen || !machineId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setEntries([]);
    setSelectedReportId(null);
    setV1Preview(null);
    setV2Preview(null);

    fetchMachineReportHistory(machineId)
      .then(historyEntries => {
        if (cancelled) return;

        setEntries(historyEntries);

        const currentMatch = currentReportId
          ? historyEntries.find(entry => entry.reportId === currentReportId)
          : null;
        const initialSelection =
          currentMatch?.reportId ?? historyEntries[0]?.reportId ?? null;
        setSelectedReportId(initialSelection);
      })
      .catch(fetchError => {
        if (cancelled) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Failed to load report history'
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, machineId, currentReportId]);

  useEffect(() => {
    if (!isOpen || !selectedEntry) {
      setV1Preview(null);
      setV2Preview(null);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);

    if (selectedEntry.reportVersion === 1) {
      setV2Preview(null);
      fetchCollectionReportById(selectedEntry.reportId)
        .then(report => {
          if (!cancelled) setV1Preview(report);
        })
        .catch(() => {
          if (!cancelled) setV1Preview(null);
        })
        .finally(() => {
          if (!cancelled) setPreviewLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }

    setV1Preview(null);
    axios
      .get<{ success: boolean; data: V2SessionPreview & { machines: V2SessionMachinePreview[] } }>(
        `/api/collection-reports-v2/sessions/${encodeURIComponent(selectedEntry.reportId)}`
      )
      .then(response => {
        if (cancelled || !response.data.success) return;
        const sessionData = response.data.data;
        const machineRow =
          sessionData.machines?.find(
            machine => machine.machineId === machineId
          ) ?? null;
        setV2Preview({
          sessionId: sessionData.sessionId,
          locationName: sessionData.locationName,
          collectorName: sessionData.collectorName,
          sessionEndTime: sessionData.sessionEndTime,
          createdAt: sessionData.createdAt,
          machine: machineRow,
        });
      })
      .catch(() => {
        if (!cancelled) setV2Preview(null);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedEntry, machineId]);

  const handleOpenInNewTab = useCallback(() => {
    if (!selectedEntry) return;
    const url = buildMachineReportHighlightUrl(selectedEntry, machineId);
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [selectedEntry, machineId]);

  return {
    entries,
    selectedEntry,
    selectedReportId,
    setSelectedReportId,
    loading,
    error,
    previewLoading,
    v1Preview,
    v2Preview,
    handleOpenInNewTab,
  };
}
