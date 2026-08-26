import { Container } from "@/components/marketing/site/primitives";
import { Reveal } from "@/components/marketing/site/Reveal";

/** Convert a YouTube or Loom share URL into its embed form. Returns null for direct files. */
export function toEmbedUrl(url: string): string | null {
  const u = url.trim();
  const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const loom = u.match(/loom\.com\/(?:share|embed)\/([\w-]+)/i);
  if (loom) return `https://www.loom.com/embed/${loom[1]}`;
  return null;
}

export function VideoBlock({ url, title }: { url: string; title: string }) {
  const embed = toEmbedUrl(url);
  const isFile = !embed && /\.(mp4|webm|mov)(\?.*)?$/i.test(url.trim());
  if (!embed && !isFile) return null;

  return (
    <section id="video" className="relative border-t border-[hsl(var(--line))] bg-[hsl(var(--bone))] py-16 md:py-24">
      <Container className="max-w-4xl">
        <Reveal>
          <span className="eyebrow">See it work</span>
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-6 overflow-hidden rounded-xl border border-[hsl(var(--line))] bg-black">
            <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
              {embed ? (
                <iframe
                  src={embed}
                  title={title}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full border-0"
                />
              ) : (
                <video src={url} controls playsInline preload="metadata" className="absolute inset-0 h-full w-full" />
              )}
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
