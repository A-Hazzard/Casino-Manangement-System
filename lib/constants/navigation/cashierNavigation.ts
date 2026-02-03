/**
 * Cashier Navigation Configuration
 *
 * Defines navigation items for the Cashier interface in the Vault Management application.
 * Cashiers have limited navigation with only their specific pages.
 */

import type { NavigationConfig } from '@/lib/types/layout/navigation';
import { Clock, DollarSign, LayoutDashboard, Wallet } from 'lucide-react';

export const cashierNavigationConfig: NavigationConfig = {
  items: [
    {
      label: 'Dashboard',
      href: '/vault/cashier/shifts',
      icon: LayoutDashboard,
    },
    {
      label: 'Payouts',
      href: '/vault/cashier/payouts',
      icon: DollarSign,
    },
    {
      label: 'Float Requests',
      href: '/vault/cashier/float-requests',
      icon: Wallet,
    },
    {
      label: 'Activity',
      href: '/vault/cashier/activity',
      icon: Clock,
    },
  ],
};
