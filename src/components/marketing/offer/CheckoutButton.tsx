import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { trackSiteEvent } from '@/lib/studioAnalytics';
import { CONTACT_EMAIL } from '@/lib/siteContact';

type Product = 'launch_site_deposit' | 'launch_site_monthly' | 'care_seat';

export function CheckoutButton({ product, label, sourceVertical, originPath }: { product: Product; label: string; sourceVertical?: string; originPath?: string }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const loc = useLocation();
  const q = new URLSearchParams(loc.search);
  const src = q.get('src');
  const onIndustry = !!originPath?.startsWith('/for/');
  const start = async () => {
    if (busy) return;
    setBusy(true); setFailed(false);
    trackSiteEvent({ event_type: 'cta_click', label: `buy_${product}` });
    const biz = q.get('biz');
    const source_vertical = sourceVertical ?? src?.match(/^for-([a-z0-9-]{2,40})$/)?.[1] ?? null;
    let navigated = false;
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', { body: { product_key: product, src: src ?? (sourceVertical ? `for-${sourceVertical}` : null), biz, source_vertical, origin_path: originPath ?? null } });
      if (error || !data?.url) throw error ?? new Error('No checkout url');
      navigated = true;
      window.location.assign(data.url);
    } catch {
      setFailed(true);
      trackSiteEvent({ event_type: 'cta_click', label: `checkout_error_${product}` });
    } finally {
      if (!navigated) setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <Button type="button" className="studio-btn studio-btn-primary" onClick={start} disabled={busy}>{busy && <Loader2 className="animate-spin" aria-hidden />}{label}</Button>
      {failed && <p role="alert" className="max-w-sm text-sm text-destructive">Checkout could not start. Email <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or use the <a className="underline" href={onIndustry ? '#inquiry' : '#contact'}>inquiry form below</a> and I will send a payment link.</p>}
    </div>
  );
}
