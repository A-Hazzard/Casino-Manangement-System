import { useReportStore } from "@/lib/store/useReportStore";
import { ReportConfig, ReportData } from "@/lib/types/reports";
import { useState } from "react";

export function useGenerateReport() {
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
      const response = await fetch("/api/analytics/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate report");
      }

      const data: ReportData = await response.json();
      setReportData(data);
      setStep("view");
    } catch (e: unknown) {
      const errorMessage =
        e instanceof Error ? e.message : "An unknown error occurred";
      setError(errorMessage);
      setLocalError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  return { generateReport, isLoading, error };
}
