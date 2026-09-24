import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { StudioHeader } from "@/components/marketing/studio/StudioHeader";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { Container, Eyebrow, Lede } from "@/components/marketing/studio/primitives";
import { ProjectPlate } from "@/components/marketing/studio/ProjectPlate";
import { WorkFilters, type CategoryFilter } from "@/components/marketing/studio/WorkFilters";
import { useStudioProjects } from "@/hooks/useStudioProjects";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";
import { STUDIO_CATEGORIES, STUDIO_CATEGORY_LABEL, type StudioCategoryId } from "@/content/studioProjects";
import { trackStudioEvent } from "@/lib/studioAnalytics";
import { CONTACT_EMAIL } from "@/lib/siteContact";

const VALID = new Set<string>(STUDIO_CATEGORIES.map((c) => c.id));

export default function Work() {
  const { projects, isLoading, isError, isEmpty } = useStudioProjects();
  const [params, setParams] = useSearchParams();

  // Filter state lives in the URL, so it is shareable and browser
  // back/forward restores the previous selection natively.
  const raw = params.get("category") ?? "all";
  const active: CategoryFilter = VALID.has(raw) ? (raw as StudioCategoryId) : "all";

  const { available, counts, visible } = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach((p) => p.categories.forEach((c) => (counts[c] = (counts[c] ?? 0) + 1)));
    const available = STUDIO_CATEGORIES.map((c) => c.id).filter((id) => (counts[id] ?? 0) > 0);
    const visible = active === "all" ? projects : projects.filter((p) => p.categories.includes(active));
    return { available, counts, visible };
  }, [projects, active]);

  const activeLabel = active === "all" ? "All work" : STUDIO_CATEGORY_LABEL[active];

  useStudioHead({
    title: active === "all" ? "Work — Supreme Team Media" : `${activeLabel} work — Supreme Team Media`,
    description:
      "Selected live websites, creative projects, and business systems, each identifying the type of work and Sean Powers' contribution.",
    path: active === "all" ? "/work" : `/work?category=${active}`,
    canonicalPath: "/work",
  });

  const onChange = (next: CategoryFilter) => {
    const nextParams = new URLSearchParams(params);
    if (next === "all") nextParams.delete("category");
    else nextParams.set("category", next);
    setParams(nextParams); // pushes history, so Back returns to the previous filter
    if (next !== "all") trackStudioEvent("service_selected", { category: next });
  };

  return (
    <div className="stm-studio relative min-h-screen">
      <StudioHeader />
      <main className="pt-[112px] md:pt-[140px]">
        <Container>
          <Eyebrow>Selected work</Eyebrow>
          <h1 className="studio-display mt-5 max-w-5xl text-balance" style={{ fontSize: "clamp(2.8rem, 6vw, 5rem)" }}>
             Selected work, with the thinking behind it.
          </h1>
          <Lede>
             Explore live websites, creative projects, and business systems. Each case explains the business need,
             Sean&apos;s role, and what was built.
          </Lede>

          {isError ? (
            <p className="py-16 text-[0.95rem] text-muted-foreground" role="status">
               Something went wrong loading the projects. Please refresh, or email {CONTACT_EMAIL}.
            </p>
          ) : isLoading ? (
            <p className="py-16 text-[0.95rem] text-muted-foreground" role="status">
              Loading projects…
            </p>
          ) : isEmpty ? (
            <p className="py-16 text-[0.95rem] text-muted-foreground" role="status">
              No projects are published yet.
            </p>
          ) : (
            <>
              <WorkFilters
                active={active}
                available={available}
                counts={counts}
                total={projects.length}
                onChange={onChange}
              />

              <p className="mt-5 text-[0.9rem] text-muted-foreground" role="status" aria-live="polite">
                 {visible.length} {visible.length === 1 ? "project" : "projects"} in {activeLabel}.
              </p>

              <div className="mt-10 grid grid-cols-1 gap-8 pb-24 lg:grid-cols-2">
                {visible.map((p) => (
                  <ProjectPlate key={p.slug} project={p} className={p.slug === "barpulse" ? "lg:col-span-2" : undefined} />
                ))}
              </div>
            </>
          )}
        </Container>
      </main>
      <StudioFooter />
    </div>
  );
}
