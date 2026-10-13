import { Link } from 'react-router-dom';
import { ArrowRight, CircleAlert, CircleCheck, CircleX } from 'lucide-react';
import type { WebsiteCheck } from '@/hooks/usePublicAudit';
import { trackSiteEvent } from '@/lib/studioAnalytics';

/**
 * "Your website" on the free checkup report: what the checkup found when it
 * opened their homepage (and Google's phone speed test, when it answered).
 * Free to see, no email. Only what was actually checked gets a line; a
 * check that couldn't be read is left out rather than shown as a failure.
 */
type Tone = 'ok' | 'warn' | 'bad';
type Row = { tone: Tone; text: string };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function websiteRows(site: WebsiteCheck): Row[] {
  const rows: Row[] = [];
  if (site.status === 'unreachable') rows.push({ tone: 'bad', text: `${cap(site.problem ?? "it didn't open")}.` });
  if (site.opens === true) rows.push({ tone: 'ok', text: 'It opens.' });
  if (site.secure === true) rows.push({ tone: 'ok', text: "It's secure (the lock icon in the address bar)." });
  if (site.secure === false) rows.push({ tone: 'bad', text: 'It isn\'t secure. Browsers mark it "Not secure" in the address bar.' });
  if (site.phone_ready === true) rows.push({ tone: 'ok', text: "It's set up for phones." });
  if (site.phone_ready === false) rows.push({ tone: 'bad', text: "It isn't set up for phones, so it shows up tiny on a phone screen." });
  if (site.speed && site.phone_load_seconds != null) {
    const s = `${site.phone_load_seconds.toFixed(1)} seconds in Google's speed test`;
    rows.push(
      site.speed === 'fast' ? { tone: 'ok', text: `It loads fast on a phone (${s}).` }
      : site.speed === 'ok' ? { tone: 'warn', text: `It's a little slow on a phone (${s}).` }
      : { tone: 'bad', text: `It's slow on a phone (${s}).` },
    );
  }
  if (site.contact === true) rows.push({ tone: 'ok', text: 'People can call or message you from the homepage.' });
  if (site.contact === false) rows.push({ tone: 'bad', text: "We couldn't find a phone number, contact form or contact link on the homepage." });
  if (site.source === 'typed' && site.listing_has_site === false) rows.push({ tone: 'bad', text: "Your Google listing doesn't link to it." });
  return rows;
}

function heading(site: WebsiteCheck, fixes: number): { title: string; sub?: string } {
  if (site.status === 'none') {
    return { title: 'No website on your Google listing', sub: 'People who find you on Google have nowhere to click through to.' };
  }
  if (site.status === 'social') {
    const label = site.social_label ?? 'social page';
    const where = /^directory/i.test(label) ? `a ${label}` : `your ${label}`;
    return site.source === 'typed'
      ? { title: `That address is ${where}`, sub: "That's not a website of your own." }
      : { title: `Your Google listing points to ${where}`, sub: "That's not a website of your own." };
  }
  if (site.status === 'unreachable') return { title: "We couldn't open your website" };
  if (site.status === 'blocked') {
    return { title: 'Your website has a security screen', sub: 'It stopped our check, so we could only see part of it.' };
  }
  return { title: fixes > 0 ? `${fixes} thing${fixes === 1 ? '' : 's'} to fix on your website` : 'Your website passed the basics' };
}

// The status tokens with their values as fallbacks: the checkup page's
// scope doesn't define the --stm-* tokens.
const TONE_COLOR: Record<Tone, string> = {
  ok: 'hsl(var(--stm-ok, 152 68% 32%))',
  warn: 'hsl(var(--stm-warn, 36 72% 55%))',
  bad: 'hsl(var(--stm-loss, 9 72% 59%))',
};

export function WebsiteCheckCard({ site }: { site: WebsiteCheck }) {
  const rows = websiteRows(site);
  const fixes = rows.filter((r) => r.tone !== 'ok').length;
  const { title, sub } = heading(site, fixes);
  const showCta = site.status === 'none' || site.status === 'social' || site.status === 'unreachable' || fixes > 0;

  return (
    <div className="check-website rounded-2xl border border-[hsl(var(--stm-ink))]/10 bg-white p-8 md:p-10 shadow-sm">
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-[hsl(var(--stm-cobalt))]">Your website</p>
      <h3 className="font-display text-3xl md:text-4xl leading-[1.1] text-[hsl(var(--stm-ink))]">{title}</h3>
      {sub && <p className="mt-3 text-lg text-[hsl(var(--stm-ink))]/70">{sub}</p>}
      {site.url && (
        <p className="mt-3 text-base text-[hsl(var(--stm-ink))]/55">
          {site.url}{site.source === 'google' ? ' · from your Google listing' : ''}
        </p>
      )}
      {rows.length > 0 && (
        <ul className="mt-6 space-y-3">
          {rows.map((r) => {
            const Icon = r.tone === 'ok' ? CircleCheck : r.tone === 'warn' ? CircleAlert : CircleX;
            return (
              <li key={r.text} className="flex items-start gap-3 text-lg leading-snug text-[hsl(var(--stm-ink))]">
                <Icon className="mt-0.5 h-6 w-6 shrink-0" style={{ color: TONE_COLOR[r.tone] }} aria-hidden />
                <span>{r.text}</span>
              </li>
            );
          })}
        </ul>
      )}
      {showCta && (
        <Link
          to="/services/websites"
          onClick={() => {
            trackSiteEvent({ event_type: 'cta_click', label: 'audit_website_card' });
            // The site doesn't reset scroll between pages; open the next one at its top.
            requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior }));
          }}
          className="mt-7 inline-flex items-center gap-2 text-base font-semibold text-[hsl(var(--stm-cobalt))] underline-offset-4 hover:underline"
        >
          See how we build websites <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}
