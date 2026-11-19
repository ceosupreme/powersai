# Content Studio data contract

Content Studio uses the existing HQ records: `content_items` are both the idea bank and saved creative work, `production_jobs` / `action_items` remain the production workflow, `agent_handoffs` is the worker mailbox, `content_placements` records distribution, and `post_results` holds measured observations. `content_templates` is the only new catalog. There is no second content board or job creation API.

## Templates and saved instances

`content_templates` stores `id`, `slug`, integer `version`, `title`, `description`, optional `project_id`, `status`, `default_tier`, `recipe`, `validation_evidence`, and authorship/timestamps. The unique key is `(slug, version)`.

- `draft`: editable recipe under development.
- `ready`: operationally complete format that can be used to create work. This is not a performance claim.
- `validated`: an owner/manager reviewed measured posts created with this exact version. `validation_evidence` requires `{summary, post_result_ids: [...]}` referencing real observations for this template.
- `retired`: retained for historical attribution; unavailable for new work.

Ready, validated, and retired recipe versions are immutable. Change the formula by inserting a new version. Saving a promising draft as a template must not label it validated. Brand managers can create/update their own brand templates; shared templates are administered centrally. Catalog reads use the existing `content_pipeline` page permission and project access.

The recipe shape consumed by the interface is:

```ts
{
  format: string,
  product_type: string,
  destinations?: string[],
  fields: Array<{
    key: string; label: string; help?: string; required?: boolean;
    default?: unknown;
    options?: Array<{value: string; label: string; description?: string}>;
  }>,
  defaults?: Record<string, unknown>,
  steps: unknown[],
  research_brief?: string,
  quality_checks?: unknown[],
  hook_directions?: unknown[],
  platform_defaults?: Record<string, unknown>
}
```

A run is stored on the original content item:

```ts
content_items.brief.studio = {
  revision: number,
  template_snapshot: {
    id: string, slug: string, version: number, title: string,
    description: string, project_id: string | null,
    default_tier: 'guided' | 'one_tap' | 'automated', recipe: object
  },
  tier: 'guided' | 'one_tap' | 'automated',
  picks: Record<string, unknown>,
  decisions: {
    hooks?: Array<{id: string; text: string; label?: string; rationale?: string}>,
    selected_hook?: string,
    shot_plan?: string,
    [key: string]: unknown
  },
  research: {
    facts?: Array<{
      id?: string; text: string; kind: 'fact' | 'scenario';
      source_url?: string; source_title?: string; verified_at?: string
    }>,
    sources?: unknown[],
    [key: string]: unknown
  },
  variants: Array<{
    id: string; platform?: string; format?: string; hook?: string;
    caption?: string; notes?: string; asset_url?: string
  }>,
  step: string,
  updated_at: string, updated_by: string | null, updated_via: 'hq' | 'worker'
}
```

`brief.script`, `brief.caption`, and `brief.asset_urls` are the actual deliverable fields used by the existing HQ reviewers/importers. Title, format, hook and CTA remain their existing top-level columns. Unrelated brief fields survive Studio edits. Legacy briefs stored as JSON strings, prose, arrays, or null are normalized into an object while preserving the original material as `legacy_brief`.

The snapshot and project cannot be changed after an item enters Studio. Snapshot protection and revision updates also apply to edits made through older HQ editors. Creative changes clear `approved_at`, `approved_by`, and `approved_version`; navigation-only changes and measured performance observations preserve approval. Advisory quality scores and notes remain intact. Scheduled drafts must be unscheduled before creative changes, and a published revision requires a new content item.

`automated` is stored as creation intent. It does not grant permission to spend on media, schedule, or publish. Existing owner approval and delivery checks remain authoritative for every tier.

## Creating and resuming work

All creation uses `composePipeline` / `CreatePipelineDialog` and `hq_create_pipeline`. The existing `p_new_content` supports:

```ts
{
  title: string, summary: string,
  format?: string, purpose_type?: string,
  request_key?: string, // stable across retries of this one create operation
  studio?: StudioPatch
}
```

With `studio`, creation and initial template/choice persistence occur in the same transaction. The SQL sets `target_type='content_items'` when new content is supplied. An existing content target must belong to the selected project. A new Studio operation must supply an existing `target_key` or stable `p_new_content.request_key`; the latter becomes `production_jobs.target_key='studio:'+request_key`. A retry with that request key returns the original job even if it has since finished. A genuinely new operation needs a new request key. Existing content and ordinary non-Studio composer behavior remain supported.

`hq_studio_save(p_content_id uuid, p_expected_revision integer, p_patch jsonb)` returns the full updated content row. A new instance starts at expected revision `0`; the first save returns revision `1`. A stale revision raises SQLSTATE `40001`. Reload rather than silently overwriting another editor or worker.

`StudioPatch` permits `template_id` on initialization, `tier`, `picks`, `decisions`, `research`, `variants`, `step`, and `creative: {title, hook, cta, format, script, caption, asset_urls}`. Objects merge one level; the variants array is replaced. Unknown fields, publication fields and approval fields are rejected. A no-op save leaves the revision unchanged. The API stamps actor identity from the real session, never an input user ID.

## Authenticated mailbox entry points

| RPC | Inputs | Result |
| --- | --- | --- |
| `hq_studio_request` | `p_content_id`, `p_expected_revision`, `p_task_type`, `p_idempotency_key`, optional `p_instructions=''`, optional `p_action_item_id=null` | Saved handoff JSON |
| `hq_studio_tasks` | `p_content_id` | This item's Studio handoffs, newest first; claim tokens are masked |
| `hq_studio_cancel` | `p_handoff_id` | Updated handoff; revokes an active lease |

Task types are `research`, `draft`, and `production`. Requests use current saved state. Repeating the same key and identical request returns the original handoff; reusing a key for different work fails. Only one active request of a type can exist for an item. Research routes to Muse, drafting/production to Claude, with ChatGPT as the explicit fallback. A native server runner may service these requests immediately after verifying the authenticated caller.

The handoff `spec` contains `source='content_studio'`, `schema_version=1`, `task_type`, `request_key`, `requested_by`, `content_revision`, `instructions`, `job_id`, `template_snapshot`, `studio`, the saved content fields, `publication_policy='owner_approval_required'`, and a type-specific `output_contract`. Workers must use these stored inputs rather than client-supplied output or substituted content IDs.

Linking `p_action_item_id` is optional. It must be an available Claude-owned step of this same content's current, unpaused pipeline, with completed dependencies. Owner review actions cannot be linked. Requests without a linked action save their actual output without pretending a pipeline step finished.

## Server worker protocol

These two RPCs are `SECURITY INVOKER`, granted only to `service_role`, and additionally check the actual SQL role. The migration explicitly revokes default API-role grants as well as `PUBLIC` before assigning each new function's intended roles; trigger functions have no client execution grants. Changing a claim string or passing a user ID does not grant worker capability. The pre-existing composer retains its service-role privilege.

1. `hq_studio_claim(p_handoff_id uuid, p_worker text='chatgpt')` claims a new task or an expired claim. It returns the handoff with a random `studio_claim_token`, `studio_claimed_by`, and a two-hour `studio_lease_expires_at`. Reclaiming increments `attempts` and changes the token. Active, completed, cancelled, failed and needs-owner tasks cannot be claimed again; retries of failed work use a new request.
2. Produce real output from the stored brief. Verify sources for research. The worker should detect an already changed brief before spending work; the database checks again at completion.
3. `hq_studio_complete(p_handoff_id uuid, p_claim_token uuid, p_expected_revision integer, p_result jsonb, p_result_links jsonb='[]', p_status text='done')` applies output and records completion atomically.

`p_result` is `{summary: string, patch: StudioPatch}` for completed work. `p_result_links` is an array of `{url: string, label?: string}`. All URLs must be HTTP(S).

| Type | Minimum actual output for `done` |
| --- | --- |
| Research | `patch.research.facts` with at least one `kind='fact'`, a source URL for every fact, and explicitly labeled `kind='scenario'` assumptions |
| Draft | At least three distinct `patch.decisions.hooks[].text` choices and a usable `patch.creative.script` or `caption` |
| Production | Nonempty `patch.creative.asset_urls` and delivery receipt links to finished assets; a plan or prompt is insufficient |

Completion requires the lease token, an unexpired claim, and equality among the requested revision, submitted expected revision, and current content revision. A stale result raises `40001` and changes neither content nor the task. The worker can then close it with `p_status='needs_owner'` and a summary plus `partial_output` retained inside the result. `failed` and `needs_owner` never apply the submitted patch or complete a pipeline action.

The result stores the original submission, worker, whether it was applied, and resulting content revision. An identical completed retry is idempotent; replacing a completed result fails. Cancellation or a renewed lease prevents late writes. If a linked worker action exists, its completion happens only after valid output was saved, in the same transaction. A pause or failed action update rolls back all of it. The legacy mailbox trigger is not required for this guarantee. No RPC changes content stage or creates a placement, and the worker cannot complete an owner review through this API.

## Measured results and template learning

`hq_studio_record_result(p_content_id uuid, p_placement_id uuid|null, p_metrics jsonb)` records a real observation for a project manager. `p_metrics.platform` is required and uses the existing platform enum values. Supply a real `post_url` when no placement is provided; with a placement the URL must match its saved `live_url` and the placement must belong to this content and project.

Optional fields are `captured_on` (defaults to today; no future date), `posted_at`, `snapshot_day`, `views`, `reach`, `likes`, `comments`, `shares`, `saves`, `follows_gained`, and `notes`. At least one measured metric is required. Counts and snapshot day are nonnegative whole numbers. Leave unknowns blank rather than entering zero. Baseline/outlier estimates are not inferred by this API.

The existing `(post_url,captured_on)` key prevents duplicate observations. Updating a same-day observation preserves metrics not supplied by the edit. It cannot take over an observation attached to other content. `data.studio` captures template ID/version, saved revision, picks, and selected hook; template attribution survives future changes to the catalog. `hq_studio_results(p_content_id)` reads scoped observations. Recording results does not fabricate a placement, publish content, or automatically mark a format validated.

## Verification

Run `node --test scripts/tests/content-studio-database.test.mjs`. The PGlite suite reproduces Supabase default function privileges and verifies the explicit role matrix on both initial application and reapplication. It also exercises project/page permissions, anonymous denial, actual-role worker protection, snapshot immutability, legacy briefs, optimistic concurrency, atomic create/retry, queue idempotency, fact/draft/asset requirements, cancelled/expired/stale leases, owner-step exclusion, paused pipelines, completion without the legacy bridge, approval invalidation, advisory scores, measured-result attribution and evidence-backed template validation. Before deployment, also run rollback-only acceptance checks against the actual deployed schema and its existing delivery triggers.
