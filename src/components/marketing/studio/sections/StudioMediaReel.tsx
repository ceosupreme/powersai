import { getStudioMedia } from "@/config/studioMedia";
import { Container, Eyebrow, SectionTitle } from "../primitives";

const REEL = [
  { key: "work-big-paws-club", title: "Big Paws Club", position: "top center" },
  { key: "work-kario-voss", title: "Kario Voss", position: "center 18%" },
  { key: "work-supreme-wellness-club", title: "Supreme Wellness Club", position: "center 22%" },
];

export function StudioMediaReel() {
  return <section className="studio-motion-section studio-section">
    <Container>
      <Eyebrow>Selected motion</Eyebrow>
      <SectionTitle>The work should move when the work moves.</SectionTitle>
      <p className="mt-5 max-w-2xl text-[1rem] leading-relaxed text-muted-foreground">Real project captures, given a quiet editorial pan to reveal more of the experience. Motion stops when reduced motion is preferred.</p>
    </Container>
    <div className="studio-reel-track mt-12">
      {REEL.map((item, index) => {
        const media = getStudioMedia(item.key);
        if (!media?.src) return null;
        return <figure key={item.key} className={`studio-reel-panel studio-reel-panel-${index + 1}`}><div className="studio-reel-window"><img src={media.src} alt={`${item.title} website project view`} width={media.width} height={media.height} loading="lazy" style={{ objectPosition: item.position }} /></div><figcaption><span className="studio-label">Real project</span><strong className="studio-display">{item.title}</strong></figcaption></figure>;
      })}
    </div>
  </section>;
}
