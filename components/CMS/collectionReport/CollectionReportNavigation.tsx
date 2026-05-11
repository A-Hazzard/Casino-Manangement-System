/**
 * Collection Navigation Component
 * Tab navigation component for collection reports page with role-based access control.
 *
 * Features:
 * - Tab-based navigation (Collection, Monthly, Manager Schedules, Collector Schedules)
 * - Role-based tab filtering (only shows accessible tabs)
 * - Active tab highlighting
 * - Responsive design (desktop and mobile)
 * - Smooth animations with Framer Motion
 * - Loading state support
 * - Permission checks for each tab
 *
 * @param tabs - Array of collection tabs to display
 * @param activeView - Currently active view ID
 * @param onChange - Callback when tab changes
 * @param isLoading - Whether navigation is in loading state
 */
'use client';

import { motion } from 'framer-motion';
import type { CollectionView, CollectionTab } from '@/lib/types/collection';

type Props = {
  tabs: CollectionTab[];
  activeView: CollectionView;
  onChange: (view: CollectionView) => void;
  isLoading?: boolean;
};

export default function CollectionReportNavigation({
  tabs,
  activeView,
  onChange,
  isLoading = false,
}: Props) {
  // Filter out tabs that are under maintenance
  // Page-level access is already checked by ProtectedRoute and useUrlProtection
  const accessibleTabs = tabs.filter(tab => tab.available !== false);

  return (
    <div className="rounded-lg border-b border-gray-200 bg-white shadow-sm">
      {/* Desktop - md: and above */}
      <nav className="hidden space-x-1 px-1 md:flex md:space-x-2 md:px-2 lg:space-x-8 lg:px-6">
        {accessibleTabs.map(tab => {
          const isActive = activeView === tab.id;
          const isHighlighted = tab.highlight === true;

          return (
            <motion.button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`navigation-button relative flex cursor-pointer items-center space-x-0.5 whitespace-nowrap border-b-2 px-0.5 py-1 text-xs font-medium transition-all duration-200 md:space-x-1 md:px-1 md:py-2 lg:space-x-2 lg:px-2 lg:py-4 xl:text-sm ${
                isActive && isHighlighted
                  ? 'border-amber-500 bg-amber-50 text-amber-700'
                  : isActive
                    ? 'border-buttonActive bg-buttonActive/5 text-buttonActive'
                    : isHighlighted
                      ? 'border-transparent text-amber-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isLoading}
              type="button"
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
              {isHighlighted && (
                <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                  DEV
                </span>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Mobile - below md: */}
      <div className="px-4 py-2 md:hidden">
        <select
          value={activeView}
          onChange={e => onChange(e.target.value as CollectionView)}
          className="navigation-button w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-3 text-base font-semibold text-gray-700 shadow-sm focus:border-buttonActive focus:ring-buttonActive"
          disabled={isLoading}
        >
          {accessibleTabs.map(t => (
            <option key={t.id} value={t.id}>
              {t.icon} {t.label}
              {t.highlight ? ' [DEV]' : ''}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
