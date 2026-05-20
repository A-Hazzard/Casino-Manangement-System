import type { CollectionTab } from '@/lib/types/collection';
import { isTabAvailable } from '@/lib/constants/maintenance';

export const COLLECTION_TABS_CONFIG: CollectionTab[] = [
  {
    id: 'collection',
    label: 'Collection Reports',
    icon: '🧾',
    available: isTabAvailable('collection-report', 'collection'),
  },
  {
    id: 'collection-v2',
    label: 'Collection Reports - V2',
    icon: '⚡',
    available: isTabAvailable('collection-report', 'collection-v2'),
    highlight: true,
  },
  {
    id: 'monthly',
    label: 'Monthly Report',
    icon: '📅',
    available: isTabAvailable('collection-report', 'monthly'),
  },
  {
    id: 'manager',
    label: 'Manager Schedule',
    icon: '🗂️',
    available: isTabAvailable('collection-report', 'manager'),
  },
  {
    id: 'collector',
    label: 'Collectors Schedule',
    icon: '👥',
    available: isTabAvailable('collection-report', 'collector'),
  },
];
