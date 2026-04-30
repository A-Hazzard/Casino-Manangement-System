import type { LucideIcon } from 'lucide-react';

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permissionCheck?: (userRoles: string[]) => boolean;
  children?: NavigationItem[];
  underMaintenance?: boolean;
};

export type NavigationConfig = {
  items: NavigationItem[];
};

export type ApplicationContext = 'CMS' | 'VAULT';
