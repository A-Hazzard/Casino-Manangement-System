/**
 * Cabinets Types
 * Types for cabinet navigation and section management.
 *
 * Used for managing cabinet UI navigation between different
 * sections (overview, meters, logs, etc.).
 */
import type { CabinetSection } from '@/lib/constants';

export type UseCabinetNavigationReturn = {
  activeSection: CabinetSection;
  handleSectionChange: (section: CabinetSection) => void;
};

