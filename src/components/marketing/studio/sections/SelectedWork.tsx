import { Link } from "react-router-dom";
import { Container, Eyebrow, Lede, SectionTitle } from "../primitives";
import { ProjectPlate } from "../ProjectPlate";
import { useStudioProjects } from "@/hooks/useStudioProjects";
import { HOMEPAGE_WORK_ORDER } from "@/content/studioProjects";

export function SelectedWork() {
  const { projects, isLoading, isError, isEmpty } = useStudioProjects();
  const shown = HOMEPAGE_WORK_ORDER.map((slug) => projects.find((p) => p.slug === slug)).filter((p) => Boolean(p));

  return (
    <section id="work" className="studio-section">
      {/* legacy alias: older links pointed at #proof */}
      <span id="proof" aria-hidden className="block h-0" />
      <Container>
        <Eyebrow>Selected work</Eyebrow>
        <SectionTitle>See the range. Look closer at the work.</SectionTitle>
        <Lede>
          Web experiences, brand work, and practical systems—with the role and context behind each project.
        </Lede>

        {isError ? (
          <p className="mt-10 text-[0.95rem] text-muted-foreground" role="status">
            The project list couldn&apos;t be loaded right now. Please refresh, or email
            hello@supremeteammedia.com and Sean will send examples directly.
          </p>
        ) : isLoading ? (
          <p className="mt-10 text-[0.95rem] text-muted-foreground" role="status">Loading projects…</p>
        ) : isEmpty ? (
          <p className="mt-10 text-[0.95rem] text-muted-foreground" role="status">
            No projects are published yet.
          </p>
        ) : (
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {shown.map((p) => (
              <ProjectPlate key={p.slug} project={p} />
            ))}
          </div>
        )}

        <Link to="/work" className="studio-btn studio-btn-outline mt-10">
          View all work
        </Link>
      </Container>
    </section>
  );
}
