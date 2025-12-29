/**
 * Edit Collection Modal Helpers
 *
 * Helper functions for the Edit Collection Modal hook.
 * Contains API calls and utility functions extracted from useEditCollectionModal.
 */

import { updateMachineCollectionHistory } from '@/lib/helpers/cabinets';
import type { CollectionReportData } from '@/lib/types/api';
import type { CollectionDocument } from '@/lib/types/collections';
import axios from 'axios';

/**
 * Fetch collection report by ID
 */
export async function fetchCollectionReportById(
  reportId: string
): Promise<CollectionReportData> {
  const res = await axios.get(`/api/collection-report/${reportId}`);
  return res.data;
}

/**
 * Fetch collections by report ID
 */
export async function fetchCollectionsByReportId(
  reportId: string
): Promise<CollectionDocument[]> {
  const res = await axios.get(
    `/api/collections?locationReportId=${reportId}&_t=${Date.now()}`
  );
  return res.data;
}

/**
 * Delete machine collection and update history
 */
export async function deleteMachineCollection(
  id: string
): Promise<{ success: boolean }> {
  const collection = await axios.get(`/api/collections?id=${id}`);
  const collectionData = collection.data;

  const res = await axios.delete(`/api/collections?id=${id}`);

  if (collectionData && collectionData.machineId) {
    await updateMachineCollectionHistory(
      collectionData.machineId,
      undefined,
      'delete',
      id
    );
  }

  return res.data;
}

/**
 * Utility function for proper alphabetical and numerical sorting
 */
export function sortMachinesAlphabetically<
  T extends { name?: string; serialNumber?: string },
>(machines: T[]): T[] {
  return machines.sort((a, b) => {
    const nameA = (a.name || a.serialNumber || '').toString();
    const nameB = (b.name || b.serialNumber || '').toString();

    // Extract the base name and number parts
    const matchA = nameA.match(/^(.+?)(\d+)?$/);
    const matchB = nameB.match(/^(.+?)(\d+)?$/);

    if (!matchA || !matchB) {
      return nameA.localeCompare(nameB);
    }

    const [, baseA, numA] = matchA;
    const [, baseB, numB] = matchB;

    // First compare the base part alphabetically
    const baseCompare = baseA.localeCompare(baseB);
    if (baseCompare !== 0) {
      return baseCompare;
    }

    // If base parts are the same, compare numerically
    const numAInt = numA ? parseInt(numA, 10) : 0;
    const numBInt = numB ? parseInt(numB, 10) : 0;

    return numAInt - numBInt;
  });
}
