import { useEffect } from "react";

const SITE = "https://supremeteammedia.com";

type Head = {
  title: string;
  description: string;
  path: string;
  /** Self-referencing canonical when it differs from `path` (e.g. filtered lists). */
  canonicalPath?: string;
};

/**
 * Per-route head for the public studio pages. Client-side only (classic Vite
 * SPA), so social crawlers still read the static index.html head; that static
 * head carries the sitewide studio positioning.
 */
export function useStudioHead({ title, description, path, canonicalPath }: Head) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    const restores: (() => void)[] = [];

    const setMeta = (key: string, content: string, attr: "name" | "property" = "name") => {
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      let created = false;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
        created = true;
      }
      const prev = el.getAttribute("content");
      el.setAttribute("content", content);
      restores.push(() => {
        if (created) el?.remove();
        else if (prev !== null) el?.setAttribute("content", prev);
      });
    };

    const url = `${SITE}${path}`;
    const canonicalUrl = `${SITE}${canonicalPath ?? path}`;
    setMeta("description", description);
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    setMeta("og:url", canonicalUrl, "property");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    let createdCanonical = false;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
      createdCanonical = true;
    }
    const prevHref = canonical.getAttribute("href");
    canonical.setAttribute("href", canonicalUrl);
    restores.push(() => {
      if (createdCanonical) canonical?.remove();
      else if (prevHref) canonical?.setAttribute("href", prevHref);
    });

    return () => {
      document.title = prevTitle;
      restores.forEach((r) => r());
    };
  }, [title, description, path, canonicalPath]);
}
