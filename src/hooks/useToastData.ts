import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import type { ToastWidgetData } from '@/types/toast';

interface UseToastDataOptions {
  startDate?: string;
  endDate?: string;
  venueId?: string;
}

export const useToastData = (options?: UseToastDataOptions, queryOptions?: { enabled?: boolean }) => {
  const { session } = useAuth();
  
  return useQuery({
    queryKey: ['toast-data', options?.startDate, options?.endDate, options?.venueId, session?.access_token],
    queryFn: async (): Promise<ToastWidgetData> => {
      // Ensure we have a valid session before making the request
      if (!session?.access_token) {
        throw new Error('No valid session');
      }

      // Get fresh session to ensure token is valid
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      
      if (!accessToken) {
        throw new Error('Session expired');
      }

      const body: Record<string, string> = {};
      if (options?.startDate && options?.endDate) {
        body.startDate = options.startDate;
        body.endDate = options.endDate;
      }
      if (options?.venueId) {
        body.venueId = options.venueId;
      }

      const { data, error } = await supabase.functions.invoke('toast-data', {
        body,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      if (error) throw error;
      return data as ToastWidgetData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes client cache
    refetchOnWindowFocus: false,
    enabled: !!session?.access_token && (queryOptions?.enabled ?? true),
    retry: 2,
    retryDelay: 1000,
  });
};
