// Manual fallback for the website audit. Lets owners/GMs record which key
// pages exist and add notes when the automated crawl can't see the site.

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { websiteStatusKey } from './useWebsiteStatus';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  venueId: string;
  venueName: string;
};

const PAGES: Array<{ key: string; label: string }> = [
  { key: 'has_menu_page', label: 'Menu page' },
  { key: 'has_happy_hour_page', label: 'Happy hour / specials page' },
  { key: 'has_events_page', label: 'Events / calendar page' },
  { key: 'has_private_party_page', label: 'Private parties / group events page' },
  { key: 'private_party_has_form', label: '… with inquiry form' },
  { key: 'private_party_linked_from_home', label: '… linked from homepage' },
  { key: 'has_contact_page', label: 'Contact page' },
  { key: 'has_contact_form', label: '… with form' },
  { key: 'has_about_page', label: 'About page' },
  { key: 'has_reservations_page', label: 'Reservations / booking page' },
  { key: 'has_email_signup', label: 'Email signup mechanism' },
  { key: 'has_social_links', label: 'Social media links' },
  { key: 'has_localbusiness_schema', label: 'Restaurant / LocalBusiness schema' },
];

export const WebsiteManualEntryDrawer = ({ open, onOpenChange, venueId, venueName }: Props) => {
  const [state, setState] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const submit = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        venue_id: venueId,
        source: 'manual',
        scope: 'manual_entry',
        notes: notes || null,
      };
      for (const p of PAGES) payload[p.key] = !!state[p.key];
      const { error } = await supabase.from('website_snapshots').insert(payload as never);
      if (error) throw error;
      toast.success('Manual snapshot recorded');
      qc.invalidateQueries({ queryKey: websiteStatusKey(venueId) });
      onOpenChange(false);
      setState({});
      setNotes('');
    } catch (e) {
      toast.error('Save failed', { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Manual Website Audit · {venueName}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          {PAGES.map((p) => (
            <div key={p.key} className="flex items-center gap-2">
              <Checkbox
                id={p.key}
                checked={!!state[p.key]}
                onCheckedChange={(v) => setState((s) => ({ ...s, [p.key]: !!v }))}
              />
              <Label htmlFor={p.key} className="text-sm cursor-pointer">{p.label}</Label>
            </div>
          ))}
          <div className="pt-3">
            <Label htmlFor="notes" className="text-sm">Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="mt-1" />
          </div>
          <Button className="w-full" disabled={saving} onClick={submit}>
            {saving ? 'Saving…' : 'Save snapshot'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
