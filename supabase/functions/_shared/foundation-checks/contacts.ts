import type { FoundationCheck } from './types.ts';

export const primaryContactCheck: FoundationCheck = {
  id: 'contacts.primary',
  itemKey: 'primary_contact',
  async run(supabase, venueId) {
    const { count: vc } = await supabase
      .from('venue_contacts')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', venueId)
      .eq('is_active', true);
    if ((vc ?? 0) > 0) return { status: 'satisfied' };
    const { count: lc } = await supabase
      .from('venue_leadership_contacts')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', venueId)
      .eq('is_active', true);
    return { status: (lc ?? 0) > 0 ? 'satisfied' : 'missing' };
  },
};