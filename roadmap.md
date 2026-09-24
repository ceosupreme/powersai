# Roadmap

## Public studio website (STM build pack)

- [x] Phase 1 — Foundation + homepage
  - `.stm-studio` scoped tokens, isolated components under `src/components/marketing/studio`
  - Homepage sections in spec order; real `submit-inbound-lead` intake
  - Shared project-content adapter with per-entry `enabled` fallback flags
  - Service selection kept separate from message text; fields preserved on error
- [x] Phase 2 — Work pages + hiring page (build pack F–G)
  - `useStudioProjects` consumes the retained `usePublishedPortfolioItems`
  - `/work` filters with URL `?category=` state, zero-count categories hidden
  - `/work/:slug` full case detail; back link restores the filtered list
  - `/hire` page live; reached from the founder section and footer, not the primary header nav
- [x] Phase 3 — Inquiry flow + metadata (build pack H–I)
- [x] Phase 4 — Final frontend QA pass (all checks passed; no fixes required)
- [x] Owner email notification for general site inquiries
- [x] Public studio showcase enhancements
  - Refined live-project cards with browser frames, visible actions, status, and category chips
  - Accessible four-lane interactive studio map with real case links and contact intent
  - BarPulse screenshot and clearly labeled historical integration flow
  - Restrained, reduced-motion-safe reveal treatment and responsive browser verification
- [x] Publishing & Launch public service page
  - Add `/publishing`, shared navigation/footer entry points, and homepage capability callout
  - Add publishing contact intent and verify responsive navigation, page anchors, and public-route smoke checks
- [x] Public studio editorial art-direction pass
  - Image-led project mosaic, larger type, art-directed hero and capability surfaces
  - Premium case-study storytelling, visual studies, facts rail, and next-project navigation
  - Visual hiring proof, richer publishing/contact presentation, responsive and accessible QA
- [x] Public studio buyer-journey and service pages
  - Restructure public navigation around Work, Services, About, and Start a project
  - Reorder the homepage around proof, buyer problems, services, systems proof, trust, and inquiry
  - Add tailored Websites, Brand, Marketing, and AI Systems sales pages
  - Reconcile Publishing with the shared service-page experience and verify public routes
- [x] Public studio sitewide media, graphics, and motion pass
  - Add real-project media reel, visual service entry points, unique service hero/explainer/media bands
  - Enrich Publishing, Founder, Inquiry, Hire, and selective case-study media while preserving behavior
  - Verify responsive, reduced-motion, keyboard, local-media, and route behavior without live submission
- [x] Public studio sitewide copywriting pass
  - Rewrite buyer-facing homepage, service, publishing, work, case-study, hiring, contact, and footer copy
  - Strengthen messaging and copywriting across Websites, Brand, and Marketing without adding a new service
  - Verify public routes, responsive layouts, and service-intent behavior without live submission
- [x] Pre-existing HVAC overflow superseded by the new flagship route
  - Rebuild the inquiry form: required name/email/note; optional company, service
    multi-select, budget, timing; 4000-char server limit validated, never truncated
  - `conversation_channel=form`, `route_to=self`, structured `qualifier_data`,
    readable header in `message`; `project_type`/`captured_for_project_id` unset
  - Preserve `stm:contact-prefill` / `stm.contact.prefill` compatibility without
    ever erasing typed text; allowlisted intent/service values only
  - Success only on `{ok:true,id}` with no invoke error; preserve input on failure;
    handle offline, malformed responses, rate limits; honeypot is not a conversion
  - Analytics hooks (service select, case open, first form interaction, confirmed
    inquiry, hiring interest, real résumé download) via the no-op adapter;
    report analytics as unconfigured
  - Titles/descriptions/canonicals for homepage, work, cases, hire; root metadata
  - Mocked contract tests first; live intake test only with owner approval

## Flagship vertical acquisition front ends
- [x] Add explicit HVAC, automotive, real estate, legal, and med spa routes before the generic vertical route
- [x] Build distinct research-informed pages, diagnostics, sample workflows, proof, FAQ, and safe CTA attribution
- [x] Add reusable vertical inquiry and extend main inquiry source attribution without backend changes
- [x] Add Industries index and footer navigation
- [x] Verify responsive, keyboard, reduced-motion, zoom, mocked intake, metadata, and route regressions

## Hospitality flagship expansion
- [x] Add distinct Bars & Restaurants and Pizza Shops acquisition pages with attributed inquiry paths
- [x] Route `/for/bars-restaurants` into the restaurant flagship while preserving the legacy database row
- [x] Expand `/industries` and footer to seven industries
- [x] Verify responsive, accessibility, attribution, mocked inquiry, and route regressions without live submission

## Taco Shops / Taquerías flagship
- [x] Add bilingual `/for/tacos` experience and `/for/taquerias` alias
- [x] Preserve business, focus, attribution, and inquiry state across EN / ES switching
- [x] Expand Industries and footer to eight verticals
- [x] Verify responsive, accessibility, metadata, links, mocked inquiry, and existing-route regressions without publishing

## Non-client project KPI layer (Sept 2026)
- [x] project_kpis + project_kpi_values tables with project-member RLS
- [x] KPI scoring utility + pillar score sync into project_pillar_scores
- [x] Expandable KPI list on pillar tiles
- [x] One-glance project view (actions, insights, products, content, revenue, trend)
- [x] Current-week creation for non-client projects
- [x] Products brands column + brand/status filters, 10-option status select
## PASS A — public sales-path repair
- [x] Regenerate database types for existing site_settings and site_events
- [x] Repair public identity, contact email, pricing, booking, attribution, audit context, and copy
- [x] Add prospect acknowledgment email and safe dispatch
- [x] Activate privacy-safe public analytics
- [x] Add STM-only seven-day website visibility card
- [x] Verify types, build, functions, and public/mobile flows without live sends or publishing
