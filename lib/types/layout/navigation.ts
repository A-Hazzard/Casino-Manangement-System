/**
 * Navigation Configuration Types
 *
 * Defines types for config-driven navigation used by both CMS and VAULT applications.
 */

import type { LucideIcon } from 'lucide-react';

/**
 * Navigation item configuration
 */
export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permissionCheck?: (userRoles: string[]) => boolean;
  children?: NavigationItem[]; // Sub-items for expandable sections
};

/**
 * Navigation configuration for an application mode
 */
export type NavigationConfig = {
  items: NavigationItem[];
};

/**
 * Application context type
 */
export type ApplicationContext = 'CMS' | 'VAULT';
