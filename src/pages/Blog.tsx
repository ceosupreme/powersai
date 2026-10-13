import { useEffect } from "react";
import { StudioHeader } from "@/components/marketing/studio/StudioHeader";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";
import { BlogCard } from "@/components/marketing/blog/BlogCard";
import { BlogCheckupBand } from "@/components/marketing/blog/BlogCheckupBand";
import { useBlogPosts } from "@/hooks/useBlogPosts";
import { ROUTE_META } from "@/config/routeMeta";
import "@/components/marketing/blog/blog.css";

/** /blog: every published post, newest first, then the free checkup. */
export default function Blog() {
  useStudioHead({ ...ROUTE_META["/blog"], path: "/blog" });
  const { data: posts = [], isLoading, isError } = useBlogPosts();
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior }); }, []);

  return (
    <div className="stm-studio stm-blog-page min-h-screen">
      <StudioHeader />
      <main>
        <header className="stm-blog-hero">
          <div className="stm-blog-eyebrow">Blog</div>
          <h1 className="stm-blog-title">Straight answers for <em>business owners.</em></h1>
          <p className="stm-blog-lede">Websites, Google listings, reviews and getting more calls, explained in plain English.</p>
        </header>
        {isError ? (
          <p className="stm-blog-empty" role="status">The posts couldn&apos;t be loaded. Please refresh the page.</p>
        ) : isLoading ? (
          <p className="stm-blog-empty" role="status">Loading posts…</p>
        ) : posts.length === 0 ? (
          <p className="stm-blog-empty" role="status">The first posts are on their way.</p>
        ) : (
          <div className="stm-blog-list">
            {posts.map((post) => <BlogCard key={post.slug} post={post} source="blog_index" />)}
          </div>
        )}
        <BlogCheckupBand source="blog-index" />
      </main>
      <StudioFooter />
    </div>
  );
}
