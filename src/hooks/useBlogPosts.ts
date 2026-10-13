import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** A published post from blog_posts (the public can only read published ones). */
export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string | null;
  cover_image: string | null;
  cover_alt: string | null;
  author: string;
  meta_title: string | null;
  meta_description: string | null;
  published_at: string | null;
  updated_at: string;
};

const FIELDS = "slug,title,excerpt,body,category,cover_image,cover_alt,author,meta_title,meta_description,published_at,updated_at";

/** Newest first. `limit` for the homepage section and "keep reading". */
export function useBlogPosts(limit?: number) {
  return useQuery({
    queryKey: ["blog-posts", limit ?? "all"],
    staleTime: 300_000,
    queryFn: async (): Promise<BlogPost[]> => {
      let query = supabase.from("blog_posts").select(FIELDS).eq("published", true).order("published_at", { ascending: false });
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as BlogPost[];
    },
  });
}

export function useBlogPost(slug: string | undefined) {
  return useQuery({
    queryKey: ["blog-post", slug],
    enabled: !!slug,
    staleTime: 300_000,
    queryFn: async (): Promise<BlogPost | null> => {
      const { data, error } = await supabase.from("blog_posts").select(FIELDS).eq("slug", slug!).eq("published", true).maybeSingle();
      if (error) throw error;
      return (data as BlogPost | null) ?? null;
    },
  });
}

/** "October 13, 2026", formatted at render time (never baked into a build). */
export function postDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
