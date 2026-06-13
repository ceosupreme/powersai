// Pushes a Marketing Hub campaign to its venue's Asana board.
// Supports dry_run preview (no writes) and live writes (gated by
// venue_execution_adapters.live_writes_enabled).
//
// Note: For Prompt 8 the Campaign object is passed in by the client
// (campaigns are not yet persisted server-side). The venue's adapter
// config IS persisted and is the source of truth for live-writes gating.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
import { guardIntegration } from '../_shared/integration-disabled.ts'; // __PHASE1_INTEGRATION_GUARD__
  MARKETING_FIELD_DEFS,
  MARKETING_SUBTASK_TEMPLATE,
  type MarketingFieldKey,
} from "../_shared/marketing-asana-fields.ts";

const ASANA_BASE = "https://app.asana.com/api/1.0";
const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024; // 10MB hard limit

type CampaignPayload = {
  id: string;
  venueId: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  type: string;
  status: string;
  recurrence: string;
  brandPartner?: string | null;
  budget?: number | null;
  expectedGuestCount?: number | null;
  expectedRevenueImpact?: number | null;
  linkedToastPromoCode?: string | null;
  linkedMenuItems?: string[];
  staffBrief?: string | null;
  assets?: { id: string; kind: string; title: string; body: string }[];
  attachments?: { filename: string; content_type: string; base64: string }[];
  externalTaskId?: string | null;
};

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
    const { data: claims, error: claimsErr } =
      await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { campaign, dry_run } = await req.json() as { campaign: CampaignPayload; dry_run: boolean };
    if (!campaign?.venueId) {
      return new Response(JSON.stringify({ error: "campaign.venueId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: cfg, error: cfgErr } = await admin
      .from("venue_execution_adapters")
      .select("*")
      .eq("venue_id", campaign.venueId)
      .maybeSingle();
    if (cfgErr) throw cfgErr;
    if (!cfg) throw new Error("Venue adapter not configured. Run setup first.");
    if (!cfg.asana_project_gid || !cfg.asana_section_gid) {
      throw new Error("Asana project_gid / section_gid missing on venue adapter.");
    }

    // Validate attachment sizes upfront (works for dry_run too — fail loud).
    for (const att of campaign.attachments || []) {
      const approx = Math.floor(att.base64.length * 0.75);
      if (approx > ATTACHMENT_MAX_BYTES) {
        return new Response(JSON.stringify({
          error: `Attachment "${att.filename}" is ${(approx / 1024 / 1024).toFixed(1)}MB. Max 10MB per attachment.`,
        }), { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Build the task payload preview.
    const fieldMap = (cfg.asana_custom_field_map || {}) as Record<MarketingFieldKey, string>;
    const customFieldValues = buildCustomFieldValues(campaign, fieldMap);
    const notes = buildNotes(campaign);
    const commentBlocks = buildCommentBlocks(campaign);

    const preview = {
      task_name: campaign.title,
      section: { gid: cfg.asana_section_gid, name: "Marketing Efforts" },
      project_gid: cfg.asana_project_gid,
      start_on: campaign.startDate,
      due_on: campaign.endDate,
      notes_preview: notes.slice(0, 600),
      custom_fields: MARKETING_FIELD_DEFS.map(d => ({
        key: d.key,
        asana_name: d.asanaName,
        gid: fieldMap[d.key] || null,
        value: customFieldValues[d.key] ?? null,
      })),
      subtasks: MARKETING_SUBTASK_TEMPLATE,
      comments: commentBlocks.map(c => ({ asset_id: c.assetId, kind: c.kind, preview: c.text.slice(0, 200) })),
      attachments: (campaign.attachments || []).map(a => ({
        filename: a.filename,
        size_bytes: Math.floor(a.base64.length * 0.75),
      })),
      live_writes_enabled: cfg.live_writes_enabled,
    };

    if (dry_run) {
      return new Response(JSON.stringify({ ok: true, dry_run: true, preview }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!cfg.live_writes_enabled) {
      return new Response(JSON.stringify({
        error: "Live writes are disabled for this venue. Enable in Admin Panel → Marketing Hub.",
      }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Live writes ──────────────────────────────────────────────────────
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

    const numericCustom: Record<string, any> = {};
    for (const d of MARKETING_FIELD_DEFS) {
      const gid = fieldMap[d.key]; if (!gid) continue;
      const v = customFieldValues[d.key];
      if (v == null) continue;
      numericCustom[gid] = v;
    }

    let taskGid = campaign.externalTaskId || null;
    let permalink: string | null = null;

    if (!taskGid) {
      const taskRes = await af(`/tasks`, {
        method: "POST",
        body: JSON.stringify({
          data: {
            name: campaign.title,
            notes,
            start_on: campaign.startDate,
            due_on: campaign.endDate,
            memberships: [{ project: cfg.asana_project_gid, section: cfg.asana_section_gid }],
            custom_fields: numericCustom,
          },
        }),
      });
      taskGid = taskRes.data.gid;
      permalink = taskRes.data.permalink_url;

      // Subtasks (only on first creation).
      for (const name of MARKETING_SUBTASK_TEMPLATE) {
        await af(`/tasks/${taskGid}/subtasks`, {
          method: "POST", body: JSON.stringify({ data: { name } }),
        });
      }
    } else {
      const upd = await af(`/tasks/${taskGid}`, {
        method: "PUT",
        body: JSON.stringify({
          data: {
            name: campaign.title,
            notes,
            start_on: campaign.startDate,
            due_on: campaign.endDate,
            custom_fields: numericCustom,
          },
        }),
      });
      permalink = upd.data.permalink_url;
    }

    // Set BarPulse Sync ID custom field (separate update so the value matches campaign.id).
    const syncIdGid = fieldMap.barpulse_sync_id;
    if (syncIdGid) {
      await af(`/tasks/${taskGid}`, {
        method: "PUT",
        body: JSON.stringify({ data: { custom_fields: { [syncIdGid]: campaign.id } } }),
      });
    }

    // Asset comments.
    for (const cmt of commentBlocks) {
      await af(`/tasks/${taskGid}/stories`, {
        method: "POST", body: JSON.stringify({ data: { text: cmt.text } }),
      });
    }

    // Attachments.
    for (const att of campaign.attachments || []) {
      const bin = Uint8Array.from(atob(att.base64), c => c.charCodeAt(0));
      const fd = new FormData();
      fd.append("parent", taskGid!);
      fd.append("file", new Blob([bin], { type: att.content_type }), att.filename);
      const r = await fetch(`${ASANA_BASE}/attachments`, {
        method: "POST", headers: { Authorization: `Bearer ${asanaToken}` }, body: fd,
      });
      if (!r.ok) console.error(`[marketing-asana-push] attachment ${att.filename} failed: ${r.status}`);
    }

    return new Response(JSON.stringify({
      ok: true, dry_run: false,
      external_task_id: taskGid, permalink_url: permalink,
      synced_at: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[marketing-asana-push]", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildCustomFieldValues(c: CampaignPayload, _map: Record<string, string>) {
  return {
    effort_type: c.type,
    marketing_status: c.status,
    recurrence: c.recurrence,
    brand_partner: c.brandPartner ?? null,
    budget: c.budget ?? null,
    expected_guest_count: c.expectedGuestCount ?? null,
    expected_revenue_impact: c.expectedRevenueImpact ?? null,
    toast_promo_code: c.linkedToastPromoCode ?? null,
    linked_menu_items: (c.linkedMenuItems || []).join(", ") || null,
    barpulse_sync_id: c.id,
  } as Record<MarketingFieldKey, any>;
}

function buildNotes(c: CampaignPayload) {
  const parts = [c.description?.trim()];
  if (c.staffBrief?.trim()) {
    parts.push("\n\n—— Staff Brief ——\n" + c.staffBrief.trim());
  }
  parts.push(`\n\n[barpulse_campaign:${c.id}]`);
  return parts.filter(Boolean).join("");
}

function buildCommentBlocks(c: CampaignPayload) {
  return (c.assets || []).map(a => ({
    assetId: a.id,
    kind: a.kind,
    text: `${labelForKind(a.kind)} — ${a.title}\n\n${a.body}\n\n[barpulse_asset:${a.id}]`,
  }));
}

function labelForKind(k: string) {
  const map: Record<string, string> = {
    campaign_brief: "Campaign Brief",
    social_post: "Social Caption",
    gbp_post: "GBP Post",
    email_draft: "Email",
    sms_draft: "SMS",
    staff_script: "Staff Script",
    measurement_plan: "Measurement Plan",
    ops_fix_brief: "Ops Brief",
  };
  return map[k] || k;
}
