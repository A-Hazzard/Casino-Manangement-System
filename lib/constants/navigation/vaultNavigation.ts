/**
 * VAULT Navigation Configuration
 *
 * Defines navigation items for the Vault Management application.
 */

import type { NavigationConfig } from '@/lib/types/layout/navigation';
import {
    BarChart3,
    FileText,
    Receipt,
    TrendingUp,
    Wallet
} from 'lucide-react';

export const vaultNavigationConfig: NavigationConfig = {
  items: [
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
      label: 'Transfers',
      href: '/vault/management/transfers',
      icon: TrendingUp,
    },
    {
      label: 'Cash on Premises',
      href: '/vault/management/reports/cash-on-premises',
      icon: FileText,
    },
    {
      label: 'Expenses',
      href: '/vault/management/expenses',
      icon: Receipt,
    },
  ],
};
