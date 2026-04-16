import { isTabAvailable } from '@/lib/constants/maintenance';

export type AdministrationSection =
  | 'users'
  | 'licencees'
  | 'countries'
  | 'activity-logs'
  | 'feedback';

export type AdministrationTab = {
  id: AdministrationSection;
  label: string;
  icon: string;
  /** false when the tab is under maintenance (controlled by NEXT_PUBLIC_ADMINISTRATION_<TAB>) */
  available: boolean;
};

export const ADMINISTRATION_TABS_CONFIG: AdministrationTab[] = [
  {
    id: 'users',
    label: 'Users',
    icon: '👤', // User emoji
    available: isTabAvailable('administration', 'users'),
  },
  {
    id: 'licencees',
    label: 'Licencees',
    icon: '🏢', // Building emoji
    available: isTabAvailable('administration', 'licencees'),
  },
  {
    id: 'countries',
    label: 'Countries',
    icon: '🌍', // Globe emoji
    available: isTabAvailable('administration', 'countries'),
  },
  {
    id: 'activity-logs',
    label: 'Activity Logs',
    icon: '📋', // Clipboard emoji
    available: isTabAvailable('administration', 'activity-logs'),
  },
  {
    id: 'feedback',
    label: 'Feedback',
    icon: '💬', // Speech bubble emoji
    available: isTabAvailable('administration', 'feedback'),
  },
];

