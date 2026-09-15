import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mapCmsRow, mergeProjects, type StudioProject } from "@/content/studioProjects";

/**
 * Public project list for the studio site.
 *
 * Reads ONLY status='published' rows — draft/private work is never requested.
 * A query error is surfaced separately from a successful empty result so the
 * UI can say "couldn't load" instead of silently implying there is no work.
 */
export function useStudioProjects() {
  const query = useQuery({
    queryKey: ["studio-projects", "published"],
    queryFn: async (): Promise<StudioProject[]> => {
      const { data, error } = await (supabase as any)
        .from("portfolio_items")
        .select(
          "slug,title,description,client_or_vertical,category,image_url,thumbnail_url,external_url,case_study_body,sort_order,featured,created_at",
        )
        .eq("status", "published")
        .order("featured", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapCmsRow);
    },
  });

  const cms = query.data ?? [];
  // On a load error we do NOT merge: showing only fallbacks would hide the
  // failure. The caller renders an explicit error state instead.
  const projects = query.isError ? [] : mergeProjects(cms);

  return {
    projects,
    /** True only for a real query failure, not for an empty published set. */
    isError: query.isError,
    isLoading: query.isLoading,
    /** True when the query succeeded and produced nothing at all. */
    isEmpty: !query.isLoading && !query.isError && projects.length === 0,
  };
}

export function useStudioProject(slug: string | undefined) {
  const { projects, isError, isLoading } = useStudioProjects();
  const project = slug ? projects.find((p) => p.slug === slug) ?? null : null;
  return { project, isError, isLoading };
}
