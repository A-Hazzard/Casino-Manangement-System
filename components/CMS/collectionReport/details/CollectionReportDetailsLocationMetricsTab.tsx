'use client';

import { FC } from 'react';
import type { CollectionReportData } from '@/lib/types/api';

// === Sub-components ===
import { CollectionReportDetailsLocationSummary } from './components/CollectionReportDetailsLocationSummary';
import { CollectionReportDetailsLocationMetricCard } from './components/CollectionReportDetailsLocationMetricCard';

type CollectionReportDetailsLocationMetricsTabProps = {
  reportData: CollectionReportData;
};

/**
 * CollectionReportDetailsLocationMetricsTab Component
 *
 * Displays aggregated location-level metrics for a collection report.
 * Organized into summary totals and detailed metric sections (Variance, Revenue, Balances, Corrections).
 *
 * Features:
 * - High-level financial summary component (Responsive)
 * - Grid-based layout for categorical metrics
 * - Clear separation of variance, revenue, balances, and corrections
 * - Specialized currency formatting for financial values
 *
 * @param reportData - Full report details object containing location metrics
 */
const CollectionReportDetailsLocationMetricsTab: FC<CollectionReportDetailsLocationMetricsTabProps> = ({
  reportData,
}) => {
  // ============================================================================
  // Metric Data Configuration
  // ============================================================================
  const { locationMetrics } = reportData;

  // Define section data for cleaner rendering
  const sections = [
    {
      title: 'Section 1: Collection Variance',
      items: [
        { label: 'Variance', value: locationMetrics?.variance, isCurrency: true },
        { label: 'Variance Reason', value: locationMetrics?.varianceReason },
        { label: 'Amount To Collect', value: locationMetrics?.amountToCollect, isCurrency: true },
        { label: 'Collected Amount', value: locationMetrics?.collectedAmount, isCurrency: true },
      ]
    },
    {
      title: 'Section 2: Revenue & Capacity',
      items: [
        { label: 'Location Revenue', value: locationMetrics?.locationRevenue, isCurrency: true },
        { label: 'Amount Uncollected', value: locationMetrics?.amountUncollected, isCurrency: true },
        { label: 'Machines Number', value: locationMetrics?.machinesNumber },
        { label: 'Reason For Shortage', value: locationMetrics?.reasonForShortage },
      ]
    },
    {
      title: 'Section 3: Balances & Taxes',
      items: [
        { label: 'Taxes', value: locationMetrics?.taxes, isCurrency: true },
        { label: 'Advance', value: locationMetrics?.advance, isCurrency: true },
        { label: 'Previous Balance Owed', value: locationMetrics?.previousBalanceOwed, isCurrency: true },
        { label: 'Current Balance Owed', value: locationMetrics?.currentBalanceOwed, isCurrency: true },
      ]
    },
    {
      title: 'Section 4: Corrections',
      items: [
        { label: 'Balance Correction', value: locationMetrics?.balanceCorrection, isCurrency: true },
        { label: 'Correction Reason', value: locationMetrics?.correctionReason },
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <h2 className="my-4 text-center text-xl font-bold lg:hidden">Location Metrics</h2>

      {/* 1. Global Financial Summary (Responsive) */}
      <CollectionReportDetailsLocationSummary 
        data={{
          droppedCancelled: locationMetrics?.droppedCancelled,
          metersGross: locationMetrics?.metersGross,
          sasGross: locationMetrics?.sasGross,
          variation: locationMetrics?.variation
        }}
        isMobile={false} // The component handles both internal hidden/block logic
      />
      {/* For mobile, we explicitly show the mobile version since the original had its own card layout */}
      <div className="lg:hidden">
        <CollectionReportDetailsLocationSummary 
          data={{
            droppedCancelled: locationMetrics?.droppedCancelled,
            metersGross: locationMetrics?.metersGross,
            sasGross: locationMetrics?.sasGross,
            variation: locationMetrics?.variation
          }}
          isMobile={true}
        />
      </div>

      {/* 2. Detailed Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:pt-2">
        {sections.map((section, index) => (
          <CollectionReportDetailsLocationMetricCard 
            key={index}
            title={section.title}
            items={section.items}
          />
        ))}
      </div>
    </div>
  );
};

export default CollectionReportDetailsLocationMetricsTab;

