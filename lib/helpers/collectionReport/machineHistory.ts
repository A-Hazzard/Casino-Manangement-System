import axios from 'axios';
import type {
  MachineReportHistoryEntry,
  MachineReportHistoryResponse,
} from '@shared/types/collectionReportHistory';

export async function fetchMachineReportHistory(
  machineId: string
): Promise<MachineReportHistoryEntry[]> {
  const { data } = await axios.get<MachineReportHistoryResponse>(
    `/api/collection-reports/machine-history?machineId=${encodeURIComponent(machineId)}`
  );

  if (!data.success) {
    throw new Error('Failed to fetch machine report history');
  }

  return data.data;
}

export function buildMachineReportHighlightUrl(
  entry: MachineReportHistoryEntry,
  machineId: string
): string {
  const encodedMachineId = encodeURIComponent(machineId);

  if (entry.reportVersion === 2) {
    return `/collection-report/report/session/${encodeURIComponent(entry.reportId)}?highlightMachine=${encodedMachineId}`;
  }

  return `/collection-report/report/${encodeURIComponent(entry.reportId)}?section=machine&highlightMachine=${encodedMachineId}`;
}
