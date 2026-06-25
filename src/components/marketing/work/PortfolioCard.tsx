import { useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Play, FileText, ImageIcon } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { PortfolioItem } from "@/hooks/usePortfolioItems";
import { cn } from "@/lib/utils";

function isYouTubeOrVimeo(url: string) {
  return /youtube\.com|youtu\.be|vimeo\.com/.test(url);
}
function toEmbedUrl(url: string) {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return url;
}

export function PortfolioCard({ item, featured }: { item: PortfolioItem; featured?: boolean }) {
  const [lightbox, setLightbox] = useState(false);
  const thumb = item.thumbnail_url || item.image_url;

  const cardCls = cn(
    "group relative overflow-hidden rounded-sm border border-border bg-panel/40 transition-all hover:border-accent/50 hover:bg-panel/70",
    featured ? "md:col-span-2 md:row-span-2" : "",
  );

  const meta = (
    <div className="space-y-1 p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
          {item.category}
        </span>
        {item.client_or_vertical && (
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-accent">
            {item.client_or_vertical}
          </span>
        )}
      </div>
      <h3 className="font-display text-lg text-foreground">{item.title}</h3>
      {item.description && (
        <p className="line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
      )}
    </div>
  );

  const thumbBlock = thumb ? (
    <div className={cn("relative w-full overflow-hidden bg-background", featured ? "aspect-[16/10]" : "aspect-[4/3]")}>
      <img src={thumb} alt={item.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      <MediaBadge media_type={item.media_type} />
    </div>
  ) : (
    <div className={cn("relative flex w-full items-center justify-center bg-panel", featured ? "aspect-[16/10]" : "aspect-[4/3]")}>
      <MediaIcon media_type={item.media_type} className="h-10 w-10 text-muted-foreground/40" />
      <MediaBadge media_type={item.media_type} />
    </div>
  );

  if (item.media_type === "image") {
    return (
      <>
        <button type="button" onClick={() => setLightbox(true)} className={cn(cardCls, "text-left")}>
          {thumbBlock}
          {meta}
        </button>
        <Dialog open={lightbox} onOpenChange={setLightbox}>
          <DialogContent className="max-w-5xl border-border bg-background p-0">
            <img src={item.image_url || thumb || ""} alt={item.title} className="h-auto w-full" />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (item.media_type === "video" && item.video_url) {
    return (
      <div className={cardCls}>
        <div className={cn("w-full overflow-hidden bg-background", featured ? "aspect-[16/10]" : "aspect-[16/9]")}>
          {isYouTubeOrVimeo(item.video_url) ? (
            <iframe
              src={toEmbedUrl(item.video_url)}
              title={item.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          ) : (
            <video src={item.video_url} poster={thumb || undefined} controls className="h-full w-full object-cover" />
          )}
        </div>
        {meta}
      </div>
    );
  }

  if (item.media_type === "embed" && item.external_url) {
    return (
      <div className={cardCls}>
        <div className={cn("relative w-full overflow-hidden bg-background", featured ? "aspect-[16/10]" : "aspect-[4/3]")}>
          <iframe
            src={item.external_url}
            title={item.title}
            sandbox="allow-scripts allow-same-origin allow-popups"
            loading="lazy"
            className="h-full w-full"
          />
          <MediaBadge media_type={item.media_type} />
        </div>
        <div className="flex items-center justify-between p-5">
          <div className="space-y-1">
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
              {item.category}
            </span>
            <h3 className="font-display text-lg text-foreground">{item.title}</h3>
            {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
          </div>
          <a
            href={item.external_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-accent hover:opacity-80"
          >
            Open <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    );
  }

  if (item.media_type === "link" && item.external_url) {
    return (
      <a href={item.external_url} target="_blank" rel="noreferrer" className={cardCls}>
        {thumbBlock}
        <div className="flex items-center justify-between p-5">
          <div className="space-y-1">
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
              {item.category}
            </span>
            <h3 className="font-display text-lg text-foreground">{item.title}</h3>
            {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
          </div>
          <ExternalLink className="h-4 w-4 text-accent" />
        </div>
      </a>
    );
  }

  if (item.media_type === "case_study") {
    return (
      <Link to={`/work/${item.slug}`} className={cardCls}>
        {thumbBlock}
        <div className="flex items-center justify-between p-5">
          <div className="space-y-1">
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
              {item.category}
            </span>
            <h3 className="font-display text-lg text-foreground">{item.title}</h3>
            {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
          </div>
          <span className="text-xs uppercase tracking-wider text-accent">Read →</span>
        </div>
      </Link>
    );
  }

  return (
    <div className={cardCls}>
      {thumbBlock}
      {meta}
    </div>
  );
}

function MediaIcon({ media_type, className }: { media_type: PortfolioItem["media_type"]; className?: string }) {
  if (media_type === "video") return <Play className={className} />;
  if (media_type === "case_study") return <FileText className={className} />;
  if (media_type === "link" || media_type === "embed") return <ExternalLink className={className} />;
  return <ImageIcon className={className} />;
}

function MediaBadge({ media_type }: { media_type: PortfolioItem["media_type"] }) {
  const label = media_type === "case_study" ? "Case Study" : media_type;
  return (
    <span className="absolute left-3 top-3 rounded-sm bg-background/80 px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-foreground backdrop-blur">
      {label}
    </span>
  );
}