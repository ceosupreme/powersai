# Product runs in Content Studio (plan only)

## What the owner gets
One **Start** button on a product task, a product row, a brand page and Content Studio. All four open the same step-by-step run and pick up where he left off. Each stage shows what and why, the choices to tap (recommended marked, each with "pick this when"), what HQ already decided and why (each changeable), who does the work, the outputs and where they land, the pass/fail check and his minutes. The run ends with an upload kit and a "paste live link" box. Nothing counts as listed until a real link is saved.

## 1. Where the recipe JSON lives
**`content_templates`**, one row per product type (slug = `written_book`, `ebook_guide`, `course`, `puzzle_book`, ...), with the full JSON in `recipe` and the version in `version`. Why:
- The Studio already stores, versions and snapshots its templates there, so runs keep the version they started with (owner need 9) without new machinery.
- A new product type is one new row, not new code.
- The knowledge_base playbook (`key:written_book`) stays the readable copy. A new `kb_id` field inside the recipe links the two so the Playbooks shelf and the run never drift. key_points keep working for the existing work-plan builder.
- Loading: an admin-only "Import recipe" box on the template (paste JSON, or later read it from the Drive file once the shared Drive connection lands). Import checks the shape (stages, choices, checks, skip rule on every owner stage, upload_kit) and bumps the version. Old runs keep their snapshot.

A `kind` value in the recipe (`product` vs post/video) keeps product templates out of the post/video picker.

## 2. How a run and its stage results are stored
No second job system. **A run is a `production_jobs` row**, made by the existing `hq_create_pipeline`:
- `kind='product'`, `target_type='channel_product'`, `target_id` = the product row, `recipe` = a frozen copy of the template JSON plus template id and version, `current_step` = the current stage.
- Each stage becomes one `action_items` step, the same way composePipeline already does, so owner stages show up in Waiting on me and agent stages show up on the Agent Desk with no new lists.
- **Stage results** (choices tapped, decisions overridden, voice transcript, output links, check result, skipped + which rule applied) are stored in a `stage_results` JSON keyed by stage key on the job. This needs one new nullable column, `production_jobs.run_state jsonb`. **This is the only schema change, and it needs your approval.** The fallback with no schema is storing it inside `recipe`, but that mixes the frozen recipe with live answers, so I don't recommend it.
- Resume: Start looks up an open product job for that product. If one exists it opens it; otherwise it creates one. That makes one run per product, enforced in the create function.

## 3. Who does each stage
- **owner**: the step sits in Waiting on me with a plain line ("Pick the subtitle — 10 min"). Voice choices take a dictated answer through the phone keyboard's mic and a browser recording. The recording is saved to storage, and the transcript (from the AI connector) is saved with it.
- **claude / muse / chatgpt**: HQ writes a mailbox row through the existing `hq_studio_request`, addressed to the person the task belongs to and carrying the stage brief, inputs and earlier results. The agent claims and completes it with `hq_studio_complete`, putting outputs in `result` and proof links in the usual proof field. A small extension maps a completed product-stage handoff back into `run_state` and advances the step. The database trigger keeps moving the job, as it does today.
- **hq_instant**: one call from a new backend function `product-run-instant` to the AI connector, using the saved inputs, returns the options (e.g. three subtitles) right on the screen.
- **Check**: stored as passed/failed with a note. On a fail, the recipe's `if_fail` sends the stage back to its doer.
- **Skip**: an owner stage can be skipped only by applying its recipe skip rule (use the recommended option, or route to the agent). The rule is recorded, and the run moves on.

## 4. Screens (phone first)
- **Run screen** `/content-studio/run/:jobId`: a stage list at the top (done / waiting on you / waiting on Claude), then the current stage card with large choice buttons, a "HQ decided" section with Change links, Who does it, Outputs, Check and minutes. The bottom button always says what happens next ("Approve — starts the interview").
- **Upload kit**: files (open/download, from the brand's Drive folder through the shared connection, or proof links until then), links, every field in site order with a copy button and a live character count against its limit, and the AI-content answer. Last comes the **live link** box. Saving it creates or updates the `product_listings` row (outlet, url, listed_at) and moves `channel_products.status` to `live`. An empty or malformed link is rejected.
- **Start buttons**: Products row, product-type task card (TaskExplainer), brand workspace product lane, and a "Products" tab in Content Studio that stays separate from posts/videos.

## 5. Left out of version 1
Automatic upload to KDP or any other site; reading recipes straight from Drive (paste import first); twin listings and revenue sync; checking that a pasted link really resolves (it is format-checked and timestamped only); the Now/Queue urgent lane; making cover/interior files inside HQ (agents produce them); multiple simultaneous runs per product; printable/journal/coloring recipes (data only, once written).

## 6. Risks and conflicts
- **Content Studio**: its run function currently returns 401 in the managed runtime, which is unresolved. Product runs avoid depending on it by using the job, mailbox and new instant function, but the instant function could hit the same binding issue. I'd test that first.
- **Work-plan builder**: product stages must go through composePipeline/hq_create_pipeline, never a parallel path. Twelve stages with depends_on gating must not flood Next 10, so only the current stage is shown, using the existing ownerWork rules.
- **Products page**: status words are a fixed list. The run moves status only at real milestones (brief → brief, drafting, needs cover, ready to upload, live) and never sets live without a link. Hand edits on the Products page could conflict with the run, so the run shows the current status and doesn't overwrite a later one.
- **Finished-posts/Drive build (other thread)**: wait for its Drive connection and brand folder scoping, then reuse them. Product files go in a `Products/<title>` subfolder, and daily-post folders stay untouched. Until it lands, the kit shows proof links.
- **Agent Desk**: product handoffs must be addressed to the person and readable by people. The tidy trigger already normalizes brands and proofs. Product stage rows need a stable unique key (job id + stage key) so a retry doesn't double-post.
- **Recipe quality**: an owner stage missing a skip rule, or a choice missing a recommendation, would stall a run, so import rejects it.
- **Posts/videos speed**: product templates are filtered out of post/video lists, and the run screen loads only its own job.

## 7. Build order and credits
1. Recipe import, shape check, Written book v2.0 loaded as a template (2–3)
2. Migration `run_state` (after approval) + create/resume one run per product + Start buttons (3–4)
3. Run screen: stage card, choices, decided/override, skip rules, check (4–6)
4. Agent stages via mailbox + write-back extension; owner stages in Waiting on me (3–4)
5. hq_instant function + voice answers (3–4)
6. Upload kit + live link → listing + status (2–3)
7. Drive file view reuse once the other thread lands (2–3)
8. Tests for the rules (snapshot, skip, live-link gate, one run per product), guide update, phone check end to end on one real book (2–3)

Total about 21–30 credits over 6–9 messages.
