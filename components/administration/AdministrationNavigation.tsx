'use client';

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
      default:
        return true;
    }
  });

  return (
    <div className="rounded-lg border-b border-gray-200 bg-white shadow-sm">
      {/* Desktop - md: and above */}
      <nav className="hidden space-x-8 px-6 md:flex">
        {accessibleTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              console.log(
                '🔄 [ADMIN NAV] Tab clicked:',
                tab.id,
                'Current:',
                activeSection
              );
              onChange(tab.id);
            }}
            className={`navigation-button flex cursor-pointer items-center space-x-2 whitespace-nowrap border-b-2 px-2 py-4 text-sm font-medium transition-all duration-200 hover:opacity-80 ${
              activeSection === tab.id
                ? 'border-buttonActive bg-buttonActive/5 text-buttonActive'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
            disabled={isLoading}
            type="button"
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Mobile - below md: */}
      <div className="px-4 py-2 md:hidden">
        <select
          value={activeSection}
          onChange={e => {
            const section = e.target.value as AdministrationSection;
            console.log('🔄 [ADMIN NAV MOBILE] Select value:', e.target.value);
            console.log(
              '🔄 [ADMIN NAV MOBILE] Current activeSection:',
              activeSection
            );
            console.log('🔄 [ADMIN NAV MOBILE] Changing to:', section);
            console.log('🔄 [ADMIN NAV MOBILE] isLoading:', isLoading);
            onChange(section);
          }}
          className="navigation-button w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-3 text-base font-semibold text-gray-700 shadow-sm focus:border-buttonActive focus:ring-buttonActive"
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
