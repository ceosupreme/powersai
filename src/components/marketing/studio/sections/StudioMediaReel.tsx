import { getStudioMedia } from "@/config/studioMedia";
import { Container, Eyebrow, SectionTitle } from "../primitives";

const REEL = [
  { key: "work-big-paws-club", title: "Big Paws Club", position: "top center", video: "/studio-motion/big-paws-club.webm" },
  { key: "work-kario-voss", title: "Kario Voss", position: "center 18%", video: "/studio-motion/kario-voss.webm" },
  { key: "work-supreme-wellness-club", title: "Supreme Wellness Club", position: "center 22%", video: null },
];

export function StudioMediaReel() {
  return <section className="studio-motion-section studio-section">
    <Container>
      <Eyebrow>Selected work in motion</Eyebrow>
      <SectionTitle>See how the work holds up beyond the first screen.</SectionTitle>
      <p className="mt-5 max-w-2xl text-[1rem] leading-relaxed text-muted-foreground">A website has to do more than make a strong first impression. It should stay clear, useful, and on-brand as people explore.</p>
    </Container>
    <div className="studio-reel-track mt-12">
      {REEL.map((item, index) => {
        const media = getStudioMedia(item.key);
        if (!media?.src) return null;
        return <figure key={item.key} className={`studio-reel-panel studio-reel-panel-${index + 1}`}><div className="studio-reel-window">{item.video && <video className="studio-reel-video" src={item.video} poster={media.src} muted autoPlay loop playsInline preload="metadata" aria-label={`${item.title} live website screen recording`} />}<img className={item.video ? "studio-reel-fallback" : undefined} src={media.src} alt={`${item.title} website project view`} width={media.width} height={media.height} loading="lazy" style={{ objectPosition: item.position }} /></div><figcaption><span className="studio-label">{item.video ? "Website in use" : "Website project"}</span><strong className="studio-display">{item.title}</strong></figcaption></figure>;
      })}
    </div>
  </section>;
}
