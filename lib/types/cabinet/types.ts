import type { CabinetSection } from '@/lib/constants';

export type UseCabinetNavigationReturn = {
  activeSection: CabinetSection;
  handleSectionChange: (section: CabinetSection) => void;
};

