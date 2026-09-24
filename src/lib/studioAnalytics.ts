import { supabase } from "@/integrations/supabase/client";

export type SiteEventType =
  | "page_view"
  | "cta_click"
  | "form_success"
  | "audit_start"
  | "audit_complete"
  | "call_request";

type SiteEvent = {
  event_type: SiteEventType;
  label?: string;
  vertical?: string;
  src?: string;
};

const SAFE = /^[a-z0-9_-]{1,80}$/i;
const SESSION_KEY = "stm.site.session";

function sessionId(): string | null {
  try {
    const current = sessionStorage.getItem(SESSION_KEY);
    if (current) return current;
    const created = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return null;
  }
}

export function trackSiteEvent(event: SiteEvent): void {
  try {
    if (event.label && !SAFE.test(event.label)) return;
    if (event.vertical && !SAFE.test(event.vertical)) return;
    if (event.src && !SAFE.test(event.src)) return;
    const params = new URLSearchParams(window.location.search);
    const src = event.src ?? params.get("src");
    const derivedVertical = src?.match(/^for-([a-z0-9-]{2,40})$/)?.[1] ?? null;
    void supabase.from("site_events").insert({
      event_type: event.event_type,
      label: event.label ?? null,
      path: window.location.pathname,
      referrer: document.referrer ? document.referrer.slice(0, 300) : null,
      session_id: sessionId(),
      src: src ?? null,
      vertical: event.vertical ?? derivedVertical,
    }).then(({ error }) => {
      if (error) console.error("[site-events] insert failed", error.message);
    });
  } catch (error) {
    console.error("[site-events] tracking failed", error);
  }
}

