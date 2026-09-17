import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { getStudioMedia } from "@/config/studioMedia";
import { STUDIO_CATEGORY_LABEL, type StudioProject } from "@/content/studioProjects";
import { requestServiceIntent, type ServiceId } from "./serviceIntent";

/**
 * Full case presentation: classification, brief, role, work delivered, what it
 * demonstrates, status note and media.
 *
 * - Case body text is rendered as plain text, never as HTML.
 * - An external button appears ONLY when an approved destination is configured
 *   on the project. Without one the case stays complete on its own — no "#"
 *   links, no guessed domains, no "coming soon" panels.
 */
export function CaseDetail({ project }: { project: StudioProject }) {
  const media = getStudioMedia(project.mediaKey);
  const src = project.imageUrl || media?.src || null;
  const tags = project.categories.map((c) => STUDIO_CATEGORY_LABEL[c] ?? c);

  return (
    <article className="mx-auto max-w-3xl pb-24">
      <span className="studio-label mt-8 block">{project.classification}</span>
      <h1 className="studio-display mt-4 text-balance" style={{ fontSize: "clamp(2rem, 4.4vw, 3.2rem)" }}>
        {project.title}
      </h1>
      {project.summary && (
        <p className="mt-6 text-[1.0625rem] leading-relaxed text-muted-foreground md:text-lg">{project.summary}</p>
      )}
      <p className="studio-label mt-6">{tags.join(" · ")}</p>

      {src ? (
        <figure className="mt-10">
          <img
            src={src}
            alt={media?.alt || project.title}
            width={media?.width}
            height={media?.height}
            loading="lazy"
            className="w-full rounded-xl border border-border"
            style={{
              aspectRatio: media?.aspectRatio ?? "16 / 10",
              objectFit: media?.objectFit ?? "cover",
              objectPosition: media?.objectPosition ?? "center",
            }}
          />
          {media?.disclosure && (
            <figcaption className="mt-2 text-[0.82rem] text-muted-foreground">{media.disclosure}</figcaption>
          )}
        </figure>
      ) : (
        <div className={`studio-plate-face mt-10 rounded-xl plate-tone-${project.plateTone}`}>
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] opacity-70">
            {project.classification}
          </span>
          <span className="studio-display mt-6 block" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>
            {project.title.split("—")[0].trim()}
          </span>
          <span className="mt-4 text-[0.78rem] font-medium uppercase tracking-[0.1em] opacity-75">
            {tags.join(" · ")}
          </span>
        </div>
      )}

      <dl className="mt-12 space-y-8">
        {project.role && <Row term="Role" desc={project.role} />}
        {project.brief && <Row term="Brief" desc={project.brief} />}
        {project.work && <Row term="Work delivered" desc={project.work} />}
        {project.demonstrates && <Row term="What this demonstrates" desc={project.demonstrates} />}
        {project.statusNote && <Row term="Status" desc={project.statusNote} />}
      </dl>

      {project.bodyText && (
        <div className="mt-12 whitespace-pre-wrap text-[1rem] leading-relaxed text-muted-foreground">
          {project.bodyText}
        </div>
      )}

      {project.externalUrl && (
        <a href={project.externalUrl} target="_blank" rel="noreferrer" className="studio-btn studio-btn-outline mt-10">
          Visit site <ExternalLink size={14} />
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
