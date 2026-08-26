# Supreme Team HQ

# BarPulse  — Lovable Build Prompt

## Project Overview

Build a restaurant operations dashboard called **BarPulse** that displays weekly scorecards, alerts, insights, and actionable tasks for bar/restaurant GMs. The app connects to Airtable as its backend.


**Tech Stack:**
- Frontend: React + TypeScript + Tailwind CSS
- Backend: Airtable (via API)
- No authentication needed for MVP

## Airtable Connection

Base ID: `[USER WILL PROVIDE]`
API Key: `[USER WILL PROVIDE]`

### Tables & Key Fields

**Bars**
- bar_id (text, primary)
- bar_name, city, owner_name, gm_name


**Weeks**
- week_id (text, primary) — format: `HTP_2025-12-22`
- bar (link to Bars)
- week_start, week_end (dates)
- status


**WeeklyScorecard**
- week (link to Weeks)
- overall_score (number 0-100)
- overall_grade (A/B/C/D/F)
- confidence (High/Med/Low)
- trend_4wk (up/down/flat)
- revenue_score, labor_score, operations_score, guest_experience_score (numbers)
- monday_briefing (long text)
- wins (long text)
- key_drivers, revenue_drivers, labor_drivers, operations_drivers, guest_experience_drivers (long text)




**WeeklyCore**
- week (link to Weeks)
- net_sales, transactions, check_avg
- labor_pct_actual, scheduled_labor_cost, labor_cost_total
- comps_pct, comps_amount, voids_pct, voids_amount
- ticket_time_avg_minutes, ticket_time_over_20_pct
- tip_pct, secret_shop_score_pct




**Alerts**
- week (link to Weeks)
- pillar (Revenue/Labor/Operations/Guest Experience)
- severity (High/Medium/Low)
- metric_name, metric_value, threshold
- message (text)




**Insights**
- week (link to Weeks)
- pillar (Revenue/Labor/Operations/Guest Experience)
- priority (High/Medium/Low)
- title, summary, facts (text)
- estimated_weekly_impact_dollars (number)




**Actions**
- Name (text, primary)
- week (link to Weeks)
- insight (link to Insights)
- pillar — get from linked insight
- title, details (text)
- estimated_minutes (number)
- due_date_suggested (date)
- approval_status (Proposed/Approved/Rejected)
- approved_at (datetime)




**SecretShop_Audits**
- week (link to Weeks)
- shop_date (date)
- total_score_pct (number)
- greeting_score, service_score, food_score, cleanliness_score (numbers)
- failed_areas, positives, notable_quotes (text)




**OnlineReviews_Signals**
- week (link to Weeks)
- platform (Google/Yelp)
- avg_rating (number)
- new_reviews_count (number)
- themes_top, notable_quotes (text)




---




## Global State




The app maintains two global selectors that persist across all pages:
- **Selected Bar** (default: first bar, likely "HTP")
- **Selected Week** (default: most recent week by week_start desc)




These appear in a top nav bar on every page.




---




## Page 1: Dashboard




**URL:** `/` or `/dashboard`




**Layout (Dark Theme):**




```
┌─────────────────────────────────────────────────────────────┐
│  [Bar Selector ▼]    [Week Selector ▼]        (slate-900 bg)│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌───────────────┐    ┌──────────────────────────────────┐ │
│   │     85        │    │  Monday Briefing   (slate-800)   │ │
│   │      B        │    │  [monday_briefing text from      │ │
│   │   ▲ trending  │    │   WeeklyScorecard - 2-3 lines]   │ │
│   │     up        │    │                                  │ │
│   └───────────────┘    └──────────────────────────────────┘ │
│    (slate-800 card)                                         │
│                                                             │
│   8-Week Trend (amber sparkline on dark)                    │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  📈 [sparkline - #D4A574 line on #1E293B bg]        │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐ │
│   │  Revenue   │ │   Labor    │ │    Ops     │ │  Guest   │ │
│   │    22/25   │ │   23/25    │ │   19/20    │ │  19/30   │ │
│   │ [drivers]  │ │ [drivers]  │ │ [drivers]  │ │[drivers] │ │
│   │  → detail  │ │  → detail  │ │  → detail  │ │→ detail  │ │
│   └────────────┘ └────────────┘ └────────────┘ └──────────┘ │
│   (clickable slate-800 cards with slate-700 border)         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```




**Components:**




1. **Score Card** (left)
   - Large number: `overall_score` 
   - Letter grade: `overall_grade` with color (A=green, B=blue, C=yellow, D=orange, F=red)
   - Trend indicator: `trend_4wk` arrow (▲ up green, ▼ down red, ─ flat gray)
   - Confidence badge: `confidence`




2. **Monday Briefing** (right of score)
   - Display `monday_briefing` field (truncate to ~200 chars with "read more" if longer)




3. **8-Week Trend** 
   - Fetch last 8 WeeklyScorecard records for selected bar
   - Simple sparkline or mini bar chart showing `overall_score` progression
   - Current week highlighted




4. **Four Pillar Blocks** (grid 2x2 on mobile, 4 across on desktop)
   Each block shows:
   - Pillar name + score (e.g., "Revenue 22/25")
   - Brief driver text: first 100 chars of `revenue_drivers`, `labor_drivers`, etc.
   - Click → navigates to pillar detail page




**Data Fetching:**
```
WeeklyScorecard WHERE week.bar = [selected_bar] AND week = [selected_week]
WeeklyScorecard WHERE week.bar = [selected_bar] ORDER BY week.week_start DESC LIMIT 8 (for trend)
```




---




## Page 2: Weekly Review




**URL:** `/weekly-review`




**Layout (Dark Theme):**




```
┌─────────────────────────────────────────────────────────────┐
│  [Bar Selector ▼]    [Week Selector ▼]        (slate-900 bg)│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Week of Dec 15-21, 2025                    (slate-50 text) │
│  Score: 85 (B) | Confidence: High | Trend: ▲               │
│                                                             │
│  ── Wins ──────────────────────────────── (slate-400 header)│
│  [wins field from WeeklyScorecard]           (slate-800 bg) │
│                                                             │
│  ── Alerts (3) ────────────────────────────────────────────│
│  ● HIGH: Void rate 1.78% above 1% threshold    (red dot)   │
│  ● MED: Labor 22.3% above upper band           (amber dot) │
│  ● MED: Net sales below target                 (amber dot) │
│                                                             │
│  ── Insights (5) ──────────────────────────────────────────│
│  ● HIGH: Record Friday - Identify Driver         +$3,000   │
│  ● MED: Bev Intel Excellence at 98.2%            +$200     │
│  [priority dot] [title]                    [impact in mono] │
│                                                             │
│  ── Actions (4) ───────────────────────────────────────────│
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Research Dec 12 sales driver          (slate-800)   │   │
│  │ 20 min | Due: Dec 15 | Status: ● Proposed           │   │
│  │ [Approve ✓ green btn] [Reject ✗ red btn]            │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Audit void reasons from this week                   │   │
│  │ 30 min | Due: Dec 22 | Status: ● Proposed           │   │
│  │ [Approve ✓] [Reject ✗]                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ── Approved Actions (2) ───────── (green accent section)  │
│  ✓ Document Christmas party playbook (30 min)              │
│  ✓ Implement void approval for >$25 (15 min)               │
│                                                             │
│  ── Secret Shop ───────────────────────────────────────────│
│  Date: Nov 21 | Score: 71.8%              (amber warning)  │
│  Failed: greeting (6/10), cleanliness (7/10)               │
│  Positives: food quality (10/10)                           │
│  "Tables went long periods without being bussed"           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```




**Components:**




1. **Header**
   - Week date range (from Weeks table)
   - Score + Grade + Confidence + Trend from WeeklyScorecard




2. **Wins Block**
   - Display `wins` field from WeeklyScorecard




3. **Alerts Section**
   - Fetch Alerts WHERE week = selected_week
   - Sort by severity (High first)
   - Color-coded badges: 🔴 High, 🟡 Medium, 🟢 Low
   - Show `message` field




4. **Insights Section**
   - Fetch Insights WHERE week = selected_week
   - Sort by priority (High first)
   - Show: priority badge, title, estimated_weekly_impact_dollars
   - Click to expand → shows `summary` and `facts`




5. **Actions Section** (Proposed only)
   - Fetch Actions WHERE week = selected_week AND approval_status = "Proposed"
   - Each action card shows:
     - `title`
     - `estimated_minutes` + `due_date_suggested` + `approval_status`
     - **[Approve ✓]** button → updates approval_status to "Approved", sets approved_at
     - **[Reject ✗]** button → updates approval_status to "Rejected"
   - After clicking approve/reject, card moves to Approved section or disappears




6. **Approved Actions Section**
   - Fetch Actions WHERE week = selected_week AND approval_status = "Approved"
   - Simple list: ✓ title (estimated_minutes)




7. **Secret Shop Section** (if exists)
   - Fetch SecretShop_Audits WHERE week = selected_week
   - If no record, hide this section
   - Show: shop_date, total_score_pct, failed_areas, positives, notable_quotes




---




## Pages 3-6: Pillar Detail Pages




**URLs:** `/sales`, `/labor`, `/operations`, `/guest-experience`




**All four pages share the same layout structure (Dark Theme), with pillar-specific data:**




```
┌─────────────────────────────────────────────────────────────┐
│  [Bar Selector ▼]    [Week Selector ▼]        (slate-900 bg)│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [PILLAR NAME]                              Score: 22/25   │
│  (DM Serif headline, slate-50)               (mono, amber) │
│                                                             │
│  ── Key Metrics ───────────────────────────────────────────│
│  ┌──────────┐ ┌──────────┐ ┌──────────┐    (slate-800 cards)│
│  │ $59,723  │ │  2,095   │ │ $28.22   │    (mono numbers)  │
│  │Net Sales │ │  Trans.  │ │ Avg Chk  │    (slate-400 lbl) │
│  │ +4% tgt  │ │          │ │          │    (green if +)    │
│  └──────────┘ └──────────┘ └──────────┘                    │
│                                                             │
│  ── Drivers ───────────────────────────────────────────────│
│  [revenue_drivers / labor_drivers / etc from WeeklyScorecard]
│  (slate-300 text, slate-800 bg card)                        │
│                                                             │
│  ── Alerts (1) ────────────────────────────────────────────│
│  ● MED: Net sales below target                 (amber dot) │
│                                                             │
│  ── Insights (3) ──────────────────────────────────────────│
│  ● HIGH: Record Friday - Identify Driver         +$3,000   │
│  ● MED: Bev Intel Excellence                     +$200     │
│                                                             │
│  ── Actions (2) ───────────────────────────────────────────│
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Research Dec 12 sales driver          (slate-800)   │   │
│  │ 20 min | Due: Dec 15                                │   │
│  │ [Approve ✓ green] [Reject ✗ red]                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ── Approved Actions ──────────────────────────────────────│
│  ✓ Increase Espolon par level (30 min)         (green ✓)  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```




### Page 3: Sales (Revenue Pillar)




**URL:** `/sales`




**KPIs from WeeklyCore:**
- net_sales (format as currency)
- transactions (format as number with commas)
- check_avg (format as currency)
- Optional: Show vs target comparison if PeriodConfig.weekly_sales_target available




**Drivers:** `revenue_drivers` from WeeklyScorecard




**Filters:**
- Alerts WHERE week = selected AND pillar = "Revenue"
- Insights WHERE week = selected AND pillar = "Revenue"
- Actions WHERE week = selected AND insight.pillar = "Revenue"




---




### Page 4: Labor




**URL:** `/labor`




**KPIs from WeeklyCore:**
- labor_pct_actual (format as percentage)
- labor_cost_total (format as currency)
- scheduled_labor_cost (format as currency)
- Show variance: labor_cost_total - scheduled_labor_cost




**Drivers:** `labor_drivers` from WeeklyScorecard




**Filters:**
- Alerts WHERE pillar = "Labor"
- Insights WHERE pillar = "Labor"
- Actions WHERE insight.pillar = "Labor"




---




### Page 5: Operations




**URL:** `/operations`




**KPIs from WeeklyCore:**
- voids_pct (format as percentage)
- voids_amount (format as currency)
- comps_pct (format as percentage)
- ticket_time_avg_minutes (format as "X min")




**Drivers:** `operations_drivers` from WeeklyScorecard




**Filters:**
- Alerts WHERE pillar = "Operations"
- Insights WHERE pillar = "Operations"
- Actions WHERE insight.pillar = "Operations"




---




### Page 6: Guest Experience




**URL:** `/guest-experience`




**KPIs from WeeklyCore:**
- tip_pct (format as percentage)
- secret_shop_score_pct (format as percentage, if exists)




**Additional data:**
- SecretShop_Audits for selected week (if exists): show total_score_pct, failed_areas
- OnlineReviews_Signals for selected week: show platform, avg_rating, themes_top




**Drivers:** `guest_experience_drivers` from WeeklyScorecard




**Filters:**
- Alerts WHERE pillar = "Guest Experience"
- Insights WHERE pillar = "Guest Experience"
- Actions WHERE insight.pillar = "Guest Experience"




---




## Navigation




**Top Nav Bar (persistent on all pages, dark theme):**
```
┌─────────────────────────────────────────────────────────────┐
│ BarPulse (amber)   [Bar ▼] [Week ▼]           (navy #1B4F72)│
├─────────────────────────────────────────────────────────────┤
│ Dashboard | Weekly Review | Sales | Labor | Ops | Guest Exp │
│ (slate-400 inactive, white active, amber hover)             │
└─────────────────────────────────────────────────────────────┘
```




- Logo/Name in warm amber `#D4A574`, links to Dashboard
- Nav background: deep navy `#1B4F72`
- Bar selector dropdown (from Bars table) with slate-800 dropdown bg
- Week selector dropdown (from Weeks table, sorted by week_start desc, show as "Dec 15-21" format)
- Active tab: white text with amber underline
- Inactive tabs: slate-400 text
- Hover: amber text with subtle transition




---




## Design Direction




**Aesthetic**: Premium industrial utility meets data journalism. Think Bloomberg Terminal meets craft cocktail bar.




**Color Palette:**
- Primary: Deep navy `#1B4F72` (trust, authority)
- Secondary: Warm amber `#D4A574` (hospitality, warmth)
- Accent/Positive: Signal green `#22C55E` (positive metrics, Grade A, Approved)
- Alert/Negative: Coral red `#EF4444` (negative metrics, Grade F, High severity)
- Warning/Caution: Gold `#F59E0B` (Grade C/D, Medium severity)
- Grade B: `#3B82F6` (blue)
- Background: Dark mode `#0F172A` (slate-900)
- Card background: `#1E293B` (slate-800)
- Card border: `#334155` (slate-700)
- Text primary: `#F8FAFC` (slate-50)
- Text muted: `#94A3B8` (slate-400)




**Grade Colors:**
- Grade A: `#22C55E` (green)
- Grade B: `#3B82F6` (blue)
- Grade C: `#F59E0B` (amber)
- Grade D: `#F97316` (orange)
- Grade F: `#EF4444` (red)




**Severity/Priority Colors:**
- High: `#EF4444` (coral red) with red dot indicator ●
- Medium: `#F59E0B` (gold) with amber dot indicator ●
- Low: `#22C55E` (green) with green dot indicator ●




**Status Colors:**
- Approved: `#22C55E` (green)
- Proposed: `#94A3B8` (slate-400)
- Rejected: `#EF4444` (red)




**Typography:**
- Headlines: "DM Serif Display" or "Playfair Display" (editorial authority)
- Body/Data: "IBM Plex Sans" or "Source Sans Pro" (clarity, legibility)
- Monospace for numbers: "JetBrains Mono" (data precision)
- Large scores: text-5xl font-bold font-mono
- Section headers: text-lg font-semibold uppercase tracking-wide text-slate-400
- Body text: text-sm text-slate-200
- Muted text: text-slate-400




**Cards:**
- Background: `#1E293B` (slate-800)
- Border: 1px solid `#334155` (slate-700)
- Rounded: rounded-lg
- Shadow: shadow-lg shadow-black/20
- Padding: p-4
- Hover: subtle brightness increase on interactive cards




**Visual Language:**
- Status indicators using colored dots (●), not just text
- Sparklines for 8-week trend using Recharts with amber line on dark background
- Progress bars for goal tracking (e.g., sales vs target)
- Micro-animations: subtle pulse when data updates, smooth transitions on approve/reject
- Metric cards with monospace numbers for data precision
- Section dividers using slate-700 borders




**Responsive:**
- Mobile-first
- Pillar blocks: 1 column on mobile, 2 columns on tablet, 4 columns on desktop
- Side padding: px-4 on mobile, px-8 on desktop
- Navigation collapses to hamburger on mobile




---




## Action Handlers — MUST BE FUNCTIONAL (Not Demo)




**CRITICAL: All approve/reject buttons must make REAL Airtable API calls. This is not a demo or mockup — the buttons must actually update the Airtable records.**




### Airtable Integration Setup




```javascript
// Use Airtable.js or direct REST API
import Airtable from 'airtable';




const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(BASE_ID);




// Or direct fetch:
const AIRTABLE_API_URL = `https://api.airtable.com/v0/${BASE_ID}`;
const headers = {
  'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
  'Content-Type': 'application/json'
};
```




### Approve Action (Real API Call)




```javascript
async function approveAction(recordId: string) {
  // 1. Optimistic UI update (immediate feedback)
  setActions(prev => prev.map(a => 
    a.id === recordId 
      ? { ...a, approval_status: 'Approved', approved_at: new Date().toISOString() }
      : a
  ));




  // 2. Actual Airtable API call
  try {
    const response = await fetch(`${AIRTABLE_API_URL}/Actions/${recordId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        fields: {
          approval_status: 'Approved',
          approved_at: new Date().toISOString()
        }
      })
    });




    if (!response.ok) {
      throw new Error('Failed to update Airtable');
    }




    // 3. Success feedback (subtle animation/toast)
    showToast('Action approved', 'success');




  } catch (error) {
    // 4. Rollback optimistic update on failure
    console.error('Approve failed:', error);
    showToast('Failed to approve — please retry', 'error');
    refetchActions(); // Re-sync with Airtable
  }
}
```




### Reject Action (Real API Call)




```javascript
async function rejectAction(recordId: string) {
  setActions(prev => prev.map(a => 
    a.id === recordId 
      ? { ...a, approval_status: 'Rejected' }
      : a
  ));




  try {
    const response = await fetch(`${AIRTABLE_API_URL}/Actions/${recordId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        fields: {
          approval_status: 'Rejected'
        }
      })
    });




    if (!response.ok) throw new Error('Failed to update');
    showToast('Action rejected', 'success');




  } catch (error) {
    console.error('Reject failed:', error);
    showToast('Failed to reject — please retry', 'error');
    refetchActions();
  }
}
```




### Verify It Works




After building, test by:
1. Click "Approve" on any Proposed action
2. Open Airtable and verify `approval_status` changed to "Approved" and `approved_at` has timestamp
3. Refresh the Lovable app and confirm the action moved to "Approved Actions" section
4. Repeat test for "Reject"




**If the Airtable record doesn't update, the build is not complete.**




---




## Data Refresh




- Fetch fresh data when bar or week selector changes
- Optimistic UI updates for approve/reject (update local state immediately, sync in background)
- Show loading spinner during fetches
- Cache WeeklyScorecard list for trend chart




---




## Error States




- If no WeeklyScorecard exists for selected week: "No scorecard data for this week"
- If no Alerts/Insights/Actions: "No [items] for this week" (muted text)
- If Airtable connection fails: Toast notification with retry button




---




## Sample Data Check




After connecting to Airtable, verify these queries return data:
- Bars: 1 record (HTP)
- Weeks: 12 records
- WeeklyScorecard: 12 records
- Alerts: 18 records
- Insights: 77 records
- Actions: 77 records




If counts match, the connection is working.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://powersai.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/dc01aa48-8dd7-400a-b397-110a5d357bc1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
