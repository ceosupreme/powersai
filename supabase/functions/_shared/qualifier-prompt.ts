// Shared qualifier system-prompt builder used by both the realtime voice
// agent and the text-chat fallback. Reading config from
// project_type_qualifier_fields + project_type_qualifier_config keeps the
// agent vertical-agnostic.
import { createClient } from "npm:@supabase/supabase-js@2";

export interface QualifierField {
  field_key: string;
  field_label: string;
  field_type: string;
  is_shared: boolean;
  sort_order: number;
}

// Canonical urgency classes — must match the CHECK constraint on
// inbound_leads.urgency_class. Verticals may define any subset of these
// via project_type_qualifier_config.urgency_options, but MUST NOT invent
// new keys — the DB would reject the insert.
export const CANONICAL_URGENCY_CLASSES = [
  "emergency",
  "same_day",
  "routine",
  "estimate",
  "maintenance",
] as const;
export type UrgencyClass = typeof CANONICAL_URGENCY_CLASSES[number];

export interface UrgencyOption {
  label: string;
  guidance: string;
}

export interface QualifierContext {
  project_type: string;
  vertical_label: string;
  fields: QualifierField[];
  ready_definition: string | null;
  primary_channel: string | null;
  urgency_options: Partial<Record<UrgencyClass, UrgencyOption>> | null;
}

export async function loadQualifierContext(projectType: string): Promise<QualifierContext> {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [{ data: fields }, { data: cfg }, { data: pt }] = await Promise.all([
    admin.from("project_type_qualifier_fields")
      .select("field_key,field_label,field_type,is_shared,sort_order")
      .eq("project_type", projectType)
      .order("sort_order", { ascending: true }),
    admin.from("project_type_qualifier_config")
      .select("ready_definition,primary_channel,urgency_options")
      .eq("project_type", projectType)
      .maybeSingle(),
    admin.from("project_types").select("label").eq("id", projectType).maybeSingle(),
  ]);

  // Filter to canonical keys only — a misconfigured vertical row can never
  // widen the tool enum past what the DB CHECK will accept.
  const rawUrgency = (cfg as any)?.urgency_options ?? null;
  let urgency: Partial<Record<UrgencyClass, UrgencyOption>> | null = null;
  if (rawUrgency && typeof rawUrgency === "object") {
    const filtered: Partial<Record<UrgencyClass, UrgencyOption>> = {};
    for (const key of CANONICAL_URGENCY_CLASSES) {
      const v = rawUrgency[key];
      if (v && typeof v === "object" && typeof v.label === "string") {
        filtered[key] = { label: v.label, guidance: String(v.guidance ?? "") };
      }
    }
    if (Object.keys(filtered).length > 0) urgency = filtered;
  }

  return {
    project_type: projectType,
    vertical_label: (pt as any)?.label ?? projectType,
    fields: (fields ?? []) as QualifierField[],
    ready_definition: (cfg as any)?.ready_definition ?? null,
    primary_channel: (cfg as any)?.primary_channel ?? null,
    urgency_options: urgency,
  };
}

export function buildSystemPrompt(ctx: QualifierContext): string {
  const fieldList = ctx.fields
    .map((f, i) => `${i + 1}. ${f.field_label} (${f.field_key}, ${f.field_type})`)
    .join("\n");

  const urgencyBlock = ctx.urgency_options
    ? `

Urgency classification (important):
During the conversation, naturally figure out which of these best describes their situation, and pass it as \`urgency_class\` on the tool call:
${Object.entries(ctx.urgency_options)
  .map(([key, opt]) => `- ${key} — ${opt!.label}: ${opt!.guidance}`)
  .join("\n")}
If someone describes an emergency, do this FIRST before anything else:
1. Acknowledge briefly ("That sounds serious — let's get someone to you.").
2. Get a callback number RIGHT AWAY, before any other question.
3. Keep the rest of the conversation short.
4. If it sounds life-threatening, say once: "If this is life-threatening, please call 911." Do NOT give any other safety advice or instructions.`
    : "";

  return `You are a friendly intake agent for a ${ctx.vertical_label} business. Your job is to have a short, natural conversation with someone who just reached out, find out what they need, and decide if they're a good fit to hand off to the team right now.

Style rules:
- Plain language, warm, no jargon. Sound like a helpful human, not a survey.
- Ask ONE thing at a time. Keep each turn to 1–2 sentences.
- If they already told you something, don't ask it again.
- It's fine to combine two short related questions ("What's a good name and phone number to reach you?").
- If they sound urgent or upset, acknowledge that first.${urgencyBlock}

What you need to learn (you decide the order based on the conversation, but cover all of these before deciding):
${fieldList}

How to decide if they're ready to hand off:
${ctx.ready_definition ?? "They have a concrete need we can help with, they're contactable, and they're in our service area."}

When you have enough information (or it's clear they're NOT a fit), call the tool \`submit_qualified_lead\` with:
- \`qualifier_data\`: an object keyed by the field_keys above with the user's structured answers (strings are fine; use the closest option for selects).
- \`is_ready\`: true if they meet the ready definition, false otherwise.
- \`not_ready_reason\`: a short reason if is_ready is false (e.g. "outside service area", "no urgency / just browsing").
- \`summary\`: ONE sentence describing what they need.
${ctx.urgency_options ? "- `urgency_class`: one of the urgency keys above that best fits the situation.\n" : ""}

After calling the tool, tell them briefly what happens next ("Great — I'll have someone from the team reach out shortly at [number].") and end the conversation politely.`;
}

export const SUBMIT_TOOL_SCHEMA = {
  type: "function" as const,
  name: "submit_qualified_lead",
  description:
    "Save the qualified lead with structured field values and a readiness decision. Call exactly once when you have enough info or have determined they are not a fit.",
  parameters: {
    type: "object",
    properties: {
      qualifier_data: {
        type: "object",
        description: "Object keyed by qualifier field_key with the user's answers as strings.",
        additionalProperties: { type: "string" },
      },
      is_ready: { type: "boolean", description: "True if the lead matches the ready definition." },
      not_ready_reason: { type: "string", description: "Short reason when is_ready is false." },
      summary: { type: "string", description: "One-sentence summary of what the lead needs." },
      urgency_class: {
        type: "string",
        enum: [...CANONICAL_URGENCY_CLASSES],
        description: "OPTIONAL. Only set when the vertical uses urgency triage. Must be one of the canonical urgency classes.",
      },
    },
    required: ["qualifier_data", "is_ready", "summary"],
  },
} as const;