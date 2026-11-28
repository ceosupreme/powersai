export type SeatIntent = 'claim' | 'answer_check' | 'waitlist';
export type SeatStatus = 'open' | 'held' | 'taken';
export interface SeatPoint { title: string; body: string }
export interface SeatFact { figure: string; label: string; source_name: string; source_url: string }
export interface SeatFaq { question: string; answer: string }
export interface SeatAngle extends SeatPoint { key: string }
export interface SeatListing { name: string; description: string }
export interface SeatPage {
  id: string; slug: string; category: string; status: string; offer: string;
  meta_title: string; meta_description: string; share_image_url: string | null; video_url: string | null;
  headline: string; question: string; answer_listings: SeatListing[]; labels: Record<string, string>;
  meaning_title: string; meaning_body: string; market_facts: SeatFact[];
  why_title: string; why_points: SeatPoint[]; ninety_days_title: string; ninety_days: SeatPoint[];
  seats_title: string; seats_body: string; price_title: string; install: string; monthly: string; term: string;
  included: string[]; requirements: string[]; price_note: string | null; angles: SeatAngle[];
  faq_title: string; faqs: SeatFaq[]; trust_title: string; trust_body: string; form_title: string; form_body: string;
  created_at: string; updated_at: string;
}
export interface SeatTown { id: string; page_id: string; town: string; town_slug: string; status: SeatStatus; procedures: string[]; note: string; sort_order: number }
export const SEAT_SHARE_FALLBACK = 'https://supremeteammedia.com/og-share.jpg';
export function safeSeatUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try { const u = new URL(value); return u.protocol === 'https:' ? u.href : undefined; } catch { return undefined; }
}
export const seatCanonical = (slug: string) => `https://supremeteammedia.com/seat/${encodeURIComponent(slug)}`;
export function seatVideoEmbed(value: string | null): string | undefined {
  const safe = safeSeatUrl(value); if (!safe) return undefined;
  const u = new URL(safe);
  const yt = u.hostname === 'youtu.be' ? u.pathname.slice(1) : ['www.youtube.com','youtube.com'].includes(u.hostname) ? (u.searchParams.get('v') || u.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)/)?.[1]) : null;
  if (yt && /^[\w-]{6,20}$/.test(yt)) return `https://www.youtube-nocookie.com/embed/${yt}`;
  if (['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(u.hostname)) { const id = u.pathname.match(/(?:video\/)?(\d+)$/)?.[1]; if (id) return `https://player.vimeo.com/video/${id}`; }
  return undefined;
}
export const seatQuestion = (p: SeatPage, town: string) => p.question.split('{category}').join(p.category).split('{town}').join(town);
export const seatIntentForTown = (town?: SeatTown): SeatIntent => town?.status === 'taken' ? 'waitlist' : 'claim';
export const seatQualifier = (p: SeatPage, town: string, angle: string, intent: SeatIntent) => ({ offer: p.offer, category: p.slug, town, angle, intent });
export const seatFaqSchema = (faqs: SeatFaq[]) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) });
export function seatBadgeText(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (typeof v.category !== 'string' || typeof v.town !== 'string' || !['claim','answer_check','waitlist'].includes(String(v.intent))) return null;
  return `AI Seat · ${v.category} · ${v.town}`;
}