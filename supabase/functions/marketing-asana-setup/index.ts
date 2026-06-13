import { guardIntegration } from '../_shared/integration-disabled.ts'; // __PHASE1_INTEGRATION_GUARD__
// Per-venue setup: ensures the "Marketing Efforts" section + 10 marketing
// custom fields exist on the venue's quarterly Asana project, persists their
// GIDs into venue_execution_adapters. Idempotent.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  MARKETING_FIELD_DEFS,
  MARKETING_SECTION_NAME,
  type MarketingFieldKey,
} from "../_shared/marketing-asana-fields.ts";

const ASANA_BASE = "https://app.asana.com/api/1.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const __disabled = await guardIntegration('asana', corsHeaders);
  if (__disabled) return __disabled;
  try {
    const asanaToken = Deno.env.get("ASANA_ACCESS_TOKEN");
    if (!asanaToken) {
      return new Response(JSON.stringify({ error: "ASANA_ACCESS_TOKEN not set" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    const { data: claims, error: claimsErr } =
      await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { venue_id, project_gid, workspace_gid } = await req.json();
    if (!venue_id || !project_gid || !workspace_gid) {
      return new Response(JSON.stringify({ error: "venue_id, project_gid, workspace_gid required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const af = async (path: string, init: RequestInit = {}) => {
      const r = await fetch(`${ASANA_BASE}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${asanaToken}`,
          "Content-Type": "application/json",
          ...(init.headers || {}),
        },
      });
      const t = await r.text();
      const j = t ? JSON.parse(t) : null;
      if (!r.ok) throw new Error(`Asana ${path} ${r.status}: ${j?.errors?.[0]?.message || t}`);
      return j;
    };

    // 1. Ensure Marketing Efforts section.
    const sections = await af(`/projects/${project_gid}/sections?opt_fields=gid,name`);
    let section = (sections.data as any[]).find(s => s.name === MARKETING_SECTION_NAME);
    if (!section) {
      const created = await af(`/projects/${project_gid}/sections`, {
        method: "POST",
        body: JSON.stringify({ data: { name: MARKETING_SECTION_NAME } }),
      });
      section = created.data;
    }

    // 2. Ensure each custom field exists & is added to the project.
    const settings = await af(
      `/projects/${project_gid}/custom_field_settings?opt_fields=custom_field.gid,custom_field.name`,
    );
    const existingByName = new Map<string, string>();
    for (const s of settings.data as any[]) {
      if (s?.custom_field?.name) existingByName.set(s.custom_field.name, s.custom_field.gid);
    }

    const fieldMap: Record<MarketingFieldKey, string> = {} as any;
    const created: string[] = [];

    for (const def of MARKETING_FIELD_DEFS) {
      let gid = existingByName.get(def.asanaName);
      if (!gid) {
        const data: any = {
          workspace: workspace_gid,
          name: def.asanaName,
          resource_subtype: def.resourceSubtype,
        };
        if (def.resourceSubtype === "enum" && def.enumOptions) {
          data.enum_options = def.enumOptions.map(name => ({ name }));
        }
        if (def.resourceSubtype === "number" && def.currencyCode) {
          data.format = "currency";
          data.currency_code = def.currencyCode;
          data.precision = 0;
        }
        const cf = await af(`/custom_fields`, { method: "POST", body: JSON.stringify({ data }) });
        gid = cf.data.gid;
        await af(`/projects/${project_gid}/addCustomFieldSetting`, {
          method: "POST",
          body: JSON.stringify({ data: { custom_field: gid } }),
        });
        created.push(def.asanaName);
      }
      fieldMap[def.key] = gid!;
    }

    // 3. Persist to venue_execution_adapters.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error: upErr } = await admin
      .from("venue_execution_adapters")
      .upsert({
        venue_id,
        adapter_type: "asana",
        asana_project_gid: project_gid,
        asana_section_gid: section.gid,
        asana_custom_field_map: fieldMap,
        last_field_setup_at: new Date().toISOString(),
      });
    if (upErr) throw upErr;

    return new Response(JSON.stringify({
      ok: true,
      section_gid: section.gid,
      custom_field_map: fieldMap,
      created_fields: created,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[marketing-asana-setup]", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
