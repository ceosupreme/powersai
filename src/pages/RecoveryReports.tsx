import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  useRecoveryReports,
  useRecoveryReportMutations,
  type RecoveryReport,
} from "@/hooks/useRecoveryReports";

export default function RecoveryReports() {
  const { selectedBar } = useApp();
  const projectId = selectedBar?.id ?? null;
  const { data: reports = [], isLoading } = useRecoveryReports(projectId);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => reports.find((r) => r.id === selectedId) ?? reports[0] ?? null,
    [reports, selectedId],
  );

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Recovery Reports</h1>
        <p className="text-sm text-muted-foreground">
          Internal weekly drafts. Review the numbers, edit the narrative, then copy or mark sent
          when you share with the client. Nothing here auto-delivers.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : reports.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No reports yet. The weekly generator runs Monday mornings.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
          <div className="space-y-2">
            {reports.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={`w-full text-left p-3 rounded border ${
                  (selected?.id ?? "") === r.id
                    ? "border-primary bg-accent"
                    : "border-border hover:bg-accent/40"
                }`}
              >
                <div className="text-sm font-medium">
                  {r.period_start} → {r.period_end}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={r.status} />
                  <span className="text-xs text-muted-foreground">
                    est. ${Math.round(r.estimated_dollars).toLocaleString()}
                  </span>
                </div>
              </button>
            ))}
          </div>
          {selected && <ReportDetail report={selected} />}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: RecoveryReport["status"] }) {
  const v = status === "draft" ? "secondary" : status === "reviewed" ? "outline" : "default";
  return <Badge variant={v as any}>{status}</Badge>;
}

function ReportDetail({ report }: { report: RecoveryReport }) {
  const { saveNarrative, markReviewed, markSent } = useRecoveryReportMutations();
  const [narrative, setNarrative] = useState(report.narrative ?? "");
  const m = report.metrics;
  const b = report.estimate_basis;

  const markdown = buildMarkdown(report, narrative);

  const copy = async () => {
    await navigator.clipboard.writeText(markdown);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="text-lg font-semibold">
          Est. ${Math.round(report.estimated_dollars).toLocaleString()} at work
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Based on avg ticket ${b.avg_ticket} × close rate {(b.close_rate * 100).toFixed(0)}% (
          {b.source}).
        </div>
        <details className="mt-2 text-xs text-muted-foreground">
          <summary className="cursor-pointer">How we got this</summary>
          <div className="mt-2 space-y-1">
            <div><span className="font-mono">{b.formula}</span></div>
            {b.caveats.length > 0 && (
              <ul className="list-disc ml-4">
                {b.caveats.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            )}
          </div>
        </details>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Leads captured" value={m.leads.total}
          sub={`${m.leads.after_hours} after-hours · ${m.leads.ready} qualified`} />
        <MetricCard label="Follow-ups re-engaged" value={m.followups.re_engaged}
          sub={`${m.followups.sent} sent`} />
        <MetricCard label="Reactivation responded" value={m.reactivation.responded}
          sub={`${m.reactivation.contacted} contacted`} />
        <MetricCard label="Reviews landed" value={m.reviews.reviews_landed}
          sub={`${m.reviews.requests_sent} requests sent`} />
      </div>

      <Card className="p-4 space-y-3">
        <div className="text-sm font-medium">Narrative (editable)</div>
        <Textarea
          rows={6}
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          onBlur={() => {
            if (narrative !== (report.narrative ?? "")) {
              saveNarrative.mutate({ id: report.id, narrative });
            }
          }}
        />
        <div className="flex flex-wrap gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={copy}>Copy for client</Button>
          {report.status === "draft" && (
            <Button size="sm" onClick={async () => {
              try { await markReviewed.mutateAsync(report.id); toast.success("Marked reviewed"); }
              catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
            }}>Mark reviewed</Button>
          )}
          {report.status === "reviewed" && (
            <Button size="sm" onClick={async () => {
              try { await markSent.mutateAsync(report.id); toast.success("Marked sent"); }
              catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
            }}>Mark sent</Button>
          )}
        </div>
      </Card>
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <Card className="p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </Card>
  );
}

function buildMarkdown(r: RecoveryReport, narrative: string): string {
  const m = r.metrics;
  const b = r.estimate_basis;
  return `# Recovery Report — ${r.period_start} to ${r.period_end}

**Est. $${Math.round(r.estimated_dollars).toLocaleString()} at work** _(based on avg ticket $${b.avg_ticket} × close rate ${(b.close_rate * 100).toFixed(0)}%; source: ${b.source})_

- Leads captured: ${m.leads.total} (${m.leads.after_hours} after-hours, ${m.leads.ready} qualified)
- Follow-ups re-engaged: ${m.followups.re_engaged} (of ${m.followups.sent} sent)
- Customers reactivated (responded): ${m.reactivation.responded} (of ${m.reactivation.contacted} contacted)
- Reviews landed: ${m.reviews.reviews_landed} (of ${m.reviews.requests_sent} requests)

${narrative}
`;
}