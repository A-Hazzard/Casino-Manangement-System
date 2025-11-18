'use client';

import { motion } from 'framer-motion';

import type {
  AdministrationSection,
  AdministrationTab,
} from '@/lib/constants/administration';
import { useUserStore } from '@/lib/store/userStore';
import { hasTabAccess } from '@/lib/utils/permissions';

type Props = {
  tabs: AdministrationTab[];
  activeSection: AdministrationSection;
  onChange: (section: AdministrationSection) => void;
  isLoading?: boolean;
};

export default function AdministrationNavigation({
  tabs,
  activeSection,
  onChange,
  isLoading = false,
}: Props) {
  const { user } = useUserStore();
  const userRoles = user?.roles || [];

  // Filter tabs based on user permissions
  const accessibleTabs = tabs.filter(tab => {
    switch (tab.id) {
      case 'users':
        return hasTabAccess(userRoles, 'administration', 'users');
      case 'licensees':
        return hasTabAccess(userRoles, 'administration', 'licensees');
      case 'activity-logs':
        return hasTabAccess(userRoles, 'administration', 'activity-logs');
      case 'feedback':
        return hasTabAccess(userRoles, 'administration', 'feedback');
      default:
        return true;
    }
  });

  return (
    <div className="rounded-lg border-b border-gray-200 bg-white shadow-sm">
      {/* Desktop - md: and above */}
      <nav className="hidden space-x-2 px-4 md:flex lg:space-x-4">
        {accessibleTabs.map(tab => {
          const isActive = activeSection === tab.id;

          const handleClick = () => {
            if (tab.id !== activeSection) {
              onChange(tab.id);
            }
          };

          return (
            <motion.button
              key={tab.id}
              onClick={handleClick}
              className={`navigation-button flex cursor-pointer items-center space-x-1.5 whitespace-nowrap border-b-2 px-1.5 py-3 text-xs font-medium transition-all duration-200 ${
                isActive
                  ? 'border-buttonActive bg-buttonActive/5 text-buttonActive'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              } ${isLoading ? 'opacity-80' : ''}`}
              whileHover={{ scale: isActive ? 1 : 1.02 }}
              whileTap={{ scale: 0.98 }}
              aria-current={isActive ? 'page' : undefined}
              aria-disabled={isLoading && isActive}
              type="button"
            >
              <span className="text-sm">{tab.icon}</span>
              <span className="text-sm font-medium sm:text-base">{tab.label}</span>
            </motion.button>
          );
        })}
      </nav>

      {/* Mobile - below md: */}
      <div className="px-4 py-2 md:hidden">
        <select
          value={activeSection}
          onChange={e => onChange(e.target.value as AdministrationSection)}
          className="navigation-button w-full select-auto cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-3 text-base font-semibold text-gray-700 shadow-sm focus:border-buttonActive focus:ring-buttonActive"
          aria-label="Select administration section"
        >
          {accessibleTabs.map(t => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
