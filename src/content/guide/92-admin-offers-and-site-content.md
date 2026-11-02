# Admin: offers, templates and website content
<!-- part: Tools and system | order: 92 | slug: admin-offers-and-site-content | route: /admin | tags: automation bundles, bundle, service catalog, packages, tiers, outreach templates, scripts, work, portfolio, case study, vertical landers, landing pages, lander families, industry pages, public site -->

These Admin Panel screens hold the reusable building blocks you sell and show: automation bundles, the service catalog of packages, outreach scripts, the work samples on your public site, and the industry landing pages. Use them when you add a new package or script, or when you want a new piece of work or a new industry page to appear on the public site.

## Where to find it

- "Automation Bundles", "Service Catalog" and "Outreach Templates": Admin Panel, "Settings". On a phone the sub-tabs show icons only; these are the seventh to ninth (two boxes, then a speech bubble).
- "Work / Portfolio": its own Admin Panel tab (the briefcase icon on a phone).
- "Vertical Landers" and "Lander Families": the "Vertical Landers" tab (the globe icon on a phone).

## What you see

- "Automation Bundles": "Reusable sets of fulfillment automations", a "New bundle" button and one card per bundle with its name, an optional tier and project type, an order number, an "Active" switch, a description, "Save bundle" and its "Items".
- "Service Catalog": "The packages you sell to clients", grouped by tier ("Tier 0" to "Tier 4", or "Other"). Each package shows its name, channel, linked bundle, price and line items, with an on/off switch, an edit pencil and a trash button.
- "Outreach Templates": "Reusable sales scripts", with filters for category, vertical and channel, "New template", and one editable card per template.
- "Work / Portfolio": "Portfolio / Work showcase", "Manage what appears on the public /work page", with "New item" and a list showing each item's picture, title, "published" or "draft", "Featured", category, media type and web address, plus up and down arrows, edit and delete.
- "Vertical Landers": the industry landing pages, each served at /for/ followed by the page's web name. Each row shows its status, sort number, a view button, edit and delete. Below it, "Lander Families" holds shared content for groups of pages.

## How to use it

### Build an automation bundle
1. Tap "New bundle". A bundle called "New bundle" appears.
2. Fill in its name, description and, if you like, a tier and the project type it suits, then tap "Save bundle".
3. Under "Items", pick one of the three automations (follow-up sequence, reactivation or review request) in "Add automation" and tap "Add".
4. Each item has a settings box written in JSON, a structured text format. Edit it carefully and tap "Save item".

### Add or change a service package
1. Tap "New package", or the pencil on an existing one.
2. Fill in "Name", "Tier", "Primary channel", "One-time", "Monthly", "Currency", "Price note", "Description" and "Line items". Under "Fulfillment bundle", choose the bundle a client gets when assigned this package.
3. Tap "Save". Use the switch on the list to turn a package off without deleting it.

### Write an outreach template
1. Tap "New template". A blank text-message template appears.
2. Fill in the name, pick or type a category, choose the channel, and add a vertical (leave it blank for all). Email templates also get a "Subject".
3. Write the body. Words in double curly braces are blanks that are filled in when the script is used.
4. Tap "Save". "Duplicate" makes a copy and "Delete" removes it after a pop-up confirmation.

### Show a piece of work on the public site
1. Open "Work / Portfolio" and tap "New item".
2. Fill in "Title" (the "Slug", its web name, fills in for you), "Category", "Media type" and "Short description", and paste a "Thumbnail URL".
3. Fill in the boxes that appear for the media type: a full image, a video link, a live site link or a case study body.
4. Turn on "Published" (and "Featured" to show it first), then tap "Save". New items start as drafts.
5. Use the up and down arrows to change the order.

### Edit an industry landing page
1. Open "Vertical Landers" and tap the pencil, or "New lander".
2. Edit the text boxes, such as "Headline", "Accent word (must appear in headline)", "Subline", "Proof line" and the button labels and links, and the "Leak cards" and "FAQ" lists.
3. Turn on "Published" and tap "Save". The view button opens the public page in a new tab. Until a page is published it shows "That page isn't here.", except for the flagship industries listed below.

## Words on this screen

- Automation bundle: a ready-made set of client automations applied to a project in one step.
- Tier: the level of a package, from "Tier 0" to "Tier 4".
- Fulfillment bundle: the bundle that comes with a package.
- Outreach template: a reusable sales script for text, email, direct message or voicemail.
- Vertical: an industry. A template with no vertical is for every industry.
- Slug: the web name of a page or work item, made of lowercase words and dashes.
- Featured: a work item shown ahead of the others.
- Lander: a landing page for one industry.
- Lander family: shared text that every lander with the same family key inherits.

## Good to know

- Bundles turned off are not offered when you apply a bundle to a project, and deleting a bundle does not affect projects that already use it. Deleting an item inside a bundle happens at once, with no confirmation.
- Service Catalog packages are used inside HQ (CRM company pages, proposals and project subscriptions). The public Packages page reads a different list.
- Templates turned off are hidden from the "Outreach Templates" screen in the Tools menu.
- Work items only take web links for pictures and videos; there is no upload button here.
- Your public work page also shows a few built-in starter case studies whenever no published item uses the same web name.
- Eight industries (HVAC, auto, real estate, legal, med spa, restaurants, pizza and tacos) have built-in flagship pages. For those, a lander row is only used when it is a newer version 2 page.
- Version 2 pages also use fields this editor does not show, such as the page layout, market facts and differentiators.
- The JSON boxes on landers and families must hold valid JSON, or saving stops with an "Invalid JSON" message.
