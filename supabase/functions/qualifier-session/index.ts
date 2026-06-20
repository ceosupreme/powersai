// Public endpoint that returns the qualifier field list + ready_definition
// for a given project_type. Used by the landing page to render the chat /
// form fallbacks (the realtime voice agent loads context server-side).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { loadQualifierContext } from "../_shared/qualifier-prompt.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const projectType = url.searchParams.get("project_type") ?? "home_services";

  try {
    const ctx = await loadQualifierContext(projectType);
    return new Response(JSON.stringify(ctx), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[qualifier-session]", e);
    return new Response(JSON.stringify({ error: "Failed to load qualifier" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});