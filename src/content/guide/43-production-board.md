# Production Board
<!-- part: Making things | order: 43 | slug: production-board | route: /production-board | tags: production board, content, all brands, approve, approval, quality score, idea score, hard fails, batch approve, stages, research, writing, images, video, scheduling, four-week mix, content mode, import package -->

The Production Board shows the content pieces of all your brands in one place, sorted into tabs by production step. Each card shows the piece's scores, where it is going and whether it is approved, and lets you approve it or move it to its next step. Use it for a review session across brands; to approve all of one brand's ready pieces at once, use that brand's "Content" tab.

## Where to find it

- On a phone, tap "More" in the bottom bar, then "Production Board". On a computer, choose "Production Board" in the side menu under "Growth & Marketing".
- The address is /production-board.
- It is for admins only. Anyone else sees "The Production Board is available to admins only."

## What you see

- The title "Production Board", the line "Every internal brand in one place, by production step." and an "Import package" button.
- Three filters:
  - Brand: "All brands" or one brand.
  - Content mode: "Any content mode", "Growth", "Baseline" or "Parked".
  - Channel: "Any channel", or one of instagram, facebook, pinterest, tiktok, youtube, blog, email, x, linkedin or other.
- A "Four-week mix" card, only when one brand is chosen. It shows how many pieces were created for that brand in the last 28 days, a colored bar split by purpose, each purpose's share next to its target (such as "40% · target 30%"), a "No purpose set" count, and red warnings when the mix is off.
- Stage tabs, each with a count: "Research" (pieces at Idea), "Writing" (Script), "Images" (Design and Thumbnail), "Video" (Record and Edit) and "Scheduling" (Scheduled). After the tabs, "Done:" counts the published pieces.
- Cards for the pieces in the open tab. Each card shows:
  - Badges: the brand's name, the purpose, "Idea" with the idea score, "Quality" with the quality score, "Approved" once approved, and the format.
  - The title, and the family it belongs to or "No family yet".
  - Its placements, each with a status badge, or "No placements yet."
  - Any hard fails, in red.
  - An "Approve" button, until the piece is approved.
  - A "Move to next step" button naming the next stage, or "Approve first to schedule" when the piece must be approved before it can move on.
- A tab with nothing in it says, for example, "Nothing is at the writing step. Add a content item on the Content page, or import a finished package with the button above."

## How to use it

### To review one stage across all brands
1. Leave the filters on "All brands", "Any content mode" and "Any channel".
2. Tap a stage tab, such as "Writing".
3. Read down the cards. Narrow them with a filter if there are too many.

### To approve a piece
1. Find its card and check "Quality" and any hard fails.
2. Tap "Approve". HQ shows "Approved".
3. If "Approve" is grey, the piece is not ready. On a computer, point at the button to see why: "Needs a Quality Score before it can be approved.", "Has hard fails that must be fixed first." or "Needs a Quality Score of 80 or more."

### To approve several pieces at once
1. The board has no batch button. Open the brand from "Portfolio" under "My brands".
2. Tap the "Content" tab.
3. Tap "Approve batch". HQ approves every ready piece for that brand and reports how many were approved and how many the database refused.

### To move a piece to its next step
1. Tap "Move to next step" on its card. HQ shows "Moved to" and the new stage, and the card moves to that stage's tab.
2. If the button reads "Approve first to schedule", approve the piece first.

### To check a brand's content mix
1. Choose the brand in the brand filter.
2. Read the "Four-week mix" card. A red line such as "More than half of the last four weeks' pieces are" followed by a purpose, or "Offers are more than one in five pieces.", means the mix is lopsided.

### To import a finished package
1. Tap "Import package".
2. Choose the brand under "Brand".
3. Choose the package's asset-manifest.json file.
4. Read the "Created" and "Skipped" lists, then tap "Done".

## Words on this screen

- Content piece: one thing to publish, such as a video, post or article.
- Stage: the production step a piece is at, from Idea to Published.
- Quality score: how the finished piece scored against the quality standard. HQ allows approval at 80 or more.
- Idea score: how the idea scored in research, before it was made.
- Hard fail: a rule the piece breaks that blocks approval whatever the score.
- "Approve": mark the piece as cleared to schedule. It does not publish it.
- Content mode: the brand kit's production setting. Growth gets full weekly production, Baseline runs evergreen work on the clock, Parked gets none.
- Purpose: what a piece is for: teach, entertain, story, community, proof or offer.
- Mix target: the share of pieces the brand should have for each purpose, from its brand kit.
- Family: a group of pieces made from the same source.
- Placement: the piece on one channel and account, with its own status.
- "Done:": the number of published pieces in the current filters.
- Package: a finished set of pieces described by an asset-manifest.json file.

## Good to know

- A piece can only be approved with a quality score of 80 or more and no hard fails, and it must be approved before it can move into Scheduled or Published.
- Each format follows its own route. Videos go through Record, Edit and Thumbnail; graphics go through Design; text skips both.
- Published pieces leave the tabs and are only counted in "Done:".
- Moving a piece to "Published" only changes its record. Nothing in HQ posts to any platform by itself.
- There is no box on this page for typing a score. Claude fills them in: the monthly Radar run sets idea scores on the briefs it files, and Claude sets the quality score when it checks a finished piece against the content standard.
- The four-week mix counts every piece created for that brand in the last 28 days, whatever the other two filters say.
- The mix targets come from the brand kit. The Brand Kit page lists them under "Mix targets" but has no box to change them. Not confirmed: where they are set.
- The board includes every brand that is switched on, parked ones too. If it says "No internal brand projects are switched on yet.", note that the on and off switch is the "Status" switch ("Active" or "Inactive") in the project's edit window in the Admin Panel, not the "Active" and "Parked" buttons on the brand page.
- A repeat import of the same package adds nothing twice. New pieces start at the stage named in the file, or Idea, and each gets a draft placement.
- The import reads only the manifest file. It records the files the manifest lists but does not upload them. Not confirmed: where those files must already be stored.
