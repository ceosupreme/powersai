// Shared send-adapter interface and resolver for automations.
// MANUAL_LOG records what WOULD have been sent — no external calls.
// RESEND_EMAIL delivers real email via the Resend API when RESEND_API_KEY
// is present. SMS/DM adapters drop in the same way.
import { createClient } from "npm:@supabase/supabase-js@2";
import type { DeliveryState } from "./automation-state.ts";

export type AutomationChannel = "email" | "sms" | "linkedin_dm" | "instagram_dm" | "review_reply";

export interface SendInput {
  channel: AutomationChannel;
  to: string | null;
  subject?: string | null;
  from?: string;
  reply_to?: string;
  body: string;
  project_id: string;
  queue_id: string;
  metadata?: Record<string, unknown>;
  /** Called immediately before the external request, after all lookups. */
  beforeSend?: () => Promise<boolean>;
}

export interface SendResult {
  ok: boolean;
  provider: string;
  provider_message_id?: string;
  error?: string;
  raw?: unknown;
  delivery_status?: DeliveryState;
  /** Set only when the contact gate refused the send. */
  blocked_reason?: string;
}

export interface SendAdapter {
  name: string;
  supports(channel: AutomationChannel): boolean;
  send(input: SendInput): Promise<SendResult>;
}

/** Default — records what would have been sent. No external calls. */
export const manualLogAdapter: SendAdapter = {
  name: "manual_log",
  supports: () => true,
  async send(input) {
    if (input.beforeSend && !(await input.beforeSend())) return { ok: false, provider: "manual_log", error: "send_gate_closed", delivery_status: "queued" };
    console.log("[manual_log adapter] would send:", {
      channel: input.channel, to: input.to, queue_id: input.queue_id,
    });
    return { ok: true, provider: "manual_log", delivery_status: "logged" };
  },
};

// --- Resend email adapter --------------------------------------------------

export const DEFAULT_EMAIL_FROM = "Supreme Team OS <reports@supremeteammedia.com>";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = String(raw).trim().toLowerCase();
  return EMAIL_RE.test(v) ? v : null;
}

function svcClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

function deriveSubject(input: SendInput): string {
  if (input.subject && input.subject.trim()) return input.subject.trim();
  const key = String((input.metadata as any)?.automation_key ?? "").toLowerCase();
  if (key.includes("review")) return "A quick favor";
  if (key.includes("followup") || key.includes("follow_up")) return "Following up";
  if (key.includes("reactivation")) return "It's been a while";
  return "A quick note";
}

function resolveFrom(config: Record<string, unknown> | null | undefined): string {
  const cfg = (config?.email_from ?? null) as { name?: string; address?: string } | null;
  if (cfg && typeof cfg.address === "string" && EMAIL_RE.test(cfg.address.trim())) {
    const name = typeof cfg.name === "string" && cfg.name.trim() ? cfg.name.trim() : null;
    return name ? `${name} <${cfg.address.trim()}>` : cfg.address.trim();
  }
  return DEFAULT_EMAIL_FROM;
}

export const resendEmailAdapter: SendAdapter = {
  name: "resend",
  supports: (ch) => ch === "email",
  async send(input) {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) return { ok: false, provider: "resend", error: "RESEND_API_KEY missing" };

    const internal = (input.metadata as any)?.internal === true;
    const to = normalizeEmail(input.to);
    if (!to) return { ok: false, provider: "resend", error: "invalid_recipient" };

    const sb = svcClient();

    // Suppression check — customer sends only.
    if (!internal) {
      const { data: suppressed, error: suppressionError } = await sb.rpc("hq_is_email_suppressed", {
        p_project_id: input.project_id, p_email: to,
      });
      if (suppressionError) return { ok: false, provider: "resend", error: "suppression_check_failed", delivery_status: "failed" };
      if (suppressed) {
        return { ok: false, provider: "resend", error: "suppressed" };
      }
    }

    // Resolve enrollment config + venue for From + footer.
    const automationKey = String((input.metadata as any)?.automation_key ?? "");
    let enrConfig: Record<string, unknown> | null = null;
    if (automationKey) {
      const { data: enr, error: enrollmentError } = await sb
        .from("project_automation_enrollments")
        .select("config")
        .eq("project_id", input.project_id)
        .eq("automation_key", automationKey)
        .maybeSingle();
      if (enrollmentError) return { ok: false, provider: "resend", error: "enrollment_check_failed", delivery_status: "failed" };
      enrConfig = (enr?.config ?? null) as Record<string, unknown> | null;
    }

    let footer = "";
    if (!internal) {
      const { data: venue } = await sb
        .from("venues")
        .select("name, venue_name, city")
        .eq("id", input.project_id)
        .maybeSingle();
      if (!venue) {
        return { ok: false, provider: "resend", error: "venue_not_found" };
      }
      const name = String((venue as any).name ?? (venue as any).venue_name ?? "").trim();
      const city = String((venue as any).city ?? "").trim();
      if (!name) {
        return { ok: false, provider: "resend", error: "venue_missing_name" };
      }
      if (!city) {
        return { ok: false, provider: "resend", error: "venue_missing_city" };
      }
      const loc = city ? `${name} · ${city}` : name;
      footer = `\n\n—\n${loc}\nReply to this email to opt out.`;
    }

    const from = input.from ?? resolveFrom(enrConfig);
    const subject = deriveSubject(input);
    const text = `${input.body}${footer}`;

    if (input.beforeSend && !(await input.beforeSend())) return { ok: false, provider: "resend", error: "send_gate_closed", delivery_status: "queued" };

    let resp: Response;
    try {
      resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "Idempotency-Key": `hq:${input.queue_id}`,
        },
        body: JSON.stringify({ from, to, subject, text, ...(input.reply_to ? { reply_to: input.reply_to } : {}) }),
        signal: AbortSignal.timeout(20_000),
      });
    } catch (e) {
      return { ok: false, provider: "resend", error: `network: ${String(e)}`, delivery_status: "unconfirmed" };
    }

    let raw: any = null;
    try { raw = await resp.json(); } catch { /* noop */ }
    if (!resp.ok) {
      const msg = raw?.message ?? raw?.error ?? `http_${resp.status}`;
      return { ok: false, provider: "resend", error: String(msg), raw, delivery_status: resp.status >= 500 ? "unconfirmed" : "failed" };
    }
    if (typeof raw?.id !== "string" || !raw.id) return { ok: false, provider: "resend", error: "provider_receipt_missing", delivery_status: "unconfirmed" };
    return {
      ok: true,
      provider: "resend",
      provider_message_id: raw?.id ?? undefined,
      delivery_status: "provider_accepted",
      raw,
    };
  },
};

const ADAPTERS: Record<string, SendAdapter> = {
  manual_log: manualLogAdapter,
  resend: resendEmailAdapter,
};

/**
 * Pick the adapter for a (channel, project-config) pair.
 * config shape: { adapters?: { email?: string, sms?: string, ... } }
 *
 * For 'email': if RESEND_API_KEY is set, uses Resend UNLESS the enrollment
 * config explicitly opts out with adapters.email='manual_log'. No key or
 * unknown adapter name → manual_log fallback (never crashes).
 */
export function resolveAdapter(
  channel: AutomationChannel,
  config: Record<string, unknown> | null | undefined,
): SendAdapter {
  return withContactGate(pickAdapter(channel, config));
}

// Owner-facing alerts and forwards go to the team, never to a lead.
const OWNER_FACING_KINDS = new Set(["owner_inquiry_alert", "emergency_lead_alert", "inbound_forward", "client_stale_digest"]);

/**
 * Do-not-contact gate. Every send to a person (queue sends and lead
 * acknowledgments) asks hq_contact_gate first. A refusal comes back as a
 * cancelled, not-ok result carrying `blocked_reason`, which
 * hq_finish_automation_send records and uses to stop the run. Fails closed.
 */
export function withContactGate(adapter: SendAdapter): SendAdapter {
  return {
    name: adapter.name,
    supports: (ch) => adapter.supports(ch),
    async send(input) {
      const meta = (input.metadata ?? {}) as Record<string, unknown>;
      if (meta.internal === true && OWNER_FACING_KINDS.has(String(meta.kind ?? ""))) return adapter.send(input);
      const { data, error } = await svcClient().rpc("hq_contact_gate", {
        p_queue_id: input.queue_id, p_channel: input.channel, p_to: input.to ?? null, p_project_id: input.project_id,
        p_subject_type: typeof meta.subject_type === "string" ? meta.subject_type : null,
        p_subject_id: typeof meta.subject_id === "string" ? meta.subject_id : null,
      });
      if (error || !data) {
        console.error("[send-adapter] contact gate unavailable", { queue_id: input.queue_id, error: error?.message });
        return { ok: false, provider: adapter.name, error: "contact_gate_unavailable", delivery_status: "queued" };
      }
      if ((data as { allowed?: boolean }).allowed !== true) {
        const reason = String((data as { reason?: string }).reason ?? "blocked");
        console.log("[send-adapter] blocked by contact gate", { queue_id: input.queue_id, reason });
        return { ok: false, provider: adapter.name, error: `blocked:${reason}`, delivery_status: "cancelled", blocked_reason: reason };
      }
      return adapter.send(input);
    },
  };
}

function pickAdapter(
  channel: AutomationChannel,
  config: Record<string, unknown> | null | undefined,
): SendAdapter {
  const adapters = (config?.adapters ?? {}) as Record<string, string>;
  const explicit = adapters[channel];
  let name: string;
  if (explicit) {
    name = explicit;
  } else if (channel === "email" && Deno.env.get("RESEND_API_KEY")) {
    name = "resend";
  } else {
    name = "manual_log";
  }
  const adapter = ADAPTERS[name];
  if (adapter && adapter.supports(channel)) return adapter;
  if (channel === "email" && name !== "manual_log") {
    console.warn(`[send-adapter] falling back to manual_log for channel=email (requested=${name})`);
  }
  return manualLogAdapter;
}
