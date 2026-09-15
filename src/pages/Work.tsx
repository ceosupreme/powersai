import { StudioHeader } from "@/components/marketing/studio/StudioHeader";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { Container, Eyebrow, Lede } from "@/components/marketing/studio/primitives";
import { ProjectPlate } from "@/components/marketing/studio/ProjectPlate";
import { useStudioProjects } from "@/hooks/useStudioProjects";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";

export default function Work() {
  const { projects, isLoading, isError, isEmpty } = useStudioProjects();

  useStudioHead({
    title: "Work — Supreme Team Media",
    description:
      "Selected websites, creative projects, and business systems, each identifying Sean Mayo's role and whether it is client work, an owned brand, or a demonstration.",
    path: "/work",
  });

  return (
    <div className="stm-studio relative min-h-screen">
      <StudioHeader />
      <main className="pt-[112px] md:pt-[140px]">
        <Container>
          <Eyebrow>Selected work</Eyebrow>
          <h1 className="studio-display mt-4 text-balance" style={{ fontSize: "clamp(2.2rem, 4.6vw, 3.6rem)" }}>
            Work you can look at. Experience you can ask about.
          </h1>
          <Lede>
            Explore selected websites, creative projects, and business systems. Each project identifies Sean&apos;s role
            and whether it is client work, an owned brand, or a demonstration.
          </Lede>

          {isError ? (
            <p className="py-16 text-[0.95rem] text-muted-foreground" role="status">
              The project list couldn&apos;t be loaded right now. Please refresh, or email
              hello@supremeteammedia.com.
            </p>
          ) : isLoading ? (
            <p className="py-16 text-[0.95rem] text-muted-foreground" role="status">Loading projects…</p>
          ) : isEmpty ? (
            <p className="py-16 text-[0.95rem] text-muted-foreground" role="status">No projects are published yet.</p>
          ) : (
            <div className="mt-12 grid grid-cols-1 gap-6 pb-24 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <ProjectPlate key={p.slug} project={p} />
              ))}
            </div>
          )}
        </Container>
      </main>
      <StudioFooter />
    </div>
  );
}
