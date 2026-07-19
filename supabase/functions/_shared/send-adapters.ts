// Shared send-adapter interface and resolver for automations.
// MANUAL_LOG records what WOULD have been sent — no external calls.
// RESEND_EMAIL delivers real email via the Resend API when RESEND_API_KEY
// is present. SMS/DM adapters drop in the same way.
import { createClient } from "npm:@supabase/supabase-js@2";

export type AutomationChannel = "email" | "sms" | "linkedin_dm" | "instagram_dm" | "review_reply";

export interface SendInput {
  channel: AutomationChannel;
  to: string | null;
  subject?: string | null;
  body: string;
  project_id: string;
  queue_id: string;
  metadata?: Record<string, unknown>;
}

export interface SendResult {
  ok: boolean;
  provider: string;
  provider_message_id?: string;
  error?: string;
  raw?: unknown;
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
    console.log("[manual_log adapter] would send:", {
      channel: input.channel, to: input.to, queue_id: input.queue_id,
    });
    return { ok: true, provider: "manual_log" };
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
      const { data: sup } = await sb
        .from("email_suppressions")
        .select("reason")
        .eq("project_id", input.project_id)
        .filter("email", "eq", to) // stored lowercase-normalized by adapter/UI
        .limit(1);
      // Defensive re-check using RPC-style lower() semantics: also match any
      // legacy row that wasn't normalized on insert.
      let suppressed = (sup ?? []).length > 0;
      if (!suppressed) {
        const { data: sup2 } = await sb
          .from("email_suppressions")
          .select("email, reason")
          .eq("project_id", input.project_id);
        suppressed = (sup2 ?? []).some((r: any) => String(r.email ?? "").trim().toLowerCase() === to);
      }
      if (suppressed) {
        return { ok: false, provider: "resend", error: "suppressed" };
      }
    }

    // Resolve enrollment config + venue for From + footer.
    const automationKey = String((input.metadata as any)?.automation_key ?? "");
    let enrConfig: Record<string, unknown> | null = null;
    if (automationKey) {
      const { data: enr } = await sb
        .from("project_automation_enrollments")
        .select("config")
        .eq("project_id", input.project_id)
        .eq("automation_key", automationKey)
        .maybeSingle();
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

    const from = resolveFrom(enrConfig);
    const subject = deriveSubject(input);
    const text = `${input.body}${footer}`;

    let resp: Response;
    try {
      resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ from, to, subject, text }),
      });
    } catch (e) {
      return { ok: false, provider: "resend", error: `network: ${String(e)}` };
    }

    let raw: any = null;
    try { raw = await resp.json(); } catch { /* noop */ }
    if (!resp.ok) {
      const msg = raw?.message ?? raw?.error ?? `http_${resp.status}`;
      return { ok: false, provider: "resend", error: String(msg), raw };
    }
    return {
      ok: true,
      provider: "resend",
      provider_message_id: raw?.id ?? undefined,
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