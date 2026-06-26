import { useParams } from "react-router-dom";
import type { ProjectType } from "@/lib/effectivePillars";
import { useProjectTypeBySlug } from "@/hooks/useProjectTypes";
import { QualifierShell, QualifierNotFound, QualifierLoading } from "@/components/qualifier/QualifierShell";

/**
 * Generic vertical qualifier — /qualify/:slug. NOT tied to a client; submitted
 * leads have captured_for_project_id = null and don't auto-fire follow-up.
 */
export default function QualifyLanding() {
  const { slug = "home-services" } = useParams();
  const typeQ = useProjectTypeBySlug(slug);

  if (typeQ.isLoading) return <QualifierLoading />;

  if (!typeQ.data) {
    return (
      <QualifierNotFound
        message={<>No intake configured for <code>/qualify/{slug}</code>. Add a project type with this slug in Admin to enable it.</>}
      />
    );
  }

  const projectType = typeQ.data.id as ProjectType;
  const brand = typeQ.data.label ?? "Intake";
  const tagline = typeQ.data.description?.trim()
    || "Tell us what you need — we'll get back to you fast.";

  return (
    <QualifierShell
      projectType={projectType}
      brand={brand}
      tagline={tagline}
      capturedForProjectId={null}
    />
  );
}