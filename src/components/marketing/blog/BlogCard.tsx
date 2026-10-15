import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, MonitorSmartphone, PhoneMissed, Star, type LucideIcon } from "lucide-react";
import type { BlogPost } from "@/hooks/useBlogPosts";
import { readingMinutes } from "@/lib/blogMarkdown";
import { trackSiteEvent } from "@/lib/studioAnalytics";

/** The site doesn't reset scroll between pages; open the next one at its top. */
export const openAtTop = () => requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior }));

// A post without a cover image gets a drawn cover: the category's icon on the
// navy board, in the category's color.
const KINDS: Array<{ match: RegExp; icon: LucideIcon; tone: "cyan" | "gold" | "wine" }> = [
  { match: /web|site|design/i, icon: MonitorSmartphone, tone: "cyan" },
  { match: /google|review|listing|map/i, icon: Star, tone: "gold" },
  { match: /call|lead|customer|follow/i, icon: PhoneMissed, tone: "wine" },
];

export function postKind(category: string | null) {
  return KINDS.find((k) => k.match.test(category ?? "")) ?? { match: /./, icon: BookOpen, tone: "cyan" as const };
}

export function BlogCard({ post, source }: { post: BlogPost; source: string }) {
  const { icon: Icon, tone } = postKind(post.category);
  // A cover that fails to load (missing file, offline) falls back to the drawn cover.
  const [failed, setFailed] = useState(false);
  const cover = post.cover_image && !failed ? post.cover_image : null;
  return (
    <article className="stm-blog-card" data-tone={tone}>
      <div className="stm-blog-cover" aria-hidden={!cover}>
        {cover
          ? <img src={cover} alt={post.cover_alt ?? ""} width={1200} height={750} loading="lazy" decoding="async" onError={() => setFailed(true)} />
          : <span className="stm-blog-cover-chip"><Icon /></span>}
      </div>
      <div className="stm-blog-card-body">
        {post.category && <span className="stm-blog-card-cat">{post.category}</span>}
        <h3>
          <Link
            to={`/blog/${post.slug}`}
            className="stm-blog-card-link"
            onClick={() => { trackSiteEvent({ event_type: "cta_click", label: `${source}_post_${post.slug.replace(/-/g, "_")}` }); openAtTop(); }}
          >
            {post.title}
          </Link>
        </h3>
        <p>{post.excerpt}</p>
        <div className="stm-blog-card-foot">
          <span>{readingMinutes(post.body)} min read</span>
          <span className="stm-blog-card-go" aria-hidden="true">Read the post <ArrowRight /></span>
        </div>
      </div>
    </article>
  );
}
