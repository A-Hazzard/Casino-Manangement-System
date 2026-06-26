import type { FC } from 'react';
import { isTabAvailable } from '@/lib/constants/maintenance';

export type CabinetSection = 'cabinets' | 'smib' | 'movement' | 'firmware';

type CabinetTab = {
  id: CabinetSection;
  label: string;
  icon: FC<{ className?: string }>;
  /** false when this tab is under maintenance */
  available: boolean;
};

import { HardDrive, MonitorPlay, Package, Settings } from 'lucide-react';

export const CABINET_TABS_CONFIG: CabinetTab[] = [
  {
    id: 'cabinets',
    label: 'Machines',
    icon: MonitorPlay,
    available: isTabAvailable('cabinets', 'cabinets'),
  },
  {
    id: 'movement',
    label: 'Movement Requests',
    icon: Package,
    available: isTabAvailable('cabinets', 'movement'),
  },
  {
    id: 'smib',
    label: 'SMIB Management',
    icon: Settings,
    available: isTabAvailable('cabinets', 'smib'),
  },
  {
    id: 'firmware',
    label: 'SMIB Firmware',
    icon: HardDrive,
    available: isTabAvailable('cabinets', 'firmware'),
  },
];
