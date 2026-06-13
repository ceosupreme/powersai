// Posts a single comment to the Asana task tied to a campaign. Used for AI
// post-event analysis write-back and Growth Audit auto-resolve notes.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const asanaToken = Deno.env.get("ASANA_ACCESS_TOKEN");
    if (!asanaToken) throw new Error("ASANA_ACCESS_TOKEN not set");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: cErr } =
      await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (cErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { external_task_id, text } = await req.json();
    if (!external_task_id || !text) {
      return new Response(JSON.stringify({ error: "external_task_id, text required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const r = await fetch(`https://app.asana.com/api/1.0/tasks/${external_task_id}/stories`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${asanaToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: { text } }),
    });
    const t = await r.text();
    const j = t ? JSON.parse(t) : null;
    if (!r.ok) throw new Error(`Asana ${r.status}: ${j?.errors?.[0]?.message || t}`);

    return new Response(JSON.stringify({ ok: true, comment_gid: j.data.gid }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[marketing-asana-comment]", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
