import { Phone, Mail, ExternalLink } from 'lucide-react';
import type { Prospect } from '@/hooks/useProspects';

const btn = 'inline-flex h-10 w-10 items-center justify-center rounded-md border bg-background hover:bg-muted';

/** Tap-to-call, tap-to-email and open-post links, shown only when the value exists. */
export const LeadContactIcons = ({ p }: { p: Prospect }) => (
  <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
    {p.phone && <a className={btn} href={`tel:${p.phone.replace(/[^\d+]/g, '')}`} aria-label={`Call ${p.business_name}`}><Phone className="h-4 w-4" /></a>}
    {p.email && <a className={btn} href={`mailto:${p.email}`} aria-label={`Email ${p.business_name}`}><Mail className="h-4 w-4" /></a>}
    {p.source_url && <a className={btn} href={p.source_url} target="_blank" rel="noopener noreferrer" aria-label="Open where we found them"><ExternalLink className="h-4 w-4" /></a>}
  </div>
);
