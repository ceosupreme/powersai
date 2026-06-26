import { useParams } from "react-router-dom";
import type { ProjectType } from "@/lib/effectivePillars";
import { useVenueBySlug } from "@/hooks/useVenueBySlug";
import { QualifierShell, QualifierNotFound, QualifierLoading } from "@/components/qualifier/QualifierShell";

/**
 * Per-client qualifier — /q/:venueSlug. Resolves the venue by slug, reads
 * THAT client's project_type, and renders the same qualifier UI as the
 * vertical page. Submitted leads carry captured_for_project_id = venue.id
 * so the Build C follow-up sequence fires against the client's enrollment.
 */
export default function QualifyForVenue() {
  const { venueSlug } = useParams();
  const venueQ = useVenueBySlug(venueSlug);

  if (venueQ.isLoading) return <QualifierLoading />;

  if (!venueQ.data || !venueQ.data.project_type) {
    return (
      <QualifierNotFound
        message={<>No intake configured for <code>/q/{venueSlug}</code>.</>}
      />
    );
  }

  const projectType = venueQ.data.project_type as ProjectType;
  const brand = venueQ.data.name || "Intake";
  const tagline = "Tell us what you need — we'll get back to you fast.";

  return (
    <QualifierShell
      projectType={projectType}
      brand={brand}
      tagline={tagline}
      capturedForProjectId={venueQ.data.id}
    />
  );
}