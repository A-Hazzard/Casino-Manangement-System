'use client';

import { ReactNode, use } from 'react';
import { createContext, useState } from 'react';

type MembersHandlersContextType = {
  onRefresh?: () => void;
  onNewMember?: () => void;
  refreshing?: boolean;
  setOnRefresh: (handler: (() => void) | undefined) => void;
  setOnNewMember: (handler: (() => void) | undefined) => void;
  setRefreshing: (value: boolean) => void;
};

const MembersHandlersContext = createContext<
  MembersHandlersContextType | undefined
>(undefined);

export function MembersHandlersProvider({ children }: { children: ReactNode }) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const [refreshHandler, setRefreshHandler] = useState<
    (() => void) | undefined
  >(undefined);
  const [newMemberHandler, setNewMemberHandler] = useState<
    (() => void) | undefined
  >(undefined);
  const [refreshing, setRefreshing] = useState(false);

  // ============================================================================
  // Handlers
  // ============================================================================
  const setOnRefresh = (handler: (() => void) | undefined) => {
    setRefreshHandler(() => handler);
  };

  const setOnNewMember = (handler: (() => void) | undefined) => {
    setNewMemberHandler(() => handler);
  };

  // ============================================================================
  // Computed
  // ============================================================================
  // Memoize context value to prevent unnecessary re-renders
  const contextValue = ({
      onRefresh: refreshHandler,
      onNewMember: newMemberHandler,
      refreshing,
      setOnRefresh,
      setOnNewMember,
      setRefreshing,
    });

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <MembersHandlersContext.Provider value={contextValue}>
      {children}
    </MembersHandlersContext.Provider>
  );
}

export function useMembersHandlers() {
  const context = use(MembersHandlersContext);
  if (context === undefined) {
    throw new Error(
      'useMembersHandlers must be used within a MembersHandlersProvider'
    );
  }
  return context;
}
