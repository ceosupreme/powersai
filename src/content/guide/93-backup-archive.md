# Backup, export, archive and delete
<!-- part: Tools and system | order: 93 | slug: backup-archive | route: /admin | tags: backup, export, csv, json, download, spreadsheet, archive, restore, delete, inactive, show archived, undo, safety -->

HQ can download your records as one backup file or as spreadsheets, one table at a time, from Admin Panel, "Settings", "Backup & Export". Several screens also let you archive something instead of deleting it, so it disappears from view but can be brought back. This article shows where each option lives and what is permanent.

## Where to find it

- Backup & Export: Admin Panel, "Settings", "Backup & Export" (a download-arrow icon on a phone, tenth in the row). Only the admin can open it.
- A reminder card, "No backup on record" or "Last backup was" a number of "days ago", appears on Dashboard when you have not exported anything for 30 days. Its "Export backup" button opens the same screen.
- Archive buttons live on CRM, Brand Kit, Capture Inbox and CRM's "Inbound Leads", described below.

## What you see

- A tip, "Back up before big changes".
- The "Backup & Export" card with "Download Full JSON Backup".
- Eight groups of tables: CRM, Brand Vault, Capture, Inbound Leads, Projects, Tasks, Authored Content and Marketing. Each row shows its name, row count or access error, and a CSV button.

## How to use it

### Download a full backup
1. Open "Backup & Export" and tap "Download Full JSON Backup".
2. Wait for "Backup ready", which shows how many tables and rows it saved. A partial backup shows a warning and records the failed tables in the file.
3. A file named "supreme-team-backup-" plus today's date downloads. Save it outside HQ, for example in Google Drive.

### Export one table as a spreadsheet
1. Tap "CSV" next to the table.
2. A file named after the table and today's date downloads. Open it in Google Sheets or Excel. An empty table gives an empty file.

### Archive instead of deleting
1. In CRM, tap the three-dot menu on a company and choose "Archive or delete…", or open the company and tap "Archive or delete…". On the CRM pipeline board, deals have the same menu item, and the Brand Kit has an "Archive…" button at the top.
2. Read the box. It explains what archiving does and lists what a permanent delete would remove, such as deals and interactions that would be "permanently deleted" and contacts that would be "unlinked but kept".
3. Add a "Reason (optional)" if you like.
4. Tap "Archive (recommended)". "Delete permanently" removes it for good, and "Cancel" does nothing.

### Find and restore archived items
1. CRM companies: turn on "Show archived" above the company list. The list then shows only archived companies. Tap the restore button on one, or open it and tap "Restore".
2. Brand Kit: tap "Show archived" at the top if the project's kit is hidden, then tap "Restore".
3. Capture Inbox and CRM "Inbound Leads": open the "Archived" tab to see archived items. There is no restore button for these.

## Words on this screen

- Full JSON Backup: one file holding every table on this screen. JSON is a structured text format meant for computers; keep the file as it is.
- CSV: a plain spreadsheet file, one table at a time.
- Archive: hide a record but keep it and everything linked to it.
- Restore: bring an archived record back into normal view.
- Delete permanently: remove a record for good.
- Unlinked but kept: linked records that survive a delete but lose their link.
- Inactive: a project switched off in Admin Panel. It is hidden but nothing is lost.
- No access: your login cannot read that table.

## Good to know

- The export includes the tables listed on this screen, now including production jobs, action items, content, research, playbooks, brand channels, products, offers and channel revenue. It is not a complete database snapshot; logs, chat, authentication records and unlisted tables are outside its scope.
- Uploaded files such as images and PDFs are not in the backup, only their details.
- Tables are downloaded in ordered pages of 500 rows. The manifest lists each table’s exported count and failures. A partial export is labeled partial and does not update the last-successful-backup date.
- Exports include only rows your login can read. As the admin, that is everything.
- Projects have no archive button. Instead, set "Status" to "Inactive" in the project's "Edit" form. "Delete Project" under "Advanced" is permanent.
- Deleting a brand kit removes its color, tagline, hashtag, link and asset records. The uploaded files stay in storage.
- These can only be deleted, never archived: tasks, chat messages, draft logs, users, work items, landers, bundles, packages, templates and project types. Most ask you to confirm first, but deleting a chat message or a batch of tasks does not. Submitted logs cannot be deleted at all.
- Some screens use "Archived" as a status instead of the archive box, such as Growth Audit's Action Center, Playbooks and Marketing Hub campaigns.

Rows can change during export, so the download is not a transactionally consistent snapshot. Store uploaded files separately; only their metadata is exported.
