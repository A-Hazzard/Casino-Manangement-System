import { isTabAvailable } from '@/lib/constants/maintenance';

export type CabinetSection = 'cabinets' | 'smib' | 'movement' | 'firmware';

type CabinetTab = {
  id: CabinetSection;
  label: string;
  icon: string;
  /** false when this tab is under maintenance */
  available: boolean;
};

export const CABINET_TABS_CONFIG: CabinetTab[] = [
  {
    id: 'cabinets',
    label: 'Machines',
    icon: '🎰',
    available: isTabAvailable('cabinets', 'cabinets'),
  },
  {
    id: 'movement',
    label: 'Movement Requests',
    icon: '📦',
    available: isTabAvailable('cabinets', 'movement'),
  },
  {
    id: 'smib',
    label: 'SMIB Management',
    icon: '⚙️',
    available: isTabAvailable('cabinets', 'smib'),
  },
  {
    id: 'firmware',
    label: 'SMIB Firmware',
    icon: '💾',
    available: isTabAvailable('cabinets', 'firmware'),
  },
];

