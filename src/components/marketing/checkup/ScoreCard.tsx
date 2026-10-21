import type { OnlineScore } from './checkupReport';

/** Green when a part is strong, gold when it's middling, red when it's weak. */
function tone(share: number) {
  if (share >= 0.8) return { bar: '#1F8A4C', text: '#17663A', word: 'Strong' };
  if (share >= 0.5) return { bar: '#E09A1F', text: '#8A5A08', word: 'Room to grow' };
  return { bar: '#D93B2B', text: '#B42318', word: 'Needs work' };
}

/** The online score at the top of the checkup report: one big number out of
 *  100 and the three parts it's made of, each with the reason in plain words. */
export function ScoreCard({ score }: { score: OnlineScore }) {
  const overall = tone(score.total / 100);
  return (
    <section aria-labelledby="checkup-score-title" className="rounded-2xl border border-[#D2D8E1] bg-white p-6 md:p-10">
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
