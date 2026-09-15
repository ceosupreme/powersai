type IllustrationProps = { className?: string };

const sharedProps = {
  viewBox: "0 0 120 66",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
  "aria-hidden": true,
  focusable: false,
} as const;

export function DesignIllustration({ className }: IllustrationProps) {
  return (
    <svg {...sharedProps} className={className}>
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="8" width="48" height="38" rx="3" fill="currentColor" fillOpacity="0.05" />
        <path d="M16 36 27 16l12 20H16Z" fill="currentColor" fillOpacity="0.16" />
        <circle cx="36" cy="24" r="9" fill="none" />
        <rect x="64" y="8" width="48" height="24" rx="3" fill="currentColor" fillOpacity="0.04" />
        <path d="M80 8v24M96 8v24M64 20h48" opacity="0.52" />
        <rect x="65" y="41" width="13" height="13" rx="2" fill="currentColor" fillOpacity="0.65" />
        <rect x="82" y="41" width="13" height="13" rx="2" fill="currentColor" fillOpacity="0.32" />
        <rect x="99" y="41" width="13" height="13" rx="2" fill="currentColor" fillOpacity="0.08" />
      </g>
    </svg>
  );
}

export function BuildIllustration({ className }: IllustrationProps) {
  return (
    <svg {...sharedProps} className={className}>
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="8" width="78" height="47" rx="4" fill="currentColor" fillOpacity="0.05" />
        <path d="M8 18h78" />
        <circle cx="15" cy="13" r="1" fill="currentColor" stroke="none" />
        <circle cx="20" cy="13" r="1" fill="currentColor" stroke="none" opacity="0.55" />
        <rect x="17" y="25" width="25" height="21" rx="2" fill="currentColor" fillOpacity="0.16" stroke="none" />
        <path d="M49 27h25M49 34h19M49 41h23" opacity="0.62" />
        <rect x="76" y="20" width="36" height="40" rx="5" fill="currentColor" fillOpacity="0.08" />
        <path d="M83 28h22M83 33h22M83 40h22M83 47h15" opacity="0.72" />
        <path d="M90 55h8" />
      </g>
    </svg>
  );
}

export function GrowIllustration({ className }: IllustrationProps) {
  return (
    <svg {...sharedProps} className={className}>
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="7" y="9" width="42" height="46" rx="4" fill="currentColor" fillOpacity="0.06" />
        <rect x="14" y="16" width="28" height="19" rx="2" fill="currentColor" fillOpacity="0.17" stroke="none" />
        <path d="M14 42h24M14 47h16" opacity="0.65" />
        <path d="M54 31h10m-4-5 5 5-5 5" />
        <rect x="69" y="13" width="44" height="39" rx="4" fill="currentColor" fillOpacity="0.05" />
        <path d="M69 22h44" />
        <path d="m75 17 4 3 4-3" opacity="0.7" />
        <rect x="77" y="29" width="13" height="14" rx="2" fill="currentColor" fillOpacity="0.16" stroke="none" />
        <path d="M95 30h11M95 35h11M95 40h8" opacity="0.65" />
      </g>
    </svg>
  );
}

export function ConnectIllustration({ className }: IllustrationProps) {
  return (
    <svg {...sharedProps} className={className}>
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M24 14 49 24M24 33h25M24 52l25-10" opacity="0.7" />
        <circle cx="15" cy="12" r="7" fill="currentColor" fillOpacity="0.1" />
        <circle cx="15" cy="33" r="7" fill="currentColor" fillOpacity="0.18" />
        <circle cx="15" cy="54" r="7" fill="currentColor" fillOpacity="0.1" />
        <path d="M12 12h6M15 9v6M12 33h6M12 54h6" />
        <rect x="49" y="9" width="64" height="48" rx="5" fill="currentColor" fillOpacity="0.06" />
        <path d="M49 19h64" />
        <rect x="57" y="27" width="17" height="21" rx="2" fill="currentColor" fillOpacity="0.18" stroke="none" />
        <path d="M81 28h24M81 35h18M81 42h22M81 49h14" opacity="0.72" />
      </g>
    </svg>
  );
}