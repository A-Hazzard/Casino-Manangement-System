import { Building2, ClipboardList, Globe, MessageSquare, Users } from 'lucide-react';
import type { FC } from 'react';
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
  icon: FC<{ className?: string }>;
  /** false when the tab is under maintenance (controlled by NEXT_PUBLIC_ADMINISTRATION_<TAB>) */
  available: boolean;
};

export const ADMINISTRATION_TABS_CONFIG: AdministrationTab[] = [
  {
    id: 'users',
    label: 'Users',
    icon: Users,
    available: isTabAvailable('administration', 'users'),
  },
  {
    id: 'licencees',
    label: 'Licencees',
    icon: Building2,
    available: isTabAvailable('administration', 'licencees'),
  },
  {
    id: 'countries',
    label: 'Countries',
    icon: Globe,
    available: isTabAvailable('administration', 'countries'),
  },
  {
    id: 'activity-logs',
    label: 'Activity Logs',
    icon: ClipboardList,
    available: isTabAvailable('administration', 'activity-logs'),
  },
  {
    id: 'feedback',
    label: 'Feedback',
    icon: MessageSquare,
    available: isTabAvailable('administration', 'feedback'),
  },
];
