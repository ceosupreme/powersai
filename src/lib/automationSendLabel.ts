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