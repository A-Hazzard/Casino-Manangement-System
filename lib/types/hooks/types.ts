import { ReactElement } from 'react';
import { MembersView } from '@/shared/types/entities';
import { ReportView } from '@/shared/types/reports';

export type AnimationVariants = {
  initial: Record<string, string | number>;
  animate: Record<string, string | number>;
  exit: Record<string, string | number>;
};

export type AnimationConfig = {
  tabVariants: AnimationVariants;
};

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


