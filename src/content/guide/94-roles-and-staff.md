# Roles, role preview and staff screens
<!-- part: Tools and system | order: 94 | slug: roles-and-staff | route: /preview/:role | tags: roles, admin, owner, manager, gm, general manager, shift lead, lead, staff, producer, contributor, client, permissions, preview, view as role, staff screens, my shift, clock in -->

Every login has a role, and the role decides which screens a person can open, which menu they get and where they land after signing in. This article explains each role, the "Preview Role" tool that shows you HQ the way another role sees it, and the simpler staff screens a team member would use. Use it before you give an assistant or staff member a login.

## Where to find it

- Give or change a role: Admin Panel, "Users", "Edit". See "Admin Panel: users and permissions".
- Turn pages on or off for a role: Admin Panel, "Permissions".
- Preview on a computer: tap "Preview Role" at the bottom of the side menu. On a phone there is no menu for it; add /preview/ and then owner, gm, lead, foh or boh to the site address.
- Staff screens: /staff/my-shift, /staff/shift, /staff/tasks, /staff/chat and /staff/logs. The address /staff opens the staff tasks screen.

## What you see

### Two layers of role
Each person has an account role and a workspace role, and saving them in "Edit" keeps the two in step.
- Account role, shown in the "Users" table: admin, owner, gm, manager, shift lead, staff or client. It decides the page switches and whether the person is the admin.
- Workspace role: Owner, General Manager, Lead, Producer, Contributor or Client. It decides the menu, the home screen and the screens limited to certain roles. Admin and owner become Owner, gm and manager become General Manager, shift lead becomes Lead, and staff becomes Producer.

### What each role gets
- Admin: everything, always, ignoring the page switches. Only the admin sees "Admin Panel", "Preview Role", and the menu items "Playbooks", "Production Board" and "Answer Bank". Lands on Portfolio.
- Owner: the full owner menu and the owner-only screens, such as Portfolio, project pages, Growth Audit, Leak Stack, Prospect Dock, Foundation Audit and Marketing Hub, limited by the "Owner" switches. No Admin Panel. Lands on Portfolio.
- General Manager: the same side menu on a computer, and on a phone a bottom bar with "Review", "Insights", "Tasks", "Chat" and "More". Can open Weekly Review, Insights, Team, Tasks, Logs, Chat and any other page switched on for "GM", but not the owner-only screens. Lands on Weekly Review.
- Lead: the staff layout, plus Tasks, Logs and Chat. Lands on the shift dashboard.
- Producer and Contributor: the staff layout. Lands on "My Shift".
- Client: only the approvals screen, in a plain layout headed with their project's name and "Message approvals — nothing sends without your OK." Lands on that screen.
- Everyone except the admin sees only the projects assigned to them.

### Staff screens
- The staff layout: on a computer, a side menu with "My Shift", "Tasks", "Chat", a "Report Something" button and "Sign Out"; on a phone, a bottom bar with "Shift" or "My Shift", "Tasks", "Chat" and "Logs". A bar at the top has "Clock In" or "Clock Out", plus a FOH and BOH switch for people who work in both.
- "My Shift" (Producer and Contributor): a greeting, "Shift Updates", "My Tasks", "My Stats This Week" (Producer only), "Nice Work!", "My Schedule This Week" and quick buttons under "Something Happen?".
- The shift dashboard (Lead): "Handoff from Previous Shift", "Watch Today", "My Tasks", "Who's Working", "Daily Lead Log", "Voice Note" and a quick log bar.
- Staff tasks: the person's own tasks under "Now" (due today), "Overdue", "Upcoming" and "Completed Today". Tapping the circle ticks one off, with an undo.
- Staff chat: their channels and "Message a Team Member".
- Staff logs: "New Log" with "Start", unfinished drafts with "Continue", and "Recent Logs".

## How to use it

### Preview HQ as another role
1. On a computer, tap "Preview Role" at the bottom of the side menu.
2. Under "View as Role", pick "Owner", "General Manager", "Lead", "Producer" or "Contributor".
3. HQ opens that role's home screen with an amber bar that reads "Previewing as:" with the role and "Temporary".
4. Tap "← Exit Preview" in the amber bar, or "Exit Preview" in the menu, to return to Portfolio.

### Set up a new team member
1. Create their login in Admin Panel, "Users", with the right "Role" and their projects ticked.
2. Check the role's page switches in "Permissions" and tap "Save".
3. Preview the role to see their menu and home screen.

### Add a client approver
1. Open Admin Panel, "Settings", "Projects" and tap "Set up" on the client's project.
2. Open the "Fulfillment automations" step, under "Full configuration".
3. Tap "Invite client approver", type the client's email and tap "Send invite". You see "Invite sent." They get an email invitation and, once signed in, see only the approvals for that project.
4. For each automation the client should approve, set "Approval mode" to "Client approves" and save it.

## Words on this screen

- Admin: the one login with full access, including the Admin Panel.
- Manager: an account role that works the same as GM.
- General Manager (GM): runs a project day to day.
- Lead (Shift Lead): runs a shift.
- Producer and Contributor: staff. HQ also calls them FOH and BOH, restaurant terms for front of house and back of house.
- Client: a customer who only approves messages before they are sent.
- Home screen: where a person lands after signing in.
- Preview: a temporary look at another role's layout.

## Good to know

- Preview changes only the layout and the starting screen. Menus, data and page access still follow your admin login, and some staff menu links follow your real role, so a Lead preview may not show the "Dashboard" link. Reloading the page ends the preview, and "Client" cannot be previewed.
- Menu links are filtered by page switches only. A manager can therefore see links such as "Portfolio" or "Growth Audit" that answer "You don't have access to this page" and send them back.
- Contributor exists, but "Create User" and "Edit" cannot assign it; staff always become Producer.
- "Clock In" and "Clock Out" only remember the state on that phone or computer. They do not record time anywhere.
- The quick log buttons on "My Shift", and "Daily Lead Log" and "Voice Note" on the shift dashboard, open the Logs card picker instead of the chosen log.
- A signed-in login without a role sees "No role assigned to this account", and one whose page access fails to load sees "Access could not be verified" with "Try again" and "Sign out".
- The staff screens show the signed-in person's own tasks, so when you open them yourself you see yours.

Editing an account with no role row now creates its role assignment. Related save errors are surfaced instead of reporting success. Reopen the account after any error to verify its role and project assignments.
