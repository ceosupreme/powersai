import { Link } from "react-router-dom";
import { Container, Eyebrow, Lede, SectionTitle } from "../primitives";
import { ProjectPlate } from "../ProjectPlate";
import { useStudioProjects } from "@/hooks/useStudioProjects";
import { CONTACT_EMAIL } from "@/lib/siteContact";

const BUYER_PROOF_ORDER = ["barpulse", "big-paws-club", "kario-voss", "supreme-wellness-club"];

export function SelectedWork() {
  const { projects, isLoading, isError, isEmpty } = useStudioProjects();
  const shown = BUYER_PROOF_ORDER.map((slug) => projects.find((p) => p.slug === slug)).filter((p) => Boolean(p));

  return (
    <section id="work" className="studio-section">
      {/* legacy alias: older links pointed at #proof */}
      <span id="proof" aria-hidden className="block h-0" />
      <Container>
        <Eyebrow>Selected work</Eyebrow>
        <SectionTitle>Built to solve something.</SectionTitle>
        <Lede>
          From customer-facing brands to behind-the-scenes systems, every project starts with a business problem and ends with something people can use.
        </Lede>

        {isError ? (
          <p className="mt-10 text-[0.95rem] text-muted-foreground" role="status">
            The project list couldn&apos;t be loaded right now. Please refresh, or email{" "}
            {CONTACT_EMAIL} and Sean will send examples directly.
          </p>
        ) : isLoading ? (
          <p className="mt-10 text-[0.95rem] text-muted-foreground" role="status">Loading projects…</p>
        ) : isEmpty ? (
          <p className="mt-10 text-[0.95rem] text-muted-foreground" role="status">
            No projects are published yet.
          </p>
        ) : (
          <div className="studio-work-mosaic mt-14 grid grid-cols-1 gap-7 lg:grid-cols-12">
            {shown.map((p, index) => (
              <ProjectPlate key={p.slug} project={p} className={`studio-work-item studio-work-item-${index + 1}`} />
            ))}
          </div>
        )}

        <Link to="/work" className="studio-btn studio-btn-outline mt-10">
          See all work
        </Link>
      </Container>
    </section>
  );
}
