import type { QueueItem, QueueStatus } from "@/hooks/useAutomationQueue";

export type DeliveryTone = "success" | "muted" | "default" | "destructive";

export interface DeliveryLabel {
  label: string;
  tone: DeliveryTone;
  providerMsgId: string | null;
  provider: string | null;
}

/**
 * Derive a truthful display label for a queue item, based on send_result.provider.
 * Internal status vocabulary is untouched — this only affects rendering.
 */
export function deliveryLabel(item: {
  status: QueueStatus;
  send_result: Record<string, unknown> | null;
}): DeliveryLabel {
  if (item.status !== "sent") {
    return { label: item.status, tone: "default", providerMsgId: null, provider: null };
  }
  const result = (item.send_result ?? {}) as Record<string, unknown>;
  const provider = typeof result.provider === "string" ? result.provider : null;
  const providerMsgId = typeof result.id === "string" ? result.id : null;
  if (provider === "resend") {
    return { label: "sent", tone: "success", providerMsgId, provider };
  }
  if (provider === "manual_log") {
    return { label: "logged (not delivered)", tone: "muted", providerMsgId: null, provider };
  }
  return { label: "sent (unverified)", tone: "muted", providerMsgId: null, provider };
}

export function isRealDelivery(item: Pick<QueueItem, "status" | "send_result">): boolean {
  return item.status === "sent" && (item.send_result as any)?.provider === "resend";
}

export function isLoggedOnly(item: Pick<QueueItem, "status" | "send_result">): boolean {
  return item.status === "sent" && (item.send_result as any)?.provider === "manual_log";
}

export function shortMsgId(id: string | null | undefined): string | null {
  if (!id) return null;
  return id.length <= 8 ? id : id.slice(0, 8);
}

/**
 * Map an adapter error code (from send_result.error) to a plain human sentence
 * for operators. Raw code stays available in tooltips/metadata.
 */
export function describeSendError(code: string | null | undefined): string {
  const c = String(code ?? "").trim();
  switch (c) {
    case "venue_not_found":
      return "Can't send — this project's record is missing. Contact support.";
    case "venue_missing_name":
      return "Can't send — this project has no business name on file. Add a name on the project, then Retry.";
    case "venue_missing_city":
      return "Can't send — this project has no city on file. Add an address on the project, then Retry.";
    case "missing_project_venue":
      return "Can't send — project record is incomplete. Add a business name and address on the project, then Retry.";
    case "suppressed":
      return "Can't send — recipient is on this project's suppression list.";
    case "invalid_recipient":
      return "Can't send — recipient email address is invalid.";
    case "RESEND_API_KEY missing":
      return "Can't send — email delivery isn't configured on the server.";
    case "":
      return "Delivery failed — no details returned.";
    default:
      if (c.startsWith("network:")) return "Can't send — network error reaching the email provider. Retry.";
      if (/^http_\d+$/i.test(c)) return "Delivery provider rejected the message. See details.";
      return c.length > 140 ? "Delivery failed. See details." : c;
  }
}