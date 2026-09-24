import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackSiteEvent } from "@/lib/studioAnalytics";

const PUBLIC_PATH = /^(?:\/$|\/free-audit\/?$|\/thank-you\/?$|\/work(?:\/[^/]+)?\/?$|\/hire\/?$|\/publishing\/?$|\/services\/(?:websites|brand|marketing|ai-systems)\/?$|\/industries\/?$|\/for\/[^/]+\/?$)/;

export function PublicSiteAnalytics() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (!PUBLIC_PATH.test(pathname) || pathname.startsWith("/q/") || pathname.startsWith("/r/")) return;
    trackSiteEvent({ event_type: "page_view" });
  }, [pathname, search]);

  return null;
}
