import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { StudioHeader } from "@/components/marketing/studio/StudioHeader";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { Container } from "@/components/marketing/studio/primitives";
import { useStudioProject } from "@/hooks/useStudioProjects";
import { getStudioMedia } from "@/config/studioMedia";
import { STUDIO_CATEGORY_LABEL } from "@/content/studioProjects";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";
import { requestServiceIntent, type ServiceId } from "@/components/marketing/studio/serviceIntent";

export default function WorkCaseStudy() {
  const { slug } = useParams<{ slug: string }>();
  const { project, isLoading, isError } = useStudioProject(slug);

  useStudioHead({
    title: project ? `${project.title} — Supreme Team Media` : "Project — Supreme Team Media",
    description: project?.summary || "A selected Supreme Team Media project.",
    path: `/work/${slug ?? ""}`,
  });

  const media = getStudioMedia(project?.mediaKey);
  const src = project?.imageUrl || media?.src || null;

  return (
    <div className="stm-studio relative min-h-screen">
      <StudioHeader />
      <main className="pt-[112px] md:pt-[140px]">
        <Container>
          <Link
            to="/work"
            className="inline-flex min-h-[44px] items-center gap-2 text-[0.9rem] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={14} /> All work
          </Link>

          {isError ? (
            <p className="py-16 text-[0.95rem] text-muted-foreground" role="status">
              This project couldn&apos;t be loaded right now. Please refresh, or email hello@supremeteammedia.com.
            </p>
          ) : isLoading ? (
            <p className="py-16 text-[0.95rem] text-muted-foreground" role="status">Loading…</p>
          ) : !project ? (
            <div className="py-20">
              <h1 className="studio-display text-[2rem]">This project page isn&apos;t available.</h1>
              <p className="mt-4 text-[0.98rem] text-muted-foreground">
                The project you&apos;re looking for isn&apos;t published.{" "}
                <Link to="/work" className="underline underline-offset-4">See the selected work</Link> instead.
              </p>
            </div>
          ) : (
            <article className="mx-auto max-w-3xl pb-24">
              <span className="studio-label mt-8 block">{project.classification}</span>
              <h1 className="studio-display mt-4 text-balance" style={{ fontSize: "clamp(2rem, 4.4vw, 3.2rem)" }}>
                {project.title}
              </h1>
              {project.summary && (
                <p className="mt-6 text-[1.0625rem] leading-relaxed text-muted-foreground md:text-lg">
                  {project.summary}
                </p>
              )}
              <p className="studio-label mt-6">{project.categories.map((c) => STUDIO_CATEGORY_LABEL[c] ?? c).join(" · ")}</p>

              {src ? (
                <figure className="mt-10">
                  <img
                    src={src}
                    alt={media?.alt || project.title}
                    width={media?.width}
                    height={media?.height}
                    loading="lazy"
                    className="w-full rounded-xl border border-border"
                    style={{ aspectRatio: media?.aspectRatio ?? "16 / 10", objectFit: media?.objectFit ?? "cover" }}
                  />
                  {media?.disclosure && (
                    <figcaption className="mt-2 text-[0.82rem] text-muted-foreground">{media.disclosure}</figcaption>
                  )}
                </figure>
              ) : null}

              <dl className="mt-12 space-y-8">
                {project.role && <Row term="Role" desc={project.role} />}
                {project.brief && <Row term="Brief" desc={project.brief} />}
                {project.work && <Row term="Work" desc={project.work} />}
                {project.demonstrates && <Row term="What this demonstrates" desc={project.demonstrates} />}
                {project.statusNote && <Row term="Status" desc={project.statusNote} />}
              </dl>

              {project.bodyText && (
                <div className="mt-12 whitespace-pre-wrap text-[1rem] leading-relaxed text-muted-foreground">
                  {project.bodyText}
                </div>
              )}

              {project.externalUrl && (
                <a
                  href={project.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="studio-btn studio-btn-outline mt-10"
                >
                  View live <ExternalLink size={14} />
                </a>
              )}

              <div className="mt-14 border-t border-border pt-8">
                <p className="studio-display text-[1.25rem]">Want something like this?</p>
                <Link
                  to="/#contact"
                  onClick={() => requestServiceIntent(project.categories[0] as ServiceId)}
                  className="studio-btn studio-btn-primary mt-4"
                >
                  Discuss a project
                </Link>
              </div>
            </article>
          )}
        </Container>
      </main>
      <StudioFooter />
    </div>
  );
}

function Row({ term, desc }: { term: string; desc: string }) {
  return (
    <div className="border-t border-border pt-5">
      <dt className="studio-label">{term}</dt>
      <dd className="mt-2 text-[1rem] leading-relaxed text-muted-foreground">{desc}</dd>
    </div>
  );
}
