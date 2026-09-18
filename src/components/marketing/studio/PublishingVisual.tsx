export function PublishingVisual() {
  return (
    <svg
      viewBox="0 0 560 390"
      aria-hidden="true"
      focusable="false"
      className="h-auto w-full"
    >
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path className="publishing-visual-path" d="M182 195H242M318 195H376" />
        <path className="publishing-visual-path" d="m229 184 13 11-13 11M363 184l13 11-13 11" />

        <g className="publishing-visual-book">
          <path d="M64 98h88c17 0 30 13 30 30v166H94c-17 0-30-13-30-30V98Z" />
          <path d="M94 294V128c0-17-13-30-30-30" />
          <path d="M112 135h43M112 154h29M112 239h48" />
          <rect x="112" y="177" width="48" height="43" rx="3" />
          <path d="M74 82h88l20 16H64l10-16Z" />
        </g>

        <g className="publishing-visual-phone">
          <rect x="242" y="70" width="76" height="250" rx="16" />
          <path d="M268 87h24M270 301h20" />
          <rect x="256" y="110" width="48" height="64" rx="5" />
          <path d="M256 194h48M256 214h34M256 248h48M256 266h39" />
        </g>

        <g className="publishing-visual-listing">
          <rect x="376" y="110" width="120" height="170" rx="6" />
          <rect x="392" y="128" width="88" height="62" rx="3" />
          <path d="M392 211h70M392 229h52" />
          <rect x="392" y="249" width="54" height="14" rx="7" />
          <path d="M480 128v62M392 199h88" />
        </g>
        <path className="publishing-visual-path" d="M106 330h345" />
        <g className="publishing-visual-steps">
          <circle cx="106" cy="330" r="7"/><circle cx="220" cy="330" r="7"/><circle cx="334" cy="330" r="7"/><circle cx="451" cy="330" r="7"/>
          <text x="106" y="358" textAnchor="middle">PREPARE</text><text x="220" y="358" textAnchor="middle">PACKAGE</text><text x="334" y="358" textAnchor="middle">PUBLISH</text><text x="451" y="358" textAnchor="middle">LAUNCH</text>
        </g>
      </g>
    </svg>
  );
}