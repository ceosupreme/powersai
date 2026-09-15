# Roadmap

## Public studio website (STM build pack)

- [x] Phase 1 — Foundation + homepage (in progress)
  - `.stm-studio` scoped tokens, isolated components under `src/components/marketing/studio`
  - Homepage sections in spec order; real `submit-inbound-lead` intake
  - Shared project-content adapter with per-entry `enabled` fallback flags
  - No `/hire` links rendered until the hiring phase
  - Service selection kept separate from message text; fields preserved on error
- [ ] Phase 2 — Work index refinements (URL `?category=` filter state, full filtering)
- [ ] Phase 3 — Inquiry form refinement (multi-select, budget/timing line)
- [ ] Phase 4 — `/hire` page + enable hire links in footer/founder
