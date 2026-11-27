# Brand Drive files inside HQ (version 1, read-only)

## What the owner sees
- **Brand page > Files and documents** (the existing tab, no second place). Three sections on top, then the existing links/assets:
  1. **Ready to post** — today and tomorrow, big tiles. Each shows the images/video thumbnails, the caption (from the "POST THIS - <Brand>" doc, falling back to the .md notes), a **Copy caption** button, **Save image** per file (phone share sheet / download), and Open in Drive. Missed days (yesterday, not marked posted) show as late.
  2. **Waiting for your approval** — docs in FOR YOUR APPROVAL whose title starts with the brand name, newest first, tap to read the text in HQ.
  3. **Brand folder** — the brand's subfolder in "Supreme Team HQ - Brands" plus any Drive folders saved in the brand's links, browsable one level at a time with thumbnails; tap a file to preview (images, video, PDF, Google Docs as text).
- **Look inside** button wherever HQ already shows a Drive folder link: Agent Desk posts and proof, Waiting on me approval cards, Content Studio folder links. It opens the same viewer sheet — but only if that folder is a brand folder (or inside one) the person may see; otherwise it stays a plain "Open in Drive" link.
- A **Today's posts** shortcut on Portfolio/Agent Desk posts view listing every brand's ready-to-post pieces for today, each one tap to the same tile.

## How a brand's folders are known (no sync job)
- Matching is live, by name, at read time: brand subfolder in Brands = exact brand name; READY TO POST day folder `YYYY-MM-DD …` (Pacific dates) then subfolder = exact brand name; approval docs = title starts with brand name.
- Exact-name rule is fragile (renames, "&" vs "and"). So add a small per-brand **Drive folder** setting: an optional override folder id the owner can pin once; name matching is the default.
- Results cached a few minutes server-side per request only; nothing copied. New agent files appear on the next open/refresh.

## Safety rule
- All Drive calls happen in one backend function using the owner's connection; the browser never sees the connection.
- Every request names a brand and a folder/file id. The function first checks the signed-in person may see that brand (admin, or assigned to it — same rule as the Agent Desk read policy), then walks the file's parents up to confirm it sits inside one of that brand's roots (its Brands subfolder, its ready-to-post subfolders, its pinned/brand_kit_links folders) or is an approval doc whose title starts with the brand name. Anything else returns "not available". No search, no "My Drive" browsing, no arbitrary ids.
- Shared roots (READY TO POST, FOR YOUR APPROVAL top level) are never listed whole — only the brand's slice.

## Connecting (when we say go)
Owner taps: Settings > Connectors > Google Drive > Connect, signs in with his Google account, and on Google's screen approves **"See and download all your Google Drive files"** (drive.readonly). Do not tick edit/delete permissions. Then we link it to this project.

## Database changes (need your approval)
- One nullable column `drive_folder_id text` on brand_kits (pinned brand folder override). Nothing else; the five root folder ids live in code config.
- No new tables.

## Reuse vs build
- Reuse: Files and documents tab, brand assignment rules, Agent Desk proof/post lists, Waiting on me cards, Content Studio links, existing link parser in ownerWork.ts.
- Build: one `drive-browse` backend function (list folder, file preview/thumbnail/text, ready-to-post for brand+date, approvals for brand), a shared viewer sheet, ready-to-post tile, "Look inside" button, Guide page update, tests for name matching, Pacific date folders and the inside-a-brand check.

## Left out of v1
Uploading, renaming, moving, approving or commenting in Drive; Drive search; marking posted from the tile (stays on Agent Desk); offline copies; notifications when files arrive.

## Running cost
No Lovable connector fee; Google Drive API is free at this volume. Each open is a few backend calls; thumbnails/images stream through the function, so heavy video previews use backend bandwidth — videos open in Drive's player instead.

## Risks
- Name drift between brand names and folder names (pinned override mitigates; screen says "no folder found" plainly).
- 0 rows in brand assignments today, so helpers will see nothing until assigned — expected, but check.
- The 401 service-credential issue on content-studio-run is unrelated, but this function will use normal user sign-in, not the service key.
- The connection sees his whole Drive; safety relies entirely on the parent-walk check, so it gets dedicated tests.

## Rough credits
About 12–18 credits.
