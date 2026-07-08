import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import {
  useAutomationEnrollments,
  useUpsertEnrollment,
  type AutomationKey,
} from "@/hooks/useAutomationEnrollments";
import { ApplyBundleControl } from "./ApplyBundleControl";

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
  const { isAdmin } = useAuth();
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
      <ApplyBundleControl projectId={projectId} />
      {isAdmin && <InviteClientApprover projectId={projectId} />}
      {DEFS.map((def) => {
        const e = byKey[def.key];
        return (
          <EnrollmentRow
            key={def.key}
            projectId={projectId}
            def={def}
            existing={e}
            saving={upsert.isPending}
            onSave={async (enabled, config, approval_mode) => {
              try {
                await upsert.mutateAsync({
                  project_id: projectId,
                  automation_key: def.key,
                  enabled,
                  config,
                  approval_mode,
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
  existing?: { enabled: boolean; config: Record<string, unknown>; approval_mode?: 'operator' | 'client' };
  saving: boolean;
  onSave: (enabled: boolean, config: Record<string, unknown>, approval_mode: 'operator' | 'client') => void;
}) {
  const [enabled, setEnabled] = useState(existing?.enabled ?? false);
  const initialConfig = existing?.config && Object.keys(existing.config).length ? existing.config : def.defaultConfig;
  const [configText, setConfigText] = useState(JSON.stringify(initialConfig, null, 2));
  const [mode, setMode] = useState<'operator' | 'client'>(existing?.approval_mode ?? 'operator');

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
        <Label className="text-xs">Approval mode</Label>
        <div className="inline-flex rounded-md border p-0.5">
          <button
            type="button"
            className={`px-3 py-1 text-xs rounded ${mode === 'operator' ? 'bg-primary text-primary-foreground' : ''}`}
            onClick={() => setMode('operator')}
          >Operator QA</button>
          <button
            type="button"
            className={`px-3 py-1 text-xs rounded ${mode === 'client' ? 'bg-primary text-primary-foreground' : ''}`}
            onClick={() => setMode('client')}
          >Client approves</button>
        </div>
        {mode === 'client' && (
          <p className="text-[11px] text-muted-foreground">Drafts wait for your client's one-tap approval.</p>
        )}
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
            onSave(enabled, parsed, mode);
          }}
        >Save</Button>
      </div>
    </Card>
  );
}

function InviteClientApprover({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Invite client approver</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Invite client approver</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          They'll get an email invite. On first sign-in they land on /approvals and can see queue items for this project only.
        </p>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="client@example.com"
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            disabled={sending || !email}
            onClick={async () => {
              setSending(true);
              try {
                const { error } = await (supabase as any).functions.invoke("invite-client-approver", {
                  body: { project_id: projectId, email },
                });
                if (error) throw error;
                toast.success("Invite sent");
                setOpen(false);
                setEmail("");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Invite failed");
              } finally {
                setSending(false);
              }
            }}
          >Send invite</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}