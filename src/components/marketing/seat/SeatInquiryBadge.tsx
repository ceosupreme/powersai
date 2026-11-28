import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { seatBadgeText } from '@/lib/aiSeat';
export function SeatInquiryBadge({qualifier}: {qualifier: unknown}) {
  const text = seatBadgeText(qualifier);
  return text ? <Badge variant="secondary" className="text-xs font-normal">{text}</Badge> : null;
}
export function LeadSeatBadge({inboundId}: {inboundId?: string | null}) {
  const {data} = useQuery({queryKey: ['seat-lead-badge', inboundId], enabled: !!inboundId, staleTime: 60000, queryFn: async () => {
    if (!inboundId) return null;
    const {data, error} = await supabase.from('inbound_leads').select('project_type,qualifier_data').eq('id', inboundId).maybeSingle();
    if (error) throw error;
    return data?.project_type === 'ai_seat' ? data.qualifier_data : null;
  }});
  return <SeatInquiryBadge qualifier={data} />;
}