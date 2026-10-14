/**
 * Fonts the HQ app, internal pages and the older page designs (qualifier pages,
 * first-version industry pages) use. The public site serves its own fonts
 * (src/styles/public-fonts.css); these arrive when one of those screens first
 * opens, so most public visitors never wait on them.
 */
const EXTRA_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Instrument+Serif:ital@0;1&family=Instrument+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap";

export function ensureExtraFonts() {
  if (typeof document === "undefined" || document.getElementById("stm-extra-fonts")) return;
  const link = document.createElement("link");
  link.id = "stm-extra-fonts";
  link.rel = "stylesheet";
  link.href = EXTRA_FONTS_URL;
  document.head.appendChild(link);
}
