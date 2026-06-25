import type { FoundationCheck } from './types.ts';

async function getKitId(supabase: any, venueId: string): Promise<string | null> {
  const { data } = await supabase
    .from('brand_kits')
    .select('id')
    .eq('project_id', venueId)
    .eq('archived', false)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

export const brandLogoCheck: FoundationCheck = {
  id: 'brand.logo',
  itemKey: 'logo_uploaded',
  async run(supabase, venueId) {
    const kitId = await getKitId(supabase, venueId);
    if (!kitId) return { status: 'missing' };
    const { count } = await supabase
      .from('brand_kit_assets')
      .select('id', { count: 'exact', head: true })
      .eq('kit_id', kitId)
      .eq('asset_type', 'logo');
    return { status: (count ?? 0) > 0 ? 'satisfied' : 'missing' };
  },
};

export const brandColorsCheck: FoundationCheck = {
  id: 'brand.colors',
  itemKey: 'colors_defined',
  async run(supabase, venueId) {
    const kitId = await getKitId(supabase, venueId);
    if (!kitId) return { status: 'missing' };
    const { count } = await supabase
      .from('brand_kit_colors')
      .select('id', { count: 'exact', head: true })
      .eq('kit_id', kitId);
    const c = count ?? 0;
    return { status: c >= 2 ? 'satisfied' : c === 1 ? 'partial' : 'missing' };
  },
};

export const brandTaglineCheck: FoundationCheck = {
  id: 'brand.tagline',
  itemKey: 'tagline_defined',
  async run(supabase, venueId) {
    const kitId = await getKitId(supabase, venueId);
    if (!kitId) return { status: 'missing' };
    const { count } = await supabase
      .from('brand_kit_taglines')
      .select('id', { count: 'exact', head: true })
      .eq('kit_id', kitId);
    return { status: (count ?? 0) > 0 ? 'satisfied' : 'missing' };
  },
};