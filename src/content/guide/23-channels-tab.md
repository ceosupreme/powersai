# Channels tab
<!-- part: Running a brand | order: 23 | slug: channels-tab | route: /project/:venueId | tags: channels, social accounts, followers, numbers, stats, screenshots, update from screenshots, add numbers, stale, cadence, posts per week, handle, channel drawer, set up, method, placements -->

The "Channels" tab lists every social account, website and store on file for this brand, with its status, followers, posting target and last post. It is where you keep the numbers current, either by typing them in or by letting HQ read them from profile screenshots, and where you start a setup pipeline for one channel. Use it to see which channels are active or falling behind, and to log new follower numbers.

## Where to find it

- Open the brand, then tap "Channels" in the tab row.
- The address ends in ?tab=channels.

## What you see

- An "Update from screenshots" button at the top. Only admins see it.
- One row per channel, with a green bar on its left. On a computer the details sit in columns; on a phone they stack, with small labels such as "Level", "Followers" and "Last post".
  - The platform, such as "YouTube" or "Facebook page", with the handle or account name under it.
  - The newest numbers, when there are any, for example "12,400 followers · 310 following · 85 posts — 2026-10-30, from a screenshot".
  - The status: "Live", "Dormant", "Empty", "Planned" or "Needs Access". "STALE" follows in red when the channel is behind on posting.
  - The level: 1, 2 or 3.
  - Followers, with the date of the count in brackets.
  - The posting target, such as "3/wk".
  - The last post, such as "2 days ago".
  - The scheduler, the tool that posts for this channel.
  - The method: the playbook that governs how this channel is run, with its version.
  - A pencil button for editing. Only admins see it.
- With no channels, the tab says "No channels recorded for this brand."

Tapping a row opens the channel drawer from the side. It shows:
- The platform and handle, or "No handle recorded".
- "Status", "Level", "Account", "Followers", "Cadence", "Last post", "Scheduler" and "URL", then any notes.
- "Method": the playbook's name, version and summary, or "No governing method set."
- "Numbers": the last five saved sets of numbers, each with its date and source. Admins also get an "Add numbers" box with "Followers", "Following", "Posts", "Videos" and "Date", and a "Save numbers" button.
- "Recent placements": the last five pieces placed on this channel, each with its status and how long ago, or "No placements on this channel yet."
- "Open", which opens the account in a new tab. It only shows when a URL is saved.
- "Set up", which starts a setup pipeline for this channel.

## How to use it

### To update numbers from screenshots
1. Take screenshots of the brand's profile pages, showing the follower and post counts.
2. Tap "Update from screenshots", then pick the images under "Screenshots". You can pick several at once.
3. Tap "Read them". HQ reads each image with AI and lists every account it found, such as "Instagram · @handle", with the file it came from. If it finds none, it says "No accounts were found in these images."
4. Check the numbers and fix any that are wrong in "Followers", "Following", "Posts" and "Videos".
5. Check "Match to" for each account. HQ preselects the channel with the same handle, or the only channel on that platform, or else "Add as a new channel". You can also choose "Do not save".
6. Tap "Save". HQ shows "Numbers saved". Tap "Back" instead to start over with other images.

### To type numbers in by hand
1. Tap the channel's row to open the drawer.
2. Under "Add numbers", fill in at least one of "Followers", "Following", "Posts" or "Videos". Commas are fine.
3. Leave "Date" on today or change it to the day the numbers are from.
4. Tap "Save numbers". HQ shows "Numbers saved".

### To edit a channel
1. Tap the pencil on the channel's row.
2. Change the "Status", "Level", "Posts per week", "Handle" or "URL".
3. Tap "Save". HQ shows "Channel saved". "Cancel" closes the editor without saving.

### To start a setup pipeline for a channel
1. Tap the row to open the drawer.
2. Tap "Set up". The "Create pipeline" form opens with a title such as "Set up YouTube".
3. Change the title, niche, level or money destination if needed, and tap "Create pipeline". The new pipeline page opens.

## Words on this screen

- Channel: one account, site or store the brand uses, such as an Instagram account or an Etsy shop.
- Handle: the account's name on the platform, usually starting with @.
- Level: the channel's content level, 1 to 3. Setup pipelines make the channel's first five pieces at this level.
- "Posts per week" and "Cadence": the posting target for the channel.
- "STALE": shown when a posting target is set and the last post is missing or older than 7 days divided by the target, rounded up. At 3 posts a week a channel goes stale after 3 days without a post; at 1 a week, after 7 days.
- "Method": the platform playbook that governs the channel.
- Placement: one piece of content scheduled for, or posted on, a channel.
- Number sources: "from a screenshot", "entered by hand", "from Metricool", "from the public page" and "from the platform" say where a set of numbers came from.

## Good to know

- Screenshots are read once and not stored. Reading them uses the workspace's AI credits. If the credits run out, HQ says "AI credits have run out for this workspace." and stops reading the rest. If it says "Too many requests right now", wait a minute and try again.
- Views and likes that HQ reads from a screenshot are saved with the other numbers, but the review screen does not show them.
- "Add as a new channel" creates a live channel at Level 1. Matching an existing channel that has no handle fills in the handle from the screenshot.
- Saving numbers twice for the same channel, date and source replaces the earlier set instead of adding a second one.
- The pencil editor cannot change followers, last post, scheduler or method. Followers come from the numbers you save, from screenshots, "Add numbers" or Metricool. The method is linked by the nightly production run when the playbook for that platform is written. Not confirmed: where last post and scheduler are set.
- Saving new numbers also updates the "Followers" column. HQ copies the newest follower count, with its date, onto the channel automatically.
- "Set up" does not check for a setup pipeline already running, so tapping it twice creates two jobs. The "Setup" tab shows "Open setup job" instead when one is open.
- There is no add-channel button on this tab. New channels come from the "Setup" tab ("I already have it" or "Set it up") or from a screenshot saved with "Add as a new channel".
- "Recent placements" matches pieces by platform or account name, so a piece filed under a different channel name may not appear.
