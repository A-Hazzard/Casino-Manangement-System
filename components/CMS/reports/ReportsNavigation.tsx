'use client';

import type { ReportTab, ReportView } from '@/lib/types/reports';
import { motion } from 'framer-motion';

type ReportsNavigationProps = {
  availableTabs: ReportTab[];
  activeView: ReportView;
  onTabChange: (tabId: ReportView) => void;
};

/**
 * Reports Navigation Component
 * Handles tab navigation for the reports page with responsive design
 *
 * @module components/reports/ReportsNavigation
 */
export default function ReportsNavigation({
  availableTabs,
  activeView,
  onTabChange,
}: ReportsNavigationProps) {
  const visibleTabs = availableTabs;

  return (
    <div className="mb-6 rounded-lg border-b border-gray-200 bg-white shadow-sm">
      {/* Desktop Navigation */}
      <nav className="hidden space-x-8 px-6 md:flex">
        {visibleTabs.map(tab => (
          <motion.button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center space-x-2 whitespace-nowrap border-b-2 px-2 py-4 text-sm font-medium transition-all duration-200 ${
              activeView === tab.id
                ? 'border-buttonActive bg-buttonActive/5 text-buttonActive'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            } `}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </motion.button>
        ))}
      </nav>

      {/* Mobile Navigation */}
      <div className="px-4 py-3 md:hidden">
        <select
          value={activeView}
          onChange={e => onTabChange(e.target.value as ReportView)}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base font-semibold text-gray-700 shadow-sm focus:border-buttonActive focus:ring-buttonActive"
        >
          {visibleTabs.map(tab => (
            <option key={tab.id} value={tab.id}>
              {tab.icon} {tab.label}
            </option>
          ))}
        </select>
        <p className="mt-2 px-1 text-xs text-gray-600">
          {visibleTabs.find(tab => tab.id === activeView)?.description}
        </p>
      </div>
    </div>
  );
}

