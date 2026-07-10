// Custom hero flow diagram — inline SVG, two-stage animation.
// Stage A: fragmented paths ending in coral dead-ends.
// Stage B: single cobalt→cyan connected path terminating in a green completion.
// Slow A↔B loop via CSS keyframes; static Stage B under prefers-reduced-motion.

export function HeroFlow() {
  return (
    <div id="hero-flow" className="stm-hero-flow relative w-full">
      <style>{`
        .stm-hero-flow { --pathw: 2; }
        .stm-hero-flow .stage { transition: opacity 0.8s ease; }
        @keyframes stm-hero-toggle {
          0%, 42% { opacity: 1; }
          50%, 92% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes stm-hero-toggle-b {
          0%, 42% { opacity: 0; }
          50%, 92% { opacity: 1; }
          100% { opacity: 0; }
        }
        .stm-hero-flow .stage-a { animation: stm-hero-toggle 9s ease-in-out infinite; }
        .stm-hero-flow .stage-b { animation: stm-hero-toggle-b 9s ease-in-out infinite; }
        @keyframes stm-hero-draw {
          from { stroke-dashoffset: 720; }
          to   { stroke-dashoffset: 0; }
        }
        .stm-hero-flow .draw {
          stroke-dasharray: 720;
          stroke-dashoffset: 720;
          animation: stm-hero-draw 2.2s ease-out forwards;
          animation-delay: 0.3s;
        }
        @media (prefers-reduced-motion: reduce) {
          .stm-hero-flow .stage-a { opacity: 0 !important; animation: none !important; }
          .stm-hero-flow .stage-b { opacity: 1 !important; animation: none !important; }
          .stm-hero-flow .draw { stroke-dashoffset: 0 !important; animation: none !important; }
        }
      `}</style>

      <svg
        viewBox="0 0 640 520"
        role="img"
        aria-label="An inquiry arrives; on disconnected systems it dead-ends, on a connected path it becomes a booked customer."
        className="h-auto w-full"
      >
        <defs>
          <linearGradient id="stmGrad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#465CFF" />
            <stop offset="100%" stopColor="#55D6FF" />
          </linearGradient>
          <marker id="stmArrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#465CFF" />
          </marker>
        </defs>

        {/* ── STAGE A — disconnected, dead-ends ───────────────────────── */}
        <g className="stage stage-a">
          {/* inquiry sources */}
          <g transform="translate(28,80)">
            <rect x="0" y="0" width="80" height="44" rx="8" fill="#FFFFFF" stroke="#5F6672" />
            <text x="40" y="27" textAnchor="middle" fontSize="13" fill="#101218" fontFamily="Instrument Sans, sans-serif">Phone</text>
          </g>
          <g transform="translate(28,180)">
            <rect x="0" y="0" width="80" height="44" rx="8" fill="#FFFFFF" stroke="#5F6672" />
            <text x="40" y="27" textAnchor="middle" fontSize="13" fill="#101218" fontFamily="Instrument Sans, sans-serif">Website</text>
          </g>

          {/* disconnected tool nodes */}
          <g fontFamily="Instrument Sans, sans-serif" fontSize="12" fill="#5F6672">
            <rect x="260" y="60" width="90" height="40" rx="6" fill="none" stroke="#B4B8C1" strokeDasharray="3 3" />
            <text x="305" y="84" textAnchor="middle">CRM</text>
            <rect x="260" y="140" width="90" height="40" rx="6" fill="none" stroke="#B4B8C1" strokeDasharray="3 3" />
            <text x="305" y="164" textAnchor="middle">Schedule</text>
            <rect x="260" y="220" width="90" height="40" rx="6" fill="none" stroke="#B4B8C1" strokeDasharray="3 3" />
            <text x="305" y="244" textAnchor="middle">Inbox</text>
          </g>

          {/* dead-end paths (grey) */}
          <path d="M108 102 C 180 102, 200 80, 260 80" fill="none" stroke="#B4B8C1" strokeWidth="2" />
          <path d="M108 202 C 180 202, 200 240, 260 240" fill="none" stroke="#B4B8C1" strokeWidth="2" />
          <path d="M108 202 C 180 202, 200 160, 260 160" fill="none" stroke="#B4B8C1" strokeWidth="2" strokeDasharray="4 5" />

          {/* dead-end chips */}
          <g transform="translate(410,60)">
            <rect width="180" height="40" rx="20" fill="#FCEEEC" stroke="#E15C4A" />
            <text x="90" y="25" textAnchor="middle" fontSize="14" fontFamily="Inter Tight, sans-serif" fontWeight="700" fill="#E15C4A">NO REPLY</text>
          </g>
          <g transform="translate(410,220)">
            <rect width="200" height="40" rx="20" fill="#FCEEEC" stroke="#E15C4A" />
            <text x="100" y="25" textAnchor="middle" fontSize="14" fontFamily="Inter Tight, sans-serif" fontWeight="700" fill="#E15C4A">SEEN 3 DAYS LATE</text>
          </g>
          {/* connector to chips */}
          <path d="M350 80 L 410 80" fill="none" stroke="#E15C4A" strokeWidth="2" />
          <path d="M350 240 L 410 240" fill="none" stroke="#E15C4A" strokeWidth="2" />

          {/* label */}
          <text x="320" y="460" textAnchor="middle" fontFamily="Instrument Sans, sans-serif" fontSize="14" fill="#5F6672">
            Tools that don't talk to each other
          </text>
        </g>

        {/* ── STAGE B — connected, booked ─────────────────────────────── */}
        <g className="stage stage-b" opacity="0">
          {/* inquiry source */}
          <g transform="translate(20,220)">
            <rect x="0" y="0" width="90" height="60" rx="10" fill="#FFFFFF" stroke="#101218" strokeWidth="1.5" />
            <text x="45" y="27" textAnchor="middle" fontSize="12" fontFamily="Instrument Sans, sans-serif" fill="#5F6672">INQUIRY</text>
            <text x="45" y="46" textAnchor="middle" fontSize="13" fontFamily="Inter Tight, sans-serif" fontWeight="700" fill="#101218">Phone · Web</text>
          </g>

          {/* connected path */}
          <path
            className="draw"
            d="M110 250 C 170 250, 190 120, 260 120 L 380 120 C 460 120, 470 260, 540 260"
            fill="none"
            stroke="url(#stmGrad)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            className="draw"
            d="M540 260 C 560 260, 570 260, 580 260"
            fill="none"
            stroke="url(#stmGrad)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* step labels along the path */}
          <g fontFamily="Inter Tight, sans-serif" fontSize="14" fontWeight="700">
            <g transform="translate(160,90)">
              <rect x="0" y="0" width="180" height="34" rx="17" fill="#E9EDFF" stroke="#465CFF" />
              <text x="90" y="22" textAnchor="middle" fill="#101218">ANSWERED IN SECONDS</text>
            </g>
            <g transform="translate(360,90)">
              <rect x="0" y="0" width="120" height="34" rx="17" fill="#E9EDFF" stroke="#465CFF" />
              <text x="60" y="22" textAnchor="middle" fill="#101218">QUALIFIED</text>
            </g>
            <g transform="translate(400,230)">
              <rect x="0" y="0" width="100" height="34" rx="17" fill="#E9EDFF" stroke="#465CFF" />
              <text x="50" y="22" textAnchor="middle" fill="#101218">BOOKED</text>
            </g>
            <g transform="translate(400,290)">
              <rect x="0" y="0" width="180" height="34" rx="17" fill="#E9EDFF" stroke="#465CFF" />
              <text x="90" y="22" textAnchor="middle" fill="#101218">OWNER NOTIFIED</text>
            </g>
          </g>

          {/* completion */}
          <g transform="translate(580,244)">
            <circle cx="16" cy="16" r="16" fill="#198A5A" />
            <path d="M9 16 L14 21 L23 12" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>

          <text x="320" y="460" textAnchor="middle" fontFamily="Instrument Sans, sans-serif" fontSize="14" fill="#5F6672">
            One connected path — every inquiry answered, booked, and owner notified
          </text>
        </g>
      </svg>
    </div>
  );
}