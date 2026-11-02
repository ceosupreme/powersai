# Production jobs (pipelines)
<!-- part: Making things | order: 40 | slug: production-jobs | route: none | tags: production job, pipeline, job, steps, recipe, owner, claude, you, tool, nightly run, blocked, ready, queued, done, dependencies, current step, level, money destination, job status -->

A production job, which HQ also calls a pipeline, is the plan for making one thing for one brand: a content piece, a product, a money avenue switched on, a channel set up, or a playbook written. It breaks the work into numbered steps, says who does each step, and moves forward by itself as steps are finished. Read this to understand how every pipeline works before you start or open one.

## Where to find it

There is no single list of every job. Each job belongs to one brand and has its own pipeline page, which opens as soon as you create the job. After that, you reach it from the "Pipeline" buttons on a brand's "Products", "Intel" and "Playbooks" tabs, "Open setup job" on the "Setup" tab, "Open" next to a step in the brand's "Waiting on you", or a "Next 10" row ending in "· Pipeline".

## What you see

Every job has the same parts:
- Kind: what the job makes. A content job makes a piece from a brief or pain, a product job makes a product, a lane job switches on a money avenue, a channel setup job sets up one account, and a playbook job writes a playbook.
- Recipe: the list of playbooks the steps were built from, in this order: the brand's rules, its niches, the product type, the destinations, then the monetization and promotion playbooks. Each shows its version, so you can tell later which version of a method was used.
- Steps: the numbered tasks, done strictly in order. Each step waits on the one before it, and each has an owner and a status (both explained below).
- Current step: the step the job is on now.
- Level and money destination: the production level (1 to 3) and where the money is meant to land, such as an Etsy shop.
- Job status: "Ready", "Running", "Blocked", "Waiting on a decision", "In review", "Finished" or "Parked". The database sets it as the job moves.

How the steps are built:
- Content and product jobs always start with "Brand rules check", a Claude step. Then come the product type playbook's steps, then each destination's steps, then the extra steps that the monetization and promotion playbooks add.
- Lane jobs (from "Turn this on") and channel setup jobs (from "Set up" or "Set it up") use a fixed five-step plan instead. A media kit setup uses its own three steps.

## How to use it

### To follow a job from start to finish
1. Start the job. It begins on step 1, with the status "Ready" when step 1 is yours or "Running" when step 1 is Claude's.
2. When the current step is yours, it appears in the brand's "Waiting on you" list and is ranked into "Next 10" with everything else. Do the work, then tap "Done".
3. When the current step is Claude's, it stays out of your lists. An external worker must pick it up, do the work and save the output. The documented schedule is 2:13 AM Pacific, but HQ does not confirm that the worker is running. Check the last actual run and the saved output.
4. Each time a step is marked done, HQ moves the job to the next step by itself. You never move a job by hand.
5. Later steps show "Blocked" until the step before them is done. Carry on until the last step is done.

### To get a Claude step done sooner
1. Open the job's pipeline page and find the step.
2. Tap "Copy prompt".
3. Paste the prompt into a Claude chat. It names the brand, job, step, playbook and checks, and ends by asking Claude to mark the step done in HQ with a link to the output.

### To give one of your steps to Claude
1. Open the job's pipeline page and find your step.
2. Tap "Hand to Claude". The step leaves your lists and becomes eligible for the external worker. This does not start a run or confirm pickup.

## Words on this screen

- Playbook: a written method in HQ's library. Pipelines build their steps from playbooks.
- "Claude": a step assigned to Claude, for an external worker or a prompted chat to complete.
- "You": a step you do and mark done.
- "Agent" and "Tool": steps owned by an automation other than Claude. The pipelines HQ builds only use "Claude" and "You". Not confirmed: where agent and tool steps come from.
- "Done": finished.
- "Blocked": waiting on an earlier step that is not done.
- "Ready": your step, free to do now.
- "Awaiting your decision": your step whose title starts with "Decision". You decide, then mark it done.
- "Queued": a Claude step awaiting worker pickup, not confirmation that a run has started.
- "Open": a step owned by an agent or tool that is not done or blocked.
- Level: the production level for the job, 1 to 3.
- Money destination: where the money from this job is meant to land. It is free text.
- Nightly run: the external production worker, documented to run at 2:13 AM Pacific. Its current schedule and health must be checked in the service that runs it.

## Good to know

- Only one step is current at a time, because each step waits on the one before it.
- Your steps are created at priority P2 and Claude's at P3, so your steps rank fairly high in "Next 10".
- The Today page's "Waiting on me" list only holds items that still need a yes-or-no decision. Pipeline steps never land there. Your first step in a new pipeline is created already approved, and each later step of yours is approved automatically the moment the step before it is marked Done, so your pipeline steps always show in "Next 10".
- Timed checks, such as the cadence check in 14 days or the 30-day check, are dated from the day the job was created, not from when the step before them finishes.
- A playbook that is planned but not written yet becomes one Claude step called "Method not written yet:" followed by its name.
- A playbook step meant for a tool, such as pressing Publish in an app, is created as your step, because you press the button.
- If the product type's playbook already has a publish or listing step, the destination's matching publish step is left out, so you never publish twice.
- The level is saved on the job and shown on its page, but it does not change which steps are created. Not confirmed: how Claude uses it.
- Nothing in HQ publishes or posts to any platform by itself. Publishing and listing steps are yours.
- "Cancel pipeline" pauses the job and preserves its history and outputs. "Resume pipeline" continues at the first unfinished step. There is no delete button.
- Steps for parked brands do not show on the Today page.
