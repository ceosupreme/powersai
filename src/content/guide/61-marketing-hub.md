# Marketing Hub
<!-- part: Money and offers | order: 61 | slug: marketing-hub | route: /marketing-hub | tags: marketing hub, campaigns, promotions, specials, events, asana, sync, dry run, marketing assets, post-event analysis, growth audit, social media, marketing -->

The Marketing Hub tracks marketing campaigns for every project in one place: what is live, what starts soon, what has ended, and whether each one is synced to Asana (an online task and project app). It was built around bar and restaurant promotions, so it fits client venue campaigns best.

## Where to find it
- On a computer, tap "Marketing Hub" under "Growth & Marketing" in the left menu.
- On a phone, tap "More" in the bottom bar, then "Marketing Hub" under "Growth & Marketing".
- On Today, the "Campaigns needing attention" list and the "Marketing Hub" link lead here.
- The old /marketing and /social-media addresses open this screen too.
- It is for admin accounts only; anyone else is sent to the home page.
- It shows campaigns for all projects. The project picker at the top of the screen does not filter it.

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
- The numbers from "Generate Analysis" under "Post-Event Analysis" are sample numbers in this build. It runs in demo mode and invents revenue, guests, labor and item sales from your expected figures, or from stock figures when those are blank. Don't use them for decisions. Once generated they also feed the "Spend vs. attributed" and "Best performer" tiles.
- HQ has no control for changing a campaign's status. New campaigns start as "Draft" and only change when Asana's status field changes and you sync, so until then they stay in "Needs attention".
- There is no delete button for campaigns.
- "Generate Content" uses AI, but if the AI call fails HQ quietly uses template text instead, and the message still says the assets were generated.
- The "Mock" or "Live" switch applies to every campaign and is remembered on this device only.
- On-screen hints say to turn on live writes in Admin → Marketing Hub. Not confirmed: where that setting is; the Admin Panel has no Marketing Hub section in this build.
- Links on Today and in the Growth Audit that point at one campaign open the Marketing Hub but not that campaign; find it in "Campaigns" and tap it.
- The form is built for bars and restaurants, with fields such as menu items, guests, happy hour and in-venue signage.
