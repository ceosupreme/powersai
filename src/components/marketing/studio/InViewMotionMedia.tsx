import { useEffect, useRef, useState } from "react";

const MOTION: Record<string, string> = {
  "big-paws-club": "/studio-motion/big-paws-club.webm",
  "kario-voss": "/studio-motion/kario-voss.webm",
};

export function InViewMotionMedia({ slug, poster, alt }: { slug: string; poster: string; alt: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [reduced, setReduced] = useState(false);
  const source = MOTION[slug];
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const video = videoRef.current;
    if (!video || reduced || !source) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void video.play().catch(() => undefined);
      else video.pause();
    }, { threshold: 0.2 });
    observer.observe(video);
    return () => observer.disconnect();
  }, [reduced, source]);
  if (!source || reduced) return <img src={poster} alt={alt} loading="lazy" />;
  return <video ref={videoRef} className="studio-inview-video" muted loop playsInline preload="metadata" poster={poster} aria-label={alt}><source src={source} type="video/webm" /></video>;
}