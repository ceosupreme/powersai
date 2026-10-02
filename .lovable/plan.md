# Public-site audit (read-only) — HEAD 322aaed, Oct 2 2026

Verified from code and live database rows this turn. Older notes (master brief, layout doc, earlier plans) are only cited where they still match code. No files changed.

## 1. Public routes and navigation
Routes (App.tsx): `/`, `/about`, `/pricing`, `/startups`, `/work`, `/work/:slug`, `/hire`, `/services/websites`, `/services/brand`, `/services/marketing`, `/services/ai-systems`, `/publishing`, `/industries`, `/for/:slug`, `/free-audit`, `/thank-you`, `/privacy`, `/terms`, `/qualify/:slug`, `/q/:venueSlug` (per-client), `/r/:token` (shared recovery report), `/auth` + `/login` (same page), `/reset-password`, `*` 404.

Desktop header: Services dropdown (Websites, Brand, Marketing, AI & Systems, Publishing, Startups, Pricing) | Industries dropdown (View all + published V2 markets) | Work | About | "Start a project".
Mobile menu: same, plus Privacy/Terms links.
Footer: Work, the five services, Pricing, Startups, About, Hire, Industries, Privacy, Terms, Log in.
Not linked from navigation: `/free-audit`, `/thank-you`, `/qualify/:slug`, `/q/*`, `/r/*`, and the two legacy V1 industry pages.

## 2. Homepage order
Hero, After-click, Industries, Selected work, Testimonials (renders nothing when no published rows), Process, Pricing teaser, Inquiry, Footer. Signed-in visitors are sent to `/portfolio`.

## 3. Service and industry pages
Services: Websites, Brand, Marketing, AI Systems (`/services/*`), Publishing (`/publishing`, not under `/services`), plus Startups and Pricing as related pages.
Industry rows in the database:
- Published V2 (new design, in menus): auto, dealerships, hvac, legal, medspa, pizza, plumbing, real-estate, restaurants, tacos (ES via `?lang=es`). That is 10, not the 9 the brief lists. Dealerships was added.
- Published V1 (old design, still reachable by URL, not in menus): carpet-cleaning, moving-hauling.
- Drafts used only as aliases: bars-restaurants, plumbing-hvac. The `taquerias` alias is code only.
Resolver order: V2 row, then the hard-coded flagship set (8 slugs), then the old V1 renderer, then 404.

## 4. Conversion paths
- Inquiry form (shared `Inquiry` with servicePage context, plus `VerticalInquiry` on industry pages) sends to `submit-inbound-lead`, which triggers owner alert and EN/ES acknowledgment.
- Checkout: `CheckoutButton` uses `create-checkout-session` for Launch deposit, Launch monthly and Care seat. It's gated by `site_settings.checkout_enabled`. `/thank-you` uses `verify-checkout`, which writes the idempotent order and lead. `reconcile-checkouts` exists but is unscheduled.
- Free check: `/free-audit` uses `run-public-audit`, `public-audit-status` and `unlock-public-audit`.
- Qualification: `/qualify/:slug` (qualifier chat/session/realtime functions) and the per-client `/q/:venueSlug`.
- Booking: `BookingCta` reads `booking_url`. When it's blank, it shows "Request a call".
- Startups readiness check runs in the browser, then goes to the inquiry form with src=startups.
- Video: no VSL. There's an old `VideoBlock` that only the V1 industry renderer uses. Media motion uses images or posters.

## 5. Analytics
`PublicSiteAnalytics` sends `page_view` on public paths only. Its path pattern leaves out `/pricing` and `/startups`, so those pages log no page views (a gap). Events go to `site_events` through `trackSiteEvent`: cta_click (~37 sites), form_success, call_request, audit_start, audit_complete. `?internal=1` tags test visits. There are no third-party pixels.

## 6. Do-not-disturb infrastructure
Auth/roles (`AuthContext`, `RoleContext`, `ProtectedRoute`, `routes.ts`, user_venue_roles, has_role); every HQ route (portfolio, admin, CRM, inbox, automations, approvals, marketing-hub, content, offers, products, etc.); inbound lead pipeline (submit-inbound-lead, notify-owner-inquiry, send-prospect-acknowledgment, alert-emergency-lead, enqueue-followup-sequence, resend-inbound-webhook); checkout (create-checkout-session, verify-checkout, _shared/checkoutConfirm, reconcile-checkouts, site_orders); attribution fields (src, biz, offer, source_vertical, origin_path, language, segment, key_mode); vertical_landing_pages and vertical_research rows; site_settings and site_events; public audit functions; qualifier functions and `/q/:venueSlug` (captured_for_project_id handoff into client follow-up); `/r/:token` recovery reports; prerender scripts, sitemap, robots, routeMeta, industry-meta.json; `studioMedia.ts` named slots.

## 7. Duplicate, legacy or confusing items to evaluate
- Old marketing component sets: `components/marketing/rebuild/*` (no imports found), `sections/*` and `site/Nav` (only used by V1 `VerticalLanding`), and `HeroTriage`.
- Three industry renderers (V2, FlagshipVertical, V1 VerticalLanding). The flagship branch is effectively shadowed, because all 8 flagship slugs have V2 rows.
- `StudioMediaReel`: no importers found.
- `OfferSection`: only used in ServicePage. Check whether it overlaps with Pricing.
- `/auth` and `/login` are duplicates. `/publishing` sits outside `/services/`.
- `/qualify/:slug` and `/for/:slug` are two industry entry systems.
- Live V1 pages carpet-cleaning and moving-hauling are reachable but undiscoverable, and in the old style.
- The sitemap has 21 URLs. Check it covers all 10 V2 markets plus Pricing and Startups, and check whether V1 pages belong in it.

## 8. Prices/terms that appear in several places (drift risk)
Launch $2,500 / $297 / $149, Care $149→$199, Business $3,500 + $297, Growth $497, Systems $10,000 are written into: Pricing.tsx, PricingTeaser, WebsiteServices, MarketingServices, SystemsServices, Inquiry, OfferSection, LegalPage (terms), routeMeta.js, scripts/industry-meta.json, create-checkout-session (amounts), SettingsServiceCatalogTab (HQ), and industry rows in the database. There's no single price source.

## 9. Preservation list
1. Auth, roles, ProtectedRoute, and the signed-in redirect from `/`.
2. All private HQ routes and their functions.
3. submit-inbound-lead and the alert/acknowledgment chain, plus Inquiry/VerticalInquiry payload shape and servicePage context.
4. CheckoutButton → create-checkout-session → verify-checkout/checkoutConfirm → site_orders + lead; the checkout_enabled flag; cancel return paths.
5. Attribution query params and qualifier_data fields.
6. VerticalResolver, its aliases, Spanish overrides, row-driven layout.sequence/interaction, and usePublishedVerticalLanders as the only market list.
7. Free-audit functions; qualifier and `/q/:venueSlug`; `/r/:token`.
8. trackSiteEvent, site_events, internal=1 tagging, and the no-personal-data rule.
9. BookingCta's booking_url fallback; reply_to_email in site_settings.
10. Prerender, routeMeta, sitemap/robots, studioMedia named slots.
11. Approved prices and terms text (change only with owner approval).

## Suggested first redesign steps (no build yet)
- Decide the fate of the V1 pages, old component folders and the flagship branch.
- Create one source for prices.
- Add `/pricing` and `/startups` to page-view tracking.
- Reconcile the sitemap.
