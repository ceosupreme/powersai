// Public lookup: resolve a venue (client) by its URL-safe slug.
// Used by the per-client qualifier page (/q/:venueSlug). Returns only the
// minimal fields needed to render the intake page — id, slug, name,
// project_type. Service-role read bypasses RLS on the venues table.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { slug?: string } = {};
  try { body = await req.json(); } catch { /* noop */ }
  const slug = (body.slug ?? "").trim().toLowerCase();
  if (!slug || slug.length > 80 || !/^[a-z0-9-]+$/.test(slug)) {
    return new Response(JSON.stringify({ error: "invalid_slug" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data, error } = await admin
    .from("venues")
    .select("id, slug, name, project_type, is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[resolve-venue-by-slug] query failed", error);
    return new Response(JSON.stringify({ error: "lookup_failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!data || data.is_active === false) {
    return new Response(JSON.stringify({ venue: null }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    venue: {
      id: data.id,
      slug: data.slug,
      name: data.name,
      project_type: data.project_type,
    },
  }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});