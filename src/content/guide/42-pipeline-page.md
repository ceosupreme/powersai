# The pipeline page
<!-- part: Making things | order: 42 | slug: pipeline-page | route: /project/:venueId/jobs/:jobId | tags: pipeline page, job page, steps, recipe, inputs, outputs, results, view instructions, open, done, hand to claude, queue, copy prompt, approve, quality gate, gate, current step, playbook job -->

The pipeline page shows one production job from start to finish: what it is making, the playbooks it was built from, every step with its owner and status, and what it has produced so far. It is where you mark your steps done, hand steps to Claude, copy a prompt for Claude, and approve a content piece at its quality gate. Open it whenever a step is yours, or when you want to see how far a job has come.

## Where to find it

- It opens by itself right after you create a pipeline.
- Tap "Pipeline" on a brief (brand "Intel" tab), on a product (brand "Products" tab) or on a playbook job (brand "Playbooks" tab, under "Waiting on").
- Tap "Open setup job" on the brand's "Setup" tab, or "Open pipeline" in the message after "Set it up".
- Tap "Open" next to a step in "Waiting on you" on the brand's "Overview" tab, or a "Next 10" row that ends in "· Pipeline".
- The address is /project/, the brand, /jobs/, then the job.

## What you see

At the top:
- A "Back to" link with the brand's name, which returns to the brand.
- A small line in capitals with the brand and the job's kind, such as "content", "product", "lane", "channel setup" or "playbook".
- The job's title in large type.
- Badges: the job status (such as "Ready" or "Running"), "Level" with its number, "Money to:" with the money destination when one is set, and "Your time:" with estimated and actual minutes ("—" when not filled in).

"Recipe": one chip per playbook the job was built from, with its version. Planned ones add "· planned". Tapping a chip opens a side panel with the playbook's summary, its numbered steps, "Review by" and a date, and an "Open playbook" button when it has a link. If the playbook cannot be found, the panel says "This playbook is not on the shelf yet." A traffic check notice can appear under the chips when a playbook in the recipe needs an account the brand has not set up.

"Inputs": what the job works from.
- For a content piece: its title, its brief (or "No brief yet.") and "Idea score".
- For a product: its name, status and price.
- For avenue and channel setup jobs: "No linked item."
- Always: "Brand kit:" with the kit's short bio or voice, and "Niche profile:" with a link to the brand's "Intel" tab.
- Chips for any results already linked to the job.

"Steps": one card per step, in order. Each card shows:
- The step number, in large type, and the step's title.
- A status badge: "Done", "Blocked", "Ready", "Awaiting your decision", "Queued" or "Open".
- An owner badge: "Claude", "You", "Agent", "Tool" or "Unassigned".
- The name of the playbook the step came from.
- "Current step" on the step the job is on now. That card has a highlighted border, and the page scrolls to it when it opens. Finished steps look slightly faded.
- Buttons, depending on the step: "View instructions", "Open", "Done", "Hand to Claude", "Queue" (or "Queued · awaiting worker"), and "Copy prompt".
- On a content job, a step whose title starts with "Gate" or "Quality gate" also shows a gate strip: "Quality score", "Fails:" (or "none"), and an "Approve" button, or the word "Approved" once it is.

"Outputs": links to what the job has produced, or "No outputs recorded yet."

"Results": how the finished work is doing. A content job shows the piece's performance numbers, or "No performance recorded yet." A product job shows "Monthly sales:" and up to six months of revenue, or "No revenue rows yet." Other jobs show a dash.

Playbook jobs look a little different. The "Level" and "Money to:" badges are hidden. A box under the badges shows "Playbook:" with a link to the playbook and its status word ("Written", "Thin" or "Planned"), and a "Feeds:" line saying what the playbook feeds. "Inputs" skips the linked item.

## How to use it

### To read a step's instructions
1. Tap "View instructions" on the step.
2. A side panel shows "Step" and its number, the step's title, and its written instructions (or "No written instructions."). When the step has them, it also shows "Playbook:" with the playbook's short key, "Inputs", "Expected output", "Checks", link buttons, and an "Output" button.

### To mark your step done
1. Do the work for the step.
2. Tap "Done". HQ shows "Step done".
3. HQ moves the job to its next step by itself, and the page updates.

### To hand your step to Claude
1. Tap "Hand to Claude" on your step. HQ shows "Handed to Claude".
2. The step's owner becomes "Claude". It leaves your lists and becomes eligible for the external worker. This does not start a run or confirm pickup.

### To queue a Claude step for the next run
1. Tap "Queue" on a Claude step that is not done. HQ confirms the queue marker was saved and explains that this does not start a run.
2. The button is replaced by the words "Queued · awaiting worker".

### To copy a prompt for a Claude step
1. Tap "Copy prompt" on a Claude step. HQ shows "Prompt copied".
2. Paste it into a Claude chat. It lists the brand, job, money destination, step, playbook and version, the skill to load, inputs, expected output, checks and links. Its last line asks Claude to mark the step done in Supreme Team HQ with the output link.
3. If HQ says "Could not copy. Your browser blocked the clipboard.", allow clipboard access for the site and tap "Copy prompt" again.

### To approve a piece at a quality gate
1. Find the gate strip on the gate step.
2. Read the "Quality score" and the "Fails:" list.
3. When the score is at least 80 and there are no hard failures, tap "Approve". HQ shows "Approved", and the strip then reads "Approved".

### To look at a playbook in the recipe
1. Tap its chip under "Recipe".
2. Read the summary and steps in the side panel. Tap "Open playbook" to open the full playbook when it has a link.

### To open a step's link or output
1. Tap "Open" on the step. It opens the step's first link, or its output, in a new tab.

## Words on this screen

- Recipe: the playbooks the job was built from, with their versions.
- "Current step": the step the job is on now.
- "Done": the step is finished.
- "Blocked": the step waits on an earlier step that is not done.
- "Ready": your step, free to do now.
- "Awaiting your decision": your step whose title starts with "Decision".
- "Queued": a Claude step awaiting worker pickup, not confirmation that a run has started.
- "Open": a step owned by an agent or tool that is not done or blocked.
- "Hand to Claude": give your step to Claude.
- "Queue": save a request for the external worker to pick up a Claude step.
- "Copy prompt": copy a ready-made prompt so Claude can do the step in a chat now.
- Quality gate: the step where a content piece's quality is checked and the piece is approved.
- "Your time": the minutes the job is expected to take you, and the minutes it actually took.
- "Feeds:": on a playbook job, what the playbook serves.

## Good to know

- "Done" and "Hand to Claude" only appear on your steps that are not blocked and not done. Steps owned by an agent or tool have no "Done" button on this page.
- "Take this step" returns an unblocked Claude step to you and clears its queue flag.
- "Copy prompt" stays on Claude steps even after they are done, so you can have Claude redo one.
- In this build, "Queue" only marks the step. The external worker's schedule and selection rules must be verified separately; this button does not guarantee a run or move the step ahead of other work. To work on a step now, use "Copy prompt" and paste it into a Claude chat, or use "Take this step" when available.
- "Open" only appears once a step has a link or an output saved on it.
- Approve is available only with a quality score of at least 80 and no hard failures. The database enforces the same rule for direct writes.
- Not confirmed: what fills in "Your time"; nothing on this page sets it.
- This page shows every step of the job, including snoozed ones that are hidden from your lists.
- "Cancel pipeline" pauses the job without deleting history or outputs. Its steps cannot be updated while paused. "Resume pipeline" resumes at the first unfinished step.
- Approving a piece or finishing a job never publishes or posts anything. Publishing and listing steps are yours.
- If the job cannot be found, the page says "Job not found" with a "Back to the brand" button. If it fails to load, it says "This job could not be loaded." with "Try again".
