import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: (failureCount, error: any) => {
        const status = error?.status || error?.code;
        if (status === 401 || status === 403 || status === 'PGRST301') return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: true,
    },
  },
});
