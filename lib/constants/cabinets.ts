export type CabinetSection = 'cabinets' | 'smib' | 'movement' | 'firmware';

export type CabinetTab = {
  id: CabinetSection;
  label: string;
  icon: string;
};

export const CABINET_TABS_CONFIG: CabinetTab[] = [
  {
    id: 'cabinets',
    label: 'Machines',
    icon: '🎰',
  },
  {
    id: 'movement',
    label: 'Movement Requests',
    icon: '📦',
  },
  {
    id: 'smib',
    label: 'SMIB Management',
    icon: '⚙️',
  },
  {
    id: 'firmware',
    label: 'SMIB Firmware',
    icon: '💾',
  },
];
