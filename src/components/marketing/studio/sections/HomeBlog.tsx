import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { openAtTop } from "@/components/marketing/blog/BlogCard";
import { BlogGrid } from "@/components/marketing/blog/BlogGrid";
import { useBlogPosts } from "@/hooks/useBlogPosts";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import "@/components/marketing/blog/blog.css";

/**
 * Homepage blog section, after "Where are you starting from?": the newest
 * published posts, three across and up to three rows at a time, with the
 * topic filter above and "Read more" under them, plus a link to the blog.
 * Hidden until there is at least one published post, so the homepage never
 * shows an empty blog.
 */
export function HomeBlog() {
  const { data: posts = [] } = useBlogPosts();
  if (posts.length === 0) return null;
  return (
    <section id="blog" className="stm-home-blog" aria-labelledby="home-blog-title">
      <div className="stm-home-blog-head">
        <div>
          <div className="stm-blog-eyebrow">From the blog</div>
          <h2 id="home-blog-title" className="stm-blog-title">Ideas and answers, <em>in plain English.</em></h2>
          <p className="stm-blog-lede">Websites, marketing, business systems, publishing and launches, for owners, founders and authors.</p>
        </div>
        <Link to="/blog" className="stm-home-blog-all" onClick={() => { trackSiteEvent({ event_type: "cta_click", label: "home_blog_all" }); openAtTop(); }}>
          See all posts <ArrowRight aria-hidden />
        </Link>
      </div>
      <BlogGrid posts={posts} source="home_blog" pageSize={9} />
    </section>
  );
}
