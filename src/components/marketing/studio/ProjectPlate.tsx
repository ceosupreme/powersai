import { Link, useLocation } from "react-router-dom";
import { ArrowRight, ExternalLink } from "lucide-react";
import { getStudioMedia } from "@/config/studioMedia";
import { STUDIO_CATEGORY_LABEL, type StudioProject } from "@/content/studioProjects";
import { cn } from "@/lib/utils";
import { BrowserFrame } from "./BrowserFrame";

const TONE_CLASS: Record<string, string> = {
  lilac: "plate-tone-lilac",
  sand: "plate-tone-sand",
  green: "plate-tone-green",
  paper: "plate-tone-paper",
};

/**
 * Editorial project plate. When no media is configured, the plate itself is the
 * finished artwork: project name, scope words and classification set in type.
 */
export function ProjectPlate({ project, className }: { project: StudioProject; className?: string }) {
  const media = getStudioMedia(project.mediaKey);
  const src = project.imageUrl || media?.src || null;
  const tags = project.categories.map((c) => STUDIO_CATEGORY_LABEL[c] ?? c);
  const isLive = project.statusNote?.startsWith("Live website") || project.statusNote?.startsWith("Live product site");
  const location = useLocation();
  // Remember the list (and its filter) so the case page can return to it.
  const from = `${location.pathname}${location.search}`;

  return (
    <article className={cn("studio-plate studio-card-link group flex flex-col", className)}>
      <div className="relative bg-[hsl(var(--paper))] p-3 pb-0">
        {isLive && (
          <span className="absolute right-5 top-5 z-10 inline-flex items-center gap-1.5 rounded-full border border-border bg-[hsl(var(--surface)/0.94)] px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-foreground shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden /> Live
          </span>
        )}
        <Link
          to={`/work/${project.slug}`}
          state={{ from }}
          className="block rounded-md"
          aria-label={`View case: ${project.title}`}
        >
          <BrowserFrame>
        {src ? (
          <img
            src={src}
            alt={media?.alt || project.title}
            width={media?.width}
            height={media?.height}
            loading="lazy"
            className="studio-project-image size-full"
            style={{
              aspectRatio: media?.aspectRatio ?? "16 / 10",
              objectFit: media?.objectFit ?? "cover",
              objectPosition: media?.objectPosition ?? "center",
            }}
          />
        ) : (
          <div className={cn("studio-plate-face", TONE_CLASS[project.plateTone])}>
            <span className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] opacity-70">
              {project.classification}
            </span>
            <span className="studio-display mt-6 block" style={{ fontSize: "clamp(1.4rem, 2.2vw, 2rem)" }}>
              {project.title.split("—")[0].trim()}
            </span>
            <span className="mt-4 text-[0.78rem] font-medium uppercase tracking-[0.1em] opacity-75">
              {tags.join(" · ")}
            </span>
          </div>
        )}
          </BrowserFrame>
        </Link>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="mb-4 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag} className="rounded-full border border-border px-2.5 py-1 text-[0.66rem] font-medium text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
        <h3 className="studio-display text-[1.2rem] leading-snug">{project.title}</h3>
        {project.summary && (
          <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">{project.summary}</p>
        )}
        {project.role && (
          <p className="mt-3 text-[0.85rem] text-muted-foreground">
            <span className="studio-label">Role</span> {project.role}
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-5">
          <Link
            to={`/work/${project.slug}`}
            state={{ from }}
            className="inline-flex min-h-11 items-center gap-1.5 text-[0.9rem] font-medium text-primary hover:underline"
          >
            View case <ArrowRight size={15} />
          </Link>
          {project.externalUrl && (
            <a
              href={project.externalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 text-[0.88rem] font-medium text-muted-foreground hover:text-foreground hover:underline"
            >
              Visit site <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
