# Admin: projects, project types and pillars
<!-- part: Tools and system | order: 90 | slug: admin-projects-and-pillars | route: /admin | tags: projects, add project, edit project, project type, vertical, pillars, leak vectors, qualifier fields, overrides, customize, integrations, leadership, contacts, set up, delete project, inactive -->

Every project in HQ has a type, and the type supplies the project's pillars, leak vectors and lead-qualifier questions. This article covers adding and editing projects (Admin Panel, "Settings", "Projects"), managing project types and their templates (the "Pillars" tab), and giving a single project its own pillars without changing its type.

## Where to find it

- Projects: Admin Panel, "Settings", then the first sub-tab, "Projects" (a building icon on a phone).
- Project types and templates: Admin Panel, "Pillars" (the stacked-layers icon on a phone).
- One project's own pillars: the project's "Edit" form, "Pillars" tab. The same panels appear in the project's "Set up" wizard.

## What you see

### Projects
- "Projects" with "Add Project", and a table with "Name" (plus the number of users and a badge that reads "Live" or shows go-live steps done, such as "3/5 go-live"), "Code", "Status" ("Active" or "Inactive"), "Timezone", "Last Sync" and two buttons, "Set up" and "Edit" (icons only on a phone).
- The edit form has six tabs. "Leadership", "Contacts" and "Pillars" unlock once the project is saved.
- "Basic": "Project Name", "Project code", "Status", "Address", "Timezone" and "Project Type".
- "Integrations": "Task Completion Source" ("None", "7shifts" or "Asana"), "Toast POS", "Google" (a "Google Place ID" with a search button that looks the business up by name and address), and three Asana sections: "Asana — Log Sources", "Asana — Task Routing (Scoring)" and "Asana — Approved Action Destination".
- "Leadership": "Project Leadership", the managers and lead staff offered when you assign an insight.
- "Contacts": "Project Contacts", outside vendors such as a plumber or a supplier rep.
- "Pillars": "Project Pillars", "Leak Vectors" and "Qualifier Fields" for this project only.
- "Advanced": "Diagnostics", "Legacy Asana Fields" (read only) and "Danger Zone" with "Delete Project".

### Pillars tab
- "Project Types": every type with its name, a "vertical" tag where it applies, "system default" on the Client type, how many projects use it, "Duplicate" and a trash button.
- "Project-Type Config": a "Project type" picker and three inner tabs. "Pillars" has one row per pillar (name, a locked key, weight, order number, data source and a trash button) and a "Weight sum" that turns green at 100. "Leak Vectors" has a name, how the leak is detected, its dollar formula, a benchmark and "headline" or "supporting". "Qualifier Fields" has "Ready definition (per type)", "Primary channel" and one row per question (label, locked key, answer type, channel and a "shared" switch).

## How to use it

### Add a project
1. Open "Projects" and tap "Add Project".
2. On "Basic", fill in "Project Name" and "Project code" (a short code such as initials; both are required), then pick "Project Type" and "Timezone".
3. Tap "Add Project". The "Set up" wizard opens next, with three phases: "Identity & type", "Go-live essentials" and "Full configuration".

### Change a project
1. Tap "Edit" on its row.
2. Change what you need on any tab and tap "Save Changes". People and contacts added on "Leadership" and "Contacts" save as soon as you tap "Add".
3. Changing "Project Type" does not delete data. Leak Stack uses the new type from its next run.

### Switch a project off, or delete it
1. To hide it but keep everything, open "Edit", turn "Status" to "Inactive" and tap "Save Changes". Inactive projects drop out of the project picker and Portfolio.
2. To remove it for good, open "Edit", "Advanced", tap "Delete Project" and confirm the pop-up. Its users are unassigned, and this cannot be undone.

### Make a new project type
1. On "Pillars", find the closest existing type under "Project Types" and tap "Duplicate".
2. In "Duplicate project type", type the "Label". The "Id" fills in from it: lowercase letters, numbers and underscores, starting with a letter.
3. Turn on "Vertical" if the type should have its own public qualifier page.
4. Tap "Duplicate". A message says how many pillars, leak vectors and qualifier fields were copied.

### Edit a type's pillars, leak vectors or questions
1. Under "Project-Type Config", pick the "Project type".
2. Open "Pillars", "Leak Vectors" or "Qualifier Fields" and edit the rows.
3. Add a row with "Add pillar", "Add leak vector" or "Add field".
4. Tap "Save changes". The trash button removes a row after a pop-up confirmation.

### Give one project its own pillars
1. Open the project's "Edit" form, then "Pillars".
2. Under "Project Pillars", tap "Customize for this project". This copies the type's pillars into the project, and the panel reads "Using project-specific pillars".
3. Edit names, weights, order and data sources, or tap "Add pillar" and answer the two pop-ups (a key, then a name).
4. Tap "Save".
5. To go back to the type's list, tap "Reset to default". Leak vectors and qualifier fields work the same way.

## Words on this screen

- Project: a brand, channel, app or client business that HQ tracks.
- Project type: the kind of project. It supplies the template.
- Vertical: a type that also gets a public lead-qualifier page.
- Template: the type's standard list of pillars, leak vectors and qualifier questions.
- Pillar: a scored category, such as revenue or delivery. Its weight is its share of the score.
- Leak vector: a known place a business loses money, used by Growth Audit and Leak Stack.
- Qualifier field: a question the public lead qualifier asks.
- Key: the fixed internal name of a row. It cannot be changed.
- Override: a project's own list. It replaces the type's list completely.
- System default: the Client type, which cannot be deleted.

## Good to know

- Overrides replace, they never merge. After you customize a project, later changes to its type do not reach it until you tap "Reset to default".
- A type can be deleted only when no project uses it, and the Client type never.
- There is no button to create a type from scratch or rename one. Duplicate a type and edit the copy instead.
- To change a key, delete the row and add it again.
- Pillar weights should add up to 100. The total turns green at 100, but saving is allowed at any total.
- The qualifier editor has no "required" switch and no place to edit answer choices, although the older Help Center says otherwise.
- Many integration fields come from the restaurant product, such as Toast POS and 7shifts.
- Deleting, adding and resetting here use your browser's own pop-up boxes.
