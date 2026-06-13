// Public marketing-site contact form intake.
// Anonymous visitors POST here; this function inserts into public.inbound_leads
// using the service role (bypassing RLS). The table is NOT writable by anon.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const Body = z.object({
  name: z.string().trim().min(1).max(200),
  business_name: z.string().trim().max(200).optional().nullable(),
  email: z.string().trim().email().max(255),
  message: z.string().trim().min(1).max(4000),
  // Honeypot — must be empty. Real users never see/fill this field.
  company_website: z.string().max(0).optional().nullable(),
});

// NOTE: Best-effort, per-process rate limit. Edge functions are stateless and
// can scale horizontally, so this counter resets across cold starts / instances.
// It is NOT durable protection — the honeypot field above is the primary
// first line of defense. Do not mistake this for hard rate limiting.
const RATE: Map<string, { n: number; reset: number }> = new Map();
const LIMIT = 5;
const WINDOW_MS = 60_000;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const cur = RATE.get(ip);
  if (!cur || cur.reset < now) {
    RATE.set(ip, { n: 1, reset: now + WINDOW_MS });
    return false;
  }
  cur.n += 1;
  return cur.n > LIMIT;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (rateLimited(ip)) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let raw: unknown;
  try { raw = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Silently drop honeypot hits (already validated above as empty, but defensive
  // — if the field is present at all with content, schema would have failed).
  const { name, business_name, email, message } = parsed.data;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;

  const { error } = await admin.from("inbound_leads").insert({
    name,
    business_name: business_name || null,
    email,
    message,
    source: "public_site",
    user_agent: userAgent,
  });

  if (error) {
    console.error("[submit-inbound-lead] insert failed:", error);
    return new Response(JSON.stringify({ error: "Could not save submission" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});