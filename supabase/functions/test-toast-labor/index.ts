import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { guardIntegration } from '../_shared/integration-disabled.ts'; // __PHASE1_INTEGRATION_GUARD__

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  const __disabled = await guardIntegration('toast', corsHeaders);
  if (__disabled) return __disabled;

  try {
    const clientId = Deno.env.get("TOAST_CLIENT_ID")?.replace(/[^\x20-\x7E]/g, "").trim();
    const clientSecret = Deno.env.get("TOAST_CLIENT_SECRET")?.replace(/[^\x20-\x7E]/g, "").trim();

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: "Missing Toast credentials" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticate
    const authRes = await fetch("https://ws-api.toasttab.com/authentication/v1/authentication/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, clientSecret, userAccessType: "TOAST_MACHINE_CLIENT" }),
    });
    const authBody = await authRes.text();
    if (!authRes.ok) {
      return new Response(JSON.stringify({ error: "Auth failed", status: authRes.status, body: authBody }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { token } = JSON.parse(authBody);
    const guid = "7a2e83a9-181a-42f8-8fc3-a9d2048fcb4e";
    const baseHeaders = {
      "Authorization": `Bearer ${token}`,
      "Toast-Restaurant-External-ID": guid,
      "Content-Type": "application/json",
    };

    // Fetch Feb 28
    const feb28Url = `https://ws-api.toasttab.com/labor/v1/timeEntries?businessDate=20260228`;
    const feb28Res = await fetch(feb28Url, { headers: baseHeaders });
    const feb28Body = await feb28Res.text();

    // Fetch Mar 5
    const mar5Url = `https://ws-api.toasttab.com/labor/v1/timeEntries?businessDate=20260305`;
    const mar5Res = await fetch(mar5Url, { headers: baseHeaders });
    const mar5Body = await mar5Res.text();

    return new Response(JSON.stringify({
      feb28: { status: feb28Res.status, url: feb28Url, body: JSON.parse(feb28Body) },
      mar5: { status: mar5Res.status, url: mar5Url, body: JSON.parse(mar5Body) },
    }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
