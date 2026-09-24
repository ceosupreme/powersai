import { useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { StudioHeader } from "@/components/marketing/studio/StudioHeader";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { Container } from "@/components/marketing/studio/primitives";
import { CaseDetail } from "@/components/marketing/studio/CaseDetail";
import { useStudioProject } from "@/hooks/useStudioProjects";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";
import { trackStudioEvent } from "@/lib/studioAnalytics";
import { CONTACT_EMAIL } from "@/lib/siteContact";

export default function WorkCaseStudy() {
  const { slug } = useParams<{ slug: string }>();
  const { project, isLoading, isError } = useStudioProject(slug);
  const location = useLocation();

  // "All work" returns to the filtered list the visitor came from, when known.
  const backTo =
    (location.state as { from?: string } | null)?.from?.startsWith("/work") === true
      ? (location.state as { from: string }).from
      : "/work";

  useStudioHead({
    title: project ? `${project.title} — Supreme Team Media` : "Project — Supreme Team Media",
    description: project?.summary || "A selected Supreme Team Media project.",
    path: `/work/${slug ?? ""}`,
  });

  useEffect(() => {
    if (project) trackStudioEvent("project_opened", { id: project.slug });
  }, [project]);

  return (
    <div className="stm-studio relative min-h-screen">
      <StudioHeader />
      <main className="pt-[88px]">
        <Container className="pt-6">
          <Link
            to={backTo}
            className="inline-flex min-h-[44px] items-center gap-2 text-[0.9rem] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={14} /> All work
          </Link>

        </Container>
          {isError ? (
            <Container><p className="py-16 text-[0.95rem] text-muted-foreground" role="status">
              This project couldn&apos;t be loaded right now. Please refresh, or email {CONTACT_EMAIL}.
            </p></Container>
          ) : isLoading ? (
            <Container><p className="py-16 text-[0.95rem] text-muted-foreground" role="status">
              Loading…
            </p></Container>
          ) : !project ? (
            <Container><div className="py-20">
               <h1 className="studio-display text-[2rem]">This project isn&apos;t available.</h1>
              <p className="mt-4 text-[0.98rem] text-muted-foreground">
                 The project you&apos;re looking for isn&apos;t on the site right now.{" "}
                <Link to="/work" className="underline underline-offset-4">
                  See the selected work
                </Link>{" "}
                instead.
              </p>
            </div></Container>
          ) : (
            <CaseDetail project={project} />
          )}
      </main>
      <StudioFooter />
    </div>
  );
}
