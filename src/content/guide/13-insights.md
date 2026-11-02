# Insights
<!-- part: Workspace | order: 13 | slug: insights | route: /insights | tags: insights, ai, observations, proposed, approve, reject, dismiss, assign, due date, batch, select all, filters, priority, pillar, search, restore, approved tasks, rejected tasks, audit log, insights audit, asana -->

Insights has a brand view and a client view. Brand Insights turns existing saved measurements and work into next steps; client Insights keeps the queue of AI-written observations and proposed actions.

## Brand insights
Choose a brand in the main selector, or All brands & clients for the brand overview. Colored headers and initials identify each brand. Search by brand or sort by waiting work.

Each card shows its latest recorded score with its measurement period, revenue recorded this month, data coverage, waiting work, and channels behind their publishing cadence. Missing measurements and revenue are clearly labeled. Next steps link directly to the brand workspace, channels, measurements, or revenue entry. These signals use saved records and do not require an AI generation run.

Client-report buttons below the all-brand list switch the main selection to that client. The following instructions describe the client view.

## Where to find it

- Side menu: "Workspace", then "Insights". On a phone, tap "More", then "Insights"; in the client layout it is in the bottom bar. The address is /insights.
- The audit page opens from "Audit log →" beside the Insights heading, or at /insights/audit.

## What you see

On Insights:

- The heading "Insights" with "Audit log →", and "Select All" (or "Deselect All") on the right.
- A search box, "Search all insights (including dismissed)…".
- Three summary boxes: "Pending by Severity", "Status Overview" ("Proposed", "Approved" with how many were manual or automatic, "Rejected") and "Resolution Rate".
- "This Week's Priorities": up to five proposed items from the current Monday to Sunday week, most severe first. Tap one to open it in place.
- Filters: project ("All Projects" or one project), priority ("All Priority", "Critical", "High", "Medium", "Low"), pillar ("All Pillars", "Revenue", "Labor", "Delivery", "Client Experience"), time ("All Time", "Last 7 Days", "Last Week", "Last 4 Wks", "Last 8 Wks"), sort ("Priority", "Date", "Pillar") and "Reset".
- The list of proposed insights, grouped by severity (such as "HIGH (4)", tap to open), by date (ten at a time with "Show more"), or by pillar.
- "Approved Tasks" and "Rejected Tasks" in a side column (below the list on a phone).

A closed card shows a severity tag such as "HIGH", the date, the project, the pillar, a team member's name when the insight is about one person, the title, a one-line summary and "More". An open card adds "What Happened", "Source", "Action", the estimated minutes and due date, and "Add related task". Proposed cards also show "Assign to... (required)", "Set due date (required)", "Add a note (optional)", a mention picker, "Approve" and "Reject".

On the audit page ("Insights Audit"): the tabs "Approved", "Rejected" and "All", a filter box "Filter by title, project, person, or pillar", a count such as "42 of 310", and a table with "Title", "Pillar", "Project", "Status", "By", "When" and "Asana". "← Back to Insights" returns.

## How to use it

### To approve an insight

1. Tap "More" on the card.
2. Pick a person in "Assign to... (required)" and a date in "Set due date (required)". "Approve" stays greyed out until both are set. Add a note or mention people if you like.
3. Tap "Approve". HQ creates a task on the Tasks screen, plus an Asana task when Asana is set up for that project. "Action approved" confirms it, and the card moves to "Approved Tasks".

### To reject an insight

1. Open the card and tap "Reject".
2. A card with an action moves to "Rejected Tasks". A card without an action is dismissed and leaves the page; search can still find it.

### To handle several at once

1. Tick the boxes beside the cards, or tap "Select All".
2. In the bar that appears ("3 selected"), tap "Approve", "Dismiss" or "Cancel".

### To narrow the list

1. Set the project, priority, pillar and time filters, and choose a sort.
2. Choosing one priority shows that level and everything more severe; "Medium" shows Critical, High and Medium.
3. Tap "Reset" to clear the filters.

### To find an old or dismissed insight

1. Type at least two letters in the search box.
2. Tap a result to jump to it. Dismissed results have a "Restore" button that puts them back in the active list.

### To check who decided what

1. Tap "Audit log →".
2. Choose a tab, type in the filter box, or tap "Project", "When" or "Asana" to sort.
3. Tap a row to see "Summary", "What Happened", "Action Taken / Proposed" and any "Rejection Reason", and "Add related task" if follow-up is needed.

## Words on this screen

- Proposed: waiting for your decision.
- Approved: accepted and turned into a task.
- Rejected or Dismissed: turned down.
- Auto-approved: approved by HQ's automatic rule. The "Auto" switch above "Approved Tasks" shows or hides these, and each one has "Revoke", which sends it back to Proposed.
- "Requires manual review": shown under a card when automatic approval is on but did not apply to that card.
- "Resolution Rate": approved plus rejected, as a share of all insights loaded.
- Pillars: Revenue, Labor, Delivery and Client Experience, the four client areas.
- "AI Deep Dive": a longer AI explanation, opened from the lightbulb next to "What Happened".
- Manual (audit page): a task someone added by hand from an insight; "Spawned from:" names that insight.
- Asana status (audit page): "open", "completed", "overdue", or a sync error status.

## Good to know

- Insights follows the project picked in the header. Choosing one project in the Insights filter also changes the header; choosing All Projects clears the main selection as well.
- All Time is the default, so older saved insights are visible. Severity groups start expanded. Reset restores All Time; choose Last 7 Days when you want only recent items.
- The batch "Approve" only marks items approved: no assignee, no due date, no task and no Asana task are created.
- The batch "Approve" and "Dismiss" only change insights that have an action attached. An insight shown without an action stays as it was, even though the message counts it.
- The "Revoke" confirmation says the task "will be removed from Asana", but HQ only moves the item back to Proposed; any Asana task stays where it is.
- The pillar filter and the "Pillar" sort know only the four client pillars, so insights about other pillars appear only under "Priority" or "Date".
- "All Time" loads the newest 5,000 insights. The audit page loads the newest 500 of each kind, covers every project whatever the header shows, and its "Spawned from:" link opens Insights without jumping to that insight.
