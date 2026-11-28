import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useStudioHead } from '@/components/marketing/studio/useStudioHead';
import { supabase } from '@/integrations/supabase/client';
import { StudioHeader } from '@/components/marketing/studio/StudioHeader';
import { StudioFooter } from '@/components/marketing/studio/StudioFooter';
import { SeatContent } from '@/components/marketing/seat/SeatContent';
import { safeSeatUrl, seatCanonical, seatQualifier, SEAT_SHARE_FALLBACK, type SeatPage, type SeatTown } from '@/lib/aiSeat';
import NotFound from './NotFound';
import '@/components/marketing/seat/seat.css';

export default function AiSeat() {
  const { category = '', town } = useParams();
  const preview = new URLSearchParams(window.location.search).get('preview') === '1';
  const {data, isLoading, isError} = useQuery({queryKey: ['ai-seat', category, preview], staleTime: 0, queryFn: async () => {
    let q = supabase.from('ai_seat_pages').select('*').eq('slug', category);
    if (!preview) q = q.eq('status', 'published');
    const {data: p, error} = await q.maybeSingle(); if (error) throw error; if (!p) return null;
    const {data: towns, error: te} = await supabase.from('ai_seat_availability').select('*').eq('page_id', p.id).order('sort_order'); if (te) throw te;
    return {page: p as unknown as SeatPage, towns: (towns || []) as unknown as SeatTown[]};
  }});
  useStudioHead({title: data?.page.meta_title || '', description: data?.page.meta_description || '', path: `/seat/${category}`, canonicalPath: `/seat/${category}`});
  useEffect(() => {
    if (!data) return;
    const image = safeSeatUrl(data.page.share_image_url) || SEAT_SHARE_FALLBACK;
    const undo: (() => void)[] = [];
    for (const [attr, key, value] of [['property','og:image',image],['property','og:type','website'],['name','twitter:image',image],['name','twitter:card','summary_large_image'],...(preview ? [['name','robots','noindex, nofollow']] : [])]) {
      const existing = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      const el = existing || document.createElement('meta'); const old = el.content;
      el.setAttribute(attr, key); el.content = value; if (!existing) document.head.appendChild(el);
      undo.push(() => { if (existing) el.content = old; else el.remove(); });
    }
    return () => undo.forEach(fn => fn());
  }, [data, preview]);
  useEffect(() => { document.documentElement.classList.add('stm-public'); return () => document.documentElement.classList.remove('stm-public'); }, []);
  if (isLoading) return <div role="status">Loading…</div>;
  if (isError) return <main><p role="alert">Unable to load this page. Please try again.</p></main>;
  if (!data || (town && !data.towns.some(t => t.town_slug === town))) return <NotFound />;
  const p = data.page;
  return <div className="stm-studio ai-seat-site"><StudioHeader /><SeatContent key={`${p.id}-${town || ''}`} page={p} towns={data.towns} initialTown={town} onSubmit={async (form, selected, angle, intent) => {
    const f = new FormData(form); if (f.get('website_confirm')) throw new Error('Invalid submission');
    const {data: response, error} = await supabase.functions.invoke('submit-inbound-lead', {body: {name: f.get('name'), business_name: f.get('business_name'), email: f.get('email'), phone: f.get('phone') || null, message: String(f.get('message') || '').trim() || `${p.category} · ${selected.town} · ${intent}`, project_type: 'ai_seat', qualifier_data: seatQualifier(p, selected.town, angle, intent), conversation_channel: 'form'}});
    if (error || response?.error) throw error || new Error(response.error);
  }} /><StudioFooter /></div>;
}