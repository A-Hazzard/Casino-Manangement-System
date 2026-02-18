/**
 * CMS Navigation Configuration
 *
 * Defines navigation items for the Casino Management System application.
 */

import { HIGH_PRIORITY_ROLES } from '@/lib/constants/roles';
import type { NavigationConfig, NavigationItem } from '@/lib/types/layout/navigation';
import {
  ArrowLeftRight,
  BarChart3,
  Clock,
  DollarSign,
  FileText,
  History,
  MapPin,
  MonitorSpeaker,
  Receipt,
  UserCog,
  Users,
  Wallet
} from 'lucide-react';

/**
 * Base CMS navigation items (flat structure)
 */
const baseCmsNavigationItems: NavigationItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: BarChart3,
  },
  {
    label: 'Locations',
    href: '/locations',
    icon: MapPin,
  },
  {
    label: 'Cabinets',
    href: '/cabinets',
    icon: MonitorSpeaker,
  },
  {
    label: 'Collection Report',
    href: '/collection-report',
    icon: Receipt,
  },
  {
    label: 'Sessions',
    href: '/sessions',
    icon: Clock,
  },
  {
    label: 'Members',
    href: '/members',
    icon: Users,
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: FileText,
  },
  {
    label: 'Payouts',
    href: '/vault/cashier/payouts',
    icon: DollarSign,
  },
  {
    label: 'Shifts',
    href: '/vault/cashier/shifts',
    icon: Clock,
  },
  {
    label: 'Float Requests',
    href: '/vault/cashier/float-requests',
    icon: ArrowLeftRight,
  },
  {
    label: 'Vault Overview',
    href: '/vault/management',
    icon: BarChart3,
  },
  {
    label: 'Transactions',
    href: '/vault/management/transactions',
    icon: FileText,
  },
  {
    label: 'Float Management',
    href: '/vault/management/floats',
    icon: Wallet,
  },
    {
      label: 'Expenses',
      href: '/vault/management/expenses',
      icon: Receipt,
    },
  {
    label: 'Activity Log',
    href: '/vault/management/activity-log',
    icon: History,
  },
  {
    label: 'Administration',
    href: '/administration',
    icon: UserCog,
  },
];

/**
 * Get CMS navigation config based on user roles
 * Groups "Cash Desk" and "Vault Manager" sections if user has high-priority CMS roles
 * @param userRoles - Array of user's roles
 * @returns NavigationConfig with appropriate grouping
 */
export function getCmsNavigationConfig(userRoles?: string[]): NavigationConfig {
  // Normalize roles to lowercase for comparison
  const normalizedRoles = (userRoles || []).map(role => role.toLowerCase());
  const normalizedHighPriorityRoles = HIGH_PRIORITY_ROLES.map(role =>
    role.toLowerCase()
  );

  // Check if user has any high-priority CMS role (developer, admin, manager, location admin)
  const hasHighPriorityRole = normalizedHighPriorityRoles.some(role =>
    normalizedRoles.includes(role)
  );
  
  // Specific role checks
  const isAdminOrDev = normalizedRoles.includes('admin') || normalizedRoles.includes('developer');
  const isVaultManager = normalizedRoles.includes('vault-manager') || isAdminOrDev;
  const isCashier = normalizedRoles.includes('cashier') || isAdminOrDev;

  // If user only has cashier or vault-manager roles, return flat structure
  if (!hasHighPriorityRole) {
    const filteredItems = baseCmsNavigationItems.filter(item => {
        // Vault Manager Access
        if (item.href.startsWith('/vault/management')) {
            return isVaultManager;
        }
        // Cashier Access
        if (item.href.startsWith('/vault/cashier')) {
            return isCashier;
        }
        // Default (allow other links unless specifically restricted elsewhere)
        return true;
    });

    return {
      items: filteredItems,
    };
  }

  // Group Cash Desk and Vault Manager for high-priority CMS users
  const cashDeskItems: NavigationItem[] = baseCmsNavigationItems.filter(
    item =>
      item.href === '/vault/cashier/payouts' ||
      item.href === '/vault/cashier/shifts' ||
      item.href === '/vault/cashier/float-requests'
  );

  const vaultManagerItems: NavigationItem[] = baseCmsNavigationItems.filter(
    item =>
      item.href.startsWith('/vault/management') &&
      item.href !== '/vault/management'
  );

  const otherItems = baseCmsNavigationItems.filter(
    item =>
      !item.href.startsWith('/vault/cashier') &&
      !item.href.startsWith('/vault/management')
  );
  
  const additionalSections: NavigationItem[] = [];
  
  if (isCashier) {
      additionalSections.push({
          label: 'Cash Desk',
          href: '#',
          icon: DollarSign,
          children: cashDeskItems,
      });
  }
  
  if (isVaultManager) {
      additionalSections.push({
          label: 'Vault Manager',
          href: '#',
          icon: BarChart3,
          children: [
            {
              label: 'Vault Overview',
              href: '/vault/management',
              icon: BarChart3,
            },
            ...vaultManagerItems,
          ],
      });
  }

  return {
    items: [
      ...otherItems,
      ...additionalSections,
    ],
  };
}

/**
 * Default CMS navigation config (flat structure for backward compatibility)
 */
export const cmsNavigationConfig: NavigationConfig = {
  items: baseCmsNavigationItems,
};
