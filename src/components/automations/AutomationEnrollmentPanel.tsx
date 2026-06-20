import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useAutomationEnrollments,
  useUpsertEnrollment,
  type AutomationKey,
} from "@/hooks/useAutomationEnrollments";

interface Props { projectId: string }

const DEFS: Array<{
  key: AutomationKey;
  title: string;
  description: string;
  defaultConfig: Record<string, unknown>;
}> = [
  {
    key: "followup_sequence",
    title: "Follow-up sequences",
    description: "Auto-draft multi-touch outreach when a qualified lead lands. Queued for your approval.",
    defaultConfig: {
      channels: ["email"],
      sequence_days: [0, 1, 3, 7, 14, 30],
      tone: "professional, direct, friendly",
      adapters: { email: "manual_log", sms: "manual_log" },
    },
  },
  {
    key: "reactivation",
    title: "Customer reactivation",
    description: "Win-back campaigns to lapsed customers. Operator picks the list, AI drafts segments, you approve.",
    defaultConfig: { adapters: { email: "manual_log", sms: "manual_log" } },
  },
  {
    key: "review_request",
    title: "Review requests",
    description: "Drafts a review ask after a marked visit. You approve, then it sends.",
    defaultConfig: {
      delay_hours: 2,
      platform_link: "",
      venue_name: "",
      adapters: { email: "manual_log", sms: "manual_log" },
    },
  },
];

export function AutomationEnrollmentPanel({ projectId }: Props) {
  const { data: enrollments = [], isLoading } = useAutomationEnrollments(projectId);
  const upsert = useUpsertEnrollment();
  const byKey = useMemo(() => {
    const m: Record<string, typeof enrollments[number]> = {};
    for (const e of enrollments) m[e.automation_key] = e;
    return m;
  }, [enrollments]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Nothing reaches your customers without your approval. Every draft lands in the Automation Inbox first.
        Send-channel is pluggable — defaults to a manual/log adapter that records what would have sent.
      </p>
      {DEFS.map((def) => {
        const e = byKey[def.key];
        return (
          <EnrollmentRow
            key={def.key}
            projectId={projectId}
            def={def}
            existing={e}
            saving={upsert.isPending}
            onSave={async (enabled, config) => {
              try {
                await upsert.mutateAsync({
                  project_id: projectId,
                  automation_key: def.key,
                  enabled,
                  config,
                });
                toast.success(`${def.title} ${enabled ? "enabled" : "disabled"}`);
              } catch (err) {
                const msg = err instanceof Error ? err.message : "Failed";
                toast.error(msg);
              }
            }}
          />
        );
      })}
      {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
    </div>
  );
}

function EnrollmentRow({
  def, existing, saving, onSave,
}: {
  projectId: string;
  def: typeof DEFS[number];
  existing?: { enabled: boolean; config: Record<string, unknown> };
  saving: boolean;
  onSave: (enabled: boolean, config: Record<string, unknown>) => void;
}) {
  const [enabled, setEnabled] = useState(existing?.enabled ?? false);
  const initialConfig = existing?.config && Object.keys(existing.config).length ? existing.config : def.defaultConfig;
  const [configText, setConfigText] = useState(JSON.stringify(initialConfig, null, 2));

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-medium">{def.title}</h4>
          <p className="text-xs text-muted-foreground">{def.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor={`enr-${def.key}`} className="text-xs">{enabled ? "On" : "Off"}</Label>
          <Switch id={`enr-${def.key}`} checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Config (JSON)</Label>
        <Textarea
          value={configText}
          onChange={(e) => setConfigText(e.target.value)}
          rows={6}
          className="font-mono text-xs"
        />
      </div>
      <div className="flex justify-end">
        <Button
          size="sm"
          disabled={saving}
          onClick={() => {
            let parsed: Record<string, unknown>;
            try { parsed = JSON.parse(configText); }
            catch { toast.error("Config is not valid JSON"); return; }
            onSave(enabled, parsed);
          }}
        >Save</Button>
      </div>
    </Card>
  );
}