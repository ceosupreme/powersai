# Leads sales desk (plan only)

Checked today: 13 leads, **0 activity rows**, **0 assigned**, `found_by` empty or "GoHighLevel import". outreach_templates only has the categories close, logistics, loom_system, mystery_shopper, objection, post_audit and referral, in sms / email / vm_script. There is no cold-call script and nothing keyed to a lead type.

## How the days go
**Salesperson (phone):** Open HQ and land on **My next lead**: one card with the business, why it's next ("Assigned to you · 3rd try · callback due 2:00"), the script for this lead type, and big **Call / Text / Email** buttons. These open the phone's own dialer, messages or mail with the wording filled in. Opening the card marks it "Maria is on it" for 30 minutes. When they come back, a **What happened?** sheet appears with 8 buttons. One tap saves it, sets the next try and shows the next lead. The top of the screen shows the day's count and streak ("6 calls · 2 conversations").

**Owner:** The Dashboard card shows the team today (calls, conversations, booked, won, pay owed) and stale leads. From Leads he can multi-select → Assign to / Make open, import a list and attribute it, and on a won deal tap one of the 3 pay levels. A weekly pay summary can be exported.

## Rules (one place: src/lib/leads.ts + database functions)
- **Result → effect table** (data, editable later):
  | Result | Stage | Next try | Attempt |
  |---|---|---|---|
  | No answer | first_contact | +1 business day, then +2, +3… | +1 |
  | Left voicemail | first_contact | +2 business days | +1 |
  | Call back later | unchanged | chosen time | +1 |
  | Interested | reply | +1 day | +1 |
  | Meeting booked | booking (credits the booker) | meeting date | — |
  | Not interested | Dead after confirm | none | — |
  | Wrong number | flags the phone, tries email/text | +1 day | — |
  | Asked to stop | `hq_contact_opt_out` | never | — |
  
  The cadence aims for about 6 call attempts over about 3 weeks, mixing in text/email. After the last attempt the lead moves to "Rested" (back to open after 60 days), not Dead.
- **Claim:** an atomic `hq_lead_claim` sets `working_by/working_until` (30 min) only if no one else holds it. Releasing happens on result or expiry. The queue hides claimed leads and leads whose next try is in the future.
- **Queue order:** callbacks due now → my assigned leads (hot, then oldest due) → open leads by fit score. This replaces the separate `topLeads` ordering so the Dashboard and the queue never disagree.
- **Stale:** an assigned lead untouched for N days (setting, default 5) goes back to open, with an activity row recording why. A daily job does this; the owner gets a stale list.
- **Credit:** `brought_by`, `booked_by` and `closed_by` user ids, plus `pay_level` (rep_alone | rep_with_owner | rep_sourced_owner_closed) required when moving to Won. "Touched last" comes from the latest activity.
- **Duplicates:** on import/add, match on contact_points phone/email, normalized website domain and place_id. Matches are shown as "already in HQ (assigned to X)" and skipped, or merged by choice.

## Screens (phone first)
1. **My next lead** (new tab on /prospects, the default for non-admins) + result sheet.
2. **Lead sheet**: script panel for the lead type (opener, voicemail, text, objections as tap-to-expand, offer facts), credit line, attempts "3 of 6".
3. **Bulk bar** on List: assign, make open, export (later limited for outside reps).
4. **Import**: paste or CSV with column mapping, dedupe preview, then "Brought by".
5. **Team card** on the Dashboard + a stale list; extend TopLeadsCard instead of adding a new card.
6. **First day**: a 3-item checklist on My next lead (read the offer → practice lead → first real call), plus a **Practice lead** that doesn't count and can't be dialed for real. HelpTips sit on the result buttons. Guide files are updated.

## Ideas you didn't list
- **Practice mode** lead (safe first call) and a **call timer**: tapping Call starts a timer, so a 2-minute-plus call suggests "Conversation".
- **Best time to call** shown from the business hours on its Google listing.
- **Quiet hours**: Call/Text are disabled before 8am and after 9pm in the lead's local time (TCPA/state rules). Texts to cold numbers are a legal risk, so keep text to leads who replied or inquired until consent rules are settled.
- **Hand-off note** required when reassigning a lead that has activity.
- **"Why lost" reason** on Not interested, so the owner learns which pitch fails.

## What gets in the way
- No person-level `brought_by/booked_by/closed_by`, no attempt counter, no claim fields, no pay level. These are **new nullable columns on prospects** plus a small settings row (stale days, cadence). **Schema change needs approval.**
- `hq_lead_stage_event` has no "dead/lost/won" path, by design. Won/Dead need a new admin/owner-checked function (closer + pay level) so the forward-only rule stays intact.
- Staff have Leads off by default. Turn it on for the roommate per person (a setting, no code).
- `found_by` is free text. Keep it as the source label and add `brought_by` for the person.
- outreach_templates has no lead-type key fit for cold calls. Reuse it with a `lead_type` mapping in `vertical` plus new categories (cold_call, voicemail, text_first, objection, offer). No new table.
- assigned_to holds no names. The queue needs hq_team_names() (already exists).
- Realtime: a claim must show up fast on others' phones. Use a 20-second refetch plus a server-side check at claim time (the claim is the true guard).

## Claude can do outside the agent (no credits)
Load script content into outreach_templates; write the cadence/stale settings row; turn on Leads for the roommate's login; write the HQ Guide text and the first-day checklist copy; create the practice lead and test data; import the owner's lists after the importer exists.

## Not in this build (room left)
Booking links (`booked_by` is already the field they'll fill), Twilio bridging (the Call button becomes a choice later), sequences (the Auto switch stays as is), Gmail/calendar, and export limits for outside reps.

## Build steps and credits
1. Migration: credit/claim/attempt columns, settings row, claim/release/log-result/close/stale functions, daily stale job (once a day). (3–4)
2. Shared rules in leads.ts (result table, queue order, cadence) + tests, one per rule. (2–3)
3. My next lead screen + result sheet + tel/sms/mailto fill. (4–5)
4. Lead sheet: scripts by lead type, credit line, attempts, Won with pay level. (2–3)
5. Bulk assign/open + import with dedupe and brought-by. (3–4)
6. Dashboard team card, stale list and pay summary. (2–3)
7. First-day checklist, practice lead, HelpTips, guide update, phone test as Staff. (2)

Total about 18–24 credits, 6–8 messages.
