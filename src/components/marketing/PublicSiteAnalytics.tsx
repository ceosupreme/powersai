import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackSiteEvent } from "@/lib/studioAnalytics";

const PUBLIC_PATH = /^(?:\/$|\/(?:about|privacy|terms|free-audit|thank-you|hire|publishing|industries)\/?$|\/work(?:\/[^/]+)?\/?$|\/services\/(?:websites|brand|marketing|ai-systems)\/?$|\/for\/[^/]+\/?$)/;

export function PublicSiteAnalytics() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (new URLSearchParams(search).get("internal") === "1") localStorage.setItem("stm_internal", "1");
    if (!PUBLIC_PATH.test(pathname) || pathname.startsWith("/q/") || pathname.startsWith("/r/")) return;
    trackSiteEvent({ event_type: "page_view" });
  }, [pathname, search]);

  return null;
}
