import { mapCmsRow, mergeProjects, type StudioProject } from "@/content/studioProjects";
import { usePublishedPortfolioItems } from "@/hooks/usePortfolioItems";

/**
 * Single public project adapter for the studio site (homepage, /work,
 * /work/:slug and /hire).
 *
 * Data comes from the retained `usePublishedPortfolioItems` query, which reads
 * ONLY status='published' rows — draft/private work is never requested. The
 * approved editorial starter cases are merged in only where a published row for
 * that canonical slug is absent.
 *
 * A query error is surfaced separately from a successful empty result so the UI
 * can say "couldn't load" instead of silently implying there is no work.
 */
export function useStudioProjects() {
  const query = usePublishedPortfolioItems();

  const cms: StudioProject[] = (query.data ?? []).map((row) => mapCmsRow(row));

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
