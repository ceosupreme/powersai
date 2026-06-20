# Build 1 — Lead Qualifier (Home Services test cell)

## Existing pieces I'll reuse

**Voice (extend, don't rebuild):**
- `src/hooks/useRealtimeVoiceInterview.ts` — WebRTC mic + OpenAI Realtime client over WSS. Today it takes log-form `sections` and walks fields. I'll **generalize** it: accept a generic `QualifierField[]` (id, label, type, options, required) instead of `LogSection[]`, and a system-prompt builder. The audio loop, connection state machine, transcript handling, and barge-in are kept as-is.
- `src/components/shared/VoiceInterviewMode.tsx` — mic UI / progress / transcripts. Reused; switched to the generic field shape.
- `supabase/functions/openai-realtime-proxy/index.ts` — WSS proxy to OpenAI Realtime. Reused. Extended to accept a `mode=qualifier` + a JSON `qualifier_context` (vertical, fields, ready_definition) and produce a tailored system prompt that conducts a friendly back-and-forth, asks one thing at a time, and emits a final `function_call` (`submit_qualified_lead`) with structured field values when done.
- Hardcoded WSS host in `useRealtimeVoiceInterview.ts` will be switched to `import.meta.env.VITE_SUPABASE_URL` (current value points at a different project ref — bug for our project).

**Config-driven (Build 0):**
- `useEffectiveQualifierFields(projectId)` + `useQualifierConfig(projectType)` → the agent reads its question list AND `ready_definition` from these hooks; nothing about Home Services is hardcoded in agent code. Swap the project's type → questions change.

**CRM + intake:**
- `inbound_leads` (extend) → promote into `crm_companies` / `crm_contacts` / `crm_deals` using the existing promote pattern. All qualified leads route through `inbound_leads` first so we keep a single intake surface and the existing review UI (`InboundLeadsPanel`) still works.
- `submit-inbound-lead` edge function — extended to accept qualifier payload + transcript.

## What's new

### 1. Schema (one migration)

Extend `public.inbound_leads`:
- `phone text`
- `project_type text` (FK-ish to `project_types.id`, default `'home_services'`)
- `route_to text not null default 'self'` (values: `self` | `operator` | `client`)
- `qualifier_data jsonb not null default '{}'` — structured field values keyed by `field_key`
- `is_ready boolean not null default false`
- `not_ready_reason text`
- `transcript jsonb not null default '[]'` — `[{role, text, at}]`
- `conversation_channel text` (`voice` | `chat` | `form` | `phone`)
- Keep `message` (becomes the lead's opening line / summary). Existing RLS and `promoted_company_id` unchanged.

No new CRM tables — qualifier data lives structured on `inbound_leads.qualifier_data` and is copied into `crm_deals.notes` summary + `crm_contacts.phone` on promote.

### 2. Edge functions

- **`qualifier-session`** (POST, public, honeypot + per-IP rate-limit copied from `submit-inbound-lead`) — given `{ project_id, project_type }`, returns the resolved qualifier field list + `ready_definition` + `primary_channel` (server-side fetch so the public page doesn't need auth). Lets us keep the agent prompt server-built.
- **`submit-inbound-lead`** (existing, extended) — accept new payload: `{ phone?, project_type, qualifier_data, transcript, is_ready, not_ready_reason?, conversation_channel, route_to }`. Server re-evaluates `is_ready` against `ready_definition` as a sanity check. Always inserts (qualified or not).
- **`openai-realtime-proxy`** (existing, extended) — new query mode `mode=qualifier`. Reads `project_id` and fetches fields + ready_definition server-side, builds the system prompt:
  > "You are a friendly intake agent for {vertical_label}. Ask one short question at a time covering: {fields}. Use plain language. When you have enough to decide, call `submit_qualified_lead` with the structured values and a one-sentence summary."
  Tools: one function `submit_qualified_lead({ qualifier_data, is_ready, not_ready_reason, summary })`. On function-call, the client posts to `submit-inbound-lead` with the assembled transcript.

### 3. Frontend

- **Route `/qualify/home-services`** (`src/pages/QualifyLanding.tsx`) — branded light/forest landing page (reuses marketing tokens / primitives), single CTA: **"Talk to our intake agent"**. Below: chat fallback + 5-field form fallback. Plain language, friendly.
- **`src/components/qualifier/VoiceQualifier.tsx`** — wraps the generalized `VoiceInterviewMode`. Loads fields via `useEffectiveQualifierFields(projectId)` and ready_definition via `useQualifierConfig(projectType)`. Streams transcript into local state; on agent function-call → POSTs to `submit-inbound-lead`.
- **`src/components/qualifier/ChatQualifier.tsx`** — text fallback. Uses the AI Gateway (`google/gemini-3-flash-preview`) via a new `qualifier-chat` edge function (same system prompt builder shared with the realtime proxy).
- **`src/components/qualifier/FormQualifier.tsx`** — last-resort static form, fields rendered from the same config.
- `App.tsx` — public route `/qualify/:slug` (no auth).

### 4. Generalizing the voice hook

`useRealtimeVoiceInterview` gets a sibling `useRealtimeQualifierAgent({ projectId, projectType, onComplete })` that shares the same `AudioRecorder`/`AudioQueue`/state machine but:
- doesn't require `sections`,
- passes `mode=qualifier&project_id=...` to the proxy,
- listens for `response.function_call_arguments.done` (already streamed by Realtime) and resolves with the structured payload.

`VoiceInterviewMode` is refactored to accept a generic `{ progressLabel, totalSteps?, currentStep? }` so it renders for both log interviews and the qualifier.

### 5. Phone answering (capability honesty)

**Not built in this build.** What it requires:
- A real phone number + Twilio Voice (the **Twilio connector exists** in this workspace per `standard_connectors`; not yet linked).
- A Twilio Voice webhook → new edge function `twilio-voice-qualifier` returning TwiML that bridges the call to OpenAI Realtime via `<Connect><Stream>` over Twilio Media Streams (μ-law 8 kHz). The `openai-realtime-proxy` needs a second entry point that talks Twilio's binary frame format instead of browser WebRTC frames — non-trivial but doable.
- Once that's in, the same `mode=qualifier` system prompt + `submit_qualified_lead` tool produce the same `inbound_leads` row (with `conversation_channel='phone'`, `phone` captured from Twilio caller-id).

If you want phone in this build, approve linking Twilio and I'll add it as Build 1b. Otherwise the web voice agent ships and we add phone in a follow-up without changing the data model.

### 6. Promote to CRM

Reuses existing flow in `InboundLeadsPanel`: when you click "Promote" on a qualified lead, it creates `crm_companies` (from `business_name`/`location`), `crm_contacts` (name/email/phone), and a `crm_deals` row with `notes` = formatted qualifier summary + link back to the inbound_leads id. `route_to='self'` filters to your pipeline today; the column lets us split to `operator`/`client` later without schema change.

## Tradeoffs / call-outs

- **Phone** deliberately out of scope here (see §5).
- **`ready_definition` is free-text today.** The agent uses it as guidance + we sanity-check on the server with a small rule pack (required fields present + `urgency != none` + `service_area` matches). A structured rule format is a later build.
- **Transcript** stored as JSON on `inbound_leads` (small per row); not denormalized to a separate table yet — keep it simple.
- WSS URL bug in `useRealtimeVoiceInterview` gets fixed as part of the refactor.

## Verify

1. Voice extension named: `useRealtimeVoiceInterview` + `VoiceInterviewMode` + `openai-realtime-proxy`, generalized — not rebuilt.
2. `/qualify/home-services` opens, mic button starts a real back-and-forth, chat + form fallbacks present.
3. Changing `project_type_qualifier_fields` rows for `home_services` (or pointing the page at a different `project_type`) changes the agent's questions with zero code change.
4. Phone: not built; §5 lists exactly what it needs.
5. Qualified lead → row in `inbound_leads` with `qualifier_data` populated, `transcript` saved, `is_ready=true`, `route_to='self'`; Promote button pushes to `crm_*`. Not-ready leads written with `is_ready=false` + `not_ready_reason`.
6. No parallel CRM/AI stack. `tsc` clean.
