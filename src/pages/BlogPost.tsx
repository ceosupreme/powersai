import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { StudioHeader } from "@/components/marketing/studio/StudioHeader";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";
import { BlogCard, openAtTop } from "@/components/marketing/blog/BlogCard";
import { BlogCheckupBand } from "@/components/marketing/blog/BlogCheckupBand";
import { useBlogPost, useBlogPosts, postDate } from "@/hooks/useBlogPosts";
import { BlogBody, readingMinutes } from "@/lib/blogMarkdown";
import { ROUTE_META } from "@/config/routeMeta";
import "@/components/marketing/blog/blog.css";

const SITE = "https://supremeteammedia.com";

/** /blog/:slug: one post, the free checkup, then two more posts. */
export default function BlogPost() {
  const { slug } = useParams();
  const { data: post, isLoading, isError } = useBlogPost(slug);
  const { data: latest = [] } = useBlogPosts(4);
  const more = latest.filter((p) => p.slug !== slug).slice(0, 2);

  useStudioHead({
    title: post ? post.meta_title || `${post.title} | Supreme Team Media` : ROUTE_META["/blog"].title,
    description: post ? post.meta_description || post.excerpt : ROUTE_META["/blog"].description,
    path: `/blog/${slug ?? ""}`,
  });
  // Every post opens at the top, wherever the visitor came from.
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior }); }, [slug]);

  if (isLoading) {
    return (
      <div className="stm-studio stm-post-page min-h-screen"><StudioHeader />
        <main><p className="stm-post-state" role="status">Loading the post…</p></main>
      <StudioFooter /></div>
    );
  }
  if (isError || !post) {
    return (
      <div className="stm-studio stm-post-page min-h-screen"><StudioHeader />
        <main><div className="stm-post-state" role="status">
          <h1>{isError ? "This post couldn't be loaded." : "This post isn't available."}</h1>
          <p>{isError ? "Please refresh the page, or " : "It may have moved. "}<Link to="/blog" onClick={openAtTop}>see all posts on the blog</Link>.</p>
        </div></main>
      <StudioFooter /></div>
    );
  }

  // Article details for search engines, written as JSON (with "<" escaped so
  // nothing in a post can close the script tag).
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.meta_description || post.excerpt,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: { "@type": "Person", name: post.author },
    publisher: { "@type": "Organization", name: "Supreme Team Media", url: SITE },
    mainEntityOfPage: `${SITE}/blog/${post.slug}`,
    ...(post.cover_image ? { image: post.cover_image.startsWith("/") ? `${SITE}${post.cover_image}` : post.cover_image } : {}),
  }).replace(/</g, "\\u003c");

  return (
    <div className="stm-studio stm-post-page min-h-screen">
      <StudioHeader />
      <main>
        <article className="stm-post">
          <Link to="/blog" className="stm-post-back" onClick={openAtTop}><ArrowLeft aria-hidden />All posts</Link>
          {post.category && <span className="stm-post-cat">{post.category}</span>}
          <h1>{post.title}</h1>
          <p className="stm-post-meta">
            <span>By <strong>{post.author}</strong></span>
            {post.published_at && <span>{postDate(post.published_at)}</span>}
            <span>{readingMinutes(post.body)} min read</span>
          </p>
          {post.cover_image && (
            <div className="stm-post-hero-img"><img src={post.cover_image} alt={post.cover_alt ?? ""} /></div>
          )}
          <div className="stm-post-body"><BlogBody markdown={post.body} /></div>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
        </article>
        <BlogCheckupBand source={`blog-${post.slug}`} />
        {more.length > 0 && (
          <section className="stm-post-more" aria-labelledby="post-more-title">
            <h2 id="post-more-title">Keep reading</h2>
            <div className="stm-post-more-grid">
              {more.map((p) => <BlogCard key={p.slug} post={p} source="blog_more" />)}
            </div>
          </section>
        )}
        <div style={{ height: "clamp(80px, 8vw, 112px)" }} aria-hidden="true" />
      </main>
      <StudioFooter />
    </div>
  );
}
