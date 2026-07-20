// Admin-only: invites a client approver and grants project access.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const BodySchema = z.object({
  project_id: z.string().uuid(),
  email: z.string().email(),
});

const ELEVATED_ROLES = new Set([
  "admin", "owner", "gm", "lead", "staff", "shift_lead", "foh", "boh",
]);

async function findExistingUserId(sb: ReturnType<typeof createClient>, email: string): Promise<string | null> {
  const lower = email.toLowerCase();
  const { data: prof } = await sb
    .from("profiles")
    .select("id")
    .ilike("email", lower)
    .maybeSingle();
  if (prof?.id) return prof.id as string;
  // Fallback: scan auth users (bounded page).
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) return null;
    const hit = data.users.find((u: any) => (u.email ?? "").toLowerCase() === lower);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "unauthorized" }, 401);

  const sbUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } },
  );
  const { data: userRes, error: userErr } = await sbUser.auth.getUser();
  if (userErr || !userRes.user) return json({ error: "unauthorized" }, 401);
  const callerId = userRes.user.id;

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Admin check via service role.
  const { data: roleRow } = await sb
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleRow) return json({ error: "admin_only" }, 403);

  let payload: unknown;
  try { payload = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const parsed = BodySchema.safeParse(payload);
  if (!parsed.success) {
    return json({ error: parsed.error.flatten().fieldErrors }, 400);
  }
  const { project_id, email } = parsed.data;

  const origin = req.headers.get("origin") ?? "";
  const redirectTo = origin
    ? `${origin}/reset-password?next=/approvals`
    : undefined;
  const signInUrl = origin ? `${origin}/auth` : "/auth";

  // Check if the email already resolves to an existing auth user.
  const existingId = await findExistingUserId(sb, email);
  if (existingId) {
    const { data: existingRoles } = await sb
      .from("user_roles")
      .select("role")
      .eq("user_id", existingId);
    const roles = (existingRoles ?? []).map((r: any) => String(r.role));
    const elevated = roles.find((r) => ELEVATED_ROLES.has(r));
    if (elevated) {
      return json({
        error: "team_account",
        message: "This email belongs to a team account and can't be used as a client approver.",
      }, 409);
    }
    // Role-less or already a client — grant project access.
    await sb.from("user_roles").upsert(
      { user_id: existingId, role: "client" },
      { onConflict: "user_id,role" },
    );
    await sb.from("venue_assignments").upsert(
      { user_id: existingId, venue_id: project_id },
      { onConflict: "user_id,venue_id" },
    );
    return json({
      ok: true,
      mode: "granted_existing",
      user_id: existingId,
      sign_in_url: signInUrl,
      message: `Access granted. They can sign in at ${signInUrl} with their existing password (Forgot password works if they never set one).`,
    });
  }

  const { data: inviteData, error: inviteErr } = await sb.auth.admin.inviteUserByEmail(email, {
    data: { invited_role: "client", invited_project_id: project_id },
    redirectTo,
  });
  if (inviteErr || !inviteData?.user) {
    const msg = inviteErr?.message ?? "invite_failed";
    // Race: someone signed up between our lookup and invite call.
    if (/already been registered|email_exists|already exists/i.test(msg)) {
      return json({
        error: "email_exists_race",
        message: "This email just registered elsewhere. Try again to grant access.",
      }, 409);
    }
    return json({ error: "invite_failed", message: msg }, 500);
  }
  const invitedId = inviteData.user.id;

  // Grant access immediately — the handle_new_user trigger already stamped
  // user_roles(client) on the auth.users insert, but we ensure it here too.
  await sb.from("user_roles").upsert(
    { user_id: invitedId, role: "client" },
    { onConflict: "user_id,role" },
  );
  await sb.from("venue_assignments").upsert(
    { user_id: invitedId, venue_id: project_id },
    { onConflict: "user_id,venue_id" },
  );

  return json({ ok: true, mode: "invited", user_id: invitedId });
});