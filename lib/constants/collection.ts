import type { CollectionTab } from '@/lib/types/collection';
import { isTabAvailable } from '@/lib/constants/maintenance';
import { Calendar, FileText, Zap } from 'lucide-react';

export const COLLECTION_TABS_CONFIG: CollectionTab[] = [
  {
    id: 'collection',
    label: 'Collection Reports',
    icon: FileText,
    available: isTabAvailable('collection-report', 'collection'),
  },
  {
    id: 'collection-v2',
    label: 'Collection Reports - V2',
    icon: Zap,
    available: isTabAvailable('collection-report', 'collection-v2'),
    highlight: true,
  },
  {
    id: 'monthly',
    label: 'Monthly Report',
    icon: Calendar,
    available: isTabAvailable('collection-report', 'monthly'),
  },
  // {
  //   id: 'manager',
  //   label: 'Manager Schedule',
  //   icon: FolderOpen,
  //   available: isTabAvailable('collection-report', 'manager'),
  // },
  // {
  //   id: 'collector',
  //   label: 'Collectors Schedule',
  //   icon: Users,
  //   available: isTabAvailable('collection-report', 'collector'),
  // },
  // Manager Schedule and Collectors Schedule are currently not in use until specified
];
