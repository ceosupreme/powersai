import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  useAutomationQueue,
  useQueueMutations,
  type QueueItem,
  type QueueStatus,
} from "@/hooks/useAutomationQueue";
import { type AutomationKey, useAutomationEnrollments } from "@/hooks/useAutomationEnrollments";
import { HelpTip } from "@/components/help/HelpTip";
import { HELP_KEYS } from "@/config/helpKeys";

const AUTOMATION_LABELS: Record<AutomationKey, string> = {
  followup_sequence: "Follow-up",
  reactivation: "Reactivation",
  review_request: "Review request",
};

export default function AutomationInbox() {
  const { selectedBar } = useApp();
  const projectId = selectedBar?.id ?? null;
  const [automation, setAutomation] = useState<AutomationKey | "all">("all");
  const [status, setStatus] = useState<QueueStatus | "all">("pending_review");
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const { data: items = [], isLoading } = useAutomationQueue({
    projectId,
    automationKey: automation === "all" ? null : automation,
    status: status === "all" ? null : status,
    flaggedOnly,
  });
  const { data: enrollments = [] } = useAutomationEnrollments(projectId);
  const clientModeKeys = useMemo(() => new Set(
    enrollments.filter((e) => e.approval_mode === "client").map((e) => e.automation_key),
  ), [enrollments]);

  const counts = useMemo(() => ({
    pending_review: items.filter((i) => i.status === "pending_review").length,
    approved: items.filter((i) => i.status === "approved").length,
    sent: items.filter((i) => i.status === "sent").length,
  }), [items]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Automation Inbox</h1>
        <p className="text-sm text-muted-foreground">
          Every drafted customer message waits here. Approve, edit, or reject before anything sends.
        </p>
      </div>

      <HelpTip helpKey={HELP_KEYS.automationInbox} title="This is the approval gate">
        Every AI-drafted customer message (follow-ups, reactivation, review requests) pauses here as
        "pending_review". Nothing reaches a real customer until you approve it. See the Help Center
        article "The approval gate" for more.
      </HelpTip>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">Pending: {counts.pending_review}</Badge>
          <Badge variant="outline">Approved: {counts.approved}</Badge>
          <Badge variant="outline">Sent: {counts.sent}</Badge>
        </div>
        <Button
          variant={flaggedOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setFlaggedOnly((v) => !v)}
        >
          {flaggedOnly ? "Showing flagged" : "Flagged"}
        </Button>
        <Select value={automation} onValueChange={(v) => setAutomation(v as AutomationKey | "all")}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All automations</SelectItem>
            <SelectItem value="followup_sequence">Follow-up</SelectItem>
            <SelectItem value="reactivation">Reactivation</SelectItem>
            <SelectItem value="review_request">Review request</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as QueueStatus | "all")}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending_review">Pending review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No messages match these filters.</Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <QueueRow key={item.id} item={item} isClientMode={clientModeKeys.has(item.automation_key)} />
          ))}
        </div>
      )}
    </div>
  );
}

function QueueRow({ item, isClientMode }: { item: QueueItem; isClientMode: boolean }) {
  const { approve, reject, sendNow } = useQueueMutations();
  const [body, setBody] = useState(item.edited_body ?? item.body);
  const recipient = item.recipient_snapshot as { name?: string; email?: string; phone?: string };
  const to = recipient.email ?? recipient.phone ?? "(no contact)";

  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <Badge>{AUTOMATION_LABELS[item.automation_key]}</Badge>
          <Badge variant="outline">{item.channel}</Badge>
          {isClientMode && <Badge variant="secondary">CLIENT QUEUE</Badge>}
          {item.flagged_for_operator && <Badge variant="destructive">Flagged</Badge>}
          <span className="font-medium">{recipient.name ?? "(unknown)"}</span>
          <span className="text-muted-foreground">→ {to}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {item.scheduled_for ? `Sends ${new Date(item.scheduled_for).toLocaleString()}` : "Send immediately"}
          {" · "}{item.status}
          {item.approved_at && item.status === "approved" && isClientMode && (
            <> · Approved by client · {new Date(item.approved_at).toLocaleString()}</>
          )}
          {item.approved_at && item.status === "rejected" && isClientMode && (
            <> · Skipped by client · {new Date(item.approved_at).toLocaleString()}</>
          )}
        </div>
      </div>
      {item.subject != null && (
        <div className="text-sm"><span className="text-muted-foreground">Subject:</span> {item.subject}</div>
      )}
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} className="text-sm" />
      {item.status === "pending_review" && (
        <div className="flex flex-wrap gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={async () => {
            try { await reject.mutateAsync({ id: item.id, reason: "operator" }); toast.success("Rejected"); }
            catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
          }}>Reject</Button>
          <Button size="sm" onClick={async () => {
            try {
              await approve.mutateAsync({ id: item.id, editedBody: body !== item.body ? body : null });
              toast.success("Approved");
            } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
          }}>Approve</Button>
        </div>
      )}
      {item.status === "approved" && (
        <div className="flex justify-end">
          <Button size="sm" onClick={async () => {
            try { await sendNow.mutateAsync(item.id); toast.success("Send attempted"); }
            catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
          }}>Send now</Button>
        </div>
      )}
    </Card>
  );
}