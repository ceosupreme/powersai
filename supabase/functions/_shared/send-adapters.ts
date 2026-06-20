// Shared send-adapter interface and resolver for Build C automations.
// The MANUAL_LOG adapter is the only one shipped today — it records what
// WOULD have been sent into automation_send_log and returns ok.
// Real providers (Twilio, Resend/SendGrid, LinkedIn/IG) drop in here later
// by implementing SendAdapter and registering in ADAPTERS.

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

// Future drop-ins (stubs):
//   twilioSmsAdapter — needs TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM
//   resendEmailAdapter — needs RESEND_API_KEY + verified domain
//   sendgridEmailAdapter — needs SENDGRID_API_KEY
//   linkedinDmAdapter / instagramDmAdapter — likely manual-assist only

const ADAPTERS: Record<string, SendAdapter> = {
  manual_log: manualLogAdapter,
};

/**
 * Pick the adapter for a (channel, project-config) pair.
 * config shape: { adapters?: { email?: string, sms?: string, ... } }
 * Falls back to manual_log.
 */
export function resolveAdapter(
  channel: AutomationChannel,
  config: Record<string, unknown> | null | undefined,
): SendAdapter {
  const adapters = (config?.adapters ?? {}) as Record<string, string>;
  const name = adapters[channel] || "manual_log";
  const adapter = ADAPTERS[name];
  if (adapter && adapter.supports(channel)) return adapter;
  return manualLogAdapter;
}