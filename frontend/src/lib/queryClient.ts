import { QueryClient } from "@tanstack/react-query";

/** Shared React Query client. Server state lives here; client/UI state stays in Zustand. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});
