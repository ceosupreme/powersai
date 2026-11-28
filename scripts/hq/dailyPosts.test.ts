import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  countDailyPostsByStatus,
  filterDailyPostsByDate,
  isDailyPost,
  parseDailyPostPackage,
  parseDailyPostPlacement,
  plainWaitingReason,
  qualityLabel,
  rankDailyPosts,
  mergeDrivePosts,
} from "../../src/lib/dailyPosts";

describe("dailyPosts shared rules", () => {
  it('prefers one saved record over Drive for the same brand and date', () => {
    const row = (id: string, brand: string, date: string) => parseDailyPostPackage({ id, project_id: brand, due_date: date }, [], brand);
    assert.deepEqual(mergeDrivePosts([row('saved', 'big-paws', '2026-11-27')], [row('folder', 'big-paws', '2026-11-27'), row('tomorrow', 'big-paws', '2026-11-28')]).map(p => p.id), ['tomorrow', 'saved']);
  });
  it("identifies daily_post items without dropping null purpose_type", () => {
    assert.equal(isDailyPost({ purpose_type: "daily_post" }), true);
    assert.equal(isDailyPost({ purpose_type: "teach" }), false);
    assert.equal(isDailyPost({ purpose_type: null }), false);
    assert.equal(isDailyPost({}), false);
  });

  it("marks a package posted only when every placement is published", () => {
    const p1 = parseDailyPostPlacement({ id: "1", content_item_id: "c1", project_id: "v1", channel: "instagram", status: "published", live_url: "https://ig.com/1", verified_at: "2026-11-27T18:00:00Z" });
    const p2 = parseDailyPostPlacement({ id: "2", content_item_id: "c1", project_id: "v1", channel: "facebook", status: "planned" });
    const partial = parseDailyPostPackage({ id: "c1", project_id: "v1", due_date: "2026-11-27", brief: { daily_post: { post_status: "ready" } } }, [p1, p2], "Jenna");
    assert.equal(partial.post_status, "ready");

    const allDone = parseDailyPostPackage({ id: "c1", project_id: "v1", due_date: "2026-11-27", brief: { daily_post: { post_status: "ready" } } }, [p1], "Jenna");
    assert.equal(allDone.post_status, "posted");
  });

  it("ranks by quality score descending, nulls last", () => {
    const a = parseDailyPostPackage({ id: "1", project_id: "v1", due_date: "2026-11-27", quality_score: 72 }, [], "B");
    const b = parseDailyPostPackage({ id: "2", project_id: "v2", due_date: "2026-11-27", quality_score: 91 }, [], "A");
    const c = parseDailyPostPackage({ id: "3", project_id: "v3", due_date: "2026-11-27", quality_score: null }, [], "C");
    assert.deepEqual(rankDailyPosts([c, a, b]).map((x) => x.id), ["2", "1", "3"]);
    assert.equal(qualityLabel(91), "Strong");
    assert.equal(qualityLabel(72), "Good");
    assert.equal(qualityLabel(null), "Unscored");
  });

  it("filters today, tomorrow and last 7 days in Pacific dates", () => {
    const pkgs = ["2026-11-20", "2026-11-21", "2026-11-27", "2026-11-28"].map((d, i) =>
      parseDailyPostPackage({ id: String(i), project_id: "v1", due_date: d }, [], "B"),
    );
    assert.deepEqual(filterDailyPostsByDate(pkgs, "today", "2026-11-27").map((p) => p.post_date), ["2026-11-27"]);
    assert.deepEqual(filterDailyPostsByDate(pkgs, "tomorrow", "2026-11-27").map((p) => p.post_date), ["2026-11-28"]);
    assert.deepEqual(filterDailyPostsByDate(pkgs, "last7", "2026-11-27").map((p) => p.post_date), ["2026-11-21", "2026-11-27"]);
  });

  it("formats plain waiting reasons and counts statuses", () => {
    assert.match(plainWaitingReason("no_channel", null), /No social account/);
    assert.equal(plainWaitingReason("account_problem", "Token expired"), "Account problem: Token expired");
    const pkgs = [
      parseDailyPostPackage({ id: "1", project_id: "v1", due_date: "2026-11-27", brief: { daily_post: { post_status: "ready" } } }, [], "A"),
      parseDailyPostPackage({ id: "2", project_id: "v2", due_date: "2026-11-27", brief: { daily_post: { post_status: "waiting_on_owner" } } }, [], "B"),
    ];
    assert.deepEqual(countDailyPostsByStatus(pkgs), { ready: 1, almost_ready: 0, waiting_on_owner: 1, scheduled: 0, posted: 0, total: 2 });
  });
});