## Build B — Intake → Config bridge

Carry an inbound_lead's `qualifier_data` / `transcript` forward into the new project's creation form (and the Build A wizard that opens after) so the operator confirms rather than re-keys. No parallel intake, no parallel creation path, no silent writes.

### 1. Schema (additive — one small migration)

- `venues.source_lead_id uuid null references public.inbound_leads(id) on delete set null` + index. One project = one originating lead; the lead's transcript/qualifier_data is reachable from the client via this FK. (Cleaner than a link table — strictly 1:0..1, no extra join in the read path.)
- No RLS change. No change to inbound_leads, project_types, or Build 0 tables.

### 2. Mapping layer — edge function `lead-to-project-proposal`

Modeled on `crm-analyze-lead` (service-role read, JSON-only output, Lovable AI Gateway, `google/gemini-2.5-flash`). Input: `{ lead_id }`. Output: a **proposal object** — never writes config.

```ts
type ProjectSetupProposal = {
  lead_id: string;
  // Direct fields — high confidence, pre-fill into EditBarDialog form
  direct: {
    name: string | null;            // business_name || qualifier_data.business_name
    project_type: string | null;    // lead.project_type (already resolved by qualifier)
    timezone: string | null;        // inferred from address only if unambiguous
    address: string | null;         // qualifier_data.address / service_area
  };
  // Direct contact — pre-fill into the Contacts tab as a leadership_contact row
  contact: {
    display_name: string | null;
    email: string | null;
    phone: string | null;
    role_label: string | null;      // 'owner' | 'gm' | 'manager' | free text
  } | null;
  // Interpreted — clearly marked suggestions; rendered with a "Suggested" pill
  suggestions: {
    primary_channel?: { value: string; rationale: string };
    pillar_focus?: { keys: string[]; rationale: string };     // pillar_template ids the lead implied
    leak_vector_focus?: { keys: string[]; rationale: string };
    goals_summary?: string;          // 1–2 sentence operator note (budget/urgency/goals)
    not_ready_reason?: string;       // surface lead.not_ready_reason verbatim
  };
  raw: { qualifier_data: unknown; transcript: unknown; conversation_channel: string | null };
};
```

Rules:
- Direct fields are extracted in code (deterministic) from `qualifier_data` keys + `business_name` + `email/phone`.
- Interpreted fields go through the model with strict JSON output. If the AI call fails or returns invalid JSON, return `suggestions: {}` and still ship `direct`/`contact` — the bridge degrades gracefully (same pattern as `crm-analyze-lead`'s URL-fetch fallback).
- Tight system prompt: "Propose values for an operator to confirm. Never invent contact info. Cite the lead's own words when proposing pillar/leak focus."

### 3. Bridge into project creation (extend, don't replace)

`InboundLeadsPanel.tsx` — add a new action on `new`/`reviewed` rows beside the existing **Promote to CRM** button:

- **"Create project from lead"** → calls `lead-to-project-proposal({ lead_id })`, then opens `EditBarDialog` with the proposal pre-filling form state. The existing **Promote to CRM** button is unchanged.

`EditBarDialog.tsx` — additive prop only:
```ts
interface Props {
  // ...existing
  initialProposal?: ProjectSetupProposal | null;
  sourceLeadId?: string | null;
}
```
- When `editingBar` is null AND `initialProposal` is present, seed `formData` from `direct` (name, bar_code derived from name, address, timezone, project_type) instead of `defaultForm`. Existing edit path is untouched.
- On create-insert, include `source_lead_id: sourceLeadId ?? null` in the payload — single source of truth for the write stays in this dialog's existing submit handler.
- After successful insert, also (a) upsert the proposed `venue_leadership_contacts` row from `contact` (operator already saw/edited it via a new compact "From lead" section on the Contacts tab — confirmation, not silent), and (b) mark the inbound_lead `status='promoted'` and stamp `promoted_company_id` semantics-equivalent field if applicable (we set `inbound_leads.status='promoted'` + new field `promoted_venue_id uuid null` on inbound_leads — second tiny column in the same migration, mirrors the existing `promoted_company_id` pattern).
- A small read-only "Suggestions from lead" panel renders interpreted fields with a **Use** button per suggestion (writes into the relevant override panel via its existing hooks — never silent). Pillar/leak suggestions become pre-checked items in the Build A wizard's existing override panels; they do not write until the operator saves those panels themselves.

`SettingsBarsTab.tsx` — `handleSaved(newId)` already auto-opens `VenueOnboardingWizard`. No change. Because identity/contact rows are now populated on create, Build A's detectors flip the Identity + Contacts steps to `complete` on first wizard open. Pre-checked-but-unsaved override panels remain `not_started` until the operator saves them (intentional — preserves the "operator confirms" contract).

### 4. Files touched

Additive only:
- `supabase/migrations/<ts>_intake_bridge.sql` — `venues.source_lead_id`, `inbound_leads.promoted_venue_id`, indexes.
- `supabase/functions/lead-to-project-proposal/index.ts` — new edge function (Lovable AI Gateway via `LOVABLE_API_KEY`).
- `supabase/config.toml` — register function (no other config change).
- `src/hooks/useLeadProposal.ts` — `useMutation` wrapper around `supabase.functions.invoke('lead-to-project-proposal')`.
- `src/components/crm/InboundLeadsPanel.tsx` — add "Create project from lead" action; lift `EditBarDialog` open state with `initialProposal` + `sourceLeadId`. Existing Promote to CRM untouched.
- `src/components/admin/EditBarDialog.tsx` — accept `initialProposal` + `sourceLeadId`; seed form on create; include `source_lead_id` in insert payload; render compact "From lead" + "Suggestions from lead" sections only when present.
- `src/hooks/useInboundLeads.ts` — add `promoted_venue_id` to the row type; (no behavior change to existing `promote` mutation).
- `src/integrations/supabase/types.ts` — regenerated post-migration.

Not touched: Build 0 resolution (`effectivePillars` / `effectiveLeakVectors` / `effectiveQualifierFields`), Build A wizard internals, `VenueOnboardingWizard.tsx` step list, qualifier landing/edge function, RLS on `inbound_leads` / `venues` / overrides, integrations.

### 5. Verification

1. `useInboundLeads` row with `qualifier_data` → "Create project from lead" → EditBarDialog opens with name/project_type/address/timezone/contact pre-filled; "Suggestions from lead" panel shows interpreted pillar/leak/channel/goals with rationales.
2. Operator edits → Save runs the existing `handleSubmit` insert path with `source_lead_id` set; no other write path is introduced.
3. Build A wizard auto-opens; Identity + Contacts steps detect complete; pillar/leak override panels show suggestion chips that only persist when the operator saves those panels.
4. `select id, source_lead_id from venues where id = <new>` returns the lead id; `select promoted_venue_id, status from inbound_leads where id = <lead>` returns the new venue id + `promoted`.
5. Promote-to-CRM button still works unchanged on the same row (the two actions are independent; status transitions are idempotent).
6. AI failure path (force `lead-to-project-proposal` to throw) → bridge still fills `direct`/`contact`, suggestions panel shows "AI suggestions unavailable", operator can still create.
7. `tsc --noEmit` clean. No change to Build 0, Build A behavior, RLS, integrations.

### Out of scope
- Templated automation deployment (Build C), Recovery report (Build D), changes to qualifier capture, any rewrite of `crm-analyze-lead` or the CRM promote flow's existing behavior, auto-writing AI suggestions into config.
