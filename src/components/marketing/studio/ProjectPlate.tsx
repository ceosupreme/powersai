import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { getStudioMedia } from "@/config/studioMedia";
import { STUDIO_CATEGORY_LABEL, type StudioProject } from "@/content/studioProjects";
import { cn } from "@/lib/utils";

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

  return (
    <article className={cn("studio-plate studio-card-link flex flex-col", className)}>
      <Link to={`/work/${project.slug}`} className="block" aria-label={`Explore project: ${project.title}`}>
        {src ? (
          <img
            src={src}
            alt={media?.alt || project.title}
            width={media?.width}
            height={media?.height}
            loading="lazy"
            className="w-full"
            style={{ aspectRatio: media?.aspectRatio ?? "16 / 10", objectFit: media?.objectFit ?? "cover" }}
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
      </Link>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="studio-display text-[1.2rem] leading-snug">{project.title}</h3>
        {project.summary && (
          <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">{project.summary}</p>
        )}
        {project.role && (
          <p className="mt-3 text-[0.85rem] text-muted-foreground">
            <span className="studio-label">Role</span> {project.role}
          </p>
        )}
        <Link
          to={`/work/${project.slug}`}
          className="mt-5 inline-flex items-center gap-1.5 self-start text-[0.9rem] font-medium text-[hsl(var(--cobalt))] hover:underline"
        >
          Explore project <ArrowUpRight size={15} />
        </Link>
      </div>
    </article>
  );
}
