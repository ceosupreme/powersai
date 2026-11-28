import { Phone, Mail, ExternalLink } from 'lucide-react';
import type { Prospect } from '@/hooks/useProspects';
import { useSalesSettings } from '@/hooks/useSalesDesk';
import { SalesContactActions } from './SalesContactActions';

const btn = 'inline-flex h-10 w-10 items-center justify-center rounded-md border bg-background hover:bg-muted';

/** Tap-to-call, tap-to-email and open-post links, shown only when the value exists. Call and email are hidden on a do-not-contact lead. */
export const LeadContactIcons = ({ p }: { p: Prospect }) => {
  const {data:settings}=useSalesSettings();
  return (
  <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
    {settings&&<SalesContactActions compact lead={p} settings={settings} rep="Your rep" />}
    {p.source_url && <a className={btn} href={p.source_url} target="_blank" rel="noopener noreferrer" aria-label="Open where we found them"><ExternalLink className="h-4 w-4" /></a>}
  </div>
); };
