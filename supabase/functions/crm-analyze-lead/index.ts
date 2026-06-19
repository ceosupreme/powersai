// Analyzes a CRM lead from a URL or pasted text via Lovable AI Gateway.
// Mirrors the capture-classify pattern: service-role writes, strict JSON output,
// google/gemini-2.5-flash. URL fetch failures degrade gracefully — never throw.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-2.5-flash";

type Body = {
  company_id?: string;
  deal_id?: string | null;
  source_kind?: "url" | "text";
  source_url?: string;
  source_text?: string;
};

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 15000);
}

async function fetchUrlText(url: string): Promise<{ ok: true; text: string } | { ok: false; message: string }> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    const r = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LovableLeadAnalyzer/1.0)",
        "Accept": "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    clearTimeout(t);
    if (!r.ok) return { ok: false, message: `Couldn't read the URL (status ${r.status}) — paste details instead` };
    const html = await r.text();
    const text = stripHtml(html);
    if (!text || text.length < 80) {
      return { ok: false, message: "Couldn't read the URL — paste details instead" };
    }
    return { ok: true, text };
  } catch (_e) {
    return { ok: false, message: "Couldn't read the URL — paste details instead" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // JWT-derived caller (used as created_by).
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData } = await userClient.auth.getUser(jwt);
  const userId = userData?.user?.id;
  if (!userId) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Body = {};
  try { body = await req.json(); } catch { /* noop */ }
  const { company_id, deal_id, source_kind, source_url, source_text } = body;
  if (!company_id || (source_kind !== "url" && source_kind !== "text")) {
    return new Response(JSON.stringify({ error: "company_id and source_kind required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (source_kind === "url" && !source_url) {
    return new Response(JSON.stringify({ error: "source_url required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (source_kind === "text" && !source_text) {
    return new Response(JSON.stringify({ error: "source_text required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const svc = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Load company (also confirms it exists).
  const { data: company, error: cErr } = await svc
    .from("crm_companies")
    .select("id, name, website, industry, notes")
    .eq("id", company_id).maybeSingle();
  if (cErr || !company) {
    return new Response(JSON.stringify({ error: "company not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Resolve source content.
  let fetchedContent: string | null = null;
  let contentForPrompt = "";
  if (source_kind === "url") {
    const r = await fetchUrlText(source_url!);
    if (!r.ok) {
      return new Response(JSON.stringify({ ok: false, code: "fetch_failed", message: r.message }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    fetchedContent = r.text;
    contentForPrompt = r.text;
  } else {
    contentForPrompt = source_text!.slice(0, 15000);
  }

  // Load active offers.
  const { data: offers } = await svc
    .from("service_offers")
    .select("id, name, who_its_for, problem_solved, best_target")
    .eq("status", "active");
  const offerLines = (offers ?? [])
    .map((o: any) => `- ${o.id} :: ${o.name}\n    who_its_for: ${o.who_its_for ?? ""}\n    problem_solved: ${o.problem_solved ?? ""}\n    best_target: ${o.best_target ?? ""}`)
    .join("\n");

  const sys = `You analyze a business lead and match it to ONE service offer.
Return ONLY a JSON object with this exact shape:
{ "summary": string, "recommended_offer_id": string|null, "recommendation_reason": string, "priority": "high"|"medium"|"low" }
- "summary": 2-4 sentences describing what the business is/does.
- "recommended_offer_id": the id of the single best-fit offer from the list, or null if nothing fits.
- "recommendation_reason": 1-3 sentences on WHY this offer fits this lead.
- "priority": fit/urgency rating.`;

  const user = `Lead — Company: "${company.name}"${company.website ? ` (website: ${company.website})` : ""}${company.industry ? `, industry: ${company.industry}` : ""}.

Source (${source_kind}):
"""${contentForPrompt}"""

Available service offers:
${offerLines || "- (none)"}`;

  let parsed: any = null;
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
    if (r.status === 429) {
      return new Response(JSON.stringify({ error: "rate_limited", message: "AI is busy — try again in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (r.status === 402) {
      return new Response(JSON.stringify({ error: "credits_exhausted", message: "AI credits exhausted." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: "ai_error", detail: t.slice(0, 500) }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const j = await r.json();
    const content = j?.choices?.[0]?.message?.content ?? "{}";
    parsed = JSON.parse(content);
  } catch (e) {
    return new Response(JSON.stringify({ error: "ai_parse_failed", detail: String(e) }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const allowedOfferIds = new Set((offers ?? []).map((o: any) => o.id));
  const recommended_offer_id = parsed.recommended_offer_id && allowedOfferIds.has(parsed.recommended_offer_id)
    ? parsed.recommended_offer_id : null;
  const priority = ["high","medium","low"].includes(parsed.priority) ? parsed.priority : "medium";

  const { data: inserted, error: iErr } = await svc
    .from("crm_lead_analyses")
    .insert({
      company_id,
      deal_id: deal_id ?? null,
      source_kind,
      source_url: source_url ?? null,
      source_text: source_text ?? null,
      fetched_content: fetchedContent,
      summary: parsed.summary ?? null,
      recommended_offer_id,
      recommendation_reason: parsed.recommendation_reason ?? null,
      priority,
      model: MODEL,
      created_by: userId,
    })
    .select("*")
    .single();

  if (iErr) {
    return new Response(JSON.stringify({ error: "insert_failed", detail: iErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, analysis: inserted }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});