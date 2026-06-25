import type { FoundationCheck } from './types.ts';

export const offersHasCheck: FoundationCheck = {
  id: 'offers.has',
  itemKey: 'has_service_offer',
  async run(supabase, _venueId) {
    const { count } = await supabase
      .from('service_offers')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');
    return { status: (count ?? 0) > 0 ? 'satisfied' : 'missing' };
  },
};

export const channelsHasCheck: FoundationCheck = {
  id: 'channels.has',
  itemKey: 'channel_coverage',
  async run(supabase, _venueId) {
    const { count } = await supabase
      .from('channel_products')
      .select('id', { count: 'exact', head: true });
    return { status: (count ?? 0) > 0 ? 'satisfied' : 'missing' };
  },
};