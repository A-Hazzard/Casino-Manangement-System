/**
 * useMembersSummaryData Hook
 *
 * Encapsulates state and logic for the Members Summary Tab.
 * Handles data fetching for player statistics, demographics, and trends.
 */

'use client';

import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

type UseMembersSummaryDataProps = {
  selectedLicencee: string;
  search?: string;
  locationFilter?: string;
  page?: number;
  limit?: number;
};

type MembersSummaryData = {
  stats?: {
    totalMembers: number;
    activeMembers: number;
    newMembers?: number;
  };
  members?: Array<{
    _id: string;
    fullName: string;
    [key: string]: unknown;
  }>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  [key: string]: unknown;
};

type DemographicsData = {
  ageGroups: Record<string, number>;
  genders: Record<string, number>;
  [key: string]: unknown;
};

type ActivityTrend = {
  date: string;
  activeMembers: number;
  newMembers: number;
  [key: string]: unknown;
};

export function useMembersSummaryData({
  selectedLicencee,
  search = '',
  locationFilter = 'all',
  page = 1,
  limit = 10,
}: UseMembersSummaryDataProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<MembersSummaryData | null>(null);
  const [demographicsData, setDemographicsData] = useState<DemographicsData | null>(null);
  const [activityTrends, setActivityTrends] = useState<ActivityTrend[]>([]);

  const fetchSummaryData = useCallback(async () => {
    setIsLoading(true);
    let hasError = false;
    const errors: string[] = [];
    
    try {
      // Build query params
      const params = new URLSearchParams({
        licensee: selectedLicencee,
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (search) {
        params.append('search', search);
      }
      
      if (locationFilter && locationFilter !== 'all') {
        params.append('location', locationFilter);
      }

      const locationQuery = locationFilter && locationFilter !== 'all' ? `&location=${locationFilter}` : '';

      const [summaryRes, demographicsRes, trendsRes] = await Promise.allSettled([
        axios.get(`/api/members/summary?${params.toString()}`),
        axios.get(`/api/members/demographics?licensee=${selectedLicencee}${locationQuery}`),
        axios.get(`/api/members/trends?licensee=${selectedLicencee}${locationQuery}`),
      ]);

      // Handle summary response
      // API returns: { success: true, data: { members: [...], summary: {...}, pagination: {...} } }
      if (summaryRes.status === 'fulfilled') {
        const responseData = summaryRes.value.data;
        // Handle both direct data and wrapped response structures
        if (responseData?.data) {
          // Wrapped response: { success: true, data: { members, summary, pagination } }
          setSummaryData({
            members: responseData.data.members || [],
            stats: responseData.data.summary || null,
            pagination: responseData.data.pagination || null,
          });
        } else if (responseData?.members || responseData?.stats) {
          // Direct response: { members: [...], stats: {...} }
          setSummaryData(responseData);
        } else {
          // Fallback: assume responseData is the summary data
          setSummaryData(responseData);
        }
      } else {
        hasError = true;
        errors.push('summary');
        console.error('Failed to fetch members summary:', summaryRes.reason);
      }

      // Handle demographics response (optional - don't show error for 404)
      if (demographicsRes.status === 'fulfilled') {
        setDemographicsData(demographicsRes.value.data);
      } else {
        // Only log error, don't add to errors array if it's a 404 (endpoint doesn't exist)
        const is404 = demographicsRes.reason?.response?.status === 404;
        if (!is404) {
          hasError = true;
          errors.push('demographics');
        }
        console.warn('Demographics endpoint not available:', demographicsRes.reason);
      }

      // Handle trends response (optional - don't show error for 404)
      if (trendsRes.status === 'fulfilled') {
        setActivityTrends(trendsRes.value.data);
      } else {
        // Only log error, don't add to errors array if it's a 404 (endpoint doesn't exist)
        const is404 = trendsRes.reason?.response?.status === 404;
        if (!is404) {
          hasError = true;
          errors.push('trends');
        }
        console.warn('Trends endpoint not available:', trendsRes.reason);
      }

      // Show single consolidated error toast only if critical requests failed (not 404s)
      if (hasError && errors.length > 0) {
        const failedItems = errors.join(', ');
        toast.error(`Failed to load ${failedItems} data. Please try again.`);
      }
    } catch (error) {
      console.error('Failed to fetch members summary data:', error);
      toast.error('Failed to load summary data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedLicencee, search, locationFilter, page, limit]);

  useEffect(() => {
    fetchSummaryData();
  }, [fetchSummaryData]);

  return {
    isLoading,
    summaryData,
    demographicsData,
    activityTrends,
    refreshData: fetchSummaryData,
  };
}


