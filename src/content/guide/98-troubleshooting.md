# Troubleshooting
<!-- part: Reference | order: 98 | slug: troubleshooting | route: none | tags: problems, errors, fix, stuck, not working, could not be loaded, try again, credits, mock, sample, missing, wrong score, help -->

When something in HQ looks wrong, it is usually one of a handful of known causes. This article is organized by what you see, with the likely cause and the fix for each. If none of these match, the last section says how to get help without losing time.

## A screen will not load or shows an error

- A message such as "could not be loaded" with "Try again": tap "Try again". If it keeps failing, reload the page, then sign out and back in. It is almost always a dropped connection or an expired sign-in.
- "Job not found" on a pipeline page: the link points at a job that no longer exists or belongs to another project. Tap "Back to the brand".
- A screen is empty when you expected data: check the project picker at the top. Most screens show only the selected project, and some lists only appear with "All projects" chosen.
- A menu item is missing: some screens are for admins only, and staff roles see fewer screens. "Preview Role" shows what another role sees; tap "Exit Preview" to return to your own view.

## Today looks wrong

- "Next 10 across all projects" is missing: choose "All projects" in the project picker. With one project chosen, Today shows that project's digest instead.
- A step you expected is not in "Next 10": only active brands count, only your steps count, and a step waits until the step before it is done. Claude's steps never show there.
- A yellow note naming a source, such as "money lanes" or "KPIs": that one source could not be checked. Tap "Try again".
- A red message saying the list "is not trustworthy right now": the whole check failed. Reload the page before acting on the list.
- Changing the week picker does not change "Next 10" or "Waiting on me". Both always use the current week.

## A score looks wrong

- The overall score jumped or dropped overnight: a pillar probably got its first number, or lost it. Check the coverage line, such as "2 of 5 pillars measured".
- A pillar shows a dash: it has no number for that week. Enter the KPI numbers, or a hand score for a pillar without KPIs.
- A pillar looks perfect: check its KPI targets. A target that is too low gives an easy 100.
- The Setup score on Portfolio does not match the Setup tab: Portfolio shows the last completed week and its saved scores, which refresh nightly. The Setup tab is always live.
- Putting setup items in "Later" did not raise the Setup score: only "Skip" takes an item out of the score.

## A pipeline is stuck

- A Claude step was not done overnight: open the pipeline and read the step's note. When a step is blocked, the note names what is missing, such as an input, a login or your decision. Also check that the step before it is Done, the job is not parked, and the brand is active.
- A step says "Method not written yet": the playbook for that method is still planned. The nightly crew writes that playbook first, then rewrites the step to follow it.
- Too many steps waiting: the crew does at most six steps a night, and no more than three from one job. For an urgent one, tap "Copy prompt" on the Claude step and paste it into a Claude chat to have it done right away.
- Two jobs for the same thing: some buttons, such as "Turn this on" on the Avenues tab and "Set up" in a channel's drawer, do not check for an existing job first. Look for an open job before tapping again.

## Content will not move forward

- "Cannot move to scheduled until the item is approved": your own brands' pieces must be approved before they can be scheduled or published. Approve it once its production work is finished.
- A piece cannot be approved: open it and read "What needs to be finished?". Approval waits only on finished production (the file or text attached and any call to action added), not on the quality score or hard fails.

## Numbers and followers

- A channel's followers are old: Metricool only covers the accounts connected to it. For the rest, open the brand's "Channels" tab and tap "Update from screenshots", or type the numbers in by hand.
- "AI credits have run out for this workspace.": reading screenshots uses the HQ workspace's AI credits, and they are used up. Type the numbers in by hand until the credits are topped up.
- "Too many requests right now": wait a minute and try again.

## Sample or placeholder text

- A Quick Generate message that ends in "MOCK" instead of "AI": the AI call failed and HQ showed sample text. Those drafts are not saved. Try again later.
- "Generate Content" can quietly fall back to template text when the AI call fails, even though its message says the assets were generated. Read what it made before using it.
- "Generate Analysis" now requests live results and reports failures. Previously stored sample results require review before being treated as measurements.

## Signing in

- Forgot your password: on the sign-in card tap "Forgot password?", enter your email, and follow the link in the email.
- "Link expired": tap "Reset password" to get a new link.

## Email and reports

- Not sure a crew ran: open "Admin Panel", "Crews". Every crew logs a line when it finishes. A red dot means it failed or missed its run, and the row says why.
- No report email from a crew: some crews only write when there is something to say. The backlog builder stays quiet once every backlog is full, and the blog crew only notifies you when something needs you. Check the crew's row on "Crews" before assuming it did not run, then check spam once.

## When the guide and a screen disagree

The screen is right. Tell Claude which screen and which article, and Claude will update the guide and the PDF together.

## Getting help fast

1. Note the screen's name, what you tapped, and what you expected to happen.
2. Take a screenshot of the screen.
3. Send both to Claude in a chat. Never include a password or a login code.
4. If the fix needs a bigger build in Lovable, Claude tells you the rough cost before doing anything.
