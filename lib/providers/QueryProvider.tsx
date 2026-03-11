'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

type QueryProviderProps = {
  children: ReactNode;
};

/**
 * React Query Provider
 * Provides QueryClient to the application for data fetching, caching, and synchronization
 */
export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Prevent refetching on window focus to reduce API calls
            refetchOnWindowFocus: false,
            // Prevent refetching on reconnect
            refetchOnReconnect: false,
            // Keep data fresh for 5 minutes
            staleTime: 5 * 60 * 1000,
            // Cache data for 10 minutes
            gcTime: 10 * 60 * 1000,
            // Retry failed requests once
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
