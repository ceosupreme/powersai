// Reads an inbound_lead and returns a structured project-setup proposal.
// Direct fields are extracted deterministically; interpreted fields come from
// Lovable AI Gateway (google/gemini-2.5-flash, strict JSON). NEVER writes config.
// Modeled on crm-analyze-lead — service-role read, graceful AI fallback.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const MODEL = "google/gemini-2.5-flash";

type Suggestion<T> = { value: T; rationale: string };

type ProjectSetupProposal = {
  lead_id: string;
  direct: {
    name: string | null;
    project_type: string | null;
    timezone: string | null;
    address: string | null;
  };
  contact: {
    display_name: string | null;
    email: string | null;
    phone: string | null;
    role_label: string | null;
  } | null;
  suggestions: {
    primary_channel?: Suggestion<string>;
    pillar_focus?: { keys: string[]; rationale: string };
    leak_vector_focus?: { keys: string[]; rationale: string };
    goals_summary?: string;
    not_ready_reason?: string;
  };
  raw: {
    qualifier_data: unknown;
    transcript: unknown;
    conversation_channel: string | null;
  };
  ai_status: "ok" | "skipped" | "failed";
};

function pickStr(o: Record<string, unknown> | null | undefined, ...keys: string[]): string | null {
  if (!o) return null;
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function inferTimezoneFromAddress(addr: string | null): string | null {
  if (!addr) return null;
  const s = addr.toLowerCase();
  // Very conservative — only fire on unambiguous signals.
  if (/\b(ca|california|nv|nevada|wa|washington|or|oregon)\b/.test(s)) return "America/Los_Angeles";
  if (/\b(az|arizona)\b/.test(s)) return "America/Phoenix";
  if (/\b(co|colorado|ut|utah|nm|new mexico|mt|montana|wy|wyoming|id|idaho)\b/.test(s)) return "America/Denver";
  if (/\b(tx|texas|il|illinois|mn|minnesota|wi|wisconsin|mo|missouri|ok|oklahoma|ks|kansas|ne|nebraska|ia|iowa|nd|sd|ar|arkansas|la|louisiana|al|alabama|ms|mississippi|tn|tennessee)\b/.test(s)) return "America/Chicago";
  if (/\b(ny|new york|ma|massachusetts|nj|new jersey|pa|pennsylvania|ct|connecticut|fl|florida|ga|georgia|nc|north carolina|sc|south carolina|va|virginia|md|maryland|de|delaware|me|maine|nh|new hampshire|vt|vermont|ri|rhode island|oh|ohio|mi|michigan|in|indiana|ky|kentucky|wv|west virginia|dc)\b/.test(s)) return "America/New_York";
  if (/\bhawaii|hi\b/.test(s)) return "Pacific/Honolulu";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { lead_id?: string } = {};
  try { body = await req.json(); } catch { /* noop */ }
  const lead_id = body.lead_id;
  if (!lead_id) {
    return new Response(JSON.stringify({ error: "lead_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Require an authenticated caller — admins / authenticated users only (matches RLS on inbound_leads).
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData } = await userClient.auth.getUser(authHeader.replace(/^Bearer\s+/i, ""));
  if (!userData?.user?.id) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const svc = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: lead, error: lErr } = await svc
    .from("inbound_leads")
    .select("id, name, business_name, email, phone, message, project_type, qualifier_data, is_ready, not_ready_reason, transcript, conversation_channel")
    .eq("id", lead_id)
    .maybeSingle();
  if (lErr || !lead) {
    return new Response(JSON.stringify({ error: "lead_not_found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const q = (lead.qualifier_data as Record<string, unknown> | null) ?? {};
  const direct = {
    name: (lead.business_name && lead.business_name.trim()) ||
      pickStr(q, "business_name", "businessName", "company", "company_name", "venue_name") ||
      null,
    project_type: lead.project_type || pickStr(q, "project_type", "vertical") || null,
    address: pickStr(q, "address", "location", "service_area", "city_state") || null,
    timezone: null as string | null,
  };
  direct.timezone = inferTimezoneFromAddress(direct.address);

  const contactName = lead.name || pickStr(q, "contact_name", "full_name", "name") || null;
  const contact = (contactName || lead.email || lead.phone) ? {
    display_name: contactName,
    email: lead.email || null,
    phone: lead.phone || null,
    role_label: pickStr(q, "role", "title", "contact_role") || null,
  } : null;

  // ── Interpreted (AI) — best-effort. Failures degrade to empty suggestions.
  let suggestions: ProjectSetupProposal["suggestions"] = {};
  let ai_status: ProjectSetupProposal["ai_status"] = "skipped";

  // Load pillar template + leak vector keys for the lead's project_type so AI suggestions are constrained.
  let allowedPillarKeys: string[] = [];
  let allowedLeakKeys: string[] = [];
  if (direct.project_type) {
    const [{ data: pillars }, { data: leaks }] = await Promise.all([
      svc.from("pillar_templates").select("pillar_key").eq("project_type", direct.project_type).eq("is_active", true),
      svc.from("project_type_leak_vectors").select("leak_key").eq("project_type", direct.project_type).eq("is_active", true),
    ]);
    allowedPillarKeys = (pillars ?? []).map((r: any) => r.pillar_key).filter(Boolean);
    allowedLeakKeys = (leaks ?? []).map((r: any) => r.leak_key).filter(Boolean);
  }

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  const hasInterpretableContent = !!(lead.message || (Array.isArray(lead.transcript) && lead.transcript.length) || Object.keys(q).length);

  if (apiKey && hasInterpretableContent) {
    const transcriptText = Array.isArray(lead.transcript)
      ? (lead.transcript as any[]).slice(0, 40).map((t) => `${t.role ?? "?"}: ${t.text ?? ""}`).join("\n").slice(0, 6000)
      : "";
    const sys = `You analyze a qualified lead and PROPOSE setup values for an operator to confirm.
Return ONLY JSON: {
  "primary_channel": {"value": string, "rationale": string} | null,
  "pillar_focus": {"keys": string[], "rationale": string} | null,
  "leak_vector_focus": {"keys": string[], "rationale": string} | null,
  "goals_summary": string | null,
  "not_ready_reason": string | null
}
Rules:
- Cite the lead's own words in each rationale (short quote).
- Pillar keys MUST be from: ${JSON.stringify(allowedPillarKeys)}. If none fit, return null.
- Leak vector keys MUST be from: ${JSON.stringify(allowedLeakKeys)}. If none fit, return null.
- Never invent contact info, prices, names, or commitments.
- goals_summary: 1-2 sentence operator note (budget/urgency/goals) — leave null if absent.`;
    const user = `Lead project_type: ${direct.project_type ?? "(unknown)"}
Business: ${direct.name ?? "(unknown)"}
Channel: ${lead.conversation_channel ?? "(unknown)"}
is_ready: ${lead.is_ready ? "yes" : "no"}${lead.not_ready_reason ? ` (${lead.not_ready_reason})` : ""}

Qualifier answers:
${JSON.stringify(q, null, 2).slice(0, 4000)}

Free-text message:
${(lead.message ?? "").slice(0, 2000)}

Transcript:
${transcriptText}`;

    try {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Lovable-API-Key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: sys },
            { role: "user", content: user },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (r.status === 429 || r.status === 402) {
        ai_status = "failed";
      } else if (!r.ok) {
        ai_status = "failed";
      } else {
        const j = await r.json();
        const parsed = JSON.parse(j?.choices?.[0]?.message?.content ?? "{}");
        const allowedPillars = new Set(allowedPillarKeys);
        const allowedLeaks = new Set(allowedLeakKeys);
        if (parsed.primary_channel?.value) {
          suggestions.primary_channel = {
            value: String(parsed.primary_channel.value),
            rationale: String(parsed.primary_channel.rationale ?? ""),
          };
        }
        if (parsed.pillar_focus?.keys?.length) {
          const keys = (parsed.pillar_focus.keys as unknown[])
            .map(String).filter((k) => allowedPillars.has(k));
          if (keys.length) suggestions.pillar_focus = { keys, rationale: String(parsed.pillar_focus.rationale ?? "") };
        }
        if (parsed.leak_vector_focus?.keys?.length) {
          const keys = (parsed.leak_vector_focus.keys as unknown[])
            .map(String).filter((k) => allowedLeaks.has(k));
          if (keys.length) suggestions.leak_vector_focus = { keys, rationale: String(parsed.leak_vector_focus.rationale ?? "") };
        }
        if (parsed.goals_summary && typeof parsed.goals_summary === "string") {
          suggestions.goals_summary = parsed.goals_summary.slice(0, 600);
        }
        if (lead.not_ready_reason) suggestions.not_ready_reason = lead.not_ready_reason;
        else if (parsed.not_ready_reason && typeof parsed.not_ready_reason === "string") {
          suggestions.not_ready_reason = parsed.not_ready_reason.slice(0, 400);
        }
        ai_status = "ok";
      }
    } catch (e) {
      console.error("[lead-to-project-proposal] AI call failed:", e);
      ai_status = "failed";
    }
  } else if (lead.not_ready_reason) {
    suggestions.not_ready_reason = lead.not_ready_reason;
  }

  const proposal: ProjectSetupProposal = {
    lead_id,
    direct,
    contact,
    suggestions,
    raw: {
      qualifier_data: lead.qualifier_data ?? {},
      transcript: lead.transcript ?? [],
      conversation_channel: lead.conversation_channel ?? null,
    },
    ai_status,
  };

  return new Response(JSON.stringify({ ok: true, proposal }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});