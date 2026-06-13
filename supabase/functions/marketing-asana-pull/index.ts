// Pulls Asana state back into BarPulse.
//
// Modes:
//   - { external_task_id, venue_id, campaign_id? }  → single-task reconciliation
//     (returns a patch the client applies to its store).
//   - { sweep: true, venue_id? }                    → section sweep across the
//     venue's Marketing Efforts section. For each task without a BarPulse Sync
//     ID custom field value, creates a marketing_campaigns row with
//     origin='manual_external' and writes the new id back into the Asana
//     custom field. Tasks already linked are reconciled in-place.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { type MarketingFieldKey } from "../_shared/marketing-asana-fields.ts";
import { guardIntegration } from '../_shared/integration-disabled.ts'; // __PHASE1_INTEGRATION_GUARD__

const ASANA_BASE = "https://app.asana.com/api/1.0";
const TASK_OPT_FIELDS =
  "gid,name,notes,completed,completed_at,due_on,start_on,modified_at,permalink_url," +
  "custom_fields.gid,custom_fields.text_value,custom_fields.number_value,custom_fields.enum_value.name";

type CustomDelta = Partial<Record<MarketingFieldKey, unknown>>;

function readCustomFields(
  task: any,
  reverseMap: Map<string, MarketingFieldKey>,
): CustomDelta {
  const out: CustomDelta = {};
  for (const cf of (task.custom_fields || []) as any[]) {
    const key = reverseMap.get(cf.gid);
    if (!key) continue;
    const value = cf.enum_value?.name ?? cf.text_value ?? cf.number_value ?? null;
    out[key] = value;
  }
  return out;
}

async function asanaFetch(token: string, path: string, init: RequestInit = {}) {
  const r = await fetch(`${ASANA_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await r.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { ok: r.ok, status: r.status, body };
}

// Pull every task in a section, capped to keep us inside the function budget.
async function listSectionTasks(token: string, sectionGid: string, hardCap = 500) {
  const tasks: any[] = [];
  let offset: string | undefined;
  for (let page = 0; page < 10 && tasks.length < hardCap; page++) {
    const qs = new URLSearchParams({ limit: "100", opt_fields: TASK_OPT_FIELDS });
    if (offset) qs.set("offset", offset);
    const { ok, body } = await asanaFetch(token, `/sections/${sectionGid}/tasks?${qs}`);
    if (!ok) throw new Error(`list section tasks failed: ${JSON.stringify(body)}`);
    tasks.push(...(body.data || []));
    offset = body.next_page?.offset;
    if (!offset) break;
  }
  return tasks.slice(0, hardCap);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const __disabled = await guardIntegration('asana', corsHeaders);
  if (__disabled) return __disabled;
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

    const body = await req.json().catch(() => ({}));
    const { venue_id, external_task_id, campaign_id, sweep } = body as {
      venue_id?: string;
      external_task_id?: string;
      campaign_id?: string;
      sweep?: boolean;
    };

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ════════════════════════════════════════════════════════════════════
    // SWEEP MODE
    // ════════════════════════════════════════════════════════════════════
    if (sweep) {
      const adapterQuery = admin
        .from("venue_execution_adapters")
        .select("venue_id, asana_section_gid, asana_custom_field_map")
        .not("asana_section_gid", "is", null);
      const { data: adapters, error: adErr } = venue_id
        ? await adapterQuery.eq("venue_id", venue_id)
        : await adapterQuery;
      if (adErr) throw adErr;

      // Resolve venue display names in one shot.
      const vIds = (adapters || []).map(a => a.venue_id);
      const venueNameById = new Map<string, string>();
      if (vIds.length) {
        const { data: vs } = await admin.from("venues").select("id, name").in("id", vIds);
        for (const v of (vs || [])) venueNameById.set(v.id, v.name);
      }

      let scanned = 0, created = 0, updated = 0, needs_details = 0, skipped = 0;
      const skippedVenues: { venue_id: string; reason: string }[] = [];

      for (const adapter of (adapters || [])) {
        const fieldMap = (adapter.asana_custom_field_map || {}) as Record<MarketingFieldKey, string>;
        const syncIdGid = fieldMap.barpulse_sync_id;
        if (!syncIdGid || !fieldMap.effort_type) {
          skippedVenues.push({ venue_id: adapter.venue_id, reason: "field_map_incomplete" });
          continue;
        }
        const reverseMap = new Map(
          Object.entries(fieldMap).map(([k, v]) => [v, k as MarketingFieldKey]),
        );
        const venueName = venueNameById.get(adapter.venue_id) ?? "Unknown venue";

        let tasks: any[] = [];
        try {
          tasks = await listSectionTasks(asanaToken, adapter.asana_section_gid!);
        } catch (e) {
          console.error(`[sweep] list failed for venue ${adapter.venue_id}:`, e);
          skippedVenues.push({ venue_id: adapter.venue_id, reason: "list_failed" });
          continue;
        }

        for (const task of tasks) {
          scanned++;
          try {
            const customDelta = readCustomFields(task, reverseMap);
            const stampedSyncId =
              typeof customDelta.barpulse_sync_id === "string" && customDelta.barpulse_sync_id.trim()
                ? (customDelta.barpulse_sync_id as string).trim()
                : null;

            // Try to find an existing campaign — first by stamped sync id,
            // then by external_id (covers prior failed write-backs).
            let existingId: string | null = null;
            if (stampedSyncId) {
              const { data } = await admin
                .from("marketing_campaigns")
                .select("id")
                .eq("id", stampedSyncId)
                .maybeSingle();
              if (data) existingId = data.id;
            }
            if (!existingId) {
              const { data } = await admin
                .from("marketing_campaigns")
                .select("id")
                .eq("execution_adapter->>external_id", task.gid)
                .maybeSingle();
              if (data) existingId = data.id;
            }

            if (existingId) {
              // Linked path → reconcile in place.
              const patch: Record<string, unknown> = {
                title: task.name,
                start_date: task.start_on ?? undefined,
                end_date: task.due_on ?? undefined,
                last_synced_from: "asana",
                execution_adapter: {
                  adapter_type: "asana",
                  external_id: task.gid,
                  sync_status: "Synced",
                  last_synced_at: new Date().toISOString(),
                  permalink_url: task.permalink_url,
                },
              };
              if (customDelta.marketing_status) patch.status = customDelta.marketing_status;
              // Strip undefineds so date-NOT-NULL columns don't get clobbered.
              for (const k of Object.keys(patch)) if (patch[k] === undefined) delete patch[k];

              await admin.from("marketing_campaigns").update(patch).eq("id", existingId);
              updated++;
              continue;
            }

            // Unlinked path → create.
            const newId = crypto.randomUUID();
            const missing: string[] = [];
            if (!customDelta.effort_type) missing.push("effort_type");
            if (!task.start_on) missing.push("start_date");
            if (!task.due_on) missing.push("end_date");
            const isJotform = /\[source:jotform\]/i.test(task.notes || "");
            const today = new Date().toISOString().slice(0, 10);

            const insertRow = {
              id: newId,
              venue_id: adapter.venue_id,
              venue_name: venueName,
              origin: "manual_external" as const,
              external_subsource: isJotform ? "jotform" : null,
              title: task.name || "(untitled)",
              type: (customDelta.effort_type as string) || "Other",
              status: "Draft",
              start_date: (task.start_on as string) || today,
              end_date: (task.due_on as string) || today,
              description: task.notes || "",
              objective: "",
              recurrence: (customDelta.recurrence as string) || "One-Time",
              target_audience: "",
              channels: [],
              brand_partner: (customDelta.brand_partner as string) || null,
              budget: (customDelta.budget as number) ?? null,
              expected_guest_count: (customDelta.expected_guest_count as number) ?? null,
              expected_revenue_impact: (customDelta.expected_revenue_impact as number) ?? null,
              linked_toast_promo_code: (customDelta.toast_promo_code as string) || null,
              linked_menu_items: [],
              success_metric: "",
              attachments: [],
              execution_adapter: {
                adapter_type: "asana",
                external_id: task.gid,
                sync_status: "Synced",
                last_synced_at: new Date().toISOString(),
                permalink_url: task.permalink_url,
              },
              last_synced_from: "asana",
              needs_details: missing.length > 0,
              missing_fields: missing,
            };

            const { error: insErr } = await admin.from("marketing_campaigns").insert(insertRow);
            if (insErr) {
              console.error(`[sweep] insert failed for task ${task.gid}:`, insErr);
              skipped++;
              continue;
            }

            // Write the BarPulse Sync ID back to Asana so the next sweep treats
            // this task as linked. If write-back fails, we still keep the
            // campaign — the external_id lookup above will catch it next time.
            const writeBack = await asanaFetch(asanaToken, `/tasks/${task.gid}`, {
              method: "PUT",
              body: JSON.stringify({
                data: { custom_fields: { [syncIdGid]: newId } },
              }),
            });
            if (!writeBack.ok) {
              console.warn(`[sweep] sync_id write-back failed for ${task.gid}:`, writeBack.body);
            }

            created++;
            if (missing.length > 0) needs_details++;
          } catch (e) {
            console.error(`[sweep] task ${task.gid} failed:`, e);
            skipped++;
          }
        }
      }

      return new Response(JSON.stringify({
        ok: true, sweep: true,
        scanned, created, updated, needs_details, skipped,
        venues: (adapters || []).length,
        skipped_venues: skippedVenues,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ════════════════════════════════════════════════════════════════════
    // SINGLE-TASK MODE (unchanged behavior)
    // ════════════════════════════════════════════════════════════════════
    if (!venue_id || !external_task_id) {
      return new Response(JSON.stringify({ error: "venue_id, external_task_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: cfg, error: cfgErr } = await admin
      .from("venue_execution_adapters")
      .select("asana_custom_field_map")
      .eq("venue_id", venue_id)
      .maybeSingle();
    if (cfgErr || !cfg) throw new Error("Venue adapter not configured");
    const fieldMap = (cfg.asana_custom_field_map || {}) as Record<MarketingFieldKey, string>;
    const reverseMap = new Map(
      Object.entries(fieldMap).map(([k, v]) => [v, k as MarketingFieldKey]),
    );

    const taskRes = await fetch(`${ASANA_BASE}/tasks/${external_task_id}?opt_fields=${TASK_OPT_FIELDS}`, {
      headers: { Authorization: `Bearer ${asanaToken}` },
    });
    if (taskRes.status === 404) {
      return new Response(JSON.stringify({
        ok: true, sync_lost: true, campaign_id,
        synced_at: new Date().toISOString(),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!taskRes.ok) {
      const t = await taskRes.text();
      throw new Error(`Asana task fetch ${taskRes.status}: ${t}`);
    }
    const task = (await taskRes.json()).data;

    const subRes = await fetch(
      `${ASANA_BASE}/tasks/${external_task_id}/subtasks?opt_fields=gid,name,completed,completed_at`,
      { headers: { Authorization: `Bearer ${asanaToken}` } },
    );
    const subtasks = subRes.ok ? (await subRes.json()).data : [];

    const stRes = await fetch(
      `${ASANA_BASE}/tasks/${external_task_id}/stories?opt_fields=gid,text,created_at,type,resource_subtype,created_by.name`,
      { headers: { Authorization: `Bearer ${asanaToken}` } },
    );
    const stories = stRes.ok ? (await stRes.json()).data : [];
    const comments = (stories as any[])
      .filter(s => s.type === "comment")
      .map(s => ({
        gid: s.gid, text: s.text, author: s.created_by?.name || "Asana user",
        created_at: s.created_at,
      }));

    const customDelta = readCustomFields(task, reverseMap);

    const patch = {
      title: task.name,
      startDate: task.start_on,
      endDate: task.due_on,
      ...(customDelta.marketing_status ? { status: customDelta.marketing_status } : {}),
      executionAdapter: {
        adapter_type: "asana",
        external_id: task.gid,
        sync_status: "Synced",
        last_synced_at: new Date().toISOString(),
        permalink_url: task.permalink_url,
      },
      lastSyncedFrom: "asana",
      asanaModifiedAt: task.modified_at,
    };

    return new Response(JSON.stringify({
      ok: true, sync_lost: false, campaign_id,
      patch, subtasks, comments, custom_fields: customDelta,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[marketing-asana-pull]", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
