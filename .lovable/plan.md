# Finished posts in HQ (plus brand Drive files)

## The short answer
- One record per finished post, stored with HQ's other content: one **content item** per post package, plus one **placement** per platform (Instagram, Facebook...). Agents write them every night. The Drive folder stays where the files live.
- Brand page: a **Posts** meter and list, ranked by quality, with media, captions, copy buttons, Drive links and Mark posted.
- All brands: a new **Daily posts** view inside the Production Board (not a new board).
- Only real exceptions reach **Waiting on me**, in plain words.
- Media previews need the Google Drive connection, read-only. The brand Drive files view (the earlier Drive plan) rides on the same connection, so it's built in the same project as step 4.

## 1. Where a finished post lives (one source of truth)
**Reuse content items and placements, don't extend the mailbox rows.** Why: placements already hold "published only with live link and verified time"; content items already have quality score, brand, approval and the brief; the brand Content tab and Production Board already read them. Mailbox rows stay what they are: the job to *make* the post. The six social-post mailbox rows link to their package by `content_item_id` (the column already exists).

### Write contract for the agents
**content_items**, one row per brand per post day:
- `project_id` = brand (venue id) · `title` = "<Brand> — 2026-11-27"
- `purpose_type` = `'daily_post'` (new allowed value; how HQ keeps these out of the normal boards)
- `stage` = `'ready'` · `due_date` = post date (Pacific, YYYY-MM-DD)
- `quality_score` = 0–100 · `quality_notes` = one plain line
- `brief.daily_post` (JSON):
  - `post_status`: `ready` | `almost_ready` | `waiting_on_owner` | `scheduled` | `posted` (agents set the first three, and `scheduled` when a scheduler took it; HQ sets `posted`)
  - `waiting_reason`: `needs_person_approval` | `no_channel` | `missing_logo` | `missing_link` | `account_problem` | `other` (+ `waiting_detail` free text, one sentence)
  - `almost_ready_detail`: what's missing, one sentence
  - `drive_folder_url`, `post_this_doc_url`
  - `media`: [{ `drive_file_id`, `url`, `kind`: image|video, `name` }]
  - `made_by`: claude | muse | chatgpt · `handoff_id` (optional)
- Unique key: one package per brand per post date (`idempotency`: agents re-running overwrite, never duplicate).

**content_placements**, one row per platform in the package:
- `content_item_id`, `project_id`, `channel` (instagram, facebook, tiktok, google, linkedin, youtube, pinterest, x)
- `status`: `planned` (ready, not scheduled) | `scheduled` | `published` | `failed`
- `scheduled_for` = posting time from POST THIS
- `receipt.caption` = full caption for that platform, `receipt.hashtags`, `receipt.notes`
- `idempotency_key` = "daily:<brand id>:<date>:<channel>"

I'll give you the exact SQL insert the agents can paste into their jobs.

## 2. Brand page
On the brand's Today tab, near the top: a **Posts** meter with five numbers: *Ready to post · Almost ready · Waiting on you · Scheduled · Posted*. Date chips switch between today, tomorrow and the last 7 days. Tapping a number opens the list filtered to it, best quality first.

Each post card (phone-first):
- Big media preview, swipe for more; **Save to phone** per image or video.
- One tab per platform: posting time, full caption in large text, **Copy caption**.
- **Open folder** and **Open POST THIS** buttons (inside HQ; Drive as a backup link).
- Quality score shown as a plain word plus number ("Strong · 86").
- **Mark posted** per platform.
- If almost ready or waiting, a plain line saying why.

A plain **Finished posts folder** link on the brand's Files and documents tab, opening that brand's day folders inside HQ.

## 3. All brands
A **Daily posts** tab on the Production Board, beside the stage tabs: the same meter totalled across all brands, then today's posts grouped by status, best quality first, with a brand filter. Same card as the brand page. A one-line summary on Today ("14 ready to post, 2 waiting on you") links there. No new board.

## 4. Waiting on you
Only packages with `waiting_on_owner` appear in Waiting on me, one line each, in plain words:
- "Jenna needs to approve this video before it goes out."
- "No Instagram account set up for this brand yet."
- "Logo missing from the brand kit."
- "Channel link missing."
- "Account problem: <detail>."
Ready, almost ready and scheduled posts never appear there, matching the Nov 22 rule that routine posts need no approval.

## 5. Mark posted from a phone
Tap **Mark posted** on a platform → paste the live link (paste button; the phone's share sheet usually copies it) → Save. HQ stores the live link and sets the verified time to now, with `receipt.verified_by = 'person'` and who did it. That meets "published only with live link and verified time": a person seeing the post live *is* the check. No link, no posted; there's a "Posted but no link yet" choice that keeps it as *scheduled* with a note, so nobody is forced to fake a link. When every platform is posted, the package shows Posted, and the matching mailbox post row gets the link too (same as the existing Agent Desk Mark posted), so both screens agree.

## 6. Keeping 23 a day from flooding things
Everything with `purpose_type = 'daily_post'` is left out of: Production Board stage tabs and counts, the four-week mix card, Waiting on you counts (except true exceptions), brand Content tab idea lists, and Content Studio. One shared filter rule so every screen agrees. Daily posts show only in the Posts meter, the Daily posts tab and Waiting on me (exceptions only).

## 7. Previews and Drive files
- Thumbnails, images, video and the POST THIS doc are private in Drive, so HQ needs the **Google Drive connection, read-only**. Simplest reliable option: one backend function that fetches a file by id **only if it belongs to a package or brand folder that person may see**, and streams the thumbnail or file. Nothing is copied into HQ.
- The brand Drive files view (brand kits, reference docs, approval docs) uses the same function and safety check, so it belongs in this build as a later step, not a separate project.
- Fallback with no connection: cards still show captions (stored in HQ), counts and links that open Drive; only previews are missing. So step 1–3 work before the owner connects.
- When it's time: owner taps Connectors → Google Drive → Connect, signs in with his Google account and allows only **"See and download your Google Drive files"**.

## 8. Access
Brand managers see only their brands' packages, previews and folders: same "assigned to this brand" rule as the Agent Desk, applied on both the records and the preview function. Admins see all. Mark posted is allowed for admins and the brand's managers.

## Database changes (need your approval)
- Allow `'daily_post'` as a content purpose type; unique key on (brand, post date) for daily posts.
- Read and Mark-posted rules for brand managers on these rows; one Mark-posted action that writes link, verified time and who.
- Check first: the existing content approval guard may refuse publishing a placement whose item has no approval. Daily posts need an exception there (per Nov 22); I'll confirm and adjust that guard only for daily posts.
- No new tables.

## Risks
- The nightly job must write every package, not only the folders; until it does, the meter undercounts. A small check on the Desk ("23 folders, 19 records") would catch gaps once Drive is connected.
- "Today's list" doc and these records could disagree; HQ trusts the records.
- The DONE-in-folder-name habit continues in parallel; Mark posted in HQ should become the habit. Step 4 could also read DONE names as a hint.
- One Google connection sees his whole Drive; safety relies on the per-file check, tested on its own.

## Build order and size
1. Records, filter rule, Mark posted, approval-guard exception, write contract for the agents (~4–5 credits).
2. Brand Posts meter and cards, captions, copy, Mark posted (~4–6).
3. Daily posts tab on Production Board, Today summary, Waiting on me reasons (~3–4).
4. Drive connection: previews, Save to phone, brand Drive files view (~6–8).
5. Guide and tests throughout.
Total about 17–23 credits, roughly 4–6 messages.

## Also ready
The urgent lane plan and the AI Recommendation Seat plan are written; I'll show them again next.
