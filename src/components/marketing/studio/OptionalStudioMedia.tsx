import { getStudioMedia } from "@/config/studioMedia";

export function OptionalStudioMedia({ mediaKey }: { mediaKey: string }) {
  const media = getStudioMedia(mediaKey);
  if (!media?.src) return null;
  return <img className="optional-studio-media" data-media-key={mediaKey} src={media.src} alt={media.alt} width={media.width} height={media.height} loading="eager"/>;
}