/**
 * Public-site analytics adapter — INTENTIONALLY A NO-OP.
 *
 * There is no analytics destination installed in this project, so nothing is
 * sent anywhere and tracking is NOT active. This module exists so the public
 * site has one allowlisted call surface; wiring a real destination later is a
 * single change here.
 *
 * Privacy rules baked in: only the allowlisted event names below are accepted,
 * and payloads are limited to short allowlisted category/id strings. Never pass
 * names, emails, message bodies, contact URLs or query strings through here.
 */

export type StudioEvent =
  | "service_selected"
  | "project_opened"
  | "inquiry_started"
  | "inquiry_submitted"
  | "hiring_interest"
  | "resume_download";

type SafeDetail = { category?: string; id?: string };

const SAFE = /^[a-z0-9_-]{1,48}$/;

export function trackStudioEvent(_event: StudioEvent, detail?: SafeDetail): void {
  // No destination configured: drop the event. Deliberately not console-logged,
  // because console output is not analytics.
  if (!detail) return;
  if (detail.category && !SAFE.test(detail.category)) return;
  if (detail.id && !SAFE.test(detail.id)) return;
}

/** Tracking status, for honest reporting in docs/UI if ever needed. */
export const STUDIO_ANALYTICS_ACTIVE = false;
