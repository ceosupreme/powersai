import { shortAddress, type OnlineScore } from './checkupReport';

/** Green when a part is strong, gold when it's middling, red when it's weak. */
function tone(share: number) {
  if (share >= 0.8) return { bar: '#1F8A4C', text: '#17663A', word: 'Strong' };
  if (share >= 0.5) return { bar: '#E09A1F', text: '#8A5A08', word: 'Room to grow' };
  return { bar: '#D93B2B', text: '#B42318', word: 'Needs work' };
}

/** The online score at the top of the checkup report: one big number out of
 *  100 and the three parts it's made of, each with the reason in plain words.
 *  When the listing is known, the card opens with which Google listing was
 *  checked, so a visitor can tell right away if it's the wrong business. */
export function ScoreCard({ score, listing, onWrongBusiness }: {
  score: OnlineScore;
  listing?: { name?: string | null; address?: string | null } | null;
  onWrongBusiness?: () => void;
}) {
  const overall = tone(score.total / 100);
  const address = shortAddress(listing?.address);
  return (
    <section aria-labelledby="checkup-score-title" className="rounded-2xl border border-[#D2D8E1] bg-white p-6 md:p-10">
      {listing?.name && (
        <div className="mb-7 flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-b border-[#E6EAF0] pb-5">
          <div className="flex min-w-0 items-start gap-3">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke="#C97A08" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z" />
              <circle cx="12" cy="9.5" r="2.5" />
            </svg>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#4A5568]">Google listing we checked</p>
              <p className="mt-1 text-lg font-bold leading-snug text-[#0B1530]">{listing.name}</p>
              {address && <p className="mt-0.5 text-base text-[#4A5568]">{address}</p>}
            </div>
          </div>
          {onWrongBusiness && (
            <button type="button" onClick={onWrongBusiness} className="check-wrong-biz shrink-0 text-base font-semibold text-[#8A5A08] underline underline-offset-4 hover:text-[#0B1530]">
              Not your business?
            </button>
          )}
        </div>
      )}
      <p id="checkup-score-title" className="text-xs font-bold uppercase tracking-[0.2em] text-[#8A5A08]">Your online score</p>
      <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-2">
        <p className="font-display leading-none text-[#0B1530]">
          <span className="text-7xl md:text-8xl font-extrabold tracking-tight">{score.total}</span>
          <span className="ml-2 text-2xl md:text-3xl font-semibold text-[#0B1530]/45">out of 100</span>
        </p>
        <span className="mb-2 rounded-full px-3 py-1 text-sm font-bold" style={{ color: overall.text, background: `${overall.bar}1A` }}>{overall.word}</span>
      </div>
      <p className="mt-4 max-w-2xl text-lg md:text-xl font-medium text-[#0B1530]">{score.summary}</p>

      <ul className="mt-8 space-y-6">
        {score.parts.map((part) => {
          const share = part.points == null ? 0 : part.points / part.max;
          const t = tone(share);
          return (
            <li key={part.key}>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-lg md:text-xl font-bold text-[#0B1530]">{part.label}</span>
                <span className="shrink-0 text-lg md:text-xl font-bold" style={{ color: part.points == null ? '#4A5568' : t.text }}>
                  {part.points == null ? 'Not checked' : <>{part.points}<span className="text-base font-semibold text-[#0B1530]/45"> of {part.max}</span></>}
                </span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#E6EAF0]" aria-hidden="true">
                {part.points != null && <div className="h-full rounded-full" style={{ width: `${Math.max(3, share * 100)}%`, background: t.bar }} />}
              </div>
              <p className="mt-2 text-base text-[#334155]">{part.reason}</p>
            </li>
          );
        })}
      </ul>
      <p className="mt-8 border-t border-[#E6EAF0] pt-4 text-sm text-[#4A5568]">
        Built only from what we checked today: where you rank on Google, your Google listing and reviews, and your website.
      </p>
    </section>
  );
}
