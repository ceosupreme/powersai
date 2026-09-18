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
- [ ] Pre-existing, out of redesign scope: /for/hvac horizontal overflow on phones
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
