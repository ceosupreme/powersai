const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { guardIntegration } from '../_shared/integration-disabled.ts'; // __PHASE1_INTEGRATION_GUARD__

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const __disabled = await guardIntegration('asana', corsHeaders);
  if (__disabled) return __disabled;

  try {
    const asanaToken = Deno.env.get("ASANA_ACCESS_TOKEN");
    if (!asanaToken) {
      return new Response(JSON.stringify({ error: "Asana token not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const jwtToken = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(jwtToken);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, params } = await req.json();

    // Helper for raw Asana API calls used by the marketing actions below.
    const asanaFetch = async (path: string, init: RequestInit = {}) => {
      const r = await fetch(`https://app.asana.com/api/1.0${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${asanaToken}`,
          "Content-Type": "application/json",
          ...(init.headers || {}),
        },
      });
      const text = await r.text();
      let body: any = null;
      try { body = text ? JSON.parse(text) : null; } catch { body = text; }
      return { ok: r.ok, status: r.status, body };
    };
    const jsonResp = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    if (action === "create_task") {
      const { name, notes, due_on, assignee, project_gid, section_gid, workspace_gid } = params;

      const fullNotes = notes || "";
      const taskData = {
        data: {
          name,
          notes: fullNotes,
          memberships: [{ project: project_gid, section: section_gid }],
          workspace: workspace_gid,
          ...(due_on && { due_on }),
          ...(assignee && { assignee }),
        },
      };

      const response = await fetch("https://app.asana.com/api/1.0/tasks", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${asanaToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        const error = await response.json();
        return new Response(
          JSON.stringify({ error: error.errors?.[0]?.message || "Asana API error" }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await response.json();
      return new Response(
        JSON.stringify({ gid: result.data.gid, permalink_url: result.data.permalink_url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Marketing Hub actions ─────────────────────────────────────────────

    if (action === "update_task") {
      const { task_gid, fields } = params;
      const { ok, status, body } = await asanaFetch(`/tasks/${task_gid}`, {
        method: "PUT",
        body: JSON.stringify({ data: fields }),
      });
      return jsonResp(ok ? body.data : { error: body?.errors?.[0]?.message || "update_task failed" }, ok ? 200 : status);
    }

    if (action === "get_task_full") {
      const { task_gid } = params;
      const optFields =
        "gid,name,notes,completed,completed_at,due_on,start_on,modified_at,permalink_url," +
        "assignee.gid,assignee.name,custom_fields.gid,custom_fields.name,custom_fields.display_value," +
        "custom_fields.text_value,custom_fields.number_value,custom_fields.enum_value.gid,custom_fields.enum_value.name";
      const { ok, status, body } = await asanaFetch(
        `/tasks/${task_gid}?opt_fields=${optFields}`
      );
      if (!ok) return jsonResp({ error: body?.errors?.[0]?.message || "get_task_full failed" }, status);
      const subtasksResp = await asanaFetch(
        `/tasks/${task_gid}/subtasks?opt_fields=gid,name,completed,completed_at`
      );
      const storiesResp = await asanaFetch(
        `/tasks/${task_gid}/stories?opt_fields=gid,text,html_text,created_at,type,resource_subtype,created_by.name`
      );
      return jsonResp({
        task: body.data,
        subtasks: subtasksResp.ok ? subtasksResp.body.data : [],
        stories: storiesResp.ok ? storiesResp.body.data : [],
      });
    }

    if (action === "add_subtasks") {
      const { task_gid, names } = params as { task_gid: string; names: string[] };
      const created: { gid: string; name: string }[] = [];
      for (const name of names) {
        const { ok, body } = await asanaFetch(`/tasks/${task_gid}/subtasks`, {
          method: "POST",
          body: JSON.stringify({ data: { name } }),
        });
        if (ok) created.push({ gid: body.data.gid, name: body.data.name });
      }
      return jsonResp({ created });
    }

    if (action === "post_comment") {
      const { task_gid, text, html_text } = params as { task_gid: string; text?: string; html_text?: string };
      // Asana stories accept either `text` (plain) or `html_text` (rich, supports
      // <a data-asana-gid="GID"/> mentions). Prefer html_text when provided.
      const data: Record<string, string> = html_text ? { html_text } : { text: text ?? '' };
      const { ok, status, body } = await asanaFetch(`/tasks/${task_gid}/stories`, {
        method: "POST",
        body: JSON.stringify({ data }),
      });
      return jsonResp(ok ? { gid: body.data.gid } : { error: body?.errors?.[0]?.message || "post_comment failed" }, ok ? 200 : status);
    }

    if (action === "upload_attachment") {
      // 10MB hard limit on attachments through the proxy. Anything larger is rejected
      // with a clear error — we don't silently truncate. If the user needs bigger
      // assets later, swap to a signed-URL flow.
      const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
      const { task_gid, filename, content_type, base64 } = params as {
        task_gid: string; filename: string; content_type: string; base64: string;
      };
      // base64 length * 3/4 ≈ decoded bytes
      const approxBytes = Math.floor(base64.length * 0.75);
      if (approxBytes > ATTACHMENT_MAX_BYTES) {
        return jsonResp({
          error: `Attachment "${filename}" is ${(approxBytes / 1024 / 1024).toFixed(1)}MB. Maximum allowed is 10MB per attachment.`,
        }, 413);
      }
      const bin = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const fd = new FormData();
      fd.append("parent", task_gid);
      fd.append("file", new Blob([bin], { type: content_type }), filename);
      const r = await fetch("https://app.asana.com/api/1.0/attachments", {
        method: "POST",
        headers: { Authorization: `Bearer ${asanaToken}` },
        body: fd,
      });
      const txt = await r.text();
      const j = txt ? JSON.parse(txt) : {};
      if (!r.ok) return jsonResp({ error: j?.errors?.[0]?.message || "upload_attachment failed" }, r.status);
      return jsonResp({ gid: j.data.gid, name: j.data.name });
    }

    if (action === "create_section") {
      const { project_gid, name } = params;
      const { ok, status, body } = await asanaFetch(`/projects/${project_gid}/sections`, {
        method: "POST",
        body: JSON.stringify({ data: { name } }),
      });
      return jsonResp(ok ? { gid: body.data.gid, name: body.data.name } : { error: body?.errors?.[0]?.message || "create_section failed" }, ok ? 200 : status);
    }

    if (action === "list_sections") {
      const { project_gid } = params;
      const { ok, status, body } = await asanaFetch(`/projects/${project_gid}/sections?opt_fields=gid,name`);
      return jsonResp(ok ? body.data : { error: body?.errors?.[0]?.message || "list_sections failed" }, ok ? 200 : status);
    }

    if (action === "list_custom_field_settings") {
      const { project_gid } = params;
      const { ok, status, body } = await asanaFetch(
        `/projects/${project_gid}/custom_field_settings?opt_fields=custom_field.gid,custom_field.name,custom_field.resource_subtype,custom_field.enum_options.gid,custom_field.enum_options.name`
      );
      return jsonResp(ok ? body.data : { error: body?.errors?.[0]?.message || "list_custom_field_settings failed" }, ok ? 200 : status);
    }

    if (action === "create_custom_field") {
      const { workspace_gid, name, resource_subtype, enum_options, currency_code } = params;
      const data: any = { workspace: workspace_gid, name, resource_subtype };
      if (resource_subtype === "enum" && enum_options) {
        data.enum_options = enum_options.map((o: string) => ({ name: o }));
      }
      if (resource_subtype === "number" && currency_code) {
        data.format = "currency";
        data.currency_code = currency_code;
        data.precision = 0;
      }
      const { ok, status, body } = await asanaFetch(`/custom_fields`, {
        method: "POST",
        body: JSON.stringify({ data }),
      });
      return jsonResp(ok ? body.data : { error: body?.errors?.[0]?.message || "create_custom_field failed" }, ok ? 200 : status);
    }

    if (action === "add_custom_field_to_project") {
      const { project_gid, custom_field_gid } = params;
      const { ok, status, body } = await asanaFetch(
        `/projects/${project_gid}/addCustomFieldSetting`,
        { method: "POST", body: JSON.stringify({ data: { custom_field: custom_field_gid } }) }
      );
      return jsonResp(ok ? body.data : { error: body?.errors?.[0]?.message || "add_custom_field_to_project failed" }, ok ? 200 : status);
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("asana-proxy error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
