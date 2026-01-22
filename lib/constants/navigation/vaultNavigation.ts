/**
 * VAULT Navigation Configuration
 *
 * Defines navigation items for the Vault Management application.
 */

import {
  BarChart3,
  Calendar,
  FileText,
  Receipt,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import type { NavigationConfig } from '@/lib/types/layout/navigation';

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
      label: 'End-of-Day Reports',
      href: '/vault/management/reports/end-of-day',
      icon: Calendar,
    },
    {
      label: 'Expenses',
      href: '/vault/management/expenses',
      icon: Receipt,
    },
  ],
};
