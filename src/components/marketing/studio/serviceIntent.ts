/**
 * Capability → inquiry preselection.
 *
 * A capability CTA only preselects a SERVICE. It never writes to, clears or
 * overwrites the visitor's message text. Selection lives in the inquiry form's
 * own state and survives validation/submission errors.
 */
export type ServiceId =
  | "websites-apps"
  | "brand-creative"
  | "marketing-growth"
  | "ai-systems"
  | "not-sure"
  | "agency-collaboration"
  | "hiring-contract";

export const SERVICE_OPTIONS: { id: ServiceId; label: string }[] = [
  { id: "websites-apps", label: "Website or app" },
  { id: "brand-creative", label: "Brand or design" },
  { id: "marketing-growth", label: "Marketing or content" },
  { id: "ai-systems", label: "AI or business systems" },
  { id: "not-sure", label: "Not sure yet" },
];

/** Context-only controls, shown when the visitor arrives from those paths. */
export const CONTEXT_OPTIONS: { id: ServiceId; label: string }[] = [
  { id: "agency-collaboration", label: "Agency collaboration" },
  { id: "hiring-contract", label: "Hiring / contract role" },
];

export const SERVICE_LABEL: Record<string, string> = [...SERVICE_OPTIONS, ...CONTEXT_OPTIONS].reduce(
  (acc, o) => ({ ...acc, [o.id]: o.label }),
  {} as Record<string, string>,
);

export const SERVICE_INTENT_EVENT = "stm:studio-service-intent";

export function requestServiceIntent(id: ServiceId) {
  window.dispatchEvent(new CustomEvent<ServiceId>(SERVICE_INTENT_EVENT, { detail: id }));
}
