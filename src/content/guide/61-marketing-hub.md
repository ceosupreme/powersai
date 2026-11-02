# Marketing Hub
<!-- part: Money and offers | order: 61 | slug: marketing-hub | route: /marketing-hub | tags: marketing hub, campaigns, promotions, specials, events, asana, sync, dry run, marketing assets, post-event analysis, growth audit, social media, marketing -->

The Marketing Hub tracks marketing campaigns for every project in one place: what is live, what starts soon, what has ended, and whether each one is synced to Asana (an online task and project app). It was built around bar and restaurant promotions, so it fits client venue campaigns best.

## Where to find it
- On a computer, tap "Marketing Hub" under "Growth & Marketing" in the left menu.
- On a phone, tap "More" in the bottom bar, then "Marketing Hub" under "Growth & Marketing".
- On Dashboard, the Marketing Hub shortcut opens this screen.
- The old /marketing and /social-media addresses open this screen too.
- It is for admin accounts only; anyone else is sent to the home page.
- It follows the brand or client in the main selector. All brands & clients shows the full accessible list.

## What you see
- The heading "Marketing Hub" and the line "Plan, schedule, and measure every campaign — no matter where it originated."
- Two tabs, "Overview" and "Campaigns". On a phone they show only icons: a grid for Overview and a checklist for Campaigns.
- "Overview": the buttons "Sync from Asana" and "New Campaign"; five tiles, "Live now", "Upcoming (7d)", "Recently ended", "Spend vs. attributed" and "Best performer"; a "Needs attention" box; and three lists, "Live now", "Upcoming (next 7 days)" and "Recently ended".
- "Campaigns": a "New Campaign" button, a "Search campaigns…" box, an "All venues" dropdown, a "Clear" button, filter chips for "Status", "Origin" and "Type", a count such as "4 of 9 campaigns", and a card for each campaign with its title, status, origin, type, venue, dates, channels, "Expected → Actual" money and sync status.
- Tapping any campaign opens a detail panel with "Schedule", the description and objective, "Distribution & Linkage", "Budget & Expected Impact", "Execution adapter — Asana", "Marketing Assets", "Post-Event Analysis" (ended campaigns only), "Internal" notes, and an "Edit campaign" button.

## How to use it
### Create a campaign
1. Tap "New Campaign".
2. Fill in the required fields: "Title", "Venue", "Type", "Start date", "End date", "Description" and "Objective".
3. Tap "Add more details" for "Start time", "End time", "Recurrence", "Assigned to", "Target audience", "Channels", "Brand partner", "Partner contribution ($)", "Budget ($)", "Expected guests", "Expected revenue ($)", "Toast promo code", "Linked menu items (comma-separated)", "Success metric" and "Internal notes".
4. Tap "Create campaign". It is saved as a Draft and its detail panel opens.

### Find and edit a campaign
1. Open "Campaigns" and search, pick a venue, or tap chips. Tap "Clear" to reset.
2. Tap the campaign, then "Edit campaign".
3. Change the fields and tap "Save changes".

### Send a campaign to Asana
1. In the detail panel, go to "Execution adapter — Asana".
2. Tap "Preview Push (Dry Run)" to see exactly what would be sent, without sending it.
3. Tap "Push to Asana". In Live mode this only works once live writes are switched on for that venue.
4. Later, tap "Sync Now" to bring Asana's changes back into HQ.

### Bring campaigns in from Asana
1. On "Overview", tap "Sync from Asana". A message says how many campaigns were imported and how many were flagged "Needs details".
2. Open a flagged campaign and tap "Fill in Supreme Team Media" to complete the missing fields.

### Make marketing assets for a campaign
1. In the detail panel, tap "Generate Content" under "Marketing Assets".
2. The new assets are listed, and the button changes to "Regenerate". "Open in Action Center" opens them in the Growth Audit's Action Center.

## Words on this screen
- Campaign status: "Draft", "Approved", "Scheduled", "Live", "Ended" or "Archived".
- Origin: where a campaign came from: "From Growth Audit" (made from a Growth Audit finding), "Manual" (made in HQ) or "From Asana". The "Origin" filter chips call these "Growth Audit", "Manual (Supreme Team Media)" and "Manual (External)".
- Needs details: a campaign imported from Asana with required fields missing.
- Sync status: "Synced", "Syncing", "Sync Failed" or "Not Synced". "Sync Lost" means the Asana task was deleted; the campaign itself is kept.
- Execution adapter: the link that sends a campaign to an outside task app. Asana is the only one connected in this build.
- Mock and Live: the switch in the Asana panel. Mock never writes to Asana; Live does.
- Attributed revenue: money credited to the campaign. "Spend vs. attributed" compares all campaign budgets with all attributed revenue.
- Toast promo code: a discount code from Toast, a restaurant point-of-sale system.

## Good to know
- "Generate Analysis" requests live results. A failed or unavailable analysis shows an error; expected figures are not substituted as measured results. Older stored demo results need a separate review before being used.
- The campaign detail panel has a Status selector, so you can move a campaign from Draft through its lifecycle without Asana.
- There is no delete button for campaigns.
- "Generate Content" uses AI in Live mode. An AI failure is shown as an error instead of silently returning sample assets. Explicit Mock mode still produces labeled sample content.
- The "Mock" or "Live" switch applies to every campaign and is remembered on this device only.
- On-screen hints say to turn on live writes in Admin → Marketing Hub. Not confirmed: where that setting is; the Admin Panel has no Marketing Hub section in this build.
- Links on Dashboard and in the Growth Audit that point at one campaign open the Marketing Hub but not that campaign; find it in "Campaigns" and tap it.
- The form is built for bars and restaurants, with fields such as menu items, guests, happy hour and in-venue signage.

## Brand selection and empty campaigns
Marketing Hub follows the brand or client in the main selector. All brands & clients shows the accessible campaign library. New Campaign starts assigned to the selected workspace; if nothing is selected, choose the workspace in the form.

When no campaigns exist, Plan your first campaign explains the flow and offers Create a campaign or Import from Asana. Drafts remain visible under Needs attention and Campaigns. Campaigns has search, status/type/origin filters, a brand filter within the selection, and sorting by recently updated, start date, or title. Upcoming means scheduled between today and the next seven days.

A failed campaign read shows Try again. An unsupported old tab link opens Overview. Asana import needs an existing configured connection; creating a campaign alone does not publish it to social channels. Campaign results require real recorded data.
