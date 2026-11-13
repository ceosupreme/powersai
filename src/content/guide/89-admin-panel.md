# Admin Panel: users and permissions
<!-- part: Tools and system | order: 89 | slug: admin-panel | route: /admin | tags: admin, admin panel, settings, crews, users, create user, invite, import, roles, permissions, page access, role page access, delete user, assigned projects -->

The Admin Panel is where you control who can sign in to HQ, what each person can open and how HQ is set up. This article explains how to get there, what its seven tabs are, and how to use the first two, "Users" and "Permissions". The other tabs have their own articles, listed below.

## Where to find it

- On a computer: in the side menu, under "System", tap "Admin Panel". You can also tap your name at the bottom of the side menu and choose "Settings".
- On a phone: tap "More" in the bottom bar, then "Settings" under "System".
- Only the admin login can open it. Anyone else is sent away.

## What you see

- The heading "Admin Panel" and "Manage users, roles, and project access."
- Seven tabs. On a phone they show icons only, in this order: "Users" (two people), "Permissions" (padlock), "Settings" (gear), "Crews" (pulse line), "Pillars" (stacked layers), "Work / Portfolio" (briefcase) and "Vertical Landers" (globe). A red number on "Crews" counts the crews that failed or missed their run.
- The "Users" tab: a "Users" card with "Create User", "Import Users" and "Search users...", and a table with "Name", "Email", "Role", "Project", "Joined" (computer only) and "Actions". The table scrolls sideways on a phone. "Project" shows each person's projects, with the main one highlighted.
- The "Permissions" tab: "Role Page Access", a table of 32 pages with an on/off switch for "Owner", "GM", "Shift Lead" and "Staff", and a "Save" button.
- The other tabs: "Settings" is covered in "Admin: projects, project types and pillars", "Admin: targets, monitoring and Sync Health", "Admin: offers, templates and website content", "Backup, export, archive and delete" and "Help Center and Launch Checklist". "Crews" is in "The crews that run while you sleep". "Pillars" is in "Admin: projects, project types and pillars". "Work / Portfolio" and "Vertical Landers" are in "Admin: offers, templates and website content".

## How to use it

### Add a person with a password
1. Open "Users" and tap "Create User".
2. Fill in "Full Name", "Email" and "Temporary Password" (at least 8 characters, the same minimum as signing up). Tap "Generate" for a strong one: it fills the box and shows the password, and the copy button next to it copies it so you can send it. The eye button shows or hides what you typed.
3. Pick a "Role": "Admin", "Owner", "GM", "Shift Lead" or "Staff". It starts at "Staff".
4. If you use Asana, add their "Asana GID", the number that links them to their Asana account.
5. Tick their projects under "Assigned Bars" (an older word for projects). With more than one ticked, tap "Set primary" on their main project.
6. Tap "Create User". Give the person their email and temporary password yourself; HQ does not send them.
7. If it fails, the message says why. The most common reason is a password that has shown up in data leaks on other websites: HQ's sign-in service checks every new password against a public list of leaked passwords and refuses any password on it, even a long one. Pick a different password or tap "Generate". An email that already has an account can't be created again; find the person in the table and tap "Edit" instead.

### Invite several people by email
1. Tap "Import Users".
2. Paste one person per line in the box: email, name, role and project name, separated by commas. A heading line is optional.
3. Tap "Parse CSV". Check the "Preview Import" table. You can fix any cell, change the role or project, or remove a row with its X. A row needs a valid email and a name.
4. Tap the send button, for example "Send 3 Invites" (the number counts the valid rows). Each person gets an email invitation, and "Import Results" shows who succeeded.

### Change someone's role or projects
1. Tap "Edit" on their row.
2. Change "Role", "Asana GID" or the ticks under "Assigned Bars".
3. Tap "Save Changes". You see "User updated successfully".
For an Owner role, pick any of your own brand types: internal brand, content channel, app build or service offer. Choose at least one. Prospect shells are not offered; the person only sees their assigned brands.

### Choose which menu items one person sees
1. Tap "Edit" on their row and scroll to "Menu items this person sees". For an admin it only says "Admins see every menu item."
2. The list matches the side menu: the same group headings, names and order. Items that open the same page share one switch, for example "Dashboard, Portfolio, Guide, Launch Checklist" or "Content, Radar". That first row is marked "Always on". "Playbooks", "Production Board", "Answer Bank" and "Admin Panel" are greyed out and marked "Admins only".
3. Under "Pages opened from inside HQ", "Brand and project pages" controls the brand and project screens opened from Portfolio or links.
4. Each switch starts at what the person sees today. On shows the item and lets them open it; Off hides it. "Changed for this person" appears beside any switch that differs from their role's starting items.
5. Tap "Save menu items". You see "Menu items saved" only after HQ reads the saved switches back; otherwise an error says nothing was confirmed. "Reset to role defaults" clears every personal change for this person.
6. The person gets the change the next time they open or reload HQ. If you also changed their role, save the role first with "Save Changes".

### Remove someone
1. Tap the trash button on their row. Your own row has none.
2. Read "Delete User" and tap "Delete". This cannot be undone.

### Choose which pages each role can open
1. Open "Permissions".
2. Flip the switches for each page under "Owner", "GM", "Shift Lead" and "Staff". These are the starting menu items for each role; a person's own switches in "Edit" win over them.
3. Tap "Save". You see "Role page defaults saved". People get the change the next time they open or reload HQ.

## Words on this screen

- Role: the account role shown in the table, such as admin, owner, gm, shift lead or staff. See "Roles, role preview and staff screens".
- Admin: the login with full access to everything. It ignores the page switches and is the only role that can open the Admin Panel.
- Assigned Bars: the projects a person works on. Everyone except the admin only sees their assigned projects.
- Primary: a person's main project.
- Asana GID: the number that links a person to their Asana account, used when HQ assigns tasks in Asana.
- CSV: plain text with values separated by commas, the format "Import Users" reads.
- Role Page Access: the page switches for each role.

## Good to know

- A switch that has never been saved shows as on, but that page stays closed until you tap "Save" once. Tap "Save" after your first visit to this tab.
- The "Dashboard" switch also controls Today, Portfolio, the Guide, the Help Center and the staff home screens. "Content Pipeline" also controls Radar, Production Board and Answer Bank.
- "Create User" and "Edit" do not offer "Client" or "Manager". Clients are invited from a project's setup, and their page access is set outside this screen.
- In "Import Users", the role words admin, owner, manager, gm and shift lead are understood; anything else becomes Staff. The project name must match exactly, and a name containing a comma breaks the row.
- "Edit" can change a role but cannot add one to a login that has none. Such a login shows as "staff" in the list but sees "No role assigned to this account" when signing in.
- The delete message says all associated data is removed. In practice it removes the person's login, and their records follow each table's own rule. For example, tasks assigned to them become unassigned.
- The code also has per-person page switches, but they are not shown anywhere. Access is set per role only.
