// Three spot illustrations in the same line-icon language as the hero flow.
// Line weight 2, stroke #101218, one coral highlight per scene.

export function PhoneAtNight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 180" role="img" aria-label="A phone rings at night, unanswered." className={className} fill="none" stroke="#101218" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* moon */}
      <path d="M170 30 A 18 18 0 1 0 170 66 A 14 14 0 1 1 170 30 Z" fill="#E9EDFF" stroke="#5F6672" />
      {/* phone */}
      <rect x="60" y="60" width="70" height="110" rx="10" fill="#FFFFFF" />
      <rect x="66" y="70" width="58" height="80" rx="2" fill="#F7F8FA" stroke="#5F6672" />
      <circle cx="95" cy="160" r="3" fill="#101218" stroke="none" />
      {/* ring waves — coral */}
      <path d="M40 80 Q 30 100 40 120" stroke="#E15C4A" />
      <path d="M30 70 Q 15 100 30 130" stroke="#E15C4A" />
      <path d="M150 80 Q 160 100 150 120" stroke="#E15C4A" />
      <path d="M160 70 Q 175 100 160 130" stroke="#E15C4A" />
    </svg>
  );
}

export function FadingQuote({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 180" role="img" aria-label="A quote sits on a desk, fading, unanswered." className={className} fill="none" stroke="#101218" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="40" y="30" width="120" height="130" rx="4" fill="#FFFFFF" />
      <rect x="52" y="30" width="120" height="130" rx="4" fill="#FFFFFF" opacity="0.5" />
      <text x="52" y="58" fontFamily="Inter Tight, sans-serif" fontSize="13" fontWeight="700" fill="#101218" stroke="none">QUOTE</text>
      <line x1="52" y1="72" x2="148" y2="72" />
      <line x1="52" y1="86" x2="148" y2="86" opacity="0.7" />
      <line x1="52" y1="100" x2="148" y2="100" opacity="0.55" />
      <line x1="52" y1="114" x2="130" y2="114" opacity="0.4" />
      <line x1="52" y1="128" x2="120" y2="128" opacity="0.25" />
      <text x="100" y="152" textAnchor="middle" fontFamily="Instrument Sans, sans-serif" fontSize="11" fill="#E15C4A" stroke="none">no reply</text>
    </svg>
  );
}

export function LateReport({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 180" role="img" aria-label="A report arrives after the money has already been spent." className={className} fill="none" stroke="#101218" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="30" y="40" width="140" height="100" rx="6" fill="#FFFFFF" />
      {/* bar chart */}
      <line x1="46" y1="120" x2="154" y2="120" />
      <rect x="52" y="90" width="16" height="30" fill="#5F6672" stroke="none" />
      <rect x="76" y="70" width="16" height="50" fill="#5F6672" stroke="none" />
      <rect x="100" y="80" width="16" height="40" fill="#5F6672" stroke="none" />
      <rect x="124" y="60" width="16" height="60" fill="#E15C4A" stroke="none" />
      {/* clock */}
      <circle cx="160" cy="40" r="16" fill="#FFFFFF" stroke="#E15C4A" />
      <path d="M160 30 L160 40 L168 44" stroke="#E15C4A" />
      <text x="100" y="160" textAnchor="middle" fontFamily="Instrument Sans, sans-serif" fontSize="11" fill="#5F6672" stroke="none">yesterday's numbers, today</text>
    </svg>
  );
}