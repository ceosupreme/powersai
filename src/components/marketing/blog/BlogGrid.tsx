import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { BlogPost } from "@/hooks/useBlogPosts";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import { BlogCard } from "./BlogCard";

/**
 * The post grid with a category filter above it and a "Read more" button
 * under it: three cards across, `pageSize` at a time (three rows of three on
 * the homepage), the button adding the next batch of the chosen category.
 * The filter lists "All" and every category the posts use, in first-seen
 * order, so a new category shows up on its own once a post carries it.
 */
export function BlogGrid({ posts, source, pageSize = 9 }: { posts: BlogPost[]; source: string; pageSize?: number }) {
  const [category, setCategory] = useState<string | null>(null);
  const [shown, setShown] = useState(pageSize);
  const categories = useMemo(() => Array.from(new Set(posts.map((post) => post.category).filter((c): c is string => !!c))), [posts]);
  const matching = category ? posts.filter((post) => post.category === category) : posts;
  const visible = matching.slice(0, shown);
  const pick = (next: string | null) => {
    setCategory(next);
    setShown(pageSize);
    trackSiteEvent({ event_type: "cta_click", label: `${source}_filter_${(next ?? "all").toLowerCase().replace(/[^a-z0-9]+/g, "_")}` });
  };
  return (
    <div className="stm-blog-grid-wrap">
      {categories.length > 1 && (
        <div className="stm-blog-filter" role="group" aria-label="Filter posts by topic">
          <button type="button" className="stm-blog-chip" aria-pressed={category === null} onClick={() => pick(null)}>All</button>
          {categories.map((c) => <button key={c} type="button" className="stm-blog-chip" aria-pressed={category === c} onClick={() => pick(c)}>{c}</button>)}
        </div>
      )}
      <div className="stm-blog-grid" aria-live="polite">
        {visible.map((post) => <BlogCard key={post.slug} post={post} source={source} />)}
      </div>
      {matching.length > shown && (
        <div className="stm-blog-more">
          <button type="button" className="stm-blog-more-btn" onClick={() => { setShown((n) => n + pageSize); trackSiteEvent({ event_type: "cta_click", label: `${source}_read_more` }); }}>
            Read more <ArrowRight aria-hidden />
          </button>
          <span>{visible.length} of {matching.length} posts</span>
        </div>
      )}
    </div>
  );
}
