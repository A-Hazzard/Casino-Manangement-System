import axios from 'axios';
import type { CollectionIssueDetails } from '@/shared/types/entities';

/**
 * Check for SAS time issues in a collection report
 * Returns detailed issue information per collection
 */
export async function checkSasTimeIssues(
  reportId: string
): Promise<CollectionIssueDetails> {
  try {
    const response = await axios.get(
      `/api/collection-report/${reportId}/check-sas-times`
    );
    return response.data;
  } catch (error) {
    console.error(' Error checking SAS time issues:', error);
    throw error;
  }
}

