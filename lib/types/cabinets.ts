import type { CabinetSection } from '@/lib/constants/cabinets';

export type UseCabinetNavigationReturn = {
  activeSection: CabinetSection;
  handleSectionChange: (section: CabinetSection) => void;
};
