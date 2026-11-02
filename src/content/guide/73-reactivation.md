# Reactivation Campaigns
<!-- part: Clients and leads | order: 73 | slug: reactivation | route: /automations/reactivation | tags: reactivation, win-back, past customers, customer list, csv, import, campaign, offer, segments, lapsed customers -->

Reactivation turns a client's list of past customers into win-back emails. You load the list and write the offer, and the system drafts one email per customer; every draft then waits in the Automation Inbox for approval. Use it when a client wants to bring back customers who have not been in for a while.

## Where to find it

- On a computer, open "Clients & Leads" in the side menu and choose "Reactivation". On a phone, tap "More", then "Reactivation".
- It works on the client chosen in the header. With "All projects" selected you only see "Select a project to manage reactivation lists."

## What you see

- A help tip, "How a reactivation campaign works".
- An amber warning that starts "Reactivation is not enabled for this project" when the automation is off for this client.
- A "Lists" card with one button per list, a "New list name" box and "Create list".
- After you pick a list, an "Import members" card that shows how many customers the list holds, with a paste box and "Import".
- A "Start campaign" card with "Campaign name", "Offer" and "Draft campaign".

## How to use it

### Turn reactivation on for a client
1. Open the client's project page and tap "Setup wizard".
2. Open "Full configuration", then "Fulfillment automations".
3. Switch "Customer reactivation" on and tap "Save".

### Create a list and add customers
1. Choose the client in the header.
2. Type a name in "New list name" and tap "Create list". The new list is selected for you.
3. In the paste box, put one customer per line with four values separated by commas, in this order: name, email, phone, last visit date. Write the date as year-month-day, for example 2026-03-14.
4. Tap "Import". A message confirms how many customers were imported.

### Draft the campaign
1. Make sure the right list is selected.
2. Enter a "Campaign name" (optional) and the "Offer" in plain words.
3. Tap "Draft campaign". A message says how many drafts were queued.
4. Open the Automation Inbox, set the automation menu to "Reactivation", and approve, edit or reject each draft.

## Words on this screen

- List: a saved group of a client's past customers.
- Member: one customer on a list.
- Offer: the reason to come back, written into every draft.
- Segment: customers are grouped by last visit: within 30 days, 31 to 60 days, 61 to 90 days, more than 90 days, or unknown when no date was given. The AI writes one message per group.
- Draft campaign: creates the drafts. It never sends anything.

## Good to know

- Campaigns from this page are email only. Customers without an email address are skipped.
- Each customer becomes a separate draft with their first name filled in, so a big list means many approvals. The Automation Inbox shows up to 500 messages at a time.
- Do not paste a header row, because it would be imported as a customer. A name that contains a comma shifts the other values into the wrong places.
- This page cannot show, edit or delete the customers on a list, delete a list, or show past campaigns.
- If the AI could not write a message, the draft reads "(Draft pending — …)". Reject those.
- "Draft campaign" stays greyed out until reactivation is on for the client and the list has at least one customer.
- Delivery follows the client's "Email delivery" setting on the project page. In log-only mode nothing reaches customers, even after approval.
