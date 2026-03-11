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
};

export const ADMINISTRATION_TABS_CONFIG: AdministrationTab[] = [
  {
    id: 'users',
    label: 'Users',
    icon: '👤', // User emoji
  },
  {
    id: 'licencees',
    label: 'Licencees',
    icon: '🏢', // Building emoji
  },
  {
    id: 'countries',
    label: 'Countries',
    icon: '🌍', // Globe emoji
  },
  {
    id: 'activity-logs',
    label: 'Activity Logs',
    icon: '📋', // Clipboard emoji
  },
  {
    id: 'feedback',
    label: 'Feedback',
    icon: '💬', // Speech bubble emoji
  },
];

