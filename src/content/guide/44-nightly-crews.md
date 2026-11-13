# The crews that run while you sleep
<!-- part: Making things | order: 44 | slug: nightly-crews | route: /admin?tab=crews | tags: crews, crew activity, scheduled tasks, automation, overnight, email report, weekly hq run, backlog builder, muse, morning brief, life pulse, blog autopilot, city fill, background jobs, missed run -->

Crews are scheduled tasks in your Claude account that work for HQ and your brands on a fixed schedule. HQ also runs its own background jobs inside its database. Every crew writes one line to HQ when it finishes: what it tried, what it got done and what it flagged. The Admin Panel's "Crews" tab shows each one's last run, and your morning brief tells you only about the ones that failed or missed their run. This article lists the crews as of November 9, 2026 and explains how to check on them.

## At a glance

Claude crews, in Pacific time:
- Every day at 5:56 AM: the morning brief (the Life Pulse collector).
- Tuesdays at 3:41 AM: the weekly backlog builder.
- Fridays at 2:17 AM: the weekly HQ run.
- Saturdays at 1:35 PM: the weekly social posts for Muse.
- Mondays and Thursdays at 5 AM (6 AM in summer): the Coastal Beauties blog crew.
- Mondays at 6:33 AM: Coastal Beauties City Fill.
- Every day at 10 PM: the Life Pulse check-in reminder.

HQ background jobs: the automation sender every 5 minutes, the checkout double-check every hour, and once a day the follow-up stopper, the setup scores, the trend feeds and the job history cleanup. Recovery report drafts run every Monday.

## Check that your crews ran

1. Open "Admin Panel" and tap "Crews". On a phone the tab shows a pulse line. A red number on the tab counts the crews that need a look.
2. Read the box at the top. It says "Nothing failed or missed its schedule", or it names each crew that needs a look.
3. Each crew has a row: what it does, when it runs, when it last ran, what it got done, what it flagged, and how it reports to you. A red dot and red text mean it failed or missed its run, with the reason.
4. Tap "Refresh" to check again. The tab also refreshes itself every few minutes.

The morning brief reads the same list every morning. When a crew failed or missed its run, the push has a line such as "Crews: Weekly HQ run failed; Muse posts missed its run". When everything ran, the brief says nothing about crews.

### Brand activity and default brands

A crew run appears in a brand's "Latest work" when the run lists that brand. Tap it to read "What it tried", "What got done" and, when present, "Needs you", or ask about it. A run marked ok or partial counts as work done for that brand; publishing is still measured separately.

Admins can tap the "Default brands" chips on a crew's row to change which brands its future runs belong to. Defaults apply only when the run does not supply a brands list; an explicit list (including an empty one) always wins. Coastal blog and City Fill default to Coastal Beauties; Local news defaults to San Diego Remix and Temecula & Murrieta News. Multi-brand crews must list the brands they actually touched on each run. Life Pulse runs without brands stay out of brand feeds. Changing defaults does not change old runs or the crew's schedule.

## The Claude crews

### Morning brief (every day at 5:56 AM Pacific)

- It pulls your job-search mail and agent reports into Life Pulse, and finds new jobs on Indeed, in job-alert emails and in a few public feeds.
- It reads HQ and picks the day's three business moves, plus anyone waiting on you: website inquiries, orders, emails to hello@ and free checkups that left an email.
- It checks that supremeteammedia.com and the free checkup page load.
- It files the prospect lists your Muse agent emails onto HQ's Prospects page.
- It sends one push, "Morning brief" with the date, which also names any crew that failed or missed its run. Nothing is emailed.

### Weekly HQ run (Fridays at 2:17 AM Pacific)

- Agent Desk first: it checks the work orders in your Airtable base, verifies or sends back the finished ones, and writes up to three new ones.
- It files the playbooks you finish. Drop a finished playbook in the Drive folder "Supreme Team HQ - Playbook Inbox", named for the playbook (for example "Pinterest - playbook"), and it becomes that playbook's next version, word for word. The run does not write playbooks or do niche research: you do that in your own AI threads (your call, November 1, 2026). Other material stays in the inbox, marked new, for you.
- It does up to six of Claude's ready pipeline steps, no more than three from one job, most urgent first. Each file goes into the brand's folder inside "Supreme Team HQ - Brands", is linked on the step, and the step is marked Done. When the next step is yours, it adds a Life Pulse card with an "Open pipeline" button.
- It files channel numbers: Metricool followers and posts once a week, your Muse complaint reports into each brand's Answer Bank, and your Muse Facebook stats reports. It also matches placeholder brand colors to your real page images.
- It emails "Weekly HQ run: what got done" when anything happened.

### Weekly backlog builder (Tuesdays at 3:41 AM Pacific)

- It keeps a backlog of researched, ready-to-make ideas for every brand. A brand is full at 10 vetted ideas; a brand that sells products also needs at least 3 product ideas.
- Each week it picks three brands that are not full, researches them with free sources, and files up to six briefs per brand that score 60 or more with at least two separate signals. It uses vidIQ only for YouTube-led brands, at most 10 credits a run.
- Briefs show up on "Radar" and on each brand's "Intel" tab. It never starts a pipeline: you do that with "Make this".
- It emails "Backlog builder" with the number of new ideas and how many brands are full. When every backlog is full, it stops and sends nothing.

### Weekly social posts for Muse (Saturdays at 1:35 PM Pacific)

- It records what Muse posted from last week's batch and marks those posts approved and published in HQ. Your approval in Muse counts as your HQ approval (your call, November 1, 2026).
- It decides which Facebook Pages are active next week, makes next week's posts with their images and videos, saves them in HQ as drafts, and writes the message for Muse in Drive.
- It emails "Muse posts ready" with the week and the message to paste into Muse. It never posts anything itself.

### Coastal Beauties blog crew (Mondays and Thursdays)

- It publishes one new article, or one real update to an existing article, on the Coastal Beauties website, at 5 AM Pacific in winter and 6 AM Pacific in summer.
- It costs no Lovable credits, uses only images that are already on the site, checks the article against the content standard, and checks the live page after publishing.
- It only notifies you when something needs you: a draft that scored just under the bar and is waiting for your look, a run that could not publish, or a broken page.

### Coastal Beauties City Fill (Mondays at 6:33 AM Pacific)

- It adds up to 15 new local businesses a week to the Coastal Beauties directory: photographers, model and talent agencies, studios and video crews, and hair, makeup and styling pros. Each one is checked on its own website first.
- It never adds models or influencers. You hand-pick those.
- It emails "Coastal Beauties directory: weekly fill", including what is waiting for your review.

### Life Pulse check-in reminder (every day at 10 PM Pacific)

- One push, "Tonight's check-in", unless you already did it.

## HQ background jobs

These run inside HQ's database on a fixed world clock, so their Pacific times move by an hour when daylight saving time starts or ends.

- Automation sender, every 5 minutes: sends approved automation messages when their time comes. Only messages you approved go out.
- Checkout double-check, every hour: checks Stripe for completed online checkouts and records any that were missed.
- Follow-up stopper, every day at 5 AM Pacific: cancels pending follow-ups for leads who replied, booked, opted out or were halted.
- Setup scores, every day at 2:05 AM Pacific: recomputes every brand's Setup score. See "How scores work".
- Trend feeds, every day at 5:07 and 5:22 AM Pacific: fetch and file Google's Trending Now feeds, and on Mondays the autocomplete for every brief keyword.
- Recovery reports, Mondays at 8 AM Pacific: drafts a recovery report for each active project. Drafts are never sent on their own.
- Job history cleanup, every day at 1:17 AM Pacific: deletes background-job history older than 7 days.

Four of these jobs hand their work to a backend function: the automation sender, the checkout double-check, the follow-up stopper and the recovery reports. The job history only shows that the hand-off happened, so HQ also records what the function answered each time, and the "Crews" tab goes red when the function turns the job away or fails. Since November 9, 2026 each of these jobs signs in with its own key.

## What the crews never do

- Spend Lovable credits or money. Paid research tools are used only inside the caps you set.
- Publish, schedule or post anything, except the blog crew, which publishes one article per run on the Coastal Beauties site.
- Approve content for you. The Muse crew only records the approvals you gave in Muse.
- Delete your material or overwrite a written playbook.
- Contact anyone but you, or ask for a password.

## How to use it

### Find out what a crew did
1. Open "Admin Panel", "Crews" and read the crew's row: "Got done" and "Flagged" come from its last run.
2. For the full detail, open the report it names under "Reports to you by", such as the "Weekly HQ run: what got done" email.
3. Tap a pipeline link in that email to open the job. Finished steps show their file link.

### Get a step done sooner
1. Make sure the step before it is Done and the brand is active. The weekly HQ run only picks up steps that are ready, skips parked jobs, and takes the most urgent steps first, then the oldest jobs.
2. When a step cannot wait for Friday, open the pipeline, tap "Copy prompt" on the Claude step, and paste it into a Claude chat. Claude does the step there and marks it done with the output link.

### Pause or change a crew
The crews are scheduled tasks in your Claude account, not settings in HQ. Ask Claude in any chat to pause, resume or change one, for example "pause the weekly HQ run for a week". Claude confirms before it changes anything. A crew that is new or renamed shows up on the "Crews" tab the first time it logs a run.

## Words on this screen

- Crew: a scheduled Claude task that works for HQ on its own.
- Background job: a job that runs inside HQ's database on a fixed clock.
- "Ran fine": its last run did its job, or found nothing to do.
- "Partly done": it ran but part of the job was blocked or skipped. "Flagged" says what.
- "Failed": its last run did not get its main job done, or could not send its report.
- "Missed its run": no run came in within its window.
- "No run logged yet": it is new on the list and its first run is still ahead.
- "Waiting for first answer": a background job that already runs on schedule, but HQ only started recording what its function answers. The answer shows after its next run.
- "Paused": the job is switched off.
- "Result not tracked": the job starts on time, but HQ does not record yet whether the work behind it succeeded.

## Good to know

- A crew's window is its schedule plus some slack: a day and 2 hours for daily crews, a week and 3 hours for weekly crews, and 4 days and 3 hours for the blog crew. The automation sender's window is 20 minutes.
- A crew logs its own run as its last step, even when it had nothing to do or hit an error. A crew that stops partway may not log at all; it then shows as "Missed its run" once its window passes.
- The Claude crews follow Pacific time all year. Times can slip by a few minutes when many scheduled tasks start at once.
- The "Queue" button on a Claude step saves a request but does not start a run, and the weekly HQ run does not read it yet.
- If a step stays Open for several weeks, read its note on the pipeline page. It almost always names what is missing, such as an input, a login, a playbook you need to write, or your decision.
- Life Pulse is your private dashboard, a separate app. The morning brief and the check-in reminder belong to it; they are listed here so you can see every scheduled task in one place.
