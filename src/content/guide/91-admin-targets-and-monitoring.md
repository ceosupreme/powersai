# Admin: targets, monitoring and Sync Health
<!-- part: Tools and system | order: 91 | slug: admin-targets-and-monitoring | route: /admin/sync-health | tags: targets, periods, pillar weights, auto-approve, daily flash, email, online ratings, google rating, yelp, compliance, sweep, sync health, ai calls, cost, settings -->

These Admin Panel screens set the numbers HQ measures projects against and let you watch what HQ's automatic checks are doing. They are five "Settings" sub-tabs ("Targets", "Auto-Approve", "Daily Flash", "Online Ratings" and "Compliance") and the separate Sync Health page. Most people only visit them when setting up a project or checking that HQ is healthy.

## Where to find it

- The five sub-tabs: Admin Panel, "Settings". On a phone the sub-tabs show icons only; these five are the second to sixth: a target, a robot, an envelope, a star and a shield.
- Sync Health: it has no menu link. Open it from the Launch Checklist card about security ("Open Sync Health"), or add /admin/sync-health to the site address. Only the admin can open it.

## What you see

- "Targets": "Period Config Targets", with "Select Project", "New Period", "Period Name", "Effective Start", "Effective End", four groups of target boxes ("Revenue Targets", "Labor Targets", "Operations Targets" and "Client Experience Targets"), "Pillar Weights" for "Guest", "Revenue", "Labor" and "Delivery" with a "Sum" badge, and "Save Targets". Most targets are restaurant measures, such as weekly net sales, labor percent, kitchen ticket times and tips.
- "Auto-Approve": an on/off switch. When on, it shows "Rule 1 — Severity by Project Score", "Rule 2 — Repeat Action Matching", "Rule 3 — Pillar Overrides" and "Activity" for this week ("Auto-approved", "Revoked" and "Min saved").
- "Daily Flash": "Daily Flash Email Recipients", described as "Who receives the morning performance summary".
- "Online Ratings": a project picker, Google and Yelp "Rating" and "Review Count" boxes, "Combined Online Reputation", "Save" and "Sync Google from API".
- "Compliance": "Compliance Audit", a table for each project over the last 30 days, with "Refresh", "CSV", "Run sweep (7d)" and "Backfill 30d (all)".
- Sync Health: three counts ("Coverage-gate suppressions", "Dedup races (23505)" and "Sanity-check suppressions") with a table for each, then "AI calls": "Total AI cost (7d)", "Total calls (7d)", "Error rate (7d)", "Cost by function & provider (7d)" and "Recent AI calls (24h)".

## How to use it

### Set targets for a project
1. Open "Targets" and pick the project under "Select Project".
2. If it says "No period configs. Create one to set targets.", tap "New Period".
3. Fill in the target boxes you care about. Empty boxes are fine.
4. Enter "Pillar Weights" that add up to 100. "Save Targets" stays grey until the badge reads "Sum: 100/100".
5. Tap "Save Targets". You see "Targets saved".

### Start a new target period
1. Tap "New Period". It starts today and ends the current period today.
2. Older periods appear as chips; tap one to view or edit it.

### Turn on auto-approve rules
1. Open "Auto-Approve" and turn on the switch.
2. Under "Rule 1", drag the sliders for "LOW severity" and "MEDIUM severity". The rule says actions of that level are approved automatically when the project's score is at or above the number. High and critical actions always wait for you.
3. Under "Rule 2", turn on matching, pick the "Match window", and under "Advanced" set the "Similarity threshold". The screen says actions that closely match ones you approved before, for the same project and pillar, are approved automatically.
4. Under "Rule 3", turn off any pillar whose actions you always want to review yourself.
5. Every change saves on its own ("Settings saved"). "View auto-approve history" shows the last 20.

### Choose who gets the Daily Flash email
1. Open "Daily Flash", type an address in "Add email address" and tap "Add".
2. Remove someone with the small x on their address.

### Update a project's online ratings
1. Open "Online Ratings" and pick the project. Projects without a Google Place ID say "(no Place ID)".
2. Type the Google and Yelp "Rating" and "Review Count", then tap "Save". Saving twice on the same day updates that day's record.
3. Or tap "Sync Google from API" to pull Google ratings for every project that has a Place ID.

### Check compliance
1. Open "Compliance". It loads by itself; "Refresh" reloads it.
2. A red number or a warning triangle means raw signals exist, such as missing clock-outs or overtime, but no insight was created.
3. Tap "Sweep" on a row to re-check one project, "Run sweep (7d)" for every project, or "Backfill 30d (all)" for the last 30 days.
4. Tap "CSV" to download the table.

### Check Sync Health
1. Open Sync Health and read the three counts. Each one is HQ holding back a doubtful number or a duplicate, so a sudden jump is the thing to look into.
2. Scroll to "AI calls" for cost, call counts and errors over the last 7 days.
3. In "Recent AI calls (24h)", a red error badge marks a failed call. On a computer, point at it to read the message.

## Words on this screen

- Period: a date range with its own set of targets.
- Pillar weights: how much each pillar counts toward the score. They must total 100.
- Severity: how serious a suggested action is.
- Revoked: an automatic approval that was later undone.
- Min saved: an estimate of 2 minutes saved per automatic approval.
- Place ID: Google's number for a business listing.
- Sweep: a fresh check of staff time records for compliance problems.
- Coverage gate: HQ hid a number because too few days of data came in.
- Dedup race: two processes tried to save the same insight at once, and one was skipped.
- Sanity check: HQ held back an insight because the number jumped so far it looked like bad data.
- Tokens: the amount of text an AI call reads and writes, which drives its cost.

## Good to know

- "Period Name" is not saved when you tap "Save Targets". This looks like a bug.
- Not confirmed: HQ saves the auto-approve rules and the Daily Flash list, but no code in this project applies the rules or sends the Daily Flash email. An outside service may use them.
- The auto-approve pillar names (Revenue, Labor, Operations, Guest Experience) are the older restaurant pillars.
- Compliance reads staff time records from connected restaurant systems. Projects without them show zeros.
- Sync Health is read only. Reload the page to refresh it. Each list shows up to 200 rows, times are Pacific, and the "Bar" column shows an internal project number rather than a name.
- If a Sync Health list fails to load, it shows its "nothing found" message, so an empty list is not proof that all is well.
- Sync Health does not show security rules, even though the Launch Checklist points to it for that.
