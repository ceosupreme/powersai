import { Link } from 'react-router-dom';
import { ArrowRight, CircleCheck, CircleHelp, CircleX } from 'lucide-react';
import { trackSiteEvent } from '@/lib/studioAnalytics';
import { marketingGapCount, type MarketingSection, type MarketingTone } from './marketingReport';

const ICON: Record<MarketingTone, { Icon: typeof CircleCheck; color: string }> = {
  ok: { Icon: CircleCheck, color: '#1F8A4C' },
  gap: { Icon: CircleX, color: '#D93B2B' },
  unknown: { Icon: CircleHelp, color: '#94A3B8' },
};

/** "Your marketing" on the checkup report: where they show up on Google,
 *  their listing, online orders, ad tags and how their site looks in Google
 *  results. Each line says what was found and, for a gap, what it costs. */
export function MarketingCard({ sections }: { sections: MarketingSection[] }) {
  if (sections.length === 0) return null;
  const gaps = marketingGapCount(sections);
  return (
    <section aria-labelledby="checkup-marketing-title" className="check-marketing rounded-2xl border border-[#D2D8E1] bg-white p-6 md:p-10">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8A5A08]">Your marketing</p>
      <h3 id="checkup-marketing-title" className="mt-3 font-display text-3xl md:text-4xl leading-[1.1] text-[#0B1530]">
        {gaps > 0 ? `${gaps} thing${gaps === 1 ? '' : 's'} to fix in your marketing` : 'Your marketing basics are in place'}
      </h3>
      <div className="mt-6 space-y-8">
        {sections.map((s) => (
          <div key={s.key} className="border-t border-[#E6EAF0] pt-6">
            <p className="text-lg font-bold text-[#0B1530]">{s.heading}</p>
            {s.intro && <p className="mt-1 text-base text-[#4A5568]">{s.intro}</p>}
            <ul className="mt-4 space-y-4">
              {s.rows.map((r, i) => {
                const { Icon, color } = ICON[r.tone];
                return (
                  <li key={`${s.key}-${i}`} className="flex items-start gap-3">
                    <Icon className="mt-0.5 h-6 w-6 shrink-0" style={{ color }} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <p className={`text-lg leading-snug ${r.tone === 'unknown' ? 'text-[#4A5568]' : 'text-[#0B1530]'} ${r.badge ? 'font-semibold' : ''}`}>{r.title}</p>
                        {r.badge && (
                          <span
                            className="shrink-0 rounded-full px-3 py-0.5 text-base font-bold"
                            style={r.tone === 'ok' ? { color: '#17663A', background: '#1F8A4C1A' } : { color: '#B42318', background: '#D93B2B14' }}
                          >
                            {r.badge}
                          </span>
                        )}
                      </div>
                      {r.detail && <p className="mt-1 text-base leading-relaxed text-[#334155]">{r.detail}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      {gaps > 0 && (
        <Link
          to="/services/marketing"
          onClick={() => {
            trackSiteEvent({ event_type: 'cta_click', label: 'audit_marketing_card' });
            // The site doesn't reset scroll between pages; open the next one at its top.
            requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior }));
          }}
          className="mt-8 inline-flex items-center gap-2 text-base font-semibold text-[#8A5A08] underline-offset-4 hover:underline"
        >
          See how we fix this <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </section>
  );
}
