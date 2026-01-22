/**
 * Cashier Navigation Configuration
 *
 * Defines navigation items for the Cashier interface in the Vault Management application.
 * Cashiers have limited navigation with only their specific pages.
 */

import { DollarSign, Clock, Wallet } from 'lucide-react';
import type { NavigationConfig } from '@/lib/types/layout/navigation';

export const cashierNavigationConfig: NavigationConfig = {
  items: [
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
      icon: Wallet,
    },
  ],
};
