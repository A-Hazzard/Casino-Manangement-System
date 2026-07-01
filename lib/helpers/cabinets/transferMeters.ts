/**
 * Transfer Meters Client Helpers
 *
 * API calls for the cabinet Transfer Meters accounting tab.
 */

import axios from 'axios';
import type {
  TransferMetersBatchRequest,
  TransferMetersBatchResult,
  TransferMetersStats,
} from '@shared/types/meters';

type TransferMetersDateRange = {
  fromDateTime?: string;
  toDateTime?: string;
};

export async function fetchTransferMetersStats(
  cabinetId: string,
  range?: TransferMetersDateRange
): Promise<TransferMetersStats> {
  const params: TransferMetersDateRange = {};
  if (range?.fromDateTime) params.fromDateTime = range.fromDateTime;
  if (range?.toDateTime) params.toDateTime = range.toDateTime;

  const response = await axios.get<{ success: boolean; data: TransferMetersStats }>(
    `/api/cabinets/${cabinetId}/transfer-meters`,
    { params: Object.keys(params).length > 0 ? params : undefined }
  );

  if (!response.data?.success || !response.data.data) {
    throw new Error('Failed to load transfer meters stats');
  }

  return response.data.data;
}

export async function transferMetersBatch(
  cabinetId: string,
  payload: TransferMetersBatchRequest
): Promise<TransferMetersBatchResult> {
  const response = await axios.post<{
    success: boolean;
    data: TransferMetersBatchResult;
  }>(`/api/cabinets/${cabinetId}/transfer-meters`, payload);

  if (!response.data?.success || !response.data.data) {
    throw new Error('Failed to transfer meters');
  }

  return response.data.data;
}
