# Roadmap

## Finished posts Step 4: brand Drive files
- [x] Link owner Drive; shared server-only per-file authorization and streaming previews/downloads
- [x] Saved brand roots and alias-matched slices; Drive-only today/tomorrow posts and one-source Mark posted with explicit platform captions
- [x] Shared previews on proof, approval, Studio and Posts links; HQ Guide/glossary updated
- [x] 22 safety/caption/posting tests pass; signed-in Big Paws Club 380px caption copy, thumbnail/full image/download, root/slice browsing, record creation/readback and cleanup; Sun Run Travel 1280px 38MB video plays and downloads with 206 ranges. Only brand-drive deployed, no publishing. Real helper session and live-link mutation on production mailbox not exercised; mailbox sync tested in isolated database. All temporary daily records removed (0 remain).

## Agent Desk Part 3
- [x] Keep all open mailbox rows and unposted files, refresh every 30 seconds, fetch sheet history, fix monthly cadence; completion companion trigger and 31-row backfill
- [x] Connect brand Today/Latest work/shared pulse and deduplicated Dashboard asks; preserve brand RLS and admin-only owner actions
- [x] Update HQ Guide; 29 rule/data/completion tests pass, preview builds pass; signed-in owner 380px/1280px brand links, proof, deduplicated asks, history and refresh checked; answer submission intercepted without writes. Existing guide route/plain-text checks still fail; real helper session not exercised. No publishing or agent-instruction note.

## Leads page
- [x] One Leads page: list/board, filters, detail sheet, quick log, add lead, CSV/PDF export, manager/staff access via menu switches (unpublished)
- [ ] Workspace top-5 prospects card: no such card exists in the app yet (waiting on owner decision)

## Brand crew activity
- [x] Add linked crew runs to shared feeds and status, with expandable Ask detail
- [x] Approved crew defaults column, insert trigger, defaults editor and guide
- [x] Verify Coastal Beauties and Supreme Team Media at 380px/desktop, real crew chat reply, one Portfolio crew query and 12 tests (no publishing); editor display checked, live default changes intentionally not made

## Brand team screen
- [x] Expand brand assignments and always-visible Business path
- [x] Today progress, step context/how-to, Whole plan and About
- [x] Read-only admin team view, guide updates and verification (no live data writes); real signed-in admin preview checked, non-admin save flow intentionally not exercised

## Business Path
- [x] Create empty path tables with scoped policies and required grants (zero rows)
- [x] Shared progress logic, admin brand tab, and gated manager Today/path view
- [x] Verify rules and admin phone/desktop preview; intercepted save/readback verified without database writes. Real populated manager flow awaits owner-loaded content; unrelated guide route test failure reported.

## Brand workspace (Build 1 of 2)
- [x] Owner filters for Next 10 / Waiting on me, Portfolio card workload, brand workspace tabs, pipeline page

## Radar
- [x] Add read-only research page and shared owner navigation entry using existing tables
- [x] Verify data rules, signed-in desktop/phone views, and preview

## Public studio website (STM build pack)

- [x] Approved production homepage opening: dedicated header, chess hero, credibility strip, and simple Services cards; later sections preserved (preview only)
- [x] Reference-match homepage opening refinement with responsive 3D service tiles and truthful claim safeguards (preview only)

- [x] Isolated header + hero review prototype at /_review/home-hero (preview only; phone pending)

- [x] Install ten approved production images into existing industry and service media slots; responsive crop QA (preview only)
- [x] Consolidated public-site refinement: Pricing, Startups, buyer-language copy, trust/legal accuracy, accurate map, resilient public-page prerendering, media slots, and signed-out QA
- [x] Build 1 trust and function: accessibility, legal, route previews, About, testimonials, Spanish, internal traffic, reply-to, hero motion
- [x] Build 2 motion, hover and polish: resilient reveals, state transitions, portfolio motion, responsive QA

- [x] Free Check and Thank-you presentation refresh; signed-out desktop/phone and intercepted audit/checkout QA (preview only)

- [x] Industries visual directory and Work alternating project pages; signed-out desktop/phone QA (preview only)

- [x] Systems and Publishing six-section sales pages, service inquiry context, signed-out desktop/phone QA (preview only)

- [x] Brand and Marketing six-section sales pages, shared service inquiry context, signed-out desktop/phone QA (preview only)

- [x] Industry V2 layout-driven homepage-system restyle, regenerated types, signed-out desktop/phone QA (preview only)

- [x] Websites page: six-section rebuild, homepage work copy cleanup, signed-out desktop/phone and offer/form checks

- [x] Homepage part 2: approved full-size artwork, header, actual work, compact offers/walkthrough, process and local close; preview-only verification

- [x] Owner-approved visual overhaul checkpoint 1
  - Database-backed desktop/mobile/footer industry navigation
  - Animated after-click website experience and immediate homepage industry access
  - Named replacement-ready media slots; approved hero transfer remains pending

- [x] PASS B — website-led public offer, payment-ready
  - Website-led homepage hierarchy, visual model, and featured website service
  - Approved public pricing and inquiry-led offer options on Website Services
  - Offer-aware inquiry context and attribution; payment connection remains a separate owner action

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

## PASS B — payment readiness
- [ ] Connect Stripe through Lovable's Connect Stripe form when the owner is ready to activate payments

## Case studies and Hire visual rebuild
- [x] Rebuild project-specific case stories and employer page without changing published data or the résumé PDF
- [x] Verify signed-out desktop and phone views, filtered return, résumé download, and no sideways scroll
- [x] Homepage hero: new chess background, callouts Marketing/Web Design/Automation repositioned

- [x] Build 3: Playbooks page, material intake, brand Playbooks tab, niche context in composer, Portfolio sorting

## Brand Setup (Build 4)
- [x] Setup tab, screenshot stats with read-channel-screenshot, channel numbers, Portfolio setup line and Setup gaps sort
- [x] Sales Phase 0 engine layer: contact points, subject-neutral runs/queue/log, send-time do-not-contact gate, stage rules, opt-out path (screens via GitHub)
- [x] Agent Desk part 1: database (owner actions, tidy-up trigger, brand read access)
- [ ] Agent Desk part 2 and 3: screens (waiting on owner's next message)
