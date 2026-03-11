/**
 * Type definitions for custom hooks
 * Centralized types for all custom hook interfaces and return types
 */

import { ReactElement } from 'react';
import { MembersView } from '@/shared/types/entities';
import { ReportView } from '@/lib/types/reports';

// Animation types
export type AnimationVariants = {
  initial: Record<string, string | number>;
  animate: Record<string, string | number>;
  exit: Record<string, string | number>;
};

export type AnimationConfig = {
  tabVariants: AnimationVariants;
};

// Tab content types
export type TabComponents<T extends string> = Record<T, ReactElement>;

export type TabAnimationProps = {
  key: string;
  variants: AnimationVariants;
  initial: string;
  animate: string;
  exit: string;
  transition: { duration: number };
  className: string;
};

// Members tab content types
export type UseMembersTabContentProps = {
  activeTab: MembersView;
  animations: AnimationConfig;
  tabComponents: TabComponents<MembersView>;
};

export type UseMembersTabContentReturn = {
  getTabAnimationProps: () => TabAnimationProps;
  isTabTransitioning: boolean;
  currentTabComponent: ReactElement;
};

// Reports tab content types
export type UseReportsTabContentProps = {
  activeView: ReportView;
  animations: AnimationConfig;
  tabComponents: TabComponents<ReportView>;
};

export type UseReportsTabContentReturn = {
  getTabAnimationProps: () => TabAnimationProps;
  isTabTransitioning: boolean;
  currentTabComponent: ReactElement;
};


