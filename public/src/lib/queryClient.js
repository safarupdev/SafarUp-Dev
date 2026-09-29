import { QueryClient } from '@tanstack/react-query';

/**
 * Public content is read-only and identical for every anonymous visitor, so it
 * is cached aggressively — DESIGN_SYSTEM.md §1 and §10: a slow page is not
 * premium.
 *
 * `retry` deliberately does not retry 404: a DRAFT or unknown slug is a
 * terminal answer, and retrying it only delays the "not found" state the
 * visitor is owed (API.destination.contract.md §2.2).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const status = error?.response?.status;
        if (status === 404) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
    },
  },
});
