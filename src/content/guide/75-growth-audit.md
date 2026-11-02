# Growth Audit
<!-- part: Clients and leads | order: 75 | slug: growth-audit | route: /growth-audit | tags: growth audit, growth score, category scores, findings, action pack, action center, readiness gate, green light, caution, needs ops fix first, data sources, data confidence, context calendar, reports, history, live data, sample data -->

The Growth Audit studies one project's Google listing, reviews, website, search rankings and business data, and lists findings: specific problems or opportunities, each with evidence and a recommended fix. It rolls them into a Growth Score out of 100 and can draft ready-to-use marketing pieces for each finding. Use it to decide what to work on next for a client and to prepare for sales conversations.

## Where to find it

- On a computer, open "Growth & Marketing" in the side menu and choose "Growth Audit". On a phone, tap "More", then "Growth Audit". A client's project page has a shortcut card too.
- It shows the project chosen in the header. With "All projects" you are asked to select one.
- Tabs: "Overview", "Categories", "Findings", "Context Calendar", "Action Center", "Reports", "History" and "Data Sources". On a phone the tabs show icons only, in that order.

## What you see

- "Overview": an amber "Finish project setup" box when data sources are missing, the project with "Last refresh" and "Refresh Now", three tiles, "Category Scores", a "Top … Priorities" list (up to five) and a strip of quick stats.
- The tiles: "Growth Score" (out of 100, labeled "Strong", "Moderate", "Weak" or "Critical", or "No data yet"), "Revenue Opportunity" (a level from "Low" to "Very High" with a dollar range) and "Data Confidence" (how many of five data sources returned data).
- "Category Scores": nine categories, from "Revenue Patterns" to "Local Context Awareness". A category with no findings and no data says "No data yet" and is left out of the Growth Score.
- "Findings": search, sort, filter pills and a card per finding with its category, type, severity, status, priority, upside and ease.
- "Context Calendar": dates, weather, news, sports and events for the next 30 days, each marked with a matching campaign or "Uncovered".
- "Action Center": every drafted marketing piece for the project, grouped by kind.
- "History": past audit runs, a score trend chart and charts of findings and campaigns.
- "Data Sources": live panels for the Google Business Profile, the website crawler, Map Pack rankings and AI search, then a card per data source with its status.
- Live data: findings, category scores, the Growth Score, data source statuses, history and AI-made action packs all come from the database.
- Placeholder numbers: the dollar ranges are fixed bands based on a 1-to-5 upside rating, not money data. The Growth Score's "vs last audit" change always reads zero, and only the "Local Search Visibility" tile can show a trend. The reputation score uses fixed stand-in values for star rating and response rate.
- Not built yet: the "Categories" tab ("Coming in next phase"), the "Continuous Audit" switch ("Coming Soon"), the "Connect", "Configure" and "Reconnect" buttons on data source cards (they only show a message), "Export PDF" in the Action Center, and "Send to Marketing Hub", which only changes the status.
- Sample content: action packs made in "Mock" mode are canned text. Sample findings stored for testing are already left out of every list, so the "Hide demo" switch has nothing to hide.
- Readiness gate: switched off in the code. It always reads "Green Light", its tile is hidden, "Caution" and "Needs Ops Fix First" never appear, and traffic-driving priorities show "Traffic-safe".

## How to use it

### Run the audit
1. Choose the project in the header and open "Overview".
2. Tap "Refresh Now". When it finishes, "Last refresh" updates and "History" records the run.

### Work a finding
1. Open "Findings". Narrow the list with the "Category", "Type", "Severity" and "Status" pills, or "More filters".
2. Tap a finding. Its panel shows "Diagnosis", "Evidence", "Recommended Action", "Generated Content & Campaigns", "Campaigns Attempted" and "Status & Workflow".
3. Tap "Mark In Progress", "Mark Resolved", "Dismiss…" (it asks for a reason) or "Snooze…" (7, 14 or 30 days).

### Draft an action pack
1. In the finding's panel, keep "AI" selected on the small AI or Mock switch and tap "Generate Action Pack (AI)". Operational findings offer "Generate Ops Fix Brief" instead.
2. For each draft piece, copy, edit or regenerate it, then approve or reject it.
3. In "Action Center", tick several pieces to "Archive" or "Bulk Send" them, or tap "Quick Generate" to draft pieces from a short brief.

### Give the audit Google and website data
1. Open "Data Sources".
2. On the Google Business Profile panel, tap "Resolve Place ID" to look the business up on Google, or "Submit Manual Snapshot" to type in the listing details yourself.
3. On the Website Crawler panel, tap "Manual Entry" to tick which pages the site has, or "Crawl Now" when a website address is already on file.
4. Go back to "Overview" and tap "Refresh Now".

### Make a report
1. Open "Reports" and tap "Generate Report".
2. Pick a type, such as "Profit Leak Snapshot" or "Executive Summary", fill in "Prepared for" and the dates, and generate it.
3. Tap "Download as PDF". Reports are not saved in HQ.

## Words on this screen

- Finding: one specific problem or opportunity the audit detected.
- Priority: upside times ease times confidence, minus operational risk, scaled to 0 to 100.
- Severity: "Critical", "High", "Medium" or "Low".
- Status: "New", "In Progress", "Sent to Marketing Hub", "Resolved", "Dismissed" or "Snoozed".
- Action pack: a set of drafted marketing pieces, such as posts, emails, staff scripts and page copy, for one finding.
- Data Confidence: "Complete", "Partial", "Limited" or "Unavailable".
- Readiness gate: a check meant to stop you sending customers to a business that cannot handle them, with the states "Green Light", "Caution" and "Needs Ops Fix First". It is currently off.
- Source statuses: "Connected", "Stale", "Never Synced", "Not Connected", "Not Wired" and "Coming Soon".

## Good to know

- Many checks (shifts, menu, events) were built for bars and restaurants and need point-of-sale data. For most service businesses only the Google listing, reviews, website, rankings and AI search apply.
- Admins can edit website mappings, Map Pack keywords and AI search queries in Data Sources for the selected project. The setup checklist opens the matching editor.
- A pack made in explicit Mock mode is labeled as sample content. A failure in Live mode is shown as an error instead of silently falling back to a mock pack.
- "Refresh sources" on "Context Calendar" needs the local context integration, which the older help describes as off.
- "History" tells you to press "Run Full Audit"; the button is called "Refresh Now".

A project without an audit score shows revenue opportunity as "Not measured", not a low dollar range. The source summary counts sources with observations rather than treating empty source objects as connected data.
