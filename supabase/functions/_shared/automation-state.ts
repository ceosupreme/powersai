/** Delivery evidence is separate from the legacy queue approval state. */
export type DeliveryState = "queued" | "logged" | "provider_accepted" | "delivered" | "failed" | "bounced" | "cancelled" | "unconfirmed";

export function deliveryState(result: { ok: boolean; provider: string; delivery_status?: DeliveryState }): DeliveryState {
  if (result.delivery_status) return result.delivery_status;
  if (!result.ok) return "failed";
  return result.provider === "manual_log" ? "logged" : "provider_accepted";
}

export function deliveryEventState(type: string): DeliveryState | null {
  switch (type) {
    case "email.sent": return "provider_accepted";
    case "email.delivered": return "delivered";
    case "email.bounced": case "email.complained": return "bounced";
    case "email.failed": case "email.suppressed": return "failed";
    default: return null;
  }
}

export function reportIsProtected(report: { narrative_edited?: boolean; status?: string; reviewed_at?: string | null; sent_at?: string | null } | null): boolean {
  return !!report && (report.narrative_edited === true || report.status !== "draft" || !!report.reviewed_at || !!report.sent_at);
}

export function dispatchOutcome(httpOk: boolean, body: Record<string, unknown>) {
  return {
    ok: httpOk && body.ok === true,
    skipped: httpOk && body.skipped === true,
    reason: typeof body.reason === "string" ? body.reason : typeof body.error === "string" ? body.error : null,
    delivery_status: typeof body.delivery_status === "string" ? body.delivery_status : null,
  };
}
