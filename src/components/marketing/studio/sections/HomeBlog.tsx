import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { BlogCard, openAtTop } from "@/components/marketing/blog/BlogCard";
import { useBlogPosts } from "@/hooks/useBlogPosts";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import "@/components/marketing/blog/blog.css";

/**
 * Homepage blog section, after "Where are you starting from?": the three
 * newest published posts as big readable cards, and a link to the blog.
 * Hidden until there is at least one published post, so the homepage never
 * shows an empty blog.
 */
export function HomeBlog() {
  const { data: posts = [] } = useBlogPosts(3);
  if (posts.length === 0) return null;
  return (
    <section id="blog" className="stm-home-blog" aria-labelledby="home-blog-title">
      <div className="stm-home-blog-head">
        <div>
          <div className="stm-blog-eyebrow">From the blog</div>
          <h2 id="home-blog-title" className="stm-blog-title">Straight answers for <em>business owners.</em></h2>
          <p className="stm-blog-lede">Websites, Google listings, reviews and getting more calls, explained in plain English.</p>
        </div>
        <Link to="/blog" className="stm-home-blog-all" onClick={() => { trackSiteEvent({ event_type: "cta_click", label: "home_blog_all" }); openAtTop(); }}>
          See all posts <ArrowRight aria-hidden />
        </Link>
      </div>
      <div className="stm-home-blog-grid">
        {posts.map((post) => <BlogCard key={post.slug} post={post} source="home_blog" />)}
      </div>
    </section>
  );
}
