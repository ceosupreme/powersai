// Seat pages are mandatory content snapshots, not optional SPA metadata fallbacks.
export const MAX_SEAT_ROUTES = 200;
export const htmlEscape = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const shareImage = value => { try {const u=new URL(value);if(u.protocol==='https:')return u.href;}catch{} return 'https://supremeteammedia.com/og-share.jpg'; };
export function seatRoutes(pages, towns) {
  const routes = pages.flatMap(p => [
    {path: `/seat/${p.slug}`, canonicalPath: `/seat/${p.slug}`, title: p.meta_title, description: p.meta_description, image: shareImage(p.share_image_url), seat: p},
    ...towns.filter(t => t.page_id === p.id).map(t => ({path: `/seat/${p.slug}/${t.town_slug}`, canonicalPath: `/seat/${p.slug}`, title: p.meta_title, description: p.meta_description, image: shareImage(p.share_image_url), seat: p})),
  ]);
  if (routes.length > MAX_SEAT_ROUTES) throw new Error(`Seat routes exceed the ${MAX_SEAT_ROUTES} page limit`);
  if (routes.some(r => !/^\/seat\/[a-z0-9-]+(?:\/[a-z0-9-]+)?$/.test(r.path))) throw new Error('Invalid seat route slug');
  return routes;
}
export function assertSeatHtml(html, p) {
  const body = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<!--.*?-->/gs,'');
  const contains = text => body.includes(htmlEscape(text)) || body.includes(String(text));
  if (!body.includes(`data-seat-slug="${p.slug}"`)) throw new Error(`Seat HTML missing for ${p.slug}`);
  for (const text of [p.headline, p.install, p.monthly, p.term, ...p.why_points.flatMap(x=>[x.title,x.body]), ...p.faqs.flatMap(x=>[x.question,x.answer])]) {
    if (text && !contains(text)) throw new Error(`Seat content snapshot incomplete for ${p.slug}`);
  }
  if (!html.includes(`<title>${htmlEscape(p.meta_title)}</title>`) || !html.includes(`name="description" content="${htmlEscape(p.meta_description)}"`)) throw new Error(`Seat metadata incomplete for ${p.slug}`);
}