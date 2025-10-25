import { useReportStore } from '@/lib/store/useReportStore';
import { ReportConfig, ReportData } from '@/lib/types/reports';
import { useState } from 'react';
import axios from 'axios';

export function useGenerateCustomReport() {
  const { setReportData, setIsGenerating, setError, setStep } =
    useReportStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setLocalError] = useState<string | null>(null);

  const generateReport = async (config: Partial<ReportConfig>) => {
    setIsLoading(true);
    setIsGenerating(true);
    setError(null);
    setLocalError(null);

    try {
      const response = await axios.post('/api/analytics/reports', config);
      const data: ReportData = response.data;
      setReportData(data);
      setStep({
        id: 'view',
        name: 'View Report',
        status: 'completed' as const,
        progress: 100,
      });
    } catch (e: unknown) {
      const errorMessage =
        e instanceof Error ? e.message : 'An unknown error occurred';
      setError(errorMessage);
      setLocalError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  return { generateReport, isLoading, error };
}
