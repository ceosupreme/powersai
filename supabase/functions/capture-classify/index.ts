// Classifies a capture_items row into a suggested project + type via
// Lovable AI Gateway (utility_classification → google/gemini-2.5-flash).
// Reads & writes as SERVICE ROLE — bypasses RLS so suggestions land cleanly.
// Gated by app_config.integrations_disabled["capture_ai_routing"]: ships disabled.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isDisabled, disabledResponse } from "../_shared/integration-disabled.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FLAG = "capture_ai_routing";
const MODEL = "google/gemini-2.5-flash"; // utility_classification tier
const ROUTED_TYPES = ["task", "idea", "note", "brand_asset", "crm_lead", "content_idea"] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Flag gate — ships disabled.
  if (await isDisabled(FLAG)) return disabledResponse(FLAG, corsHeaders);

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { capture_item_id?: string } = {};
  try { body = await req.json(); } catch { /* noop */ }
  const itemId = body.capture_item_id;
  if (!itemId) {
    return new Response(JSON.stringify({ error: "capture_item_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Service-role client — bypasses RLS for both read and write.
  const svc = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: item, error: itemErr } = await svc
    .from("capture_items")
    .select("id, raw_text, created_by, status, ai_suggestion_status")
    .eq("id", itemId)
    .maybeSingle();
  if (itemErr || !item) {
    return new Response(JSON.stringify({ error: "item not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (item.status !== "inbox") {
    return new Response(JSON.stringify({ skipped: "not_inbox" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Pull venues the owner can access. Admins → all; otherwise venue_assignments.
  const { data: roleRow } = await svc
    .from("user_roles").select("role").eq("user_id", item.created_by).maybeSingle();
  const isAdmin = roleRow?.role === "admin";
  let venues: { id: string; name: string }[] = [];
  if (isAdmin) {
    const { data } = await svc.from("venues").select("id, name").order("name");
    venues = data ?? [];
  } else {
    const { data: asg } = await svc
      .from("venue_assignments").select("venue_id").eq("user_id", item.created_by);
    const ids = (asg ?? []).map((r: any) => r.venue_id).filter(Boolean);
    if (ids.length) {
      const { data } = await svc.from("venues").select("id, name").in("id", ids);
      venues = data ?? [];
    }
  }

  await svc.from("capture_items")
    .update({ ai_suggestion_status: "pending" }).eq("id", itemId);

  const venueLines = venues.map((v) => `- ${v.id} :: ${v.name}`).join("\n") || "- (no projects)";
  const sys = `You classify quick captures into a project and a type.
Return ONLY a JSON object: { "project_id": string|null, "type": one of ${ROUTED_TYPES.join("|")}, "reasoning": string }.
If unsure pick null project. Pick the most likely single type.`;
  const user = `Capture text:\n"""${item.raw_text}"""\n\nAvailable projects:\n${venueLines}`;

  let suggested_project_id: string | null = null;
  let suggested_type: string | null = null;
  let reasoning = "";

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
    if (!r.ok) throw new Error(`gateway ${r.status}`);
    const j = await r.json();
    const raw = j?.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);
    if (parsed.project_id && venues.some((v) => v.id === parsed.project_id)) {
      suggested_project_id = parsed.project_id;
    }
    if (typeof parsed.type === "string" && (ROUTED_TYPES as readonly string[]).includes(parsed.type)) {
      suggested_type = parsed.type;
    }
    reasoning = typeof parsed.reasoning === "string" ? parsed.reasoning.slice(0, 1000) : "";
  } catch (e) {
    await svc.from("capture_items").update({
      ai_suggestion_status: "none",
      ai_reasoning: `classifier_error: ${String(e).slice(0, 200)}`,
    }).eq("id", itemId);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { error: upErr } = await svc.from("capture_items").update({
    suggested_project_id,
    suggested_type,
    ai_reasoning: reasoning,
    ai_suggestion_status: "suggested",
  }).eq("id", itemId);
  if (upErr) {
    return new Response(JSON.stringify({ error: upErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    ok: true, suggested_project_id, suggested_type,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});