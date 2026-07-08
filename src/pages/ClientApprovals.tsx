import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Flag, Pencil, Check, X as XIcon } from "lucide-react";
import {
  useAutomationQueue,
  useQueueMutations,
  type QueueItem,
} from "@/hooks/useAutomationQueue";
import type { AutomationKey } from "@/hooks/useAutomationEnrollments";

const AUTOMATION_LABELS: Record<AutomationKey, string> = {
  followup_sequence: "Follow-up",
  reactivation: "Reactivation",
  review_request: "Review request",
};

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const shown = local.slice(0, 1);
  return `${shown}${local.length > 1 ? "•••" : ""}@${domain}`;
}
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "•••";
  return `••• ••• ${digits.slice(-4)}`;
}
function maskContact(r: Record<string, unknown>): string {
  const email = r.email as string | undefined;
  const phone = r.phone as string | undefined;
  if (email) return maskEmail(email);
  if (phone) return maskPhone(phone);
  return "(no contact)";
}

function startOfIsoWeek(d = new Date()): Date {
  const day = d.getUTCDay() || 7;
  const r = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  if (day !== 1) r.setUTCDate(r.getUTCDate() - (day - 1));
  return r;
}

export default function ClientApprovals() {
  const { user } = useAuth();
  const [projectId, setProjectId] = useState<string | null>(null);

  // Resolve the single project this client can access.
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("venue_assignments" as any)
        .select("venue_id")
        .eq("user_id", user.id)
        .limit(1);
      const first = (data ?? [])[0] as { venue_id: string } | undefined;
      setProjectId(first?.venue_id ?? null);
    })();
  }, [user]);

  const { data: pending = [], isLoading } = useAutomationQueue({
    projectId,
    status: "pending_review",
  });
  const { data: myItems = [] } = useAutomationQueue({ projectId });

  const myUserId = user?.id ?? null;
  const avgApproveMinutes = useMemo(() => {
    if (!myUserId) return null;
    const since = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const mine = myItems.filter(
      (i) =>
        i.approved_by === myUserId &&
        i.approved_at &&
        new Date(i.created_at).getTime() >= since,
    );
    if (mine.length === 0) return null;
    const durations = mine
      .map((i) => new Date(i.approved_at!).getTime() - new Date(i.created_at).getTime())
      .sort((a, b) => a - b);
    const median = durations[Math.floor(durations.length / 2)];
    return Math.max(1, Math.round(median / 60000));
  }, [myItems, myUserId]);

  const sentThisWeek = useMemo(() => {
    if (!myUserId) return 0;
    const wkStart = startOfIsoWeek().getTime();
    return myItems.filter(
      (i) => i.status === "sent" && i.approved_by === myUserId && new Date(i.created_at).getTime() >= wkStart,
    ).length;
  }, [myItems, myUserId]);

  return (
    <div className="space-y-4">
      <div className="sticky top-14 z-20 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-lg font-semibold">Waiting on you: {pending.length}</h1>
          {avgApproveMinutes != null && (
            <span className="text-xs text-muted-foreground">
              Avg approve time: {avgApproveMinutes}m
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : pending.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-base font-medium">Nothing waiting on you — the system's working.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {sentThisWeek} {sentThisWeek === 1 ? "send" : "sends"} completed this week.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {pending.map((item) => <ApprovalCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}

function ApprovalCard({ item }: { item: QueueItem }) {
  const { approve, reject, flag } = useQueueMutations();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(item.edited_body ?? item.body);
  const recipient = item.recipient_snapshot as { name?: string };

  const changed = body !== (item.edited_body ?? item.body);
  const disabled = approve.isPending || reject.isPending || flag.isPending;

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge>{AUTOMATION_LABELS[item.automation_key]}</Badge>
        <Badge variant="outline">{item.channel}</Badge>
        {item.flagged_for_operator && (
          <Badge variant="destructive">Flagged</Badge>
        )}
      </div>
      <div className="text-sm">
        <div className="font-medium">{recipient.name ?? "(unknown recipient)"}</div>
        <div className="text-xs text-muted-foreground">{maskContact(item.recipient_snapshot)}</div>
      </div>
      {item.subject && (
        <div className="text-sm"><span className="text-muted-foreground">Subject:</span> {item.subject}</div>
      )}
      {editing ? (
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} className="text-sm" />
      ) : (
        <div className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">{body}</div>
      )}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
        <Button
          variant="outline"
          size="lg"
          className="min-h-11"
          disabled={disabled}
          onClick={async () => {
            try { await flag.mutateAsync(item.id); toast.success("Flagged for review"); }
            catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
          }}
        >
          <Flag className="mr-2 h-4 w-4" /> Flag
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="min-h-11"
          disabled={disabled}
          onClick={async () => {
            try {
              await reject.mutateAsync({ id: item.id, reason: "client_skipped" });
              toast.success("Skipped");
            } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
          }}
        >
          <XIcon className="mr-2 h-4 w-4" /> Skip
        </Button>
        {!editing ? (
          <Button variant="secondary" size="lg" className="min-h-11" onClick={() => setEditing(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
        ) : null}
        <Button
          size="lg"
          className="min-h-11"
          disabled={disabled}
          onClick={async () => {
            try {
              await approve.mutateAsync({
                id: item.id,
                editedBody: changed ? body : null,
              });
              toast.success("Approved");
            } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
          }}
        >
          <Check className="mr-2 h-4 w-4" />
          {editing && changed ? "Save & approve" : "Approve"}
        </Button>
      </div>
    </Card>
  );
}