import type { FoundationCheck } from './types.ts';

// `service_offers` is a global catalog (no venue/project column). To answer
// "does THIS venue have an active service offer?" we read the per-venue
// subscription link table instead.
export const offersHasCheck: FoundationCheck = {
  id: 'offers.has',
  itemKey: 'has_service_offer',
  async run(supabase, venueId) {
    const { count } = await supabase
      .from('venue_service_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', venueId)
      .eq('status', 'active');
    return { status: (count ?? 0) > 0 ? 'satisfied' : 'missing' };
  },
};

// `channel_products` is also catalog-level. Per-venue scope lives on
// `channel_product_channels.project_id` — count this venue's product/channel
// links to answer "does this venue have channel coverage?".
export const channelsHasCheck: FoundationCheck = {
  id: 'channels.has',
  itemKey: 'channel_coverage',
  async run(supabase, venueId) {
    const { count } = await supabase
      .from('channel_product_channels')
      .select('product_id', { count: 'exact', head: true })
      .eq('project_id', venueId);
    return { status: (count ?? 0) > 0 ? 'satisfied' : 'missing' };
  },
};